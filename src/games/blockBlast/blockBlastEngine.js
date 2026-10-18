export const BOARD_SIZE = 7;

const SHAPE_TEMPLATES = [
  [[0, 0]],
  [
    [0, 0],
    [0, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
  ],
  [
    [0, 0],
    [1, 0],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 1],
  ],
  [
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
    [2, 0],
    [2, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 0],
    [2, 1],
    [2, 2],
  ],
];

export const BLOCK_COLOR = '#E5B46F';
const PIECE_COLORS = [BLOCK_COLOR];

export function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

export function createPiece(shapeIndex, colorIndex, id = 'piece') {
  return {
    id,
    cells: SHAPE_TEMPLATES[shapeIndex],
    color: BLOCK_COLOR,
  };
}

export function getPieceBounds(piece) {
  if (!piece) {
    return { rows: 0, columns: 0 };
  }

  return {
    rows: Math.max(...piece.cells.map(([row]) => row)) + 1,
    columns: Math.max(...piece.cells.map(([, column]) => column)) + 1,
  };
}

export function getDropOrigin({
  piece,
  pointerX,
  pointerY,
  boardX,
  boardY,
  boardPadding,
  cellSize,
  cellGap,
  liftOffset,
}) {
  const { rows, columns } = getPieceBounds(piece);
  const cellStride = cellSize + cellGap;
  const pieceWidth = columns * cellSize + Math.max(0, columns - 1) * cellGap;
  const pieceHeight = rows * cellSize + Math.max(0, rows - 1) * cellGap;
  const pieceLeft = pointerX - pieceWidth / 2;
  const pieceTop = pointerY - liftOffset - pieceHeight / 2;

  return {
    row: Math.round((pieceTop - boardY - boardPadding) / cellStride),
    column: Math.round((pieceLeft - boardX - boardPadding) / cellStride),
  };
}

export function generatePieceSet(random = Math.random) {
  const seed = Date.now();

  return Array.from({ length: 3 }, (_, index) => {
    const shapeIndex = Math.floor(random() * SHAPE_TEMPLATES.length);
    const colorIndex = Math.floor(random() * PIECE_COLORS.length);

    return createPiece(
      shapeIndex,
      colorIndex,
      `${seed}-${index}-${shapeIndex}`,
    );
  });
}

export function canPlacePiece(board, piece, originRow, originColumn) {
  if (!piece) {
    return false;
  }

  return piece.cells.every(([rowOffset, columnOffset]) => {
    const row = originRow + rowOffset;
    const column = originColumn + columnOffset;

    return (
      row >= 0 &&
      row < BOARD_SIZE &&
      column >= 0 &&
      column < BOARD_SIZE &&
      board[row][column] === null
    );
  });
}

export function placePiece(board, piece, originRow, originColumn) {
  if (!canPlacePiece(board, piece, originRow, originColumn)) {
    return board;
  }

  const nextBoard = board.map(row => [...row]);

  piece.cells.forEach(([rowOffset, columnOffset]) => {
    nextBoard[originRow + rowOffset][originColumn + columnOffset] = piece.color;
  });

  return nextBoard;
}

export function getCompletedLines(board) {
  const completedRows = [];
  const completedColumns = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    if (board[row].every(Boolean)) {
      completedRows.push(row);
    }
  }

  for (let column = 0; column < BOARD_SIZE; column += 1) {
    let isComplete = true;

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      if (!board[row][column]) {
        isComplete = false;
        break;
      }
    }

    if (isComplete) {
      completedColumns.push(column);
    }
  }

  return { rows: completedRows, columns: completedColumns };
}

export function clearCompletedLines(board) {
  const { rows: completedRows, columns: completedColumns } =
    getCompletedLines(board);

  if (completedRows.length === 0 && completedColumns.length === 0) {
    return { board, clearedLines: 0 };
  }

  const rowsToClear = new Set(completedRows);
  const columnsToClear = new Set(completedColumns);
  const nextBoard = board.map((row, rowIndex) =>
    row.map((cell, columnIndex) =>
      rowsToClear.has(rowIndex) || columnsToClear.has(columnIndex)
        ? null
        : cell,
    ),
  );

  return {
    board: nextBoard,
    clearedLines: completedRows.length + completedColumns.length,
  };
}

export function canPieceFit(board, piece) {
  if (!piece) {
    return false;
  }

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      if (canPlacePiece(board, piece, row, column)) {
        return true;
      }
    }
  }

  return false;
}

export function hasAvailableMove(board, pieces) {
  return pieces.some(piece => canPieceFit(board, piece));
}
