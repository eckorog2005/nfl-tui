import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { transformDetailedGame } from '../nfl-api.js';
import { buildPlayLines, playQuarters, quarterLabel, teamNickname } from '../play-lines.js';
import type { NFLGame } from '../types.js';

const SIDE_PANEL_WIDTH = 52;
const MIN_PLAY_WIDTH = 50;
const STATS_PANEL_HEIGHT = 13;
const TIME_WIDTH = 7;
const TEAM_WIDTH = 12;
// App padding (2) + header (5) + footer (4), plus one spare row: Ink clears the whole screen when output reaches the terminal height.
const RESERVED_ROWS = 12;

type Panel = 'plays' | 'summary';

const useTerminalSize = () => {
  const { stdout } = useStdout();
  const [size, setSize] = useState({ columns: stdout.columns || 80, rows: stdout.rows || 24 });

  useEffect(() => {
    const onResize = () => setSize({ columns: stdout.columns, rows: stdout.rows });
    stdout.on('resize', onResize);
    return () => {
      stdout.off('resize', onResize);
    };
  }, [stdout]);

  return size;
};

interface GameDetailProps {
  game: NFLGame;
  onBack: () => void;
}

export const GameDetail: React.FC<GameDetailProps> = ({ game: initialGame, onBack }) => {
  const { exit } = useApp();
  const [game, setGame] = useState<NFLGame>(initialGame);
  const [loading, setLoading] = useState(true);
  // null keeps the view pinned to the latest play so refreshes of a live game stay at the bottom.
  const [scrollTop, setScrollTop] = useState<number | null>(null);
  const [panel, setPanel] = useState<Panel>('plays');
  // null tracks the latest quarter so a live game advances on its own.
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);

  const { columns, rows } = useTerminalSize();
  const width = Math.max(40, columns - 2);
  const bodyHeight = Math.max(6, rows - RESERVED_ROWS);
  const sideBySide = width >= SIDE_PANEL_WIDTH + 1 + MIN_PLAY_WIDTH;
  const playWidth = sideBySide ? width - SIDE_PANEL_WIDTH - 1 : width;
  const playRows = bodyHeight - 3;
  const descriptionWidth = Math.max(10, playWidth - 4 - TIME_WIDTH - TEAM_WIDTH);
  const quarters = playQuarters(game.playByPlay || []);
  const quarter = selectedQuarter !== null && quarters.includes(selectedQuarter)
    ? selectedQuarter
    : quarters[quarters.length - 1];
  const quarterIndex = quarter === undefined ? -1 : quarters.indexOf(quarter);
  const quarterPlays = (game.playByPlay || []).filter((play) => play.quarter === quarter);
  const playLines = buildPlayLines(quarterPlays, descriptionWidth);

  const maxScrollTop = Math.max(0, playLines.length - playRows);
  const top = scrollTop === null ? maxScrollTop : Math.min(scrollTop, maxScrollTop);

  const scrollBy = (delta: number) => {
    const next = Math.max(0, top + delta);
    setScrollTop(next >= maxScrollTop ? null : next);
  };

  const changeQuarter = (delta: number) => {
    const nextIndex = quarterIndex + delta;
    if (nextIndex < 0 || nextIndex >= quarters.length) return;
    const isLatest = nextIndex === quarters.length - 1;
    setSelectedQuarter(isLatest ? null : quarters[nextIndex]);
    setScrollTop(isLatest ? null : 0);
  };

  useInput((input, key) => {
    if (key.ctrl && input === 'c' || input === 'q') {
      exit();
    } else if (key.escape) {
      onBack();
    }
    if (input === 'r') {
      loadGameDetails();
    }
    if (key.upArrow) scrollBy(-1);
    if (key.downArrow) scrollBy(1);
    if (key.pageUp) scrollBy(-(playRows - 1));
    if (key.pageDown) scrollBy(playRows - 1);
    if (key.leftArrow) changeQuarter(-1);
    if (key.rightArrow) changeQuarter(1);
    if (key.tab && !sideBySide) {
      setPanel((current) => (current === 'plays' ? 'summary' : 'plays'));
    }
  });

  const loadGameDetails = async () => {
    setLoading(true);
    const detailedGame = await transformDetailedGame(game.id, game);
    setGame(detailedGame);
    setLoading(false);
  };

  useEffect(() => {
    loadGameDetails();
  }, []);

  const renderHeader = () => {
    const statusText = game.status === 'in_progress' 
      ? `${game.quarter}Q ${game.timeRemaining}` 
      : game.status === 'final' 
      ? 'Final' 
      : 'Scheduled';

    return (
      <Box flexDirection="column" marginBottom={1} borderStyle="single" paddingX={1} width={width}>
        <Box justifyContent="space-between">
          <Text bold color="green">NFL Game Tracker</Text>
          <Text bold>{statusText}</Text>
        </Box>
        <Box justifyContent="space-between">
          <Text bold>{game.awayTeam} @ {game.homeTeam}</Text>
          <Text bold color="yellow">{game.awayScore} - {game.homeScore}</Text>
        </Box>
      </Box>
    );
  };

  const renderScoringSummary = (height: number) => {
    const scoringPlays = game.scoringPlays || [];
    const visibleCount = Math.max(1, height - 3);
    const hidden = Math.max(0, scoringPlays.length - visibleCount);

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} width={SIDE_PANEL_WIDTH} height={height} overflow="hidden">
        <Box justifyContent="space-between">
          <Text bold color="cyan">SCORING SUMMARY</Text>
          {hidden > 0 && <Text dimColor>{hidden} earlier</Text>}
        </Box>
        {scoringPlays.length === 0 ? (
          <Text dimColor>No scoring plays yet.</Text>
        ) : (
          scoringPlays.slice(hidden).map((play, index) => (
            <Box key={index}>
              <Box width={10} flexShrink={0}><Text color="yellow">Q{play.quarter} {play.time}</Text></Box>
              <Box width={TEAM_WIDTH} flexShrink={0}><Text wrap="truncate">{teamNickname(play.team)}</Text></Box>
              <Text wrap="truncate">{play.type}  {play.description}</Text>
            </Box>
          ))
        )}
      </Box>
    );
  };

  const renderGameStats = () => {
    const stats = [
      { label: 'Yards', home: game.homeStats?.yards, away: game.awayStats?.yards },
      { label: 'Pass Yds', home: game.homeStats?.passingYards, away: game.awayStats?.passingYards },
      { label: 'Rush Yds', home: game.homeStats?.rushingYards, away: game.awayStats?.rushingYards },
      { label: '1st Downs', home: game.homeStats?.firstDowns, away: game.awayStats?.firstDowns },
      { label: '3rd Down', home: game.homeStats?.thirdDownEff, away: game.awayStats?.thirdDownEff },
      { label: '4th Down', home: game.homeStats?.fourthDownEff, away: game.awayStats?.fourthDownEff },
      { label: 'Penalties', home: game.homeStats?.penalties, away: game.awayStats?.penalties },
      { label: 'Turnovers', home: game.homeStats?.turnovers, away: game.awayStats?.turnovers },
      { label: 'TOP', home: game.homeStats?.timeOfPossession, away: game.awayStats?.timeOfPossession },
    ];

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="green" paddingX={1} width={SIDE_PANEL_WIDTH} flexShrink={0}>
        <Text bold color="green">GAME STATS</Text>
        <Box>
          <Box width={18}><Text dimColor>STAT</Text></Box>
          <Box width={18}><Text bold>{game.awayTeam}</Text></Box>
          <Text bold>{game.homeTeam}</Text>
        </Box>
        {game.homeStats && game.awayStats ? stats.map((stat) => (
          <Box key={stat.label}>
            <Box width={18}><Text color="yellow">{stat.label}</Text></Box>
            <Box width={18}><Text>{String(stat.away)}</Text></Box>
            <Text>{String(stat.home)}</Text>
          </Box>
        )) : <Text dimColor>No stats available.</Text>}
      </Box>
    );
  };

  const renderPlayByPlay = () => {
    const visible = playLines.slice(top, top + playRows);
    const position = playLines.length > playRows
      ? `${top + 1}-${top + visible.length} of ${playLines.length}`
      : '';

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1} width={playWidth} height={bodyHeight} overflow="hidden">
        <Box justifyContent="space-between">
          <Text>
            <Text bold color="yellow">PLAY-BY-PLAY</Text>
            {quarter !== undefined && (
              <Text>
                {'  '}
                <Text dimColor={quarterIndex <= 0}>◀ </Text>
                <Text bold>{quarterLabel(quarter)}</Text>
                <Text dimColor={quarterIndex >= quarters.length - 1}> ▶</Text>
              </Text>
            )}
          </Text>
          <Text dimColor>{position}</Text>
        </Box>
        {playLines.length === 0 ? (
          <Text dimColor>No play-by-play data.</Text>
        ) : visible.map((line, index) => (
          <Box key={index}>
            <Box width={TIME_WIDTH} flexShrink={0}><Text dimColor>{line.time}</Text></Box>
            <Box width={TEAM_WIDTH} flexShrink={0}><Text wrap="truncate">{line.team}</Text></Box>
            <Text wrap="truncate">{line.text}</Text>
          </Box>
        ))}
      </Box>
    );
  };

  const renderFooter = () => {
    return (
      <Box flexDirection="row" justifyContent="space-between" marginTop={1} borderStyle="single" paddingX={1} width={width}>
        <Text>esc Back</Text>
        <Text>←→ Quarter</Text>
        <Text>↑↓ PgUp PgDn Scroll</Text>
        {!sideBySide && <Text>tab {panel === 'plays' ? 'Stats' : 'Plays'}</Text>}
        <Text>r Refresh</Text>
        <Text>q Quit</Text>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box flexDirection="column">
        {renderHeader()}
        <Text>Loading game details...</Text>
      </Box>
    );
  }

  const renderSummary = () => (
    <Box flexDirection="column" gap={1} height={bodyHeight} overflow="hidden" flexShrink={0}>
      {renderScoringSummary(Math.max(4, bodyHeight - STATS_PANEL_HEIGHT - 1))}
      {renderGameStats()}
    </Box>
  );

  return (
    <Box flexDirection="column">
      {renderHeader()}
      <Box flexDirection="row" gap={1} height={bodyHeight}>
        {(sideBySide || panel === 'summary') && renderSummary()}
        {(sideBySide || panel === 'plays') && renderPlayByPlay()}
      </Box>
      {renderFooter()}
    </Box>
  );
};
