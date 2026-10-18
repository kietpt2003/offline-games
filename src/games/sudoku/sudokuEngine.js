const SIZE = 9;
const BOX_SIZE = 3;

const DIFFICULTIES = {
  easy: { minClues: 40, targetClues: 42 },
  medium: { minClues: 32, targetClues: 34 },
  hard: { minClues: 26, targetClues: 28 },
};

function shuffle(items, random) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.min(
      index,
      Math.max(0, Math.floor(random() * (index + 1))),
    );
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
}

function shuffledIndexes(random) {
  return shuffle([0, 1, 2], random).flatMap(group =>
    shuffle([0, 1, 2], random).map(offset => group * 3 + offset),
  );
}

function pattern(row, column) {
  return (
    (BOX_SIZE * (row % BOX_SIZE) + Math.floor(row / BOX_SIZE) + column) % SIZE
  );
}

export function createSolvedGrid(random = Math.random) {
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
  const rows = shuffledIndexes(random);
  const columns = shuffledIndexes(random);

  return rows.map(row => columns.map(column => digits[pattern(row, column)]));
}

export function isValidSolution(grid) {
  if (
    !Array.isArray(grid) ||
    grid.length !== SIZE ||
    grid.some(row => !Array.isArray(row) || row.length !== SIZE)
  ) {
    return false;
  }

  const expected = '123456789';
  const hasAllDigits = values =>
    values.every(
      value => Number.isInteger(value) && value >= 1 && value <= 9,
    ) && [...values].sort().join('') === expected;

  if (!grid.every(hasAllDigits)) {
    return false;
  }

  for (let index = 0; index < SIZE; index += 1) {
    if (!hasAllDigits(grid.map(row => row[index]))) {
      return false;
    }

    const box = [];
    for (
      let row = Math.floor(index / BOX_SIZE) * BOX_SIZE;
      row < Math.floor(index / BOX_SIZE) * BOX_SIZE + BOX_SIZE;
      row += 1
    ) {
      for (
        let column = (index % BOX_SIZE) * BOX_SIZE;
        column < (index % BOX_SIZE) * BOX_SIZE + BOX_SIZE;
        column += 1
      ) {
        box.push(grid[row][column]);
      }
    }
    if (!hasAllDigits(box)) {
      return false;
    }
  }

  return true;
}

/* eslint-disable no-bitwise */
function countSolutions(puzzle, limit = 2) {
  const grid = puzzle.map(row => [...row]);
  const rowMasks = Array(SIZE).fill(0);
  const columnMasks = Array(SIZE).fill(0);
  const boxMasks = Array(SIZE).fill(0);

  for (let row = 0; row < SIZE; row += 1) {
    for (let column = 0; column < SIZE; column += 1) {
      const value = grid[row][column];
      if (!value) {
        continue;
      }

      const bit = 1 << value;
      const box =
        Math.floor(row / BOX_SIZE) * BOX_SIZE + Math.floor(column / BOX_SIZE);
      if (
        rowMasks[row] & bit ||
        columnMasks[column] & bit ||
        boxMasks[box] & bit
      ) {
        return 0;
      }
      rowMasks[row] |= bit;
      columnMasks[column] |= bit;
      boxMasks[box] |= bit;
    }
  }

  let solutions = 0;
  const solve = () => {
    if (solutions >= limit) {
      return;
    }

    let bestRow = -1;
    let bestColumn = -1;
    let bestCandidates = 0;
    let bestCount = SIZE + 1;

    for (let row = 0; row < SIZE; row += 1) {
      for (let column = 0; column < SIZE; column += 1) {
        if (grid[row][column]) {
          continue;
        }
        const box =
          Math.floor(row / BOX_SIZE) * BOX_SIZE + Math.floor(column / BOX_SIZE);
        const candidates =
          0x3fe & ~(rowMasks[row] | columnMasks[column] | boxMasks[box]);
        const count = countBits(candidates);
        if (count === 0) {
          return;
        }
        if (count < bestCount) {
          bestRow = row;
          bestColumn = column;
          bestCandidates = candidates;
          bestCount = count;
          if (count === 1) {
            break;
          }
        }
      }
      if (bestCount === 1) {
        break;
      }
    }

    if (bestRow === -1) {
      solutions += 1;
      return;
    }

    const box =
      Math.floor(bestRow / BOX_SIZE) * BOX_SIZE +
      Math.floor(bestColumn / BOX_SIZE);
    for (let value = 1; value <= SIZE; value += 1) {
      const bit = 1 << value;
      if (!(bestCandidates & bit)) {
        continue;
      }
      grid[bestRow][bestColumn] = value;
      rowMasks[bestRow] |= bit;
      columnMasks[bestColumn] |= bit;
      boxMasks[box] |= bit;
      solve();
      grid[bestRow][bestColumn] = 0;
      rowMasks[bestRow] &= ~bit;
      columnMasks[bestColumn] &= ~bit;
      boxMasks[box] &= ~bit;
      if (solutions >= limit) {
        return;
      }
    }
  };

  solve();
  return solutions;
}

function countBits(value) {
  let count = 0;
  for (; value; value &= value - 1) {
    count += 1;
  }
  return count;
}
/* eslint-enable no-bitwise */

export function createPuzzle(difficulty = 'easy', random = Math.random) {
  const config = DIFFICULTIES[difficulty];
  if (!config) {
    throw new RangeError(`Unknown Sudoku difficulty: ${difficulty}`);
  }

  const solution = createSolvedGrid(random);
  const puzzle = solution.map(row => [...row]);
  const cells = shuffle(
    Array.from({ length: SIZE * SIZE }, (_, index) => index),
    random,
  );
  let clues = SIZE * SIZE;

  for (const cell of cells) {
    if (clues <= config.targetClues) {
      break;
    }

    const row = Math.floor(cell / SIZE);
    const column = cell % SIZE;
    const value = puzzle[row][column];
    puzzle[row][column] = 0;

    if (countSolutions(puzzle) === 1) {
      clues -= 1;
    } else {
      puzzle[row][column] = value;
    }

    if (clues <= config.minClues) {
      break;
    }
  }

  return { puzzle, solution, difficulty };
}

export function getConflicts(grid) {
  const conflicts = new Set();
  const markDuplicates = positions => {
    const cellsByValue = new Map();
    positions.forEach(([row, column]) => {
      const value = grid[row]?.[column];
      if (!value) {
        return;
      }
      const positionsForValue = cellsByValue.get(value) ?? [];
      positionsForValue.push(`${row}-${column}`);
      cellsByValue.set(value, positionsForValue);
    });

    cellsByValue.forEach(cells => {
      if (cells.length > 1) {
        cells.forEach(cell => conflicts.add(cell));
      }
    });
  };

  for (let index = 0; index < SIZE; index += 1) {
    markDuplicates(Array.from({ length: SIZE }, (_, cell) => [index, cell]));
    markDuplicates(Array.from({ length: SIZE }, (_, cell) => [cell, index]));
  }

  for (let row = 0; row < SIZE; row += BOX_SIZE) {
    for (let column = 0; column < SIZE; column += BOX_SIZE) {
      markDuplicates(
        Array.from({ length: SIZE }, (_, index) => [
          row + Math.floor(index / BOX_SIZE),
          column + (index % BOX_SIZE),
        ]),
      );
    }
  }

  return conflicts;
}

export function isComplete(grid, solution) {
  return (
    Array.isArray(grid) &&
    Array.isArray(solution) &&
    grid.length === SIZE &&
    grid.every(
      (row, rowIndex) =>
        Array.isArray(row) &&
        row.length === SIZE &&
        row.every(
          (value, columnIndex) => value === solution[rowIndex]?.[columnIndex],
        ),
    )
  );
}
