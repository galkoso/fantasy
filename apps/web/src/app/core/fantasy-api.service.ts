import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { PlayerSummary } from '@ligat-fantasy/contracts';
import { catchError, type Observable, of } from 'rxjs';
import { DEMO_PLAYERS } from './demo-players';

export interface PlayerFilters {
  search?: string;
  position?: PlayerSummary['position'] | 'ALL';
  sort?: 'totalPoints' | 'price' | 'selectedByPercent' | 'form';
}

@Injectable({ providedIn: 'root' })
export class FantasyApiService {
  private readonly baseUrl = 'http://localhost:3000';
  constructor(private readonly http: HttpClient) {}

  players(filters: PlayerFilters = {}): Observable<PlayerSummary[]> {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.position && filters.position !== 'ALL') params = params.set('position', filters.position);
    if (filters.sort) params = params.set('sort', filters.sort);
    return this.http.get<PlayerSummary[]>(`${this.baseUrl}/players`, { params }).pipe(
      catchError(() => of(filterDemoPlayers(filters))),
    );
  }
}

function filterDemoPlayers(filters: PlayerFilters): PlayerSummary[] {
  const term = filters.search?.toLowerCase();
  const result = DEMO_PLAYERS.filter((player) =>
    (!term || player.name.toLowerCase().includes(term)) &&
    (!filters.position || filters.position === 'ALL' || player.position === filters.position));
  return result.sort((a, b) => b[filters.sort ?? 'totalPoints'] - a[filters.sort ?? 'totalPoints']);
}
