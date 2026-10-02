import { describe, it, expect } from 'vitest';
import type { NFLGame, NFLScoreboard } from './types.js';

describe('Types', () => {
  it('should accept valid NFLGame structure', () => {
    const game: NFLGame = {
      id: '401437105',
      homeTeam: 'Chiefs',
      awayTeam: 'Broncos',
      homeScore: 14,
      awayScore: 7,
      quarter: 2,
      timeRemaining: '12:30',
      status: 'in_progress',
      fieldPosition: {
        team: 'KC',
        yardLine: 25
      },
      down: 1,
      distance: 10,
      possession: 'KC'
    };

    expect(game.id).toBe('401437105');
    expect(game.homeTeam).toBe('Chiefs');
    expect(game.awayTeam).toBe('Broncos');
  });

  it('should accept NFLGame without optional fields', () => {
    const game: NFLGame = {
      id: '401437105',
      homeTeam: 'Chiefs',
      awayTeam: 'Broncos',
      homeScore: 0,
      awayScore: 0,
      quarter: 0,
      timeRemaining: '',
      status: 'scheduled'
    };

    expect(game.status).toBe('scheduled');
    expect(game.fieldPosition).toBeUndefined();
  });

  it('should accept valid NFLScoreboard structure', () => {
    const scoreboard: NFLScoreboard = {
      games: [
        {
          id: '401437105',
          homeTeam: 'Chiefs',
          awayTeam: 'Broncos',
          homeScore: 14,
          awayScore: 7,
          quarter: 2,
          timeRemaining: '12:30',
          status: 'in_progress'
        }
      ]
    };

    expect(scoreboard.games).toHaveLength(1);
  });
});
