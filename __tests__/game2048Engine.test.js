import {
  BOARD_SIZE,
  continueGame,
  createEmptyBoard,
  createGame,
  hasAvailableMoves,
  moveBoard,
  moveGame,
  spawnRandomTile,
} from '../src/games/game2048/game2048Engine';

describe('2048 engine', () => {
  test('creates a 4 by 4 game with two starting tiles', () => {
    const game = createGame(() => 0);
    const tiles = game.board.flat().filter(Boolean);

    expect(game.board).toHaveLength(BOARD_SIZE);
    expect(game.board.every(row => row.length === BOARD_SIZE)).toBe(true);
    expect(tiles).toHaveLength(2);
    expect(tiles.every(tile => tile === 2)).toBe(true);
    expect(game.score).toBe(0);
    expect(game.isWon).toBe(false);
  });

  test('spawns a deterministic tile without mutating the input board', () => {
    const board = createEmptyBoard();
    const { board: nextBoard, tile } = spawnRandomTile(board, () => 0.99);

    expect(tile).toEqual({ row: 3, column: 3, value: 4 });
    expect(nextBoard[3][3]).toBe(4);
    expect(board.flat().every(value => value === 0)).toBe(true);
  });

  test('merges pairs once per move and reports score', () => {
    const board = [
      [2, 2, 2, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const result = moveBoard(board, 'left');

    expect(result.board[0]).toEqual([4, 4, 0, 0]);
    expect(result.scoreGain).toBe(8);
    expect(result.moved).toBe(true);
    expect(board[0]).toEqual([2, 2, 2, 2]);
  });

  test.each([
    ['up', [4, 2, 0, 0]],
    ['right', [0, 0, 2, 4]],
    ['down', [0, 0, 2, 4]],
    ['left', [4, 2, 0, 0]],
  ])('moves and merges toward %s', (direction, expectedLine) => {
    const board = createEmptyBoard();
    if (direction === 'up' || direction === 'down') {
      board[0][1] = 2;
      board[1][1] = 2;
      board[2][1] = 2;
    } else {
      board[0][0] = 2;
      board[0][1] = 2;
      board[0][2] = 2;
    }

    const result = moveBoard(board, direction);
    const resultingLine =
      direction === 'up' || direction === 'down'
        ? result.board.map(row => row[1])
        : result.board[0];

    expect(resultingLine).toEqual(expectedLine);
  });

  test('returns the original board when a move changes nothing', () => {
    const board = createEmptyBoard();
    board[0][0] = 2;

    const result = moveBoard(board, 'left');

    expect(result.board).toBe(board);
    expect(result.moved).toBe(false);
    expect(result.scoreGain).toBe(0);
  });

  test('tracks winning state and allows play to continue after 2048', () => {
    const board = createEmptyBoard();
    board[0] = [1024, 1024, 0, 0];
    const game = {
      board,
      score: 0,
      isWon: false,
      isGameOver: false,
      keepPlaying: false,
    };
    const wonGame = moveGame(game, 'left', () => 0);

    expect(wonGame.board[0][0]).toBe(2048);
    expect(wonGame.score).toBe(2048);
    expect(wonGame.isWon).toBe(true);
    expect(moveGame(wonGame, 'right')).toBe(wonGame);

    const continuedGame = continueGame(wonGame);
    const nextGame = moveGame(continuedGame, 'right', () => 0);

    expect(continuedGame.keepPlaying).toBe(true);
    expect(nextGame).not.toBe(continuedGame);
    expect(nextGame.isWon).toBe(true);
  });

  test('detects loss when a full board has no matching neighbors', () => {
    const board = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ];

    expect(hasAvailableMoves(board)).toBe(false);
    expect(
      moveGame(
        {
          board,
          score: 10,
          isWon: false,
          isGameOver: false,
          keepPlaying: false,
        },
        'left',
        () => 0,
      ).isGameOver,
    ).toBe(true);
  });
});
