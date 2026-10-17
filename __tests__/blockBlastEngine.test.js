import {
  BOARD_SIZE,
  canPlacePiece,
  clearCompletedLines,
  createEmptyBoard,
  createPiece,
  getDropOrigin,
  getPieceBounds,
  hasAvailableMove,
  placePiece,
} from '../src/games/blockBlast/blockBlastEngine';

describe('Block Blast engine', () => {
  test('creates an empty 8 by 8 board', () => {
    const board = createEmptyBoard();

    expect(board).toHaveLength(BOARD_SIZE);
    expect(board.every(row => row.length === BOARD_SIZE)).toBe(true);
    expect(board.flat().every(cell => cell === null)).toBe(true);
  });

  test('places a piece without mutating the previous board', () => {
    const board = createEmptyBoard();
    const square = createPiece(7, 0, 'square');
    const nextBoard = placePiece(board, square, 2, 3);

    expect(board[2][3]).toBeNull();
    expect(nextBoard[2][3]).toBe(square.color);
    expect(nextBoard[3][4]).toBe(square.color);
  });

  test('rejects overlapping and out-of-bounds placements', () => {
    const single = createPiece(0, 0, 'single');
    const horizontalThree = createPiece(2, 1, 'horizontal-three');
    const board = placePiece(createEmptyBoard(), single, 0, 0);

    expect(canPlacePiece(board, single, 0, 0)).toBe(false);
    expect(canPlacePiece(board, horizontalThree, 7, 6)).toBe(false);
  });

  test('clears completed rows and columns together', () => {
    const board = createEmptyBoard();

    for (let index = 0; index < BOARD_SIZE; index += 1) {
      board[2][index] = '#FFD447';
      board[index][5] = '#58D6E7';
    }

    board[4][4] = '#FF6B73';

    const result = clearCompletedLines(board);

    expect(result.clearedLines).toBe(2);
    expect(result.board[2].every(cell => cell === null)).toBe(true);
    expect(result.board.every(row => row[5] === null)).toBe(true);
    expect(result.board[4][4]).toBe('#FF6B73');
  });

  test('detects when no generated piece can be placed', () => {
    const fullBoard = Array.from({ length: BOARD_SIZE }, () =>
      Array(BOARD_SIZE).fill('#FFD447'),
    );
    const pieces = [createPiece(0, 0, 'single'), null, null];

    expect(hasAvailableMove(fullBoard, pieces)).toBe(false);
  });

  test('maps a lifted drag pointer to the expected board origin', () => {
    const horizontalThree = createPiece(2, 0, 'horizontal-three');
    const origin = getDropOrigin({
      piece: horizontalThree,
      pointerX: 188,
      pointerY: 252,
      boardX: 20,
      boardY: 100,
      boardPadding: 8,
      cellSize: 40,
      cellGap: 3,
      liftOffset: 80,
    });

    expect(getPieceBounds(horizontalThree)).toEqual({ rows: 1, columns: 3 });
    expect(origin).toEqual({ row: 1, column: 2 });
  });
});
