import AsyncStorage from '@react-native-async-storage/async-storage';

import { BOARD_SIZE } from './blockBlastEngine';

const GAME_STATE_KEY = '@offline-games/block-blast/game-state-v1';
const BEST_SCORE_KEY = '@offline-games/block-blast/best-score-v1';

export const MAX_UNDO_STEPS = 20;

function isValidBoard(board) {
  return (
    Array.isArray(board) &&
    board.length === BOARD_SIZE &&
    board.every(
      row =>
        Array.isArray(row) &&
        row.length === BOARD_SIZE &&
        row.every(cell => cell === null || typeof cell === 'string'),
    )
  );
}

function isValidPiece(piece) {
  return (
    piece === null ||
    (typeof piece === 'object' &&
      typeof piece.id === 'string' &&
      typeof piece.color === 'string' &&
      Array.isArray(piece.cells) &&
      piece.cells.length > 0 &&
      piece.cells.every(
        cell =>
          Array.isArray(cell) &&
          cell.length === 2 &&
          cell.every(Number.isInteger),
      ))
  );
}

function isValidSnapshot(snapshot) {
  return (
    snapshot &&
    isValidBoard(snapshot.board) &&
    Array.isArray(snapshot.pieces) &&
    snapshot.pieces.length === 3 &&
    snapshot.pieces.every(isValidPiece) &&
    Number.isInteger(snapshot.score) &&
    snapshot.score >= 0 &&
    (snapshot.combo === undefined ||
      (Number.isInteger(snapshot.combo) && snapshot.combo >= 0)) &&
    typeof snapshot.isGameOver === 'boolean'
  );
}

export function normalizeSavedGame(savedGame) {
  if (!isValidSnapshot(savedGame)) {
    return null;
  }

  const undoHistory = Array.isArray(savedGame.undoHistory)
    ? savedGame.undoHistory
        .filter(isValidSnapshot)
        .slice(-MAX_UNDO_STEPS)
        .map(snapshot => ({
          board: snapshot.board,
          pieces: snapshot.pieces,
          score: snapshot.score,
          combo: snapshot.combo ?? 0,
          isGameOver: snapshot.isGameOver,
        }))
    : [];

  return {
    board: savedGame.board,
    pieces: savedGame.pieces,
    score: savedGame.score,
    combo: savedGame.combo ?? 0,
    isGameOver: savedGame.isGameOver,
    undoHistory,
  };
}

export async function loadBlockBlastState() {
  const entries = await AsyncStorage.getMany([GAME_STATE_KEY, BEST_SCORE_KEY]);
  const savedGameValue = entries[GAME_STATE_KEY];
  const bestScoreValue = entries[BEST_SCORE_KEY];
  let savedGame = null;

  if (savedGameValue) {
    try {
      savedGame = normalizeSavedGame(JSON.parse(savedGameValue));
    } catch {
      savedGame = null;
    }
  }

  const parsedBestScore = Number(bestScoreValue);

  return {
    game: savedGame,
    bestScore:
      Number.isInteger(parsedBestScore) && parsedBestScore >= 0
        ? parsedBestScore
        : 0,
  };
}

export function saveBlockBlastState(game, bestScore) {
  return AsyncStorage.setMany({
    [GAME_STATE_KEY]: JSON.stringify(game),
    [BEST_SCORE_KEY]: String(bestScore),
  });
}
