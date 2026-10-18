import {
  createPuzzle,
  createSolvedGrid,
  getConflicts,
  isComplete,
  isValidSolution,
} from '../src/games/sudoku/sudokuEngine';

describe('Sudoku engine', () => {
  it('creates randomized complete grids that satisfy every Sudoku constraint', () => {
    const first = createSolvedGrid(() => 0.21);
    const second = createSolvedGrid(() => 0.79);

    expect(isValidSolution(first)).toBe(true);
    expect(isValidSolution(second)).toBe(true);
    expect(first).not.toEqual(second);
    expect(isValidSolution(first.map(row => [...row].reverse()))).toBe(true);
  });

  it('creates a deterministic puzzle whose clues match its valid solution', () => {
    const random = () => 0.42;
    const game = createPuzzle('easy', random);
    const repeated = createPuzzle('easy', () => 0.42);

    expect(game).toEqual(repeated);
    expect(isValidSolution(game.solution)).toBe(true);
    expect(game.puzzle).toHaveLength(9);
    expect(game.puzzle.every(row => row.length === 9)).toBe(true);

    let clueCount = 0;
    game.puzzle.forEach((row, rowIndex) => {
      row.forEach((value, columnIndex) => {
        if (value !== 0) {
          clueCount += 1;
          expect(value).toBe(game.solution[rowIndex][columnIndex]);
        }
      });
    });

    expect(clueCount).toBeGreaterThanOrEqual(40);
    expect(clueCount).toBeLessThan(81);
  });

  it('removes more clues at higher difficulty and rejects unknown levels', () => {
    const easy = createPuzzle('easy');
    const hard = createPuzzle('hard');
    const clues = puzzle => puzzle.flat().filter(value => value !== 0).length;

    expect(clues(hard.puzzle)).toBeLessThan(clues(easy.puzzle));
    expect(() => createPuzzle('expert')).toThrow(RangeError);
  });

  it('finds duplicate row, column and box entries and detects completion', () => {
    const solution = createSolvedGrid(() => 0.5);
    const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
    grid[0][0] = 4;
    grid[0][1] = 4;
    grid[1][0] = 4;

    expect(getConflicts(grid)).toEqual(new Set(['0-0', '0-1', '1-0']));
    expect(isComplete(solution, solution)).toBe(true);
    expect(isComplete(grid, solution)).toBe(false);
  });
});
