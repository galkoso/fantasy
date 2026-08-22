import type { FailedTeamSync, SquadSyncResult } from '@ligat-fantasy/contracts';
import { collections, type PlayerDocument, type TeamDocument } from '@ligat-fantasy/database';
import type { AnyBulkWriteOperation, Db, Filter, ObjectId } from 'mongodb';
import type { ExternalPlayer, ExternalTeam, FootballDataProvider } from '../football-data-provider.js';
import { parseBirthDate } from '../israeli-fa/normalize-position.js';
import { MIN_LEAGUE_PLAYERS, MIN_LEAGUE_TEAMS, MIN_SQUAD_PLAYERS, ScrapeValidationError } from '../israeli-fa/validation.js';

export interface SquadSyncLogger {
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
}

export const consoleSquadSyncLogger: SquadSyncLogger = {
  info: (obj, msg) => { console.log(msg, obj); },
  warn: (obj, msg) => { console.warn(msg, obj); },
  error: (obj, msg) => { console.error(msg, obj); },
};

export interface SquadSyncOptions {
  minTeams?: number;
  minPlayers?: number;
  minSquadPlayers?: number;
}

interface StoredTeam { _id: ObjectId; name: string; providerIds: { israeliFa?: string } }
type StoredPlayer = Pick<PlayerDocument, '_id' | 'name' | 'teamId' | 'birthDate' | 'providerIds'>;

export class SquadSyncService {
  private running = false;
  private readonly minTeams: number;
  private readonly minPlayers: number;
  private readonly minSquadPlayers: number;

  constructor(
    private readonly db: Db,
    private readonly provider: FootballDataProvider,
    options: SquadSyncOptions = {},
    private readonly logger: SquadSyncLogger = consoleSquadSyncLogger,
  ) {
    this.minTeams = options.minTeams ?? MIN_LEAGUE_TEAMS;
    this.minPlayers = options.minPlayers ?? MIN_LEAGUE_PLAYERS;
    this.minSquadPlayers = options.minSquadPlayers ?? MIN_SQUAD_PLAYERS;
  }

  async syncIsraeliPremierLeagueSquads(): Promise<SquadSyncResult> {
    if (this.running) {
      this.logger.warn({}, 'football.sync.skipped');
      return emptyResult();
    }
    this.running = true;
    const startedAt = Date.now();
    try {
      this.logger.info({}, 'football.sync.started');
      const teams = validateTeams(await this.provider.getTeams(), this.minTeams);
      const now = new Date();
      const leagueName = teams[0]?.leagueName ?? 'ליגת WINNER';
      const season = teams[0]?.seasonName;
      this.logger.info({ count: teams.length, leagueName, season }, 'football.teams.fetched');

      const teamWrite = writeBreakdown(await this.db.collection<TeamDocument>(collections.teams)
        .bulkWrite(buildTeamBulkOps(teams, now), { ordered: false }));
      await this.deactivateMissingTeams(teams, now);

      const storedTeams = await this.db.collection<StoredTeam>(collections.teams)
        .find({ 'providerIds.israeliFa': { $in: teams.map((team) => team.externalId) } })
        .project({ _id: 1, name: 1, 'providerIds.israeliFa': 1 }).toArray();
      const teamsByExternalId = new Map(storedTeams
        .filter((team) => team.providerIds.israeliFa)
        .map((team) => [team.providerIds.israeliFa!, team]));

      const fetchedPlayers: Array<ExternalPlayer & { teamId: ObjectId; teamExternalId: string }> = [];
      const failedTeams: FailedTeamSync[] = [];
      const successfulTeamIds: ObjectId[] = [];

      for (const team of teams) {
        const stored = teamsByExternalId.get(team.externalId);
        if (!stored) {
          failedTeams.push({ teamId: team.externalId, teamName: team.name, reason: 'TEAM_NOT_PERSISTED' });
          continue;
        }
        try {
          const squad = (await this.provider.getSquad(team)).filter((player) => player.name.trim().length > 0);
          if (squad.length < this.minSquadPlayers) throw new Error('SQUAD_EMPTY');
          this.logger.info({ teamId: team.externalId, teamName: team.name, count: squad.length }, 'football.team.squad.fetched');
          fetchedPlayers.push(...squad.map((player) => ({ ...player, teamId: stored._id, teamExternalId: team.externalId })));
          successfulTeamIds.push(stored._id);
        } catch (error) {
          const reason = error instanceof Error ? error.message : 'UNKNOWN_SQUAD_ERROR';
          this.logger.warn({ teamId: team.externalId, teamName: team.name, reason }, 'football.team.squad.failed');
          failedTeams.push({ teamId: team.externalId, teamName: team.name, reason });
        }
      }

      const uniqueProviderIds = fetchedPlayers.map((player) => player.externalId).filter((id): id is string => Boolean(id));
      if (new Set(uniqueProviderIds).size !== uniqueProviderIds.length) {
        this.logger.warn({ count: uniqueProviderIds.length }, 'football.players.duplicate-provider-ids');
      }

      const existing = await this.loadExistingPlayers(fetchedPlayers);
      const resolved = resolvePlayers(fetchedPlayers, existing);
      let playerWrite = { created: 0, updated: 0 };
      if (resolved.length > 0) {
        try {
          playerWrite = writeBreakdown(await this.db.collection<PlayerDocument>(collections.players)
            .bulkWrite(buildPlayerBulkOps(resolved, now), { ordered: false }));
        } catch (error) {
          throw new Error(`Failed to persist players: ${mongoWriteReason(error)}`);
        }
      }
      this.logger.info({ created: playerWrite.created, updated: playerWrite.updated, fetched: fetchedPlayers.length }, 'football.players.upserted');

      const playersDeactivated = canDeactivatePlayers(fetchedPlayers.length, this.minPlayers)
        ? await this.deactivateMissingPlayers(successfulTeamIds, resolved, now)
        : 0;

      const result: SquadSyncResult = {
        leagueName, teamsFetched: teams.length, teamsCreated: teamWrite.created, teamsUpdated: teamWrite.updated,
        playersFetched: fetchedPlayers.length, playersCreated: playerWrite.created, playersUpdated: playerWrite.updated,
        playersDeactivated, failedTeams, durationMs: Date.now() - startedAt,
        ...(season ? { season } : {}),
      };
      this.logger.info({ ...result, failedTeamCount: failedTeams.length }, 'football.sync.completed');
      return result;
    } catch (error) {
      const reason = mongoWriteReason(error);
      this.logger.error({ error: reason, durationMs: Date.now() - startedAt }, 'football.sync.failed');
      throw error instanceof Error ? error : new Error(reason);
    } finally {
      this.running = false;
    }
  }

  private async loadExistingPlayers(
    fetched: Array<ExternalPlayer & { teamId: ObjectId }>,
  ): Promise<StoredPlayer[]> {
    const ids = fetched.map((player) => player.externalId).filter((id): id is string => Boolean(id));
    const names = [...new Set(fetched.map((player) => player.name))];
    const filter: Filter<PlayerDocument> = ids.length > 0
      ? { $or: [{ 'providerIds.israeliFa': { $in: ids } }, { name: { $in: names } }] }
      : { name: { $in: names } };
    return this.db.collection<PlayerDocument>(collections.players).find(filter).toArray();
  }

  private async deactivateMissingTeams(teams: ExternalTeam[], now: Date): Promise<void> {
    const leagueId = teams[0]?.leagueExternalId;
    if (!leagueId) return;
    await this.db.collection<TeamDocument>(collections.teams).updateMany(
      {
        'league.providerId': leagueId, active: true,
        'providerIds.israeliFa': { $nin: teams.map((team) => team.externalId) },
      },
      { $set: { active: false, updatedAt: now, lastSyncedAt: now } },
    );
  }

  private async deactivateMissingPlayers(
    successfulTeamIds: ObjectId[],
    current: ResolvedPlayer[],
    now: Date,
  ): Promise<number> {
    if (successfulTeamIds.length === 0) return 0;
    const result = await this.db.collection<PlayerDocument>(collections.players).updateMany(
      inactivePlayersFilter(successfulTeamIds, current),
      { $set: { active: false, updatedAt: now, lastSyncedAt: now } },
    );
    return result.modifiedCount;
  }
}

export interface ResolvedPlayer extends ExternalPlayer {
  teamId: ObjectId;
  existingId?: ObjectId;
}

export function validateTeams(teams: ExternalTeam[], minTeams = MIN_LEAGUE_TEAMS): ExternalTeam[] {
  const valid = teams.filter((team) => team.externalId && team.name.trim().length > 0);
  const unique = [...new Map(valid.map((team) => [team.externalId, team])).values()];
  if (unique.length < minTeams) {
    throw new ScrapeValidationError(`LEAGUE_TEAMS_BELOW_THRESHOLD:${unique.length}`);
  }
  return unique;
}

export function buildTeamBulkOps(teams: ExternalTeam[], now: Date): AnyBulkWriteOperation<TeamDocument>[] {
  return teams.map((team) => ({
    updateOne: {
      filter: { 'providerIds.israeliFa': team.externalId },
      update: {
        $set: {
          name: team.name, active: true, updatedAt: now, lastSyncedAt: now,
          league: { name: team.leagueName ?? 'ליגת WINNER', ...(team.leagueExternalId ? { providerId: team.leagueExternalId } : {}) },
          season: {
            ...(team.seasonExternalId ? { providerId: team.seasonExternalId } : {}),
            ...(team.seasonName ? { name: team.seasonName } : {}),
          },
          ...(team.logo ? { logo: team.logo } : {}),
        },
        $setOnInsert: { createdAt: now, providerIds: { israeliFa: team.externalId } },
      },
      upsert: true,
    },
  }));
}

export function buildPlayerBulkOps(players: ResolvedPlayer[], now: Date): AnyBulkWriteOperation<PlayerDocument>[] {
  return players.map((player) => ({
    updateOne: {
      filter: playerFilter(player),
      update: {
        $set: playerSetFields(player, now),
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));
}

export function playerFilter(player: ResolvedPlayer): Filter<PlayerDocument> {
  if (player.existingId) return { _id: player.existingId };
  if (player.externalId) return { 'providerIds.israeliFa': player.externalId };
  const filter: Filter<PlayerDocument> = { name: player.name, teamId: player.teamId };
  const birthDate = player.birthDate ? parseBirthDate(player.birthDate) : undefined;
  if (birthDate) filter.birthDate = birthDate;
  return filter;
}

export function inactivePlayersFilter(successfulTeamIds: ObjectId[], current: ResolvedPlayer[]): Filter<PlayerDocument> {
  const currentIds = current.map((player) => player.existingId).filter((id): id is ObjectId => Boolean(id));
  const currentProviderIds = current.map((player) => player.externalId).filter((id): id is string => Boolean(id));
  const unnamed = current.filter((player) => !player.externalId && !player.existingId);
  const keep: Filter<PlayerDocument>[] = [
    ...(currentIds.length > 0 ? [{ _id: { $in: currentIds } }] : []),
    ...(currentProviderIds.length > 0 ? [{ 'providerIds.israeliFa': { $in: currentProviderIds } }] : []),
    ...unnamed.map((player) => ({ name: player.name, teamId: player.teamId })),
  ];
  if (keep.length === 0) return { _id: { $in: [] } };
  return { active: true, teamId: { $in: successfulTeamIds }, $nor: keep };
}

export function resolvePlayers(
  fetched: Array<ExternalPlayer & { teamId: ObjectId }>,
  existing: StoredPlayer[],
): ResolvedPlayer[] {
  const byProvider = new Map(existing.filter((player) => player.providerIds.israeliFa)
    .map((player) => [player.providerIds.israeliFa!, player]));
  const byNameBirth = new Map<string, StoredPlayer>();
  const byName = new Map<string, StoredPlayer[]>();
  for (const player of existing) {
    byNameBirth.set(nameBirthKey(player.name, player.birthDate), player);
    const list = byName.get(normalizeName(player.name)) ?? [];
    list.push(player);
    byName.set(normalizeName(player.name), list);
  }

  const used = new Set<string>();
  const resolved: ResolvedPlayer[] = [];
  for (const player of fetched) {
    const match = matchExisting(player, byProvider, byNameBirth, byName, used);
    if (match) used.add(match._id.toHexString());
    resolved.push({ ...player, ...(match ? { existingId: match._id } : {}) });
  }
  return dedupeResolved(resolved);
}

function matchExisting(
  player: ExternalPlayer & { teamId: ObjectId },
  byProvider: Map<string, StoredPlayer>,
  byNameBirth: Map<string, StoredPlayer>,
  byName: Map<string, StoredPlayer[]>,
  used: Set<string>,
): StoredPlayer | undefined {
  if (player.externalId) {
    const match = byProvider.get(player.externalId);
    if (match && !used.has(match._id.toHexString())) return match;
  }
  const birthDate = player.birthDate ? parseBirthDate(player.birthDate) : undefined;
  if (birthDate) {
    const match = byNameBirth.get(nameBirthKey(player.name, birthDate));
    if (match && !used.has(match._id.toHexString())) return match;
  }
  const sameName = byName.get(normalizeName(player.name)) ?? [];
  const sameTeam = sameName.find((item) => item.teamId.equals(player.teamId) && !used.has(item._id.toHexString()));
  return sameTeam;
}

function playerSetFields(player: ResolvedPlayer, now: Date) {
  const birthDate = player.birthDate ? parseBirthDate(player.birthDate) : undefined;
  return {
    name: player.name, teamId: player.teamId, active: true as const, updatedAt: now, lastSyncedAt: now,
    ...(player.externalId ? { providerIds: { israeliFa: player.externalId } } : {}),
    ...(player.shirtNumber !== undefined ? { shirtNumber: player.shirtNumber } : {}),
    ...(player.position ? { position: player.position } : {}),
    ...(player.positionRaw ? { positionRaw: player.positionRaw } : {}),
    ...(birthDate ? { birthDate } : {}),
    ...(player.age !== undefined ? { age: player.age } : {}),
    ...(player.photo ? { photo: player.photo } : {}),
  };
}

function writeBreakdown(result: { matchedCount: number; upsertedCount: number }): { created: number; updated: number } {
  return { created: result.upsertedCount, updated: result.matchedCount };
}

function canDeactivatePlayers(playersFetched: number, minPlayers: number): boolean {
  return playersFetched >= minPlayers;
}

function mongoWriteReason(error: unknown): string {
  if (error && typeof error === 'object' && 'writeErrors' in error) {
    const writeErrors = (error as { writeErrors?: Array<{ errmsg?: string }> }).writeErrors ?? [];
    const first = writeErrors[0]?.errmsg ?? (error instanceof Error ? error.message : 'BULK_WRITE_FAILED');
    return writeErrors.length > 1 ? `${first} (${writeErrors.length} write errors)` : first;
  }
  return error instanceof Error ? error.message : 'UNKNOWN_SYNC_ERROR';
}

function emptyResult(): SquadSyncResult {
  return {
    leagueName: '', teamsFetched: 0, teamsCreated: 0, teamsUpdated: 0,
    playersFetched: 0, playersCreated: 0, playersUpdated: 0, playersDeactivated: 0,
    failedTeams: [], durationMs: 0,
  };
}

function normalizeName(name: string): string {
  return name.normalize('NFKC').replace(/['׳`"]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function nameBirthKey(name: string, birthDate: Date | undefined): string {
  return `${normalizeName(name)}|${birthDate?.toISOString() ?? ''}`;
}

function dedupeResolved(players: ResolvedPlayer[]): ResolvedPlayer[] {
  const seen = new Set<string>();
  return players.filter((player) => {
    const key = player.externalId ?? player.existingId?.toHexString() ?? `name:${player.name}:${player.teamId.toHexString()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
