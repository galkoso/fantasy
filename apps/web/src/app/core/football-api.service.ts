import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { FootballPlayerFilters, FootballPlayerSummary, FootballTeamSummary, SquadSyncResult } from '@ligat-fantasy/contracts';
import type { Observable } from 'rxjs';
import { buildPlayersParams, footballMeUrl, footballPlayersUrl, footballSyncSquadsUrl, footballTeamPlayersUrl, footballTeamsUrl } from './football-api.paths';

export interface CurrentUser { id: string; isAdmin: boolean }

@Injectable({ providedIn: 'root' })
export class FootballApiService {
  private readonly http = inject(HttpClient);

  getTeams(): Observable<FootballTeamSummary[]> {
    return this.http.get<FootballTeamSummary[]>(footballTeamsUrl());
  }

  getPlayersByTeam(teamId: string): Observable<FootballPlayerSummary[]> {
    return this.http.get<FootballPlayerSummary[]>(footballTeamPlayersUrl(teamId));
  }

  getPlayers(filters: FootballPlayerFilters = {}): Observable<FootballPlayerSummary[]> {
    return this.http.get<FootballPlayerSummary[]>(footballPlayersUrl(), { params: toHttpParams(buildPlayersParams(filters)) });
  }

  getCurrentUser(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(footballMeUrl());
  }

  syncSquads(): Observable<SquadSyncResult> {
    return this.http.post<SquadSyncResult>(footballSyncSquadsUrl(), {});
  }
}

function toHttpParams(values: Record<string, string>): HttpParams {
  return Object.entries(values).reduce((params, [key, value]) => params.set(key, value), new HttpParams());
}
