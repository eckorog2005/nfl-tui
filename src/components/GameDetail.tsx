import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { transformDetailedGame } from '../nfl-api.js';
import type { NFLGame } from '../types.js';

interface GameDetailProps {
  game: NFLGame;
  onBack: () => void;
}

export const GameDetail: React.FC<GameDetailProps> = ({ game: initialGame, onBack }) => {
  const { exit } = useApp();
  const [game, setGame] = useState<NFLGame>(initialGame);
  const [loading, setLoading] = useState(true);

  useInput((input: string, key: { escape?: boolean; ctrl?: boolean; return?: boolean }) => {
    if (key.ctrl && input === 'c' || input === 'q') {
      exit();
    } else if (key.escape) {
      onBack();
    }
    if (input === 'r') {
      loadGameDetails();
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
      <Box flexDirection="column" marginBottom={1} borderStyle="single" paddingX={1}>
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

  const renderScoringSummary = () => {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} width={52}>
        <Text bold color="cyan">SCORING SUMMARY</Text>
        {!game.scoringPlays || game.scoringPlays.length === 0 ? (
          <Text dimColor>No scoring plays yet.</Text>
        ) : (
          game.scoringPlays.map((play, index) => (
            <Box key={index}>
              <Box width={8}><Text color="yellow">Q{play.quarter} {play.time}</Text></Box>
              <Box width={18}><Text>{play.team}</Text></Box>
              <Text>{play.type}  {play.description}</Text>
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
      <Box flexDirection="column" borderStyle="round" borderColor="green" paddingX={1} width={52}>
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

  const quarterLabel = (quarter: string) => {
    const period = Number(quarter);
    if (!period) return 'OTHER';
    if (period === 5) return 'OVERTIME';
    if (period > 5) return `OVERTIME ${period - 4}`;
    return `QUARTER ${period}`;
  };

  const renderPlayByPlay = () => {
    const groupedByQuarter = (game.playByPlay || []).reduce((acc: Record<string, typeof game.playByPlay>, play) => {
      const quarter = play.quarter;
      if (!acc[quarter]) acc[quarter] = [];
      acc[quarter].push(play);
      return acc;
    }, {});

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1} width={62}>
        <Text bold color="yellow">PLAY-BY-PLAY</Text>
        {Object.keys(groupedByQuarter).length === 0 ? (
          <Text dimColor>No play-by-play data.</Text>
        ) : Object.entries(groupedByQuarter).map(([quarter, plays]) => (
          <Box key={quarter} flexDirection="column" marginTop={1}>
            <Text bold color="yellow">{quarterLabel(quarter)}</Text>
            {(plays || []).slice(-10).map((play, index) => (
              <Box key={index}>
                <Box width={8}><Text color="dimColor">{play.time}</Text></Box>
                <Box width={18}><Text>{play.team || '-'}</Text></Box>
                <Text>{play.description}</Text>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    );
  };

  const renderFooter = () => {
    return (
      <Box flexDirection="row" justifyContent="space-between" marginTop={1} borderStyle="single" paddingX={1}>
        <Text>esc Back</Text>
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

  return (
    <Box flexDirection="column">
      {renderHeader()}
      <Box flexDirection="row" flexWrap="wrap" gap={1}>
        <Box flexDirection="column" gap={1}>
          {renderScoringSummary()}
          {renderGameStats()}
        </Box>
        {renderPlayByPlay()}
      </Box>
      {renderFooter()}
    </Box>
  );
};
