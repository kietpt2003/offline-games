/**
 * @format
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BlockBlastScreen } from './src/games/blockBlast/BlockBlastScreen';
import { Game2048Screen } from './src/games/game2048/Game2048Screen';
import { GomokuScreen } from './src/games/gomoku/GomokuScreen';
import { MahjongScreen } from './src/games/mahjong/MahjongScreen';
import MinesweeperScreen from './src/games/minesweeper/MinesweeperScreen';
import { PikachuScreen } from './src/games/pikachu/PikachuScreen';
import { SudokuScreen } from './src/games/sudoku/SudokuScreen';
import { HomeScreen } from './src/screens/HomeScreen';

function App({ appVersion }) {
  const [activeGame, setActiveGame] = React.useState(null);
  const isPlayingBlockBlast = activeGame === 'block-blast';
  const isPlayingMahjong = activeGame === 'mahjong';
  const isPlayingPikachu = activeGame === 'pikachu';
  const isPlayingGame2048 = activeGame === 'game-2048';
  const isPlayingGomoku = activeGame === 'gomoku';
  const isPlayingSudoku = activeGame === 'sudoku';
  const isPlayingMinesweeper = activeGame === 'minesweeper';
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isPlayingBlockBlast ? 'light-content' : 'dark-content'}
        backgroundColor={
          isPlayingBlockBlast
            ? '#673719'
            : isPlayingMahjong || isPlayingPikachu
            ? '#F3FBF7'
            : '#F7F8FC'
        }
      />
      {isPlayingBlockBlast ? (
        <BlockBlastScreen onBack={() => setActiveGame(null)} />
      ) : isPlayingGame2048 ? (
        <Game2048Screen onBack={() => setActiveGame(null)} />
      ) : isPlayingGomoku ? (
        <GomokuScreen onBack={() => setActiveGame(null)} />
      ) : isPlayingMahjong ? (
        <MahjongScreen onBack={() => setActiveGame(null)} />
      ) : isPlayingMinesweeper ? (
        <MinesweeperScreen onBack={() => setActiveGame(null)} />
      ) : isPlayingPikachu ? (
        <PikachuScreen onBack={() => setActiveGame(null)} />
      ) : isPlayingSudoku ? (
        <SudokuScreen onBack={() => setActiveGame(null)} />
      ) : (
        <HomeScreen appVersion={appVersion} onOpenGame={setActiveGame} />
      )}
    </SafeAreaProvider>
  );
}

export default App;
