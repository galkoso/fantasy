import { collections } from '@ligat-fantasy/database';
import { calculateTeamScore, type TeamScorePlayer } from '@ligat-fantasy/scoring';
import type { FantasyChip, PlayerPosition } from '@ligat-fantasy/contracts';
import type { Db } from 'mongodb';
import { randomUUID } from 'node:crypto';

interface Snapshot {
  fantasyTeamId: string; gameweekId: string; starters: string[]; bench: string[];
  captainPlayerId: string; viceCaptainPlayerId: string; activeChip: FantasyChip | null;
}
interface PlayerDocument { id: string; position: PlayerPosition }
interface PointDocument { playerId: string; total: number; provisional: boolean }
interface StatDocument { playerId: string; minutes: number }

export class GameweekScoreService {
  constructor(private readonly db: Db) {}

  async recalculate(gameweekId: string, fixtureIds: string[], provisional: boolean): Promise<void> {
    const snapshots = await this.db.collection<Snapshot>(collections.snapshots).find({ gameweekId }).toArray();
    for (const snapshot of snapshots) await this.scoreSnapshot(snapshot, fixtureIds, provisional);
    await this.assignGameweekRanks(gameweekId);
  }

  private async scoreSnapshot(snapshot: Snapshot, fixtureIds: string[], provisional: boolean): Promise<void> {
    const ids = [...snapshot.starters, ...snapshot.bench];
    const [players, points, stats, transfers] = await Promise.all([
      this.db.collection<PlayerDocument>(collections.players).find({ id: { $in: ids } }).toArray(),
      this.db.collection<PointDocument>(collections.playerMatchPoints)
        .find({ playerId: { $in: ids }, fixtureId: { $in: fixtureIds } }).toArray(),
      this.db.collection<StatDocument>(collections.playerMatchStats)
        .find({ playerId: { $in: ids }, fixtureId: { $in: fixtureIds } }).toArray(),
      this.db.collection(collections.transfers)
        .find({ fantasyTeamId: snapshot.fantasyTeamId, gameweekId: snapshot.gameweekId }).toArray(),
    ]);
    const positions = new Map(players.map((player) => [player.id, player.position]));
    if (players.length !== ids.length) return;
    const pointTotals = sumByPlayer(points, 'total');
    const minutes = sumByPlayer(stats, 'minutes');
    const toScorePlayer = (id: string): TeamScorePlayer => ({ id, position: positions.get(id)!,
      points: pointTotals.get(id) ?? 0, minutes: minutes.get(id) ?? 0 });
    const bench = snapshot.bench.map(toScorePlayer);
    const result = calculateTeamScore({ starters: snapshot.starters.map(toScorePlayer),
      benchGoalkeeper: bench.find(({ position }) => position === 'GOALKEEPER')!,
      benchOutfield: bench.filter(({ position }) => position !== 'GOALKEEPER'),
      captainPlayerId: snapshot.captainPlayerId, viceCaptainPlayerId: snapshot.viceCaptainPlayerId,
      activeChip: snapshot.activeChip,
      transferCost: transfers.reduce((sum, transfer) => sum + Number(transfer.pointsCost ?? 0), 0) });
    const scoreCollection = this.db.collection(collections.gameweekScores);
    const previous = await scoreCollection.findOne(
      { gameweekId: snapshot.gameweekId, fantasyTeamId: snapshot.fantasyTeamId });
    await scoreCollection.updateOne(
      { gameweekId: snapshot.gameweekId, fantasyTeamId: snapshot.fantasyTeamId },
      { $set: { ...result, provisional, updatedAt: new Date() } }, { upsert: true });
    if (provisional && previous?.totalPoints !== result.totalPoints) {
      await this.db.collection('live_events').insertOne({ id: randomUUID(),
        type: 'GAMEWEEK_POINTS_UPDATED', occurredAt: new Date(),
        payload: { fantasyTeamId: snapshot.fantasyTeamId, gameweekId: snapshot.gameweekId,
          points: result.totalPoints }, expiresAt: new Date(Date.now() + 86_400_000) });
    }
  }

  private async assignGameweekRanks(gameweekId: string): Promise<void> {
    const scores = await this.db.collection(collections.gameweekScores)
      .find({ gameweekId }).sort({ totalPoints: -1, fantasyTeamId: 1 }).toArray();
    await Promise.all(scores.map((score, index) => this.db.collection(collections.gameweekScores)
      .updateOne({ _id: score._id }, { $set: { rank: index + 1 } })));
  }
}

function sumByPlayer<T extends { playerId: string }>(documents: T[], field: keyof T): Map<string, number> {
  const totals = new Map<string, number>();
  for (const document of documents) {
    totals.set(document.playerId, (totals.get(document.playerId) ?? 0) + Number(document[field]));
  }
  return totals;
}
