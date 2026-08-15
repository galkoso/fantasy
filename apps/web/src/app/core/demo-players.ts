import type { PlayerSummary } from '@ligat-fantasy/contracts';

const names = [
  'Roi Mishpati', 'Miguel Silva', 'Raz Shlomo', 'Stav Lemkin', 'Sean Goldberg',
  'Or Blorian', 'Roy Revivo', 'Dor Peretz', 'Gabi Kanichowsky', 'Mahmoud Jaber',
  'Dan Biton', 'Eliel Peretz', 'Guy Melamed', 'Yarden Shua', 'Dean David',
  'Dia Saba', 'Osher Davida', 'Eran Zahavi', 'Dolev Haziza', 'Itamar Nitzan',
];
const positions: PlayerSummary['position'][] = [
  'GOALKEEPER', 'GOALKEEPER', 'DEFENDER', 'DEFENDER', 'DEFENDER', 'DEFENDER', 'DEFENDER',
  'MIDFIELDER', 'MIDFIELDER', 'MIDFIELDER', 'MIDFIELDER', 'MIDFIELDER',
  'FORWARD', 'FORWARD', 'FORWARD', 'MIDFIELDER', 'MIDFIELDER', 'FORWARD', 'MIDFIELDER', 'GOALKEEPER',
];

export const DEMO_PLAYERS: PlayerSummary[] = names.map((name, index) => ({
  id: `demo-${index + 1}`, clubId: `club-${(index % 7) + 1}`, name,
  position: positions[index]!, price: 45 + ((index * 7) % 35), totalPoints: 18 + ((index * 11) % 71),
  selectedByPercent: 3 + ((index * 13) % 42), form: 2 + ((index * 7) % 45) / 10, status: 'AVAILABLE',
}));
