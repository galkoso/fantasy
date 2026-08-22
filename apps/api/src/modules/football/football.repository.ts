import { collections, type PlayerDocument, type TeamDocument } from '@ligat-fantasy/database';
import type { FootballPlayerSummary, FootballTeamSummary } from '@ligat-fantasy/contracts';
import { ObjectId, type Db, type Filter } from 'mongodb';

export interface FootballPlayerQuery {
  teamId?: string | undefined;
  position?: string | undefined;
  search?: string | undefined;
  active?: boolean | undefined;
  includeInactive?: boolean | undefined;
}

export class FootballRepository {
  constructor(private readonly db: Db) {}

  async listTeams(): Promise<FootballTeamSummary[]> {
    const teams = await this.db.collection<TeamDocument>(collections.teams)
      .find({ active: true }).sort({ name: 1 }).toArray();
    const counts = await this.db.collection<PlayerDocument>(collections.players).aggregate<{ _id: ObjectId; count: number }>([
      { $match: { active: true } },
      { $group: { _id: '$teamId', count: { $sum: 1 } } },
    ]).toArray();
    const countByTeam = new Map(counts.map((item) => [item._id.toHexString(), item.count]));
    return teams.map((team) => ({
      id: team._id.toHexString(), name: team.name, playerCount: countByTeam.get(team._id.toHexString()) ?? 0,
      ...(team.logo ? { logo: team.logo } : {}),
    }));
  }

  async getTeam(teamId: string): Promise<TeamDocument | null> {
    if (!ObjectId.isValid(teamId)) return null;
    return this.db.collection<TeamDocument>(collections.teams).findOne({ _id: new ObjectId(teamId) });
  }

  async listPlayers(query: FootballPlayerQuery): Promise<FootballPlayerSummary[]> {
    const filter = buildPlayerFilter(query);
    const players = await this.db.collection<PlayerDocument>(collections.players)
      .find(filter).sort({ name: 1 }).limit(500).toArray();
    return sortSquad(players.map(toPlayerSummary));
  }
}

export function buildPlayerFilter(query: FootballPlayerQuery): Filter<PlayerDocument> {
  const filter: Filter<PlayerDocument> = {};
  if (query.teamId) filter.teamId = new ObjectId(query.teamId);
  if (query.position) filter.position = query.position;
  if (query.search) filter.name = { $regex: escapeRegex(query.search), $options: 'i' };
  if (query.includeInactive) {
    if (query.active !== undefined) filter.active = query.active;
  } else if (query.active === false) {
    filter.active = false;
  } else {
    filter.active = true;
  }
  return filter;
}

export function toPlayerSummary(player: PlayerDocument): FootballPlayerSummary {
  return {
    id: player._id.toHexString(), name: player.name, teamId: player.teamId.toHexString(),
    ...(player.shirtNumber !== undefined ? { number: player.shirtNumber } : {}),
    ...(player.position ? { position: player.position } : {}),
    ...(player.photo ? { photo: player.photo } : {}),
    ...(player.age !== undefined ? { age: player.age } : {}),
  };
}

const positionOrder: Record<string, number> = { GOALKEEPER: 0, DEFENDER: 1, MIDFIELDER: 2, ATTACKER: 3 };

function sortSquad(players: FootballPlayerSummary[]): FootballPlayerSummary[] {
  return [...players].sort((left, right) => {
    const byPosition = (positionOrder[left.position ?? ''] ?? 99) - (positionOrder[right.position ?? ''] ?? 99);
    if (byPosition !== 0) return byPosition;
    return (left.number ?? 99) - (right.number ?? 99) || left.name.localeCompare(right.name);
  });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
