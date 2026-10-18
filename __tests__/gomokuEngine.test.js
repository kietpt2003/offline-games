import {
  BOARD_SIZE,
  chooseComputerMove,
  createGameState,
  makeComputerMove,
  makeMove,
} from '../src/games/gomoku/gomokuEngine';

function playMoves(moves) {
  return moves.reduce(
    (state, [row, column]) => makeMove(state, row, column),
    createGameState(),
  );
}

describe('Gomoku engine', () => {
  test('starts with an empty 15 by 15 board and X to move', () => {
    const game = createGameState();

    expect(game.board).toHaveLength(BOARD_SIZE);
    expect(game.board.every(row => row.length === BOARD_SIZE)).toBe(true);
    expect(game.board.flat().every(cell => cell === null)).toBe(true);
    expect(game.turn).toBe('X');
    expect(game.winner).toBeNull();
    expect(game.draw).toBe(false);
  });

  test('alternates turns and detects a horizontal five', () => {
    const game = playMoves([
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
      [1, 2],
      [0, 3],
      [1, 3],
      [0, 4],
    ]);

    expect(game.winner).toBe('X');
    expect(game.draw).toBe(false);
    expect(game.turn).toBe('X');
  });

  test('detects a vertical five', () => {
    const game = playMoves([
      [0, 0],
      [0, 1],
      [1, 0],
      [0, 2],
      [2, 0],
      [0, 3],
      [3, 0],
      [0, 4],
      [4, 0],
    ]);

    expect(game.winner).toBe('X');
  });

  test.each([
    {
      name: 'down-right diagonal',
      xMoves: [
        [0, 0],
        [1, 1],
        [2, 2],
        [3, 3],
        [4, 4],
      ],
      oMoves: [
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
      ],
    },
    {
      name: 'down-left diagonal',
      xMoves: [
        [0, 4],
        [1, 3],
        [2, 2],
        [3, 1],
        [4, 0],
      ],
      oMoves: [
        [0, 5],
        [0, 6],
        [0, 7],
        [0, 8],
      ],
    },
  ])('detects a $name five', ({ xMoves, oMoves }) => {
    const orderedMoves = xMoves.flatMap((move, index) =>
      index < oMoves.length ? [move, oMoves[index]] : [move],
    );
    const game = playMoves(orderedMoves);

    expect(game.winner).toBe('X');
  });

  test('detects a draw when the last open square is filled', () => {
    const board = Array.from({ length: BOARD_SIZE }, (unusedRow, row) =>
      Array.from({ length: BOARD_SIZE }, (unusedColumn, column) =>
        (row + 2 * column) % 4 < 2 ? 'X' : 'O',
      ),
    );
    board[BOARD_SIZE - 1][BOARD_SIZE - 1] = null;

    const game = makeMove(
      { board, turn: 'O', winner: null, draw: false },
      BOARD_SIZE - 1,
      BOARD_SIZE - 1,
    );

    expect(game.winner).toBeNull();
    expect(game.draw).toBe(true);
    expect(game.board.flat().every(cell => cell !== null)).toBe(true);
  });

  test('rejects occupied, out-of-range, and non-integer moves without changing state', () => {
    const initial = createGameState();
    const afterFirstMove = makeMove(initial, 2, 3);

    expect(makeMove(afterFirstMove, 2, 3)).toBe(afterFirstMove);
    expect(makeMove(afterFirstMove, -1, 3)).toBe(afterFirstMove);
    expect(makeMove(afterFirstMove, 3, BOARD_SIZE)).toBe(afterFirstMove);
    expect(makeMove(afterFirstMove, 1.5, 3)).toBe(afterFirstMove);
  });

  test('does not accept moves after a win and leaves the original board unchanged', () => {
    const game = playMoves([
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
      [1, 2],
      [0, 3],
      [1, 3],
      [0, 4],
    ]);
    const nextGame = makeMove(game, 5, 5);

    expect(nextGame).toBe(game);
    expect(game.board[5][5]).toBeNull();
  });

  test('a legal move creates a new board without mutating the prior state', () => {
    const game = createGameState();
    const nextGame = makeMove(game, 7, 7);

    expect(game.board[7][7]).toBeNull();
    expect(nextGame.board[7][7]).toBe('X');
    expect(nextGame.turn).toBe('O');
    expect(nextGame.board).not.toBe(game.board);
  });

  test('computer takes a winning move when available', () => {
    const game = createGameState();
    game.board[7][5] = 'O';
    game.board[7][6] = 'O';
    game.board[7][7] = 'O';
    game.board[7][8] = 'O';
    game.turn = 'O';

    expect(chooseComputerMove(game)).toEqual([7, 4]);

    const nextGame = makeComputerMove(game);
    expect(nextGame.winner).toBe('O');
    expect(nextGame.board[7][4]).toBe('O');
  });

  test('computer blocks an opponent immediate win', () => {
    const game = createGameState();
    game.board[7][5] = 'X';
    game.board[7][6] = 'X';
    game.board[7][7] = 'X';
    game.board[7][8] = 'X';
    game.turn = 'O';

    expect(chooseComputerMove(game)).toEqual([7, 4]);
  });

  test('computer makes one legal move without changing the previous board', () => {
    const game = makeMove(createGameState(), 7, 7);
    const nextGame = makeComputerMove(game);

    expect(nextGame).not.toBe(game);
    expect(nextGame.board.flat().filter(Boolean)).toHaveLength(2);
    expect(nextGame.board[7][7]).toBe('X');
    expect(nextGame.board.flat()).toContain('O');
    expect(nextGame.turn).toBe('X');
    expect(game.board.flat().filter(Boolean)).toHaveLength(1);
    expect(game.turn).toBe('O');
  });
});
