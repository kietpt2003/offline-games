/**
 * @format
 */

import React, { useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BlockBlastScreen } from './src/games/blockBlast/BlockBlastScreen';
import { HomeScreen } from './src/screens/HomeScreen';

function App() {
  const [activeGame, setActiveGame] = useState(null);
  const isPlayingBlockBlast = activeGame === 'block-blast';

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isPlayingBlockBlast ? 'light-content' : 'dark-content'}
        backgroundColor={isPlayingBlockBlast ? '#171A32' : '#F7F8FC'}
      />
      {isPlayingBlockBlast ? (
        <BlockBlastScreen onBack={() => setActiveGame(null)} />
      ) : (
        <HomeScreen onOpenGame={setActiveGame} />
      )}
    </SafeAreaProvider>
  );
}

export default App;
