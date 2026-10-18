export const BOARD_SIZE = 15;
export const PLAYERS = ['X', 'O'];

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export function createGameState() {
  return {
    board: Array.from({ length: BOARD_SIZE }, () =>
      Array(BOARD_SIZE).fill(null),
    ),
    turn: PLAYERS[0],
    winner: null,
    draw: false,
  };
}

function isInBounds(row, column) {
  return row >= 0 && row < BOARD_SIZE && column >= 0 && column < BOARD_SIZE;
}

function countInDirection(board, row, column, rowStep, columnStep, player) {
  let count = 0;
  let nextRow = row + rowStep;
  let nextColumn = column + columnStep;

  while (
    isInBounds(nextRow, nextColumn) &&
    board[nextRow][nextColumn] === player
  ) {
    count += 1;
    nextRow += rowStep;
    nextColumn += columnStep;
  }

  return count;
}

function hasFiveAt(board, row, column, player) {
  return DIRECTIONS.some(([rowStep, columnStep]) => {
    const consecutive =
      1 +
      countInDirection(board, row, column, rowStep, columnStep, player) +
      countInDirection(board, row, column, -rowStep, -columnStep, player);

    return consecutive >= 5;
  });
}

function getLineScore(board, row, column, player) {
  return DIRECTIONS.reduce((score, [rowStep, columnStep]) => {
    let count = 1;
    let openEnds = 0;

    for (const direction of [1, -1]) {
      let nextRow = row + rowStep * direction;
      let nextColumn = column + columnStep * direction;

      while (
        isInBounds(nextRow, nextColumn) &&
        board[nextRow][nextColumn] === player
      ) {
        count += 1;
        nextRow += rowStep * direction;
        nextColumn += columnStep * direction;
      }

      if (
        isInBounds(nextRow, nextColumn) &&
        board[nextRow][nextColumn] === null
      ) {
        openEnds += 1;
      }
    }

    if (count >= 5) {
      return score + 1_000_000;
    }
    if (count === 4) {
      return score + (openEnds === 2 ? 100_000 : openEnds === 1 ? 10_000 : 0);
    }
    if (count === 3) {
      return score + (openEnds === 2 ? 5_000 : openEnds === 1 ? 500 : 0);
    }
    if (count === 2) {
      return score + (openEnds === 2 ? 250 : openEnds === 1 ? 50 : 0);
    }
    return score + openEnds;
  }, 0);
}

export function chooseComputerMove(state, player = 'O') {
  if (
    !state ||
    !Array.isArray(state.board) ||
    state.winner ||
    state.draw ||
    state.turn !== player ||
    !PLAYERS.includes(player)
  ) {
    return null;
  }

  const opponent = player === 'X' ? 'O' : 'X';
  const emptyCells = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      if (state.board[row]?.[column] === null) {
        emptyCells.push([row, column]);
      }
    }
  }

  if (emptyCells.length === 0) {
    return null;
  }

  for (const [row, column] of emptyCells) {
    state.board[row][column] = player;
    const winsNow = hasFiveAt(state.board, row, column, player);
    state.board[row][column] = null;
    if (winsNow) {
      return [row, column];
    }
  }

  for (const [row, column] of emptyCells) {
    state.board[row][column] = opponent;
    const opponentWins = hasFiveAt(state.board, row, column, opponent);
    state.board[row][column] = null;
    if (opponentWins) {
      return [row, column];
    }
  }

  let bestMove = emptyCells[0];
  let bestScore = Number.NEGATIVE_INFINITY;
  const center = (BOARD_SIZE - 1) / 2;

  for (const [row, column] of emptyCells) {
    state.board[row][column] = player;
    const attackScore = getLineScore(state.board, row, column, player);
    state.board[row][column] = opponent;
    const defenseScore = getLineScore(state.board, row, column, opponent);
    state.board[row][column] = null;

    const centerScore =
      BOARD_SIZE - (Math.abs(center - row) + Math.abs(center - column));
    const score = attackScore + defenseScore * 1.1 + centerScore;
    if (score > bestScore) {
      bestScore = score;
      bestMove = [row, column];
    }
  }

  return bestMove;
}

export function makeMove(state, row, column) {
  if (
    !state ||
    !Array.isArray(state.board) ||
    state.winner ||
    state.draw ||
    !PLAYERS.includes(state.turn) ||
    !Number.isInteger(row) ||
    !Number.isInteger(column) ||
    !isInBounds(row, column) ||
    !Array.isArray(state.board[row]) ||
    state.board[row][column] !== null
  ) {
    return state;
  }

  const board = state.board.map((boardRow, index) =>
    index === row ? boardRow.slice() : boardRow,
  );
  board[row][column] = state.turn;

  const winner = hasFiveAt(board, row, column, state.turn) ? state.turn : null;
  const draw =
    !winner && board.every(boardRow => boardRow.every(cell => cell !== null));

  return {
    board,
    turn: winner || draw ? state.turn : state.turn === 'X' ? 'O' : 'X',
    winner,
    draw,
  };
}

export function makeComputerMove(state, player = 'O') {
  if (!state || state.turn !== player) {
    return state;
  }

  const move = chooseComputerMove(state, player);
  return move ? makeMove(state, move[0], move[1]) : state;
}
