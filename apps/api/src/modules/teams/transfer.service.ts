import { DomainError, calculateSellingPrice, validateSquad } from '@ligat-fantasy/domain';
import type { OwnedPlayer } from '@ligat-fantasy/domain';
import type { MongoClient } from 'mongodb';
import type { PlayerRepository } from '../players/player.repository.js';
import type { TeamRepository } from './team.repository.js';
import type { TransferInput } from './team.types.js';

export class TransferService {
  constructor(
    private readonly client: MongoClient,
    private readonly teams: TeamRepository,
    private readonly players: PlayerRepository,
  ) {}

  async execute(userId: string, input: TransferInput): Promise<{ bank: number; pointsCost: number }> {
    const session = this.client.startSession();
    try {
      return await session.withTransaction(async () => {
        const team = await this.teams.findByUser(userId);
        if (!team) throw new DomainError('PLAYER_NOT_IN_SQUAD', 'Fantasy team does not exist');
        const owned = team.squad.find(({ playerId }) => playerId === input.playerOutId);
        if (!owned) throw new DomainError('PLAYER_NOT_IN_SQUAD', 'Outgoing player is not owned');
        if (team.squad.some(({ playerId }) => playerId === input.playerInId)) {
          throw new DomainError('PLAYER_ALREADY_OWNED', 'Incoming player is already owned');
        }
        const catalog = await this.players.byIds([...team.squad.map(({ playerId }) => playerId), input.playerInId]);
        const byId = new Map(catalog.map((player) => [player.id, player]));
        const incoming = byId.get(input.playerInId);
        const outgoing = byId.get(input.playerOutId);
        if (!incoming || !outgoing) throw new DomainError('PLAYER_NOT_IN_SQUAD', 'Player catalog entry missing');
        const soldPrice = calculateSellingPrice(owned.purchasePrice, outgoing.price);
        const bank = team.bank + soldPrice - incoming.price;
        const squad: OwnedPlayer[] = team.squad.map((member) => {
          const player = member.playerId === input.playerOutId ? incoming : byId.get(member.playerId)!;
          return { id: player.id, clubId: player.clubId, position: player.position,
            currentPrice: player.price, purchasePrice: member.playerId === input.playerOutId ? incoming.price : member.purchasePrice };
        });
        validateSquad(squad, bank);
        const pointsCost = team.freeTransfers > 0 ? 0 : 4;
        const updated = { ...team, bank, squad: squad.map(({ id, purchasePrice }) => ({ playerId: id, purchasePrice })),
          freeTransfers: Math.max(0, team.freeTransfers - 1), version: team.version + 1, updatedAt: new Date() };
        if (!(await this.teams.replaceVersioned(updated, team.version, session))) throw new Error('CONCURRENT_TEAM_UPDATE');
        await this.teams.recordTransfer({ fantasyTeamId: team.id, playerOutId: outgoing.id,
          playerInId: incoming.id, soldPrice, purchasePrice: incoming.price, pointsCost, createdAt: new Date() }, session);
        return { bank, pointsCost };
      });
    } finally { await session.endSession(); }
  }
}
