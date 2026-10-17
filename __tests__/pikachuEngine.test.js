import {
  countRemainingTiles,
  createBoard,
  findAvailablePair,
  findConnectionPath,
  getLevelConfig,
  removePair,
  shiftBoard,
} from '../src/games/pikachu/pikachuEngine';

function tile(face, id) {
  return { face, id };
}

describe('Pikachu engine', () => {
  test('keeps a 16-column by 9-row board while increasing timed difficulty', () => {
    const first = getLevelConfig(1);
    const fifth = getLevelConfig(5);

    expect(first.rows).toBe(9);
    expect(first.columns).toBe(16);
    expect(fifth.rows * fifth.columns).toBe(144);
    expect(first.faceCount).toBe(36);
    expect(fifth.faceCount).toBe(36);
    expect(fifth.seconds).toBeLessThan(first.seconds);
    expect(fifth.shift).not.toBe('none');
  });

  test('creates an even board with at least one available connection', () => {
    const config = getLevelConfig(2);
    const board = createBoard(config, () => 0.42);
    const counts = new Map();

    board.flat().forEach(item => {
      counts.set(item.face, (counts.get(item.face) ?? 0) + 1);
    });

    expect(countRemainingTiles(board)).toBe(config.rows * config.columns);
    expect([...counts.values()].every(count => count % 2 === 0)).toBe(true);
    expect(counts.size).toBe(36);
    expect([...counts.values()].every(count => count === 4)).toBe(true);
    expect(findAvailablePair(board)).not.toBeNull();
  });

  test('finds direct, two-turn, and outside-board paths', () => {
    const directBoard = [[tile(0, 'a'), null, tile(0, 'b')]];
    expect(
      findConnectionPath(
        directBoard,
        { row: 0, column: 0 },
        { row: 0, column: 2 },
      ),
    ).not.toBeNull();

    const outsideBoard = [
      [tile(0, 'a'), tile(1, 'x'), tile(0, 'b')],
      [tile(2, 'y'), tile(3, 'z'), tile(4, 'w')],
    ];
    const path = findConnectionPath(
      outsideBoard,
      { row: 0, column: 0 },
      { row: 0, column: 2 },
    );

    expect(path).not.toBeNull();
    expect(path.some(point => point.row === 0)).toBe(true);
  });

  test('removes a pair and applies downward gravity', () => {
    const board = [
      [tile(0, 'a'), tile(1, 'b')],
      [tile(0, 'c'), tile(2, 'd')],
      [tile(3, 'e'), tile(4, 'f')],
    ];
    const removed = removePair(
      board,
      { row: 0, column: 0 },
      { row: 1, column: 0 },
    );
    const shifted = shiftBoard(removed, 'down');

    expect(shifted[0][0]).toBeNull();
    expect(shifted[1][0]).toBeNull();
    expect(shifted[2][0].id).toBe('e');
  });
});
