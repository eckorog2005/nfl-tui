export interface ScoringPlay {
  quarter: string;
  time: string;
  team: string;
  type: 'TD' | 'FG' | 'XP' | '2PT' | 'Safety' | 'Other';
  description: string;
  scoringTeam: 'home' | 'away';
}

export interface GameStats {
  team: string;
  yards: number;
  passingYards: number;
  rushingYards: number;
  firstDowns: number;
  thirdDownEff: string;
  fourthDownEff: string;
  penalties: string;
  turnovers: number;
  timeOfPossession: string;
}

export interface PlayByPlayEvent {
  quarter: string;
  time: string;
  team?: string;
  description: string;
}

export interface NFLGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamRecord?: string;
  awayTeamRecord?: string;
  homeScore: number;
  awayScore: number;
  quarter: number;
  timeRemaining: string;
  status: 'scheduled' | 'in_progress' | 'final';
  fieldPosition?: {
    team: string;
    yardLine: number;
  };
  down?: number;
  distance?: number;
  possession?: string;
  scoringPlays?: ScoringPlay[];
  homeStats?: GameStats;
  awayStats?: GameStats;
  playByPlay?: PlayByPlayEvent[];
}

export interface NFLScoreboard {
  games: NFLGame[];
}
