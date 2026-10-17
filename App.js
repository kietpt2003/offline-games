/**
 * @format
 */

import React, { useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BlockBlastScreen } from './src/games/blockBlast/BlockBlastScreen';
import { MahjongScreen } from './src/games/mahjong/MahjongScreen';
import { HomeScreen } from './src/screens/HomeScreen';

function App() {
  const [activeGame, setActiveGame] = useState(null);
  const isPlayingBlockBlast = activeGame === 'block-blast';
  const isPlayingMahjong = activeGame === 'mahjong';
  const isPlayingGame = isPlayingBlockBlast || isPlayingMahjong;

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isPlayingGame ? 'light-content' : 'dark-content'}
        backgroundColor={
          isPlayingBlockBlast
            ? '#171A32'
            : isPlayingMahjong
            ? '#123C3A'
            : '#F7F8FC'
        }
      />
      {isPlayingBlockBlast ? (
        <BlockBlastScreen onBack={() => setActiveGame(null)} />
      ) : isPlayingMahjong ? (
        <MahjongScreen onBack={() => setActiveGame(null)} />
      ) : (
        <HomeScreen onOpenGame={setActiveGame} />
      )}
    </SafeAreaProvider>
  );
}

export default App;
