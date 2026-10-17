const DIRECTIONS = [
  { row: -1, column: 0 },
  { row: 0, column: 1 },
  { row: 1, column: 0 },
  { row: 0, column: -1 },
];

function shuffle(items, random = Math.random) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    const current = result[index];

    result[index] = result[target];
    result[target] = current;
  }

  return result;
}

export function getLevelConfig(level) {
  if (level === 1) {
    return { rows: 6, columns: 6, faceCount: 6, seconds: 150, shift: 'none' };
  }

  if (level === 2) {
    return { rows: 6, columns: 8, faceCount: 8, seconds: 135, shift: 'none' };
  }

  if (level === 3) {
    return { rows: 7, columns: 8, faceCount: 10, seconds: 120, shift: 'down' };
  }

  if (level === 4) {
    return { rows: 8, columns: 8, faceCount: 12, seconds: 110, shift: 'left' };
  }

  return {
    rows: 8,
    columns: 10,
    faceCount: 16,
    seconds: Math.max(70, 105 - (level - 5) * 5),
    shift: level % 2 === 0 ? 'left' : 'down',
  };
}

function createPairValues(pairCount, faceCount, random) {
  const pairFaces = shuffle(
    Array.from({ length: pairCount }, (_, index) => index % faceCount),
    random,
  );

  return shuffle(
    pairFaces.flatMap(face => [face, face]),
    random,
  );
}

export function createBoard(config, random = Math.random) {
  const values = createPairValues(
    (config.rows * config.columns) / 2,
    config.faceCount,
    random,
  );
  const board = [];

  for (let row = 0; row < config.rows; row += 1) {
    board.push(
      values
        .slice(row * config.columns, (row + 1) * config.columns)
        .map((face, column) => ({
          id: `tile-${row}-${column}-${face}`,
          face,
        })),
    );
  }

  return findAvailablePair(board) ? board : shuffleBoard(board, random);
}

function isInsidePaddedBoard(row, column, rows, columns) {
  return row >= 0 && row <= rows + 1 && column >= 0 && column <= columns + 1;
}

function isOpen(board, row, column, target) {
  if (row === target.row + 1 && column === target.column + 1) {
    return true;
  }

  if (
    row === 0 ||
    column === 0 ||
    row === board.length + 1 ||
    column === board[0].length + 1
  ) {
    return true;
  }

  return board[row - 1][column - 1] === null;
}

export function findConnectionPath(board, start, target) {
  if (
    !board[start.row]?.[start.column] ||
    !board[target.row]?.[target.column] ||
    (start.row === target.row && start.column === target.column)
  ) {
    return null;
  }

  const rows = board.length;
  const columns = board[0].length;
  const startPoint = { row: start.row + 1, column: start.column + 1 };
  const targetPoint = { row: target.row + 1, column: target.column + 1 };
  const queue = [];
  const bestTurns = new Map();

  DIRECTIONS.forEach((direction, directionIndex) => {
    const row = startPoint.row + direction.row;
    const column = startPoint.column + direction.column;

    if (
      isInsidePaddedBoard(row, column, rows, columns) &&
      isOpen(board, row, column, target)
    ) {
      queue.push({
        row,
        column,
        direction: directionIndex,
        turns: 0,
        path: [startPoint, { row, column }],
      });
    }
  });

  while (queue.length > 0) {
    const state = queue.shift();
    const key = `${state.row}:${state.column}:${state.direction}`;

    if ((bestTurns.get(key) ?? 3) <= state.turns) {
      continue;
    }

    bestTurns.set(key, state.turns);

    if (state.row === targetPoint.row && state.column === targetPoint.column) {
      return state.path;
    }

    DIRECTIONS.forEach((direction, directionIndex) => {
      const turns = state.turns + (directionIndex === state.direction ? 0 : 1);

      if (turns > 2) {
        return;
      }

      const row = state.row + direction.row;
      const column = state.column + direction.column;

      if (
        isInsidePaddedBoard(row, column, rows, columns) &&
        isOpen(board, row, column, target)
      ) {
        queue.push({
          row,
          column,
          direction: directionIndex,
          turns,
          path: [...state.path, { row, column }],
        });
      }
    });
  }

  return null;
}

export function findAvailablePair(board) {
  const tilesByFace = new Map();

  board.forEach((row, rowIndex) => {
    row.forEach((tile, columnIndex) => {
      if (!tile) {
        return;
      }

      const positions = tilesByFace.get(tile.face) ?? [];
      positions.push({ row: rowIndex, column: columnIndex });
      tilesByFace.set(tile.face, positions);
    });
  });

  for (const positions of tilesByFace.values()) {
    for (let first = 0; first < positions.length; first += 1) {
      for (let second = first + 1; second < positions.length; second += 1) {
        const path = findConnectionPath(
          board,
          positions[first],
          positions[second],
        );

        if (path) {
          return { first: positions[first], second: positions[second], path };
        }
      }
    }
  }

  return null;
}

export function removePair(board, first, second) {
  return board.map((row, rowIndex) =>
    row.map((tile, columnIndex) =>
      (rowIndex === first.row && columnIndex === first.column) ||
      (rowIndex === second.row && columnIndex === second.column)
        ? null
        : tile,
    ),
  );
}

export function shiftBoard(board, mode) {
  if (mode === 'down') {
    const result = board.map(row => [...row]);

    for (let column = 0; column < board[0].length; column += 1) {
      const tiles = board.map(row => row[column]).filter(Boolean);
      const emptyCount = board.length - tiles.length;

      for (let row = 0; row < board.length; row += 1) {
        result[row][column] = row < emptyCount ? null : tiles[row - emptyCount];
      }
    }

    return result;
  }

  if (mode === 'left') {
    return board.map(row => {
      const tiles = row.filter(Boolean);
      return [...tiles, ...Array(row.length - tiles.length).fill(null)];
    });
  }

  return board;
}

export function shuffleBoard(board, random = Math.random) {
  const positions = [];
  const tiles = [];

  board.forEach((row, rowIndex) => {
    row.forEach((tile, columnIndex) => {
      if (tile) {
        positions.push({ row: rowIndex, column: columnIndex });
        tiles.push(tile);
      }
    });
  });

  if (tiles.length < 2) {
    return board;
  }

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const shuffled = shuffle(tiles, random);
    const nextBoard = board.map(row => row.map(() => null));

    positions.forEach((position, index) => {
      nextBoard[position.row][position.column] = shuffled[index];
    });

    if (findAvailablePair(nextBoard)) {
      return nextBoard;
    }
  }

  return board;
}

export function countRemainingTiles(board) {
  return board.reduce((total, row) => total + row.filter(Boolean).length, 0);
}
