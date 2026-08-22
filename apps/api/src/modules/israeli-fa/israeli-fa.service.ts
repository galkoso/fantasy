import type { Db } from 'mongodb';
import { IsraeliFaRepository, type IsraeliFaPlayerQuery } from './israeli-fa.repository.js';

/** Serves Ligat Winner squads already stored from the Israeli FA (ההתאחדות לכדורגל). */
export class IsraeliFaService {
  private readonly repository: IsraeliFaRepository;

  constructor(db: Db) {
    this.repository = new IsraeliFaRepository(db);
  }

  listTeams() {
    return this.repository.listTeams();
  }

  getTeam(teamId: string) {
    return this.repository.getTeam(teamId);
  }

  listPlayers(query: IsraeliFaPlayerQuery) {
    return this.repository.listPlayers(query);
  }
}
