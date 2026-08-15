export interface ApiResponse<T> { response: T[] }
export interface ApiFixture {
  fixture: { id: number; date: string; status: { short: string } };
  teams: { home: { id: number }; away: { id: number } };
  goals: { home: number | null; away: number | null };
}
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
