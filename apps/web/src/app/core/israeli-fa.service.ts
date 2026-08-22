import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { FootballPlayerFilters, FootballPlayerSummary, FootballTeamSummary, SquadSyncResult } from '@ligat-fantasy/contracts';
import type { Observable } from 'rxjs';
import { buildPlayersParams, israeliFaPlayersUrl, israeliFaSyncSquadsUrl, israeliFaTeamPlayersUrl, israeliFaTeamsUrl } from './israeli-fa.paths';

/** Reads Ligat Winner squads stored from the Israeli FA (ההתאחדות לכדורגל). Never calls football.org.il. */
@Injectable({ providedIn: 'root' })
export class IsraeliFaService {
  private readonly http = inject(HttpClient);

  getTeams(): Observable<FootballTeamSummary[]> {
    return this.http.get<FootballTeamSummary[]>(israeliFaTeamsUrl());
  }

  getPlayersByTeam(teamId: string): Observable<FootballPlayerSummary[]> {
    return this.http.get<FootballPlayerSummary[]>(israeliFaTeamPlayersUrl(teamId));
  }

  getPlayers(filters: FootballPlayerFilters = {}): Observable<FootballPlayerSummary[]> {
    return this.http.get<FootballPlayerSummary[]>(israeliFaPlayersUrl(), { params: toHttpParams(buildPlayersParams(filters)) });
  }

  syncSquads(): Observable<SquadSyncResult> {
    return this.http.post<SquadSyncResult>(israeliFaSyncSquadsUrl(), {});
  }
}

function toHttpParams(values: Record<string, string>): HttpParams {
  return Object.entries(values).reduce((params, [key, value]) => params.set(key, value), new HttpParams());
}
