import { randomUUID } from 'node:crypto';
import { collections } from '@ligat-fantasy/database';
import type { FootballDataProvider, ProviderFixture, ProviderPlayerStats } from '@ligat-fantasy/football-data';
import { calculatePlayerPoints, type MatchPlayerStats } from '@ligat-fantasy/scoring';
import type { Db } from 'mongodb';

interface InternalFixture {
  id: string; providerIds: { apiFootball: number }; kickoffAt: Date;
  status: ProviderFixture['status']; homeClubId: string; awayClubId: string;
  homeGoals: number | null; awayGoals: number | null; gameweekId?: string;
}
interface ProviderIdentity { id: string; providerIds: { apiFootball: number } }

export class FootballSyncJob {
  private running = false;
  constructor(private readonly db: Db, private readonly provider: FootballDataProvider,
    private readonly season: number) {}

  async run(date?: Date): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      for (const fixture of await this.provider.getFixtures(date)) {
        const internal = await this.upsertFixture(fixture);
        if (fixture.status === 'LIVE' || fixture.status === 'FINISHED') await this.syncStats(internal);
      }
    } finally { this.running = false; }
  }

  private async upsertFixture(fixture: ProviderFixture): Promise<InternalFixture> {
    const collection = this.db.collection<InternalFixture>(collections.fixtures);
    const previous = await collection.findOne({ 'providerIds.apiFootball': fixture.providerId });
    const id = previous?.id ?? randomUUID();
    const gameweekId = await this.ensureGameweek(fixture, id);
    const clubs = await this.db.collection<ProviderIdentity>(collections.clubs).find({
      'providerIds.apiFootball': { $in: [fixture.homeClubProviderId, fixture.awayClubProviderId] },
    }).toArray();
    const clubIds = new Map(clubs.map((club) => [club.providerIds.apiFootball, club.id]));
    const homeClubId = clubIds.get(fixture.homeClubProviderId);
    const awayClubId = clubIds.get(fixture.awayClubProviderId);
    if (!homeClubId || !awayClubId) throw new Error('FIXTURE_CLUB_MAPPING_MISSING');
    const document: InternalFixture = { id, kickoffAt: fixture.kickoffAt, status: fixture.status,
      homeClubId, awayClubId, homeGoals: fixture.homeGoals, awayGoals: fixture.awayGoals,
      providerIds: { apiFootball: fixture.providerId },
      ...(gameweekId ? { gameweekId } : {}) };
    await collection.replaceOne({ 'providerIds.apiFootball': fixture.providerId }, document, { upsert: true });
    return document;
  }

  private async ensureGameweek(fixture: ProviderFixture, fixtureId: string): Promise<string | undefined> {
    if (fixture.gameweekNumber === undefined) return undefined;
    const collection = this.db.collection(collections.gameweeks);
    const filter = { season: this.season, number: fixture.gameweekNumber };
    await collection.updateOne(filter, { $setOnInsert: { id: randomUUID(), ...filter,
      name: `Gameweek ${fixture.gameweekNumber}`, status: fixture.kickoffAt > new Date() ? 'OPEN' : 'LOCKED',
      deadline: fixture.kickoffAt, fixtureIds: [], createdAt: new Date() },
      $addToSet: { fixtureIds: fixtureId }, $min: { deadline: fixture.kickoffAt } }, { upsert: true });
    return String((await collection.findOne(filter))!.id);
  }

  private async syncStats(fixture: InternalFixture): Promise<void> {
    for (const providerStats of await this.provider.getPlayerStats(fixture.providerIds.apiFootball)) {
      const player = await this.db.collection<ProviderIdentity>(collections.players)
        .findOne({ 'providerIds.apiFootball': providerStats.playerProviderId });
      if (!player) continue;
      const stats = normalizeStats(fixture.id, player.id, providerStats);
      await this.db.collection(collections.playerMatchStats)
        .replaceOne({ fixtureId: fixture.id, playerId: player.id }, stats, { upsert: true });
      const points = calculatePlayerPoints(stats);
      await this.db.collection(collections.playerMatchPoints).replaceOne(
        { fixtureId: fixture.id, playerId: player.id },
        { fixtureId: fixture.id, playerId: player.id, ...points, provisional: fixture.status !== 'FINISHED', updatedAt: new Date() },
        { upsert: true },
      );
      await this.refreshPlayerFantasyStats(player.id);
      await this.publishPoints(player.id, fixture.id, points.total);
    }
  }

  private async refreshPlayerFantasyStats(playerId: string): Promise<void> {
    const matches = await this.db.collection<{ total: number }>(collections.playerMatchPoints)
      .find({ playerId }).sort({ updatedAt: -1 }).toArray();
    const totalPoints = matches.reduce((sum, match) => sum + match.total, 0);
    const recent = matches.slice(0, 5);
    const form = recent.length ? Number((recent.reduce((sum, match) => sum + match.total, 0) / recent.length).toFixed(1)) : 0;
    await this.db.collection(collections.players).updateOne({ id: playerId }, { $set: { totalPoints, form } });
  }

  private async publishPoints(playerId: string, fixtureId: string, points: number): Promise<void> {
    await this.db.collection('live_events').insertOne({ id: randomUUID(), type: 'PLAYER_POINTS_UPDATED',
      occurredAt: new Date(), payload: { playerId, fixtureId, points }, expiresAt: new Date(Date.now() + 86_400_000) });
  }
}

function normalizeStats(fixtureId: string, playerId: string, stats: ProviderPlayerStats): MatchPlayerStats {
  return { fixtureId, playerId, position: stats.position, minutes: stats.minutes, goals: stats.goals,
    assists: stats.assists, goalsConcededWhilePlaying: stats.goalsConcededWhilePlaying,
    saves: stats.saves, penaltiesSaved: stats.penaltiesSaved, penaltiesMissed: stats.penaltiesMissed,
    yellowCards: stats.yellowCards, redCards: stats.redCards, ownGoals: stats.ownGoals,
    ...(stats.rating === undefined ? {} : { rating: stats.rating }) };
}
