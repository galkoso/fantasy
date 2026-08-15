export interface ApiResponse<T> { response: T[]; paging?: { current: number; total: number } }
export interface ApiFixture {
  fixture: { id: number; date: string; status: { short: string } };
  teams: { home: { id: number }; away: { id: number } };
  goals: { home: number | null; away: number | null };
  league: { round: string };
}
export interface ApiClub { team: { id: number; name: string; code: string | null; logo: string } }
export interface ApiPlayer { player: { id: number; name: string }; statistics: Array<{
  team: { id: number }; games: { position: string };
}> }
export interface ApiTeamStats {
  team: { id: number };
  players: Array<{
    player: { id: number };
    statistics: Array<{
      games: { minutes: number | null; position: string };
      goals: { total: number | null; assists: number | null; conceded: number | null; saves: number | null };
      penalty: { saved: number | null; missed: number | null };
      cards: { yellow: number; red: number };
      rating?: string | null;
    }>;
  }>;
}
