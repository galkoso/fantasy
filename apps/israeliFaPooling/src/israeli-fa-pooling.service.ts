import type { SquadSyncResult } from '@ligat-fantasy/contracts';
import type { Db } from 'mongodb';
import { createIsraeliFaSquadSync } from '@ligat-fantasy/football-data';
import type { AppConfig } from '@ligat-fantasy/config';

export interface IsraeliFaSquadSync {
  syncIsraeliPremierLeagueSquads(): Promise<SquadSyncResult>;
}

/** Polls the Israeli FA (ההתאחדות לכדורגל) and upserts Ligat Winner squads into MongoDB. */
export class IsraeliFaPoolingService {
  constructor(private readonly associationSync: IsraeliFaSquadSync) {}

  static fromConfig(db: Db, config: AppConfig): IsraeliFaPoolingService {
    return new IsraeliFaPoolingService(createIsraeliFaSquadSync(db, {
      baseUrl: config.ISRAELI_FA_BASE_URL,
      timeoutMs: config.ISRAELI_FA_REQUEST_TIMEOUT_MS,
      requestDelayMs: config.ISRAELI_FA_REQUEST_DELAY_MS,
      leagueId: config.ISRAELI_FA_LEAGUE_ID,
    }));
  }

  syncSquads() {
    return this.associationSync.syncIsraeliPremierLeagueSquads();
  }
}
