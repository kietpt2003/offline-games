import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createEmptyBoard,
  createPiece,
} from '../src/games/blockBlast/blockBlastEngine';
import {
  loadBlockBlastState,
  normalizeSavedGame,
  saveBlockBlastState,
} from '../src/games/blockBlast/blockBlastStorage';

describe('Block Blast storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('saves and restores the current game and best score', async () => {
    const board = createEmptyBoard();
    const piece = createPiece(2, 0, 'horizontal-three');
    const game = {
      board,
      pieces: [piece, null, null],
      score: 12,
      combo: 2,
      isGameOver: false,
      undoHistory: [
        {
          board: createEmptyBoard(),
          pieces: [piece, null, null],
          score: 9,
          combo: 1,
          isGameOver: false,
        },
      ],
    };

    await saveBlockBlastState(game, 34);

    await expect(loadBlockBlastState()).resolves.toEqual({
      game,
      bestScore: 34,
    });
  });

  test('rejects a malformed saved board', () => {
    expect(
      normalizeSavedGame({
        board: [],
        pieces: [],
        score: 0,
        isGameOver: false,
      }),
    ).toBeNull();
  });
});
