export const BOARD_SIZE = 4;
export const WIN_TILE = 2048;

export const DIRECTIONS = ['up', 'right', 'down', 'left'];

export function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(0),
  );
}

export function spawnRandomTile(board, random = Math.random) {
  const emptyCells = [];

  board.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      if (value === 0) {
        emptyCells.push({ row: rowIndex, column: columnIndex });
      }
    });
  });

  if (emptyCells.length === 0) {
    return { board, tile: null };
  }

  const selectedCell = emptyCells[
    Math.min(
      emptyCells.length - 1,
      Math.floor(random() * emptyCells.length),
    )
  ];
  const value = random() < 0.9 ? 2 : 4;
  const nextBoard = board.map(row => [...row]);

  nextBoard[selectedCell.row][selectedCell.column] = value;

  return {
    board: nextBoard,
    tile: { ...selectedCell, value },
  };
}

export function createGame(random = Math.random) {
  const firstTile = spawnRandomTile(createEmptyBoard(), random);
  const secondTile = spawnRandomTile(firstTile.board, random);

  return {
    board: secondTile.board,
    score: 0,
    isWon: false,
    isGameOver: false,
    keepPlaying: false,
  };
}

function getLines(direction) {
  if (!DIRECTIONS.includes(direction)) {
    return [];
  }

  return Array.from({ length: BOARD_SIZE }, (_, lineIndex) =>
    Array.from({ length: BOARD_SIZE }, (__, offset) => {
      if (direction === 'left') {
        return [lineIndex, offset];
      }
      if (direction === 'right') {
        return [lineIndex, BOARD_SIZE - 1 - offset];
      }
      if (direction === 'up') {
        return [offset, lineIndex];
      }
      return [BOARD_SIZE - 1 - offset, lineIndex];
    }),
  );
}

export function moveBoard(board, direction) {
  const lines = getLines(direction);

  if (lines.length === 0) {
    return { board, moved: false, scoreGain: 0, isWon: false };
  }

  const nextBoard = createEmptyBoard();
  let scoreGain = 0;

  lines.forEach(coordinates => {
    const values = coordinates
      .map(([row, column]) => board[row][column])
      .filter(value => value !== 0);
    const mergedValues = [];

    for (let index = 0; index < values.length; index += 1) {
      if (values[index] === values[index + 1]) {
        const mergedValue = values[index] * 2;
        mergedValues.push(mergedValue);
        scoreGain += mergedValue;
        index += 1;
      } else {
        mergedValues.push(values[index]);
      }
    }

    coordinates.forEach(([row, column], offset) => {
      nextBoard[row][column] = mergedValues[offset] ?? 0;
    });
  });

  const moved = nextBoard.some((row, rowIndex) =>
    row.some((value, columnIndex) => value !== board[rowIndex][columnIndex]),
  );

  return {
    board: moved ? nextBoard : board,
    moved,
    scoreGain: moved ? scoreGain : 0,
    isWon: moved && nextBoard.some(row => row.some(value => value >= WIN_TILE)),
  };
}

export function hasAvailableMoves(board) {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      const value = board[row][column];

      if (
        value === 0 ||
        board[row + 1]?.[column] === value ||
        board[row][column + 1] === value
      ) {
        return true;
      }
    }
  }

  return false;
}

export function moveGame(game, direction, random = Math.random) {
  if (game.isGameOver || (game.isWon && !game.keepPlaying)) {
    return game;
  }

  const result = moveBoard(game.board, direction);

  if (!result.moved) {
    return hasAvailableMoves(game.board) ? game : { ...game, isGameOver: true };
  }

  const spawned = spawnRandomTile(result.board, random);
  const isWon = game.isWon || result.isWon;

  return {
    ...game,
    board: spawned.board,
    score: game.score + result.scoreGain,
    isWon,
    isGameOver: !hasAvailableMoves(spawned.board),
  };
}

export function continueGame(game) {
  if (!game.isWon || game.keepPlaying) {
    return game;
  }

  return { ...game, keepPlaying: true };
}
