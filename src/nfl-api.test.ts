import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchNFLScores, transformESPNGame, fetchGameDetails, transformDetailedGame } from './nfl-api.js';
import axios from 'axios';
import type { NFLGame } from './types.js';

vi.mock('axios');

describe('NFL API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchNFLScores', () => {
    it('should fetch NFL scores from ESPN API', async () => {
      const mockEvents = [
        {
          id: '401437105',
          status: {
            type: { state: 'in' },
            period: 2,
            displayClock: '12:30'
          },
          competitions: [
            {
              competitors: [
                {
                  homeAway: 'home',
                  team: { shortDisplayName: 'Chiefs' },
                  score: '14'
                },
                {
                  homeAway: 'away',
                  team: { shortDisplayName: 'Broncos' },
                  score: '7'
                }
              ],
              situation: {
                yardLine: '25',
                possession: 'KC',
                down: 1,
                distance: 10
              }
            }
          ]
        }
      ];

      vi.mocked(axios.get).mockResolvedValue({ data: { events: mockEvents } });

      const result = await fetchNFLScores();

      expect(axios.get).toHaveBeenCalledWith(
        'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'
      );
      expect(result).toEqual(mockEvents);
    });

    it('should return empty array on error', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));

      const result = await fetchNFLScores();

      expect(result).toEqual([]);
    });
  });

  describe('transformESPNGame', () => {
    it('should transform ESPN game data to internal format', () => {
      const espnGame = {
        id: '401437105',
        status: {
          type: { state: 'in' },
          period: 2,
          displayClock: '12:30'
        },
        competitions: [
          {
            competitors: [
              {
                homeAway: 'home',
                team: { shortDisplayName: 'Chiefs' },
                score: '14'
              },
              {
                homeAway: 'away',
                team: { shortDisplayName: 'Broncos' },
                score: '7'
              }
            ],
            situation: {
              yardLine: '25',
              possession: 'KC',
              down: 1,
              distance: 10
            }
          }
        ]
      };

      const result = transformESPNGame(espnGame) as NFLGame;

      expect(result).toEqual({
        id: '401437105',
        homeTeam: 'Chiefs',
        awayTeam: 'Broncos',
        homeTeamRecord: undefined,
        awayTeamRecord: undefined,
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
      });
    });

    it('should handle scheduled games', () => {
      const espnGame = {
        id: '401437105',
        status: {
          type: { state: 'pre' },
          period: 0,
          displayClock: ''
        },
        competitions: [
          {
            competitors: [
              {
                homeAway: 'home',
                team: { shortDisplayName: 'Chiefs' },
                score: '0'
              },
              {
                homeAway: 'away',
                team: { shortDisplayName: 'Broncos' },
                score: '0'
              }
            ]
          }
        ]
      };

      const result = transformESPNGame(espnGame) as NFLGame;

      expect(result.status).toBe('scheduled');
      expect(result.quarter).toBe(0);
    });

    it('should handle final games', () => {
      const espnGame = {
        id: '401437105',
        status: {
          type: { state: 'post' },
          period: 4,
          displayClock: '0:00'
        },
        competitions: [
          {
            competitors: [
              {
                homeAway: 'home',
                team: { shortDisplayName: 'Chiefs' },
                score: '28'
              },
              {
                homeAway: 'away',
                team: { shortDisplayName: 'Broncos' },
                score: '14'
              }
            ]
          }
        ]
      };

      const result = transformESPNGame(espnGame) as NFLGame;

      expect(result.status).toBe('final');
    });

    it('should handle missing situation data', () => {
      const espnGame = {
        id: '401437105',
        status: {
          type: { state: 'in' },
          period: 2,
          displayClock: '12:30'
        },
        competitions: [
          {
            competitors: [
              {
                homeAway: 'home',
                team: { shortDisplayName: 'Chiefs' },
                score: '14'
              },
              {
                homeAway: 'away',
                team: { shortDisplayName: 'Broncos' },
                score: '7'
              }
            ]
          }
        ]
      };

      const result = transformESPNGame(espnGame) as NFLGame;

      expect(result.fieldPosition).toBeUndefined();
      expect(result.down).toBeUndefined();
      expect(result.distance).toBeUndefined();
    });

    it('should include team records when available', () => {
      const espnGame = {
        id: '401437105',
        status: {
          type: { state: 'in' },
          period: 2,
          displayClock: '12:30'
        },
        competitions: [
          {
            competitors: [
              {
                homeAway: 'home',
                team: { shortDisplayName: 'Chiefs' },
                score: '14',
                records: [{ summary: '9-4' }]
              },
              {
                homeAway: 'away',
                team: { shortDisplayName: 'Broncos' },
                score: '7',
                records: [{ summary: '5-8' }]
              }
            ]
          }
        ]
      };

      const result = transformESPNGame(espnGame) as NFLGame;

      expect(result.homeTeamRecord).toBe('9-4');
      expect(result.awayTeamRecord).toBe('5-8');
    });
  });

  describe('fetchGameDetails', () => {
    it('should fetch game details from ESPN API', async () => {
      const mockDetails = {
        gamepackage: [
          {
            competitions: [
              {
                drives: [],
                competitors: [],
                plays: []
              }
            ]
          }
        ]
      };

      vi.mocked(axios.get).mockResolvedValue({ data: mockDetails });

      const result = await fetchGameDetails('401437105');

      expect(axios.get).toHaveBeenCalledWith(
        'https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=401437105'
      );
      expect(result).toEqual(mockDetails);
    });

    it('should return null on error', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));

      const result = await fetchGameDetails('401437105');

      expect(result).toBeNull();
    });
  });

  describe('transformDetailedGame', () => {
    const baseGame: NFLGame = {
      id: '401437105',
      homeTeam: 'Chiefs',
      awayTeam: 'Broncos',
      homeScore: 14,
      awayScore: 7,
      quarter: 2,
      timeRemaining: '12:30',
      status: 'in_progress'
    };

    it('should transform detailed game data', async () => {
      const mockDetails = {
        gamepackage: [
          {
            competitions: [
              {
                drives: [
                  {
                    result: 'TD',
                    period: 2,
                    clock: '12:30',
                    team: { displayName: 'Chiefs', id: '1' },
                    homeTeamId: '1'
                  }
                ],
                competitors: [
                  {
                    team: { shortDisplayName: 'Chiefs' },
                    stats: [
                      { name: 'totalYards', value: 350 },
                      { name: 'passingYards', value: 250 },
                      { name: 'rushingYards', value: 100 },
                      { name: 'firstDowns', value: 20 },
                      { name: 'thirdDownEff', displayValue: '5/12' },
                      { name: 'fourthDownEff', displayValue: '1/2' },
                      { name: 'penalties', displayValue: '5-40' },
                      { name: 'turnovers', value: 1 },
                      { name: 'possessionTime', displayValue: '25:30' }
                    ]
                  },
                  {
                    team: { shortDisplayName: 'Broncos' },
                    stats: [
                      { name: 'totalYards', value: 280 },
                      { name: 'passingYards', value: 200 },
                      { name: 'rushingYards', value: 80 },
                      { name: 'firstDowns', value: 15 },
                      { name: 'thirdDownEff', displayValue: '4/10' },
                      { name: 'fourthDownEff', displayValue: '0/1' },
                      { name: 'penalties', displayValue: '3-25' },
                      { name: 'turnovers', value: 2 },
                      { name: 'possessionTime', displayValue: '24:30' }
                    ]
                  }
                ],
                plays: [
                  {
                    period: 1,
                    clock: '15:00',
                    team: { displayName: 'Chiefs' },
                    text: 'Touchdown'
                  }
                ]
              }
            ]
          }
        ]
      };

      const basicGame: NFLGame = {
        id: '401437105',
        homeTeam: 'Chiefs',
        awayTeam: 'Broncos',
        homeScore: 14,
        awayScore: 7,
        quarter: 2,
        timeRemaining: '12:30',
        status: 'in_progress'
      };

      vi.mocked(axios.get).mockResolvedValue({ data: mockDetails });

      const result = await transformDetailedGame('401437105', basicGame);

      expect(result.scoringPlays).toHaveLength(1);
      expect(result.scoringPlays?.[0].type).toBe('TD');
      expect(result.homeStats).toBeDefined();
      expect(result.awayStats).toBeDefined();
      expect(result.playByPlay).toHaveLength(1);
    });

    it('should transform scoring plays from a historical ESPN summary', async () => {
      const mockDetails = {
        header: {
          competitions: [{
            competitors: [
              { id: '1', homeAway: 'home' },
              { id: '2', homeAway: 'away' }
            ]
          }]
        },
        boxscore: {
          teams: [
            { homeAway: 'home', team: { displayName: 'Chiefs' } },
            { homeAway: 'away', team: { displayName: 'Broncos' } }
          ]
        },
        scoringPlays: [{
          period: { number: 2 },
          clock: { displayValue: '12:30' },
          team: { id: '1', displayName: 'Chiefs' },
          scoringType: { abbreviation: 'TD' },
          text: 'Touchdown'
        }]
      };
      const basicGame: NFLGame = {
        id: '401437105',
        homeTeam: 'Chiefs',
        awayTeam: 'Broncos',
        homeScore: 14,
        awayScore: 7,
        quarter: 2,
        timeRemaining: '12:30',
        status: 'final'
      };

      vi.mocked(axios.get).mockResolvedValue({ data: mockDetails });

      const result = await transformDetailedGame('401437105', basicGame);

      expect(result.scoringPlays).toEqual([{
        quarter: '2',
        time: '12:30',
        team: 'Chiefs',
        type: 'TD',
        description: 'Touchdown',
        scoringTeam: 'home'
      }]);
    });

    it('should read stats by homeAway and displayValue regardless of competitor order', async () => {
      const mockDetails = {
        gamepackage: [{
          competitions: [{
            competitors: [
              {
                homeAway: 'away',
                team: { shortDisplayName: 'Broncos' },
                stats: [
                  { name: 'totalYards', value: 280 },
                  { name: 'thirdDownEff', displayValue: '4/10' },
                  { name: 'possessionTime', displayValue: '24:30' }
                ]
              },
              {
                homeAway: 'home',
                team: { shortDisplayName: 'Chiefs' },
                stats: [
                  { name: 'totalYards', value: 350 },
                  { name: 'thirdDownEff', displayValue: '5/12' },
                  { name: 'possessionTime', displayValue: '35:30' }
                ]
              }
            ]
          }]
        }]
      };
      vi.mocked(axios.get).mockResolvedValue({ data: mockDetails });

      const result = await transformDetailedGame('401437105', baseGame);

      expect(result.homeStats).toMatchObject({ team: 'Chiefs', yards: 350, thirdDownEff: '5/12', timeOfPossession: '35:30' });
      expect(result.awayStats).toMatchObject({ team: 'Broncos', yards: 280, thirdDownEff: '4/10', timeOfPossession: '24:30' });
    });

    it('should refresh score, clock and status from the summary header', async () => {
      const mockDetails = {
        header: {
          competitions: [{
            competitors: [
              { id: '1', homeAway: 'home', score: '21' },
              { id: '2', homeAway: 'away', score: '10' }
            ],
            status: { period: 3, displayClock: '4:12', type: { state: 'in' } }
          }]
        },
        boxscore: { teams: [] }
      };
      vi.mocked(axios.get).mockResolvedValue({ data: mockDetails });

      const result = await transformDetailedGame('401437105', baseGame);

      expect(result).toMatchObject({ homeScore: 21, awayScore: 10, quarter: 3, timeRemaining: '4:12', status: 'in_progress' });
    });

    it('should extract historical play-by-play, boxscore displayValues and scoring types', async () => {
      const mockDetails = {
        header: { competitions: [{ competitors: [{ id: '1', homeAway: 'home' }, { id: '2', homeAway: 'away' }] }] },
        boxscore: {
          teams: [
            {
              homeAway: 'home',
              team: { displayName: 'Chiefs' },
              statistics: [
                { name: 'totalYards', value: '-', displayValue: '96' },
                { name: 'netPassingYards', value: 62, displayValue: '62' },
                { name: 'totalPenaltiesYards', value: '-', displayValue: '2-20' },
                { name: 'turnovers', value: '-', displayValue: '1' },
                { name: 'thirdDownEff', value: 0.4167, displayValue: '5-12' },
                { name: 'possessionTime', value: 348, displayValue: ' 5:48' }
              ]
            },
            { homeAway: 'away', team: { displayName: 'Broncos' } }
          ]
        },
        scoringPlays: [
          { period: { number: 4 }, team: { id: '2' }, scoringType: { abbreviation: 'SF' }, text: 'Safety' },
          { period: { number: 4 }, team: { id: '1' }, scoringType: { abbreviation: '' }, text: 'Mystery' }
        ],
        drives: {
          previous: [{
            team: { displayName: 'Chiefs' },
            plays: [
              { period: { number: 1 }, clock: { displayValue: '15:00' }, text: 'Kickoff' },
              { period: { number: 5 }, clock: { displayValue: '9:58' }, text: 'Walk-off TD' }
            ]
          }]
        }
      };
      vi.mocked(axios.get).mockResolvedValue({ data: mockDetails });

      const result = await transformDetailedGame('401437105', { ...baseGame, status: 'final' });

      expect(result.homeStats).toMatchObject({
        yards: 96,
        passingYards: 62,
        penalties: '2-20',
        turnovers: 1,
        thirdDownEff: '5-12',
        timeOfPossession: '5:48'
      });
      expect(result.scoringPlays?.map((p) => p.type)).toEqual(['Safety', 'Other']);
      expect(result.playByPlay).toEqual([
        { quarter: '1', time: '15:00', team: 'Chiefs', description: 'Kickoff' },
        { quarter: '5', time: '9:58', team: 'Chiefs', description: 'Walk-off TD' }
      ]);
    });

    it('should return basic game if details fetch fails', async () => {
      const basicGame: NFLGame = {
        id: '401437105',
        homeTeam: 'Chiefs',
        awayTeam: 'Broncos',
        homeScore: 14,
        awayScore: 7,
        quarter: 2,
        timeRemaining: '12:30',
        status: 'in_progress'
      };

      vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));

      const result = await transformDetailedGame('401437105', basicGame);

      expect(result).toEqual(basicGame);
    });
  });
});
