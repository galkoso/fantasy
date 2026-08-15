import { collections } from '@ligat-fantasy/database';
import type { Db } from 'mongodb';
import { GameweekScoreService } from './gameweek-score.service.js';

type GameweekStatus = 'OPEN' | 'LOCKED' | 'LIVE' | 'FINALIZING' | 'FINAL';
interface Gameweek { id: string; status: GameweekStatus; deadline: Date; fixtureIds: string[] }
interface Team { id: string; squad: unknown[]; starters: string[]; bench: string[];
  captainPlayerId?: string; viceCaptainPlayerId?: string; bank: number }

export class GameweekLifecycleJob {
  private readonly scores: GameweekScoreService;
  private running = false;
  constructor(private readonly db: Db) { this.scores = new GameweekScoreService(db); }

  async run(now = new Date()): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const due = await this.db.collection<Gameweek>(collections.gameweeks)
        .find({ status: 'OPEN', deadline: { $lte: now } }).toArray();
      for (const gameweek of due) {
        await this.snapshotTeams(gameweek);
        await this.db.collection(collections.gameweeks).updateOne({ id: gameweek.id, status: 'OPEN' },
          { $set: { status: 'LOCKED', startedAt: now } });
      }
      const active = await this.db.collection<Gameweek>(collections.gameweeks)
        .find({ status: { $in: ['LOCKED', 'LIVE', 'FINALIZING'] } }).toArray();
      for (const gameweek of active) await this.advance(gameweek, now);
      const pendingEffects = await this.db.collection(collections.gameweeks)
        .find({ status: 'FINAL', effectsApplied: { $ne: true } }).toArray();
      for (const gameweek of pendingEffects) await this.applyFinalEffects(String(gameweek.id));
    } finally { this.running = false; }
  }

  private async advance(gameweek: Gameweek, now: Date): Promise<void> {
    const fixtures = await this.db.collection(collections.fixtures)
      .find({ id: { $in: gameweek.fixtureIds } }).toArray();
    if (!fixtures.length) return;
    const allFinished = fixtures.every(({ status }) => status === 'FINISHED');
    const started = fixtures.some(({ status }) => status === 'LIVE' || status === 'FINISHED');
    if (allFinished) {
      await this.db.collection(collections.gameweeks).updateOne({ id: gameweek.id, status: { $ne: 'FINAL' } },
        { $set: { status: 'FINALIZING' } });
      await this.scores.recalculate(gameweek.id, gameweek.fixtureIds, false);
      await this.db.collection(collections.gameweeks).updateOne({ id: gameweek.id, status: 'FINALIZING' },
        { $set: { status: 'FINAL', finalizedAt: now, effectsApplied: false } });
      await this.applyFinalEffects(gameweek.id);
    } else if (started) {
      await this.db.collection(collections.gameweeks).updateOne({ id: gameweek.id }, { $set: { status: 'LIVE' } });
      await this.scores.recalculate(gameweek.id, gameweek.fixtureIds, true);
    }
  }

  private async snapshotTeams(gameweek: Gameweek): Promise<void> {
    const teams = await this.db.collection<Team>(collections.fantasyTeams)
      .find({ 'squad.14': { $exists: true }, 'starters.10': { $exists: true } }).toArray();
    for (const team of teams) {
      if (!team.captainPlayerId || !team.viceCaptainPlayerId) continue;
      await this.db.collection(collections.snapshots).updateOne(
        { gameweekId: gameweek.id, fantasyTeamId: team.id }, { $set: { gameweekId: gameweek.id,
          fantasyTeamId: team.id, squad: team.squad, starters: team.starters, bench: team.bench,
          captainPlayerId: team.captainPlayerId, viceCaptainPlayerId: team.viceCaptainPlayerId,
          activeChip: null, bank: team.bank, submittedAt: new Date() } }, { upsert: true });
    }
  }

  private async applyFinalEffects(gameweekId: string): Promise<void> {
    const totals = await this.db.collection(collections.gameweekScores).aggregate<{ _id: string; points: number }>([
      { $match: { provisional: false } }, { $group: { _id: '$fantasyTeamId', points: { $sum: '$totalPoints' } } },
    ]).toArray();
    for (const total of totals) await this.db.collection(collections.fantasyTeams)
      .updateOne({ id: total._id, processedGameweeks: { $ne: gameweekId } },
        { $set: { overallPoints: total.points }, $inc: { freeTransfers: 1 },
          $addToSet: { processedGameweeks: gameweekId } });
    await this.db.collection(collections.fantasyTeams).updateMany({ freeTransfers: { $gt: 5 } }, { $set: { freeTransfers: 5 } });
    const teams = await this.db.collection(collections.fantasyTeams).find().sort({ overallPoints: -1, id: 1 }).toArray();
    await Promise.all(teams.map((team, index) => this.db.collection(collections.fantasyTeams)
      .updateOne({ _id: team._id }, { $set: { overallRank: index + 1 } })));
    await this.db.collection(collections.gameweeks).updateOne({ id: gameweekId },
      { $set: { effectsApplied: true } });
  }
}
