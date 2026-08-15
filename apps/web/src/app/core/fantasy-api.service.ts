import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { DashboardDto, FantasyTeamDto, GameweekSummary, LiveEvent, PlayerSummary } from '@ligat-fantasy/contracts';
import { catchError, map, Observable, of } from 'rxjs';
import { DEMO_PLAYERS } from './demo-players';

export interface PlayerFilters {
  search?: string;
  position?: PlayerSummary['position'] | 'ALL';
  sort?: 'totalPoints' | 'price' | 'selectedByPercent' | 'form';
}

@Injectable({ providedIn: 'root' })
export class FantasyApiService {
  private readonly baseUrl = 'http://localhost:3000';
  private readonly http = inject(HttpClient);

  players(filters: PlayerFilters = {}): Observable<PlayerSummary[]> {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.position && filters.position !== 'ALL') params = params.set('position', filters.position);
    if (filters.sort) params = params.set('sort', filters.sort);
    return this.http.get<PlayerSummary[]>(`${this.baseUrl}/players`, { params }).pipe(
      map((players) => players.length ? players : filterDemoPlayers(filters)),
      catchError(() => of(filterDemoPlayers(filters))),
    );
  }

  team(): Observable<FantasyTeamDto | null> {
    return this.http.get<FantasyTeamDto>(`${this.baseUrl}/fantasy-team`).pipe(catchError(() => of(null)));
  }

  saveSquad(name: string, playerIds: string[]): Observable<FantasyTeamDto> {
    return this.http.put<FantasyTeamDto>(`${this.baseUrl}/fantasy-team/squad`, { name, playerIds });
  }

  saveLineup(starters: string[], bench: string[]): Observable<FantasyTeamDto> {
    return this.http.put<FantasyTeamDto>(`${this.baseUrl}/fantasy-team/lineup`, { starters, bench });
  }

  saveCaptains(captainPlayerId: string, viceCaptainPlayerId: string): Observable<FantasyTeamDto> {
    return this.http.put<FantasyTeamDto>(`${this.baseUrl}/fantasy-team/captain`,
      { captainPlayerId, viceCaptainPlayerId });
  }

  currentGameweek(): Observable<GameweekSummary | null> {
    return this.http.get<GameweekSummary>(`${this.baseUrl}/gameweeks/current`).pipe(catchError(() => of(null)));
  }

  submitGameweek(gameweekId: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/fantasy-team/gameweeks/${gameweekId}/submit`, {});
  }

  dashboard(): Observable<DashboardDto | null> {
    return this.http.get<DashboardDto>(`${this.baseUrl}/dashboard`).pipe(catchError(() => of(null)));
  }

  liveEvents(): Observable<LiveEvent> {
    return new Observable((subscriber) => {
      const source = new EventSource(`${this.baseUrl}/live/events`);
      const receive = (event: MessageEvent<string>) => subscriber.next(JSON.parse(event.data) as LiveEvent);
      ['PLAYER_POINTS_UPDATED', 'GAMEWEEK_POINTS_UPDATED', 'RANK_UPDATED']
        .forEach((type) => source.addEventListener(type, receive as EventListener));
      source.onerror = () => subscriber.error(new Error('LIVE_STREAM_DISCONNECTED'));
      return () => source.close();
    });
  }
}

function filterDemoPlayers(filters: PlayerFilters): PlayerSummary[] {
  const term = filters.search?.toLowerCase();
  const result = DEMO_PLAYERS.filter((player) =>
    (!term || player.name.toLowerCase().includes(term)) &&
    (!filters.position || filters.position === 'ALL' || player.position === filters.position));
  return result.sort((a, b) => b[filters.sort ?? 'totalPoints'] - a[filters.sort ?? 'totalPoints']);
}
