import {
  createMahjongBoard,
  findAvailablePair,
  getFreeTiles,
  isTileFree,
  removePair,
  shuffleRemainingTiles,
} from '../src/games/mahjong/mahjongEngine';

const deterministicRandom = () => 0.42;

describe('Mahjong engine', () => {
  test('creates an 80-tile board with four copies of every face', () => {
    const tiles = createMahjongBoard(deterministicRandom);
    const counts = tiles.reduce((result, tile) => {
      result[tile.key] = (result[tile.key] ?? 0) + 1;
      return result;
    }, {});

    expect(tiles).toHaveLength(80);
    expect(Object.values(counts).every(count => count === 4)).toBe(true);
    expect(findAvailablePair(tiles)).not.toBeNull();
  });

  test('only exposes tiles without a cover and with a free side', () => {
    const tiles = [
      { id: 'left', x: 0, y: 0, layer: 0, active: true },
      { id: 'middle', x: 1, y: 0, layer: 0, active: true },
      { id: 'right', x: 2, y: 0, layer: 0, active: true },
      { id: 'cover', x: 0, y: 0, layer: 1, active: true },
    ];

    expect(isTileFree(tiles[0], tiles)).toBe(false);
    expect(isTileFree(tiles[1], tiles)).toBe(false);
    expect(isTileFree(tiles[2], tiles)).toBe(true);
  });

  test('removes only a matching free pair', () => {
    const board = createMahjongBoard(deterministicRandom);
    const pair = findAvailablePair(board);
    const nextBoard = removePair(board, pair[0].id, pair[1].id);

    expect(nextBoard.filter(tile => tile.active)).toHaveLength(78);
    expect(board.filter(tile => tile.active)).toHaveLength(80);
  });

  test('keeps an available pair after shuffling remaining tiles', () => {
    const board = createMahjongBoard(deterministicRandom);
    const pair = findAvailablePair(board);
    const reducedBoard = removePair(board, pair[0].id, pair[1].id);
    const shuffled = shuffleRemainingTiles(reducedBoard, () => 0.73);

    expect(getFreeTiles(shuffled).length).toBeGreaterThanOrEqual(2);
    expect(findAvailablePair(shuffled)).not.toBeNull();
  });
});
