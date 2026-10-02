import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { fetchNFLScores, transformESPNGame } from '../nfl-api.js';
import type { NFLGame } from '../types.js';

interface GameListProps {
  onSelectGame: (game: NFLGame) => void;
}

const COLUMNS = 3;

export const GameList: React.FC<GameListProps> = ({ onSelectGame }) => {
  const [games, setGames] = useState<NFLGame[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Games fill each column top to bottom, so vertical moves step by 1 and horizontal moves by a column.
  const columnHeight = Math.ceil(games.length / COLUMNS);

  useInput((input: string, key: { return?: boolean; upArrow?: boolean; downArrow?: boolean; leftArrow?: boolean; rightArrow?: boolean }) => {
    if (key.return && games[selectedIndex]) {
      onSelectGame(games[selectedIndex]);
    }
    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    }
    if (key.downArrow) {
      setSelectedIndex(Math.min(games.length - 1, selectedIndex + 1));
    }
    if (key.leftArrow && selectedIndex - columnHeight >= 0) {
      setSelectedIndex(selectedIndex - columnHeight);
    }
    if (key.rightArrow && selectedIndex + columnHeight < games.length) {
      setSelectedIndex(selectedIndex + columnHeight);
    }
  });

  useEffect(() => {
    // Only the first load shows the loading screen; refreshes swap data in place to avoid flicker.
    const loadGames = async () => {
      const espnGames = await fetchNFLScores();
      const transformedGames = espnGames.map(transformESPNGame) as NFLGame[];
      setGames(transformedGames);
      setSelectedIndex((index) => Math.min(index, Math.max(0, transformedGames.length - 1)));
      setLoading(false);
    };

    loadGames();
    const interval = setInterval(loadGames, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <Text>Loading NFL scores...</Text>;
  }

  if (games.length === 0) {
    return <Text>No games available at this time.</Text>;
  }

  const renderGameStatus = (game: NFLGame) => {
    if (game.status === 'in_progress') {
      return `${game.quarter}Q ${game.timeRemaining}`;
    } else if (game.status === 'final') {
      return 'Final';
    } else {
      return game.timeRemaining || 'Scheduled';
    }
  };

  const renderGame = (game: NFLGame, index: number) => {
    const isSelected = index === selectedIndex;
    const status = renderGameStatus(game);

    const selectedColor = isSelected ? 'black' : 'white';
    const selectedBackground = isSelected ? 'cyan' : undefined;

    return (
      <Box
        key={game.id}
        flexDirection="column"
        marginBottom={1}
        marginRight={1}
        paddingX={1}
        width={28}
        borderStyle="round"
        borderColor={isSelected ? 'cyan' : 'gray'}
      >
        <Text bold color={selectedColor} backgroundColor={selectedBackground}>
          {isSelected ? '> ' : '  '}{status}
        </Text>
        <Text bold color={selectedColor} backgroundColor={selectedBackground}>
          {game.awayTeam} @ {game.homeTeam}
        </Text>
        <Text bold color={selectedColor} backgroundColor={selectedBackground}>
          {game.awayScore}  -  {game.homeScore}
        </Text>
      </Box>
    );
  };

  const renderColumn = (startIndex: number) => {
    const columnGames = [];
    for (let i = startIndex; i < games.length && i < startIndex + columnHeight; i++) {
      columnGames.push(renderGame(games[i], i));
    }
    return <Box flexDirection="column">{columnGames}</Box>;
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} borderStyle="single" borderColor="green" paddingX={1}>
        <Text bold color="green">NFL LIVE SCORES</Text>
      </Box>
      <Box flexDirection="row">
        {Array.from({ length: Math.min(COLUMNS, games.length) }).map((_, colIndex) => (
          <Box key={colIndex} marginRight={colIndex < Math.min(COLUMNS, games.length) - 1 ? 2 : 0}>
            {renderColumn(colIndex * columnHeight)}
          </Box>
        ))}
      </Box>
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>Arrow keys navigate   Enter select   Ctrl+C quit</Text>
      </Box>
    </Box>
  );
};
