export const DIFFICULTIES = {
  Beginner: { rows: 9, columns: 9, mines: 10 },
  Intermediate: { rows: 16, columns: 16, mines: 40 },
  Expert: { rows: 16, columns: 30, mines: 99 },
};

function createBoard(rows, columns) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => ({
      mine: false,
      adjacent: 0,
      revealed: false,
      flagged: false,
    })),
  );
}

function isValidCell(game, row, column) {
  return (
    Number.isInteger(row) &&
    Number.isInteger(column) &&
    row >= 0 &&
    row < game.rows &&
    column >= 0 &&
    column < game.columns
  );
}

function forEachNeighbor(game, row, column, callback) {
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) {
        continue;
      }

      const neighborRow = row + rowOffset;
      const neighborColumn = column + columnOffset;

      if (isValidCell(game, neighborRow, neighborColumn)) {
        callback(neighborRow, neighborColumn);
      }
    }
  }
}

function updateAdjacentCounts(board, rows, columns) {
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (board[row][column].mine) {
        board[row][column].adjacent = 0;
        continue;
      }

      let adjacent = 0;

      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          const neighborRow = row + rowOffset;
          const neighborColumn = column + columnOffset;

          if (
            neighborRow >= 0 &&
            neighborRow < rows &&
            neighborColumn >= 0 &&
            neighborColumn < columns &&
            board[neighborRow][neighborColumn].mine
          ) {
            adjacent += 1;
          }
        }
      }

      board[row][column].adjacent = adjacent;
    }
  }
}

function countFlags(board) {
  return board.reduce(
    (total, row) => total + row.filter(cell => cell.flagged).length,
    0,
  );
}

function finishIfWon(game) {
  const revealedSafeCells = game.board.reduce(
    (total, row) =>
      total +
      row.filter(cell => cell.revealed && !cell.mine).length,
    0,
  );

  if (revealedSafeCells === game.rows * game.columns - game.mineCount) {
    return { ...game, status: 'won' };
  }

  return game;
}

export function createGame(difficulty = 'Beginner', random = Math.random) {
  const settings =
    typeof difficulty === 'string'
      ? DIFFICULTIES[difficulty]
      : difficulty || DIFFICULTIES.Beginner;

  if (
    !settings ||
    !Number.isInteger(settings.rows) ||
    !Number.isInteger(settings.columns) ||
    !Number.isInteger(settings.mines) ||
    settings.rows < 1 ||
    settings.columns < 1 ||
    settings.mines < 0 ||
    settings.mines >= settings.rows * settings.columns
  ) {
    throw new RangeError('Invalid Minesweeper difficulty settings');
  }

  const board = createBoard(settings.rows, settings.columns);
  const availableCells = Array.from(
    { length: settings.rows * settings.columns },
    (_, index) => index,
  );

  for (let index = 0; index < settings.mines; index += 1) {
    const randomValue = random();
    const safeRandom = Number.isFinite(randomValue)
      ? Math.min(Math.max(randomValue, 0), 1 - Number.EPSILON)
      : 0;
    const selectedIndex = Math.floor(safeRandom * availableCells.length);
    const [minePosition] = availableCells.splice(selectedIndex, 1);
    const row = Math.floor(minePosition / settings.columns);
    const column = minePosition % settings.columns;
    board[row][column].mine = true;
  }

  updateAdjacentCounts(board, settings.rows, settings.columns);

  return {
    difficulty:
      typeof difficulty === 'string' ? difficulty : 'Custom',
    rows: settings.rows,
    columns: settings.columns,
    mineCount: settings.mines,
    board,
    status: 'playing',
    firstReveal: true,
    flagsRemaining: settings.mines,
  };
}

export function toggleFlag(game, row, column) {
  if (
    game.status !== 'playing' ||
    !isValidCell(game, row, column) ||
    game.board[row][column].revealed
  ) {
    return game;
  }

  const board = game.board.map(boardRow => boardRow.map(cell => ({ ...cell })));
  board[row][column].flagged = !board[row][column].flagged;

  return {
    ...game,
    board,
    flagsRemaining: game.mineCount - countFlags(board),
  };
}

export function revealCell(game, row, column) {
  if (
    game.status !== 'playing' ||
    !isValidCell(game, row, column) ||
    game.board[row][column].revealed ||
    game.board[row][column].flagged
  ) {
    return game;
  }

  const board = game.board.map(boardRow => boardRow.map(cell => ({ ...cell })));
  let firstReveal = game.firstReveal;

  if (firstReveal) {
    firstReveal = false;

    if (board[row][column].mine) {
      board[row][column].mine = false;
      const relocationCandidates = [];

      for (let candidateRow = 0; candidateRow < game.rows; candidateRow += 1) {
        for (
          let candidateColumn = 0;
          candidateColumn < game.columns;
          candidateColumn += 1
        ) {
          if (
            (candidateRow !== row || candidateColumn !== column) &&
            !board[candidateRow][candidateColumn].mine
          ) {
            relocationCandidates.push([candidateRow, candidateColumn]);
          }
        }
      }

      const [targetRow, targetColumn] =
        relocationCandidates[relocationCandidates.length - 1];
      board[targetRow][targetColumn].mine = true;
      updateAdjacentCounts(board, game.rows, game.columns);
    }
  }

  if (board[row][column].mine) {
    board.forEach(boardRow =>
      boardRow.forEach(cell => {
        if (cell.mine) {
          cell.revealed = true;
        }
      }),
    );

    return {
      ...game,
      board,
      firstReveal,
      status: 'lost',
      flagsRemaining: game.mineCount - countFlags(board),
    };
  }

  const pending = [[row, column]];
  const visited = new Set();

  while (pending.length > 0) {
    const [currentRow, currentColumn] = pending.pop();
    const key = `${currentRow},${currentColumn}`;

    if (visited.has(key)) {
      continue;
    }
    visited.add(key);

    const cell = board[currentRow][currentColumn];

    if (cell.mine || cell.flagged || cell.revealed) {
      continue;
    }

    cell.revealed = true;

    if (cell.adjacent === 0) {
      forEachNeighbor(
        game,
        currentRow,
        currentColumn,
        (neighborRow, neighborColumn) => {
          const neighbor = board[neighborRow][neighborColumn];

          if (!neighbor.mine && !neighbor.flagged && !neighbor.revealed) {
            pending.push([neighborRow, neighborColumn]);
          }
        },
      );
    }
  }

  return finishIfWon({
    ...game,
    board,
    firstReveal,
    flagsRemaining: game.mineCount - countFlags(board),
  });
}
