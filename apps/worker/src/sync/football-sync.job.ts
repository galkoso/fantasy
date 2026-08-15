import { randomUUID } from 'node:crypto';
import { collections } from '@ligat-fantasy/database';
import type { FootballDataProvider, ProviderFixture, ProviderPlayerStats } from '@ligat-fantasy/football-data';
import { calculatePlayerPoints, type MatchPlayerStats } from '@ligat-fantasy/scoring';
import type { Db } from 'mongodb';

interface InternalFixture extends ProviderFixture { id: string; providerIds: { apiFootball: number } }
interface ProviderIdentity { id: string; providerIds: { apiFootball: number } }

export class FootballSyncJob {
  private running = false;
  constructor(private readonly db: Db, private readonly provider: FootballDataProvider) {}

  async run(date: Date): Promise<void> {
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
    const document = { ...fixture, id: previous?.id ?? randomUUID(), providerIds: { apiFootball: fixture.providerId } };
    await collection.replaceOne({ 'providerIds.apiFootball': fixture.providerId }, document, { upsert: true });
    return document;
  }

  private async syncStats(fixture: InternalFixture): Promise<void> {
    for (const providerStats of await this.provider.getPlayerStats(fixture.providerId)) {
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
      await this.publishPoints(player.id, fixture.id, points.total);
    }
  }

  private async publishPoints(playerId: string, fixtureId: string, points: number): Promise<void> {
    await this.db.collection('live_events').insertOne({ id: randomUUID(), type: 'PLAYER_POINTS_UPDATED',
      occurredAt: new Date(), payload: { playerId, fixtureId, points }, expiresAt: new Date(Date.now() + 86_400_000) });
  }
}

function normalizeStats(fixtureId: string, playerId: string, stats: ProviderPlayerStats): MatchPlayerStats {
  const { fixtureProviderId: _fixture, playerProviderId: _player, clubProviderId: _club, ...normalized } = stats;
  return { fixtureId, playerId, ...normalized };
}
