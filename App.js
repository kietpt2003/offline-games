/**
 * @format
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BlockBlastScreen } from './src/games/blockBlast/BlockBlastScreen';
import { MahjongScreen } from './src/games/mahjong/MahjongScreen';
import { PikachuScreen } from './src/games/pikachu/PikachuScreen';
import { HomeScreen } from './src/screens/HomeScreen';

function App({ appVersion }) {
  const [activeGame, setActiveGame] = React.useState(null);
  const isPlayingBlockBlast = activeGame === 'block-blast';
  const isPlayingMahjong = activeGame === 'mahjong';
  const isPlayingPikachu = activeGame === 'pikachu';
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
      ) : isPlayingMahjong ? (
        <MahjongScreen onBack={() => setActiveGame(null)} />
      ) : isPlayingPikachu ? (
        <PikachuScreen onBack={() => setActiveGame(null)} />
      ) : (
        <HomeScreen appVersion={appVersion} onOpenGame={setActiveGame} />
      )}
    </SafeAreaProvider>
  );
}

export default App;
