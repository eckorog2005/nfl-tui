import React, { useState } from 'react';
import { Box } from 'ink';
import { GameList } from './components/GameList.js';
import { GameDetail } from './components/GameDetail.js';
import type { NFLGame } from './types.js';

type View = 'list' | 'detail';

export const App: React.FC = () => {
  const [view, setView] = useState<View>('list');
  const [selectedGame, setSelectedGame] = useState<NFLGame | null>(null);

  const handleSelectGame = (game: NFLGame) => {
    setSelectedGame(game);
    setView('detail');
  };

  const handleBack = () => {
    setView('list');
    setSelectedGame(null);
  };

  return (
    <Box flexDirection="column" padding={1}>
      {view === 'list' ? (
        <GameList onSelectGame={handleSelectGame} />
      ) : (
        selectedGame && (
          <GameDetail game={selectedGame} onBack={handleBack} />
        )
      )}
    </Box>
  );
};
