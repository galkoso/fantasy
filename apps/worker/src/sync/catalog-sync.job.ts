import { randomUUID } from 'node:crypto';
import { collections } from '@ligat-fantasy/database';
import type { FootballDataProvider, ProviderPlayer } from '@ligat-fantasy/football-data';
import type { Db } from 'mongodb';

interface Identity { id: string; providerIds: { apiFootball: number } }

export class CatalogSyncJob {
  constructor(private readonly db: Db, private readonly provider: FootballDataProvider) {}

  async run(): Promise<void> {
    for (const club of await this.provider.getClubs()) {
      const previous = await this.db.collection<Identity>(collections.clubs)
        .findOne({ 'providerIds.apiFootball': club.providerId });
      await this.db.collection(collections.clubs).updateOne(
        { 'providerIds.apiFootball': club.providerId }, { $set: { name: club.name,
          shortName: club.shortName, logoUrl: club.logoUrl, updatedAt: new Date() },
          $setOnInsert: { id: previous?.id ?? randomUUID(), providerIds: { apiFootball: club.providerId },
            primaryColor: clubColor(club.providerId), createdAt: new Date() } }, { upsert: true });
    }
    const clubs = await this.db.collection<Identity>(collections.clubs).find().toArray();
    const clubIds = new Map(clubs.map((club) => [club.providerIds.apiFootball, club.id]));
    for (const player of await this.provider.getPlayers()) await this.upsertPlayer(player, clubIds);
  }

  private async upsertPlayer(player: ProviderPlayer, clubIds: ReadonlyMap<number, string>): Promise<void> {
    const clubId = clubIds.get(player.clubProviderId);
    if (!clubId) return;
    const previous = await this.db.collection<Identity>(collections.players)
      .findOne({ 'providerIds.apiFootball': player.providerId });
    await this.db.collection(collections.players).updateOne(
      { 'providerIds.apiFootball': player.providerId }, { $set: { clubId, name: player.name,
        position: player.position, updatedAt: new Date() }, $setOnInsert: {
          id: previous?.id ?? randomUUID(), providerIds: { apiFootball: player.providerId },
          price: initialPrice(player.position), totalPoints: 0, selectedByPercent: 0,
          form: 0, status: 'AVAILABLE', createdAt: new Date(),
        } }, { upsert: true });
  }
}

function initialPrice(position: ProviderPlayer['position']): number {
  return { GOALKEEPER: 45, DEFENDER: 45, MIDFIELDER: 55, FORWARD: 60 }[position];
}

function clubColor(providerId: number): string {
  return ['#31d7c5', '#c8f33d', '#ffbd59', '#5aa7ff', '#f078a8'][providerId % 5]!;
}
