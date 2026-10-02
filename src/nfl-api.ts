import axios from 'axios';
import type { NFLGame, ScoringPlay, GameStats, PlayByPlayEvent } from './types.js';

const ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

interface ESPNStat {
  name?: string;
  value?: string | number;
  displayValue?: string;
}

interface ESPNTeam {
  id?: string;
  displayName?: string;
  shortDisplayName?: string;
}

interface ESPNCompetitor {
  id?: string;
  homeAway?: 'home' | 'away';
  team?: ESPNTeam;
  score?: string | number;
  records?: Array<{ summary?: string }>;
  stats?: ESPNStat[];
}

interface ESPNPlay {
  period?: number | { number?: number };
  clock?: string | { displayValue?: string };
  team?: ESPNTeam;
  text?: string;
}

interface ESPNDrive extends ESPNPlay {
  result?: string;
  homeTeamId?: string;
}

interface ESPNStatus {
  period?: number;
  displayClock?: string;
  type?: { state?: string };
}

interface ESPNCompetition {
  competitors?: ESPNCompetitor[];
  status?: ESPNStatus;
  situation?: {
    yardLine?: string | number;
    possession?: string;
    down?: number;
    distance?: number;
  };
  drives?: ESPNDrive[];
  plays?: ESPNPlay[];
  teams?: ESPNBoxscoreTeam[];
}

interface ESPNBoxscoreTeam {
  homeAway?: 'home' | 'away';
  team?: ESPNTeam;
  statistics?: ESPNStat[];
}

interface ESPNScoringPlay extends ESPNPlay {
  scoringType?: { abbreviation?: string };
  type?: { abbreviation?: string; text?: string };
}

interface ESPNSummaryDrive {
  team?: ESPNTeam;
  plays?: ESPNPlay[];
}

interface ESPNDetails {
  gamepackage?: Array<{ competitions?: ESPNCompetition[] }>;
  boxscore?: { teams?: ESPNBoxscoreTeam[] };
  header?: { competitions?: ESPNCompetition[] };
  scoringPlays?: ESPNScoringPlay[];
  drives?: { previous?: ESPNSummaryDrive[] };
  plays?: ESPNPlay[];
}

interface ESPNEvent {
  id: string;
  competitions: ESPNCompetition[];
  status: ESPNStatus;
}

function toGameStatus(state?: string): NFLGame['status'] {
  if (state === 'in') return 'in_progress';
  if (state === 'post') return 'final';
  return 'scheduled';
}

export async function fetchNFLScores(date?: string): Promise<unknown[]> {
  try {
    const url = date
      ? `${ESPN_API_BASE}/scoreboard?dates=${date}`
      : `${ESPN_API_BASE}/scoreboard`;
    const response = await axios.get(url);
    return response.data.events || [];
  } catch (error) {
    console.error('Error fetching NFL scores:', error);
    return [];
  }
}

export async function fetchGameDetails(gameId: string): Promise<unknown> {
  try {
    const response = await axios.get(`${ESPN_API_BASE}/summary?event=${gameId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching game details:', error);
    return null;
  }
}

function extractScoringPlays(drives: unknown[], homeTeamId?: string): ScoringPlay[] {
  const scoringPlays: ScoringPlay[] = [];

  drives.forEach((drive: unknown) => {
    const d = drive as ESPNDrive;
    if (d.result && ['TD', 'FG', 'Safety'].includes(d.result)) {
      const scoringTeam = d.team?.id === (homeTeamId || d.homeTeamId) ? 'home' : 'away';
      const period = typeof d.period === 'object' ? d.period.number : d.period;
      const clock = typeof d.clock === 'object' ? d.clock.displayValue : d.clock;
      scoringPlays.push({
        quarter: period?.toString() || '0',
        time: clock || '',
        team: d.team?.displayName || '',
        type: d.result as 'TD' | 'FG' | 'Safety',
        description: d.result === 'TD' ? 'Touchdown' : d.result === 'FG' ? 'Field Goal' : 'Safety',
        scoringTeam
      });
    }
  });

  return scoringPlays;
}

function extractGameStats(competition: unknown, homeTeam: unknown, awayTeam: unknown): { homeStats: GameStats, awayStats: GameStats } {
  const extractTeamStats = (team: unknown) => {
    const t = team as ESPNCompetitor;
    const numericStat = (name: string) => {
      const stat = t.stats?.find((s) => s.name === name);
      return Number(stat?.value ?? stat?.displayValue ?? 0) || 0;
    };
    const displayStat = (name: string, fallback: string) =>
      t.stats?.find((s) => s.name === name)?.displayValue || fallback;

    return {
      team: t.team?.shortDisplayName || 'Unknown',
      yards: numericStat('totalYards'),
      passingYards: numericStat('passingYards'),
      rushingYards: numericStat('rushingYards'),
      firstDowns: numericStat('firstDowns'),
      thirdDownEff: displayStat('thirdDownEff', '0/0'),
      fourthDownEff: displayStat('fourthDownEff', '0/0'),
      penalties: displayStat('penalties', '0-0'),
      turnovers: numericStat('turnovers'),
      timeOfPossession: displayStat('possessionTime', '0:00')
    };
  };

  return {
    homeStats: extractTeamStats(homeTeam),
    awayStats: extractTeamStats(awayTeam)
  };
}

function extractPlayByPlay(plays: unknown[], driveTeam?: ESPNTeam): PlayByPlayEvent[] {
  return plays.map((play: unknown) => {
    const p = play as ESPNPlay;
    const period = typeof p.period === 'object' ? p.period.number : p.period;
    const clock = typeof p.clock === 'object' ? p.clock.displayValue : p.clock;
    return {
      quarter: period?.toString() || '0',
      time: clock || '',
      team: (p.team || driveTeam)?.displayName,
      description: p.text || ''
    };
  });
}

// Completed-game summaries nest plays under drives.previous, attributing the team at the drive level.
function extractSummaryPlayByPlay(details: ESPNDetails): PlayByPlayEvent[] {
  const drives = details.drives?.previous || [];
  if (drives.length > 0) {
    return drives.flatMap((drive) => extractPlayByPlay(drive.plays || [], drive.team));
  }
  return extractPlayByPlay(details.plays || []);
}

// Re-read score, clock and status from the summary header so refreshes reflect the live game.
function applySummaryHeader(basicGame: NFLGame, details: ESPNDetails): NFLGame {
  const header = details.header?.competitions?.[0];
  if (!header) return basicGame;

  const homeTeam = header.competitors?.find((c) => c.homeAway === 'home');
  const awayTeam = header.competitors?.find((c) => c.homeAway === 'away');

  return {
    ...basicGame,
    homeScore: homeTeam?.score !== undefined ? Number(homeTeam.score) : basicGame.homeScore,
    awayScore: awayTeam?.score !== undefined ? Number(awayTeam.score) : basicGame.awayScore,
    quarter: header.status?.period ?? basicGame.quarter,
    timeRemaining: header.status?.displayClock ?? basicGame.timeRemaining,
    status: header.status?.type?.state ? toGameStatus(header.status.type.state) : basicGame.status
  };
}

export function transformESPNGame(event: unknown): NFLGame {
  const e = event as ESPNEvent;
  const competition = e.competitions[0];
  const competitors = competition.competitors || [];
  const homeTeam = competitors.find((c) => c.homeAway === 'home');
  const awayTeam = competitors.find((c) => c.homeAway === 'away');

  return {
    id: e.id,
    homeTeam: homeTeam?.team?.shortDisplayName || 'Unknown',
    awayTeam: awayTeam?.team?.shortDisplayName || 'Unknown',
    homeTeamRecord: homeTeam?.records?.[0]?.summary || undefined,
    awayTeamRecord: awayTeam?.records?.[0]?.summary || undefined,
    homeScore: Number(homeTeam?.score || 0),
    awayScore: Number(awayTeam?.score || 0),
    quarter: Number(e.status.period || 0),
    timeRemaining: e.status.displayClock || '',
    status: toGameStatus(e.status.type?.state),
    fieldPosition: competition.situation?.yardLine ? {
      team: competition.situation.possession || '',
      yardLine: parseInt(String(competition.situation.yardLine), 10)
    } : undefined,
    down: competition.situation?.down,
    distance: competition.situation?.distance,
    possession: competition.situation?.possession
  };
}

export async function transformDetailedGame(gameId: string, basicGame: NFLGame): Promise<NFLGame> {
  const details = await fetchGameDetails(gameId);
  if (!details) {
    return basicGame;
  }

  // Handle both current games (gamepackage) and historical games (boxscore)
  const detailsData = details as ESPNDetails;
  const game = applySummaryHeader(basicGame, detailsData);
  let competition = detailsData.gamepackage?.[0]?.competitions?.[0];
  let isHistorical = false;

  if (!competition && detailsData.boxscore) {
    // Historical games use boxscore structure
    competition = detailsData.boxscore;
    isHistorical = true;
  }

  if (!competition) {
    return game;
  }

  let scoringPlays: ScoringPlay[] = [];
  let homeStats: GameStats | undefined;
  let awayStats: GameStats | undefined;
  let playByPlay: PlayByPlayEvent[] = [];

  if (isHistorical) {
    // Extract data from boxscore structure for historical games
    const teams = competition.teams || [];
    if (teams.length >= 2) {
       const homeTeam = teams.find((t) => t.homeAway === 'home') || teams[1];
       const awayTeam = teams.find((t) => t.homeAway === 'away') || teams[0];

      // Extract stats from boxscore
      homeStats = extractBoxscoreStats(homeTeam);
      awayStats = extractBoxscoreStats(awayTeam);

      // Completed-game summaries keep scoring plays at the response root.
       const homeTeamId = detailsData.header?.competitions?.[0]?.competitors
         ?.find((c) => c.homeAway === 'home')?.id;
      scoringPlays = extractESPNScoringPlays(detailsData.scoringPlays || [], homeTeamId);
    }
    playByPlay = extractSummaryPlayByPlay(detailsData);
  } else {
    // Use existing extraction for current games
    const homeTeamId = competition.competitors
      ?.find((c) => c.homeAway === 'home')?.id;
    scoringPlays = extractScoringPlays(competition.drives || [], homeTeamId);
    const competitors = competition.competitors || [];
    const homeTeam = competitors.find((c) => c.homeAway === 'home') || competitors[0];
    const awayTeam = competitors.find((c) => c.homeAway === 'away') || competitors[1];
    const stats = extractGameStats(competition, homeTeam, awayTeam);
    homeStats = stats.homeStats;
    awayStats = stats.awayStats;
    playByPlay = extractPlayByPlay(competition.plays || []);
  }

  return {
    ...game,
    scoringPlays,
    homeStats,
    awayStats,
    playByPlay
  };
}

const SCORING_TYPES: Record<string, ScoringPlay['type']> = {
  TD: 'TD',
  FG: 'FG',
  XP: 'XP',
  PAT: 'XP',
  '2PT': '2PT',
  D2P: '2PT',
  SF: 'Safety',
  SAFETY: 'Safety'
};

function extractESPNScoringPlays(plays: ESPNScoringPlay[], homeTeamId?: string): ScoringPlay[] {
  return plays.map((play) => {
    const type = play.scoringType?.abbreviation || play.type?.abbreviation || '';
    const normalizedType = SCORING_TYPES[type.toUpperCase()] || 'Other';
    const period = typeof play.period === 'object' ? play.period.number : play.period;
    const time = typeof play.clock === 'object' ? play.clock.displayValue : play.clock;

    return {
      quarter: period?.toString() || '0',
      time: time || '',
      team: play.team?.displayName || '',
      type: normalizedType,
      description: play.text || play.type?.text || normalizedType,
      scoringTeam: play.team?.id === homeTeamId ? 'home' : 'away'
    };
  });
}

function extractBoxscoreStats(team: ESPNBoxscoreTeam): GameStats {
  if (!team || !team.statistics) {
    return {
      team: team?.team?.displayName || 'Unknown',
      yards: 0,
      passingYards: 0,
      rushingYards: 0,
      firstDowns: 0,
      thirdDownEff: '0/0',
      fourthDownEff: '0/0',
      penalties: '0-0',
      turnovers: 0,
      timeOfPossession: '0:00'
    };
  }

  const stats = team.statistics;
  // ESPN's boxscore uses '-' as `value` for some stats (e.g. totalYards, turnovers), so fall back to displayValue.
  const findStat = (...names: string[]) =>
    names.map((name) => stats.find((s) => s.name === name)).find(Boolean);
  const numericStat = (...names: string[]): number => {
    const stat = findStat(...names);
    const value = Number(stat?.value);
    return Number.isFinite(value) ? value : Number(stat?.displayValue?.trim()) || 0;
  };
  const textStat = (...names: string[]): string | number => {
    const stat = findStat(...names);
    return stat?.displayValue?.trim() || stat?.value || 0;
  };

  // Format time from seconds to MM:SS
  const formatTime = (seconds: number | string) => {
    if (typeof seconds === 'string' && seconds.includes(':')) return seconds;
    seconds = Number(seconds) || 0;
    if (!seconds || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Convert decimal efficiency to X/Y format if needed
  const formatEfficiency = (value: string | number) => {
    if (typeof value === 'number' && value > 0 && value < 1) {
      // It's a decimal, try to convert to fraction
      const denominator = Math.round(1 / value);
      const numerator = Math.round(value * denominator);
      return `${numerator}/${denominator}`;
    }
    return value ? String(value) : '0/0';
  };

  return {
    team: team.team?.displayName || 'Unknown',
    yards: numericStat('totalYards'),
    passingYards: numericStat('netPassingYards', 'passingYards'),
    rushingYards: numericStat('rushingYards'),
    firstDowns: numericStat('firstDowns'),
    thirdDownEff: formatEfficiency(textStat('thirdDownEff')),
    fourthDownEff: formatEfficiency(textStat('fourthDownEff')),
    penalties: String(textStat('totalPenaltiesYards', 'penalties') || '0-0'),
    turnovers: numericStat('turnovers'),
    timeOfPossession: formatTime(textStat('possessionTime'))
  };
}
