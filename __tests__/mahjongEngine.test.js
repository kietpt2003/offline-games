import {
  createMahjongBoard,
  findAvailablePair,
  getFreeTiles,
  isTileFree,
  removePair,
  revealTile,
  restoreTileFaceUpStates,
  shuffleRemainingTiles,
} from '../src/games/mahjong/mahjongEngine';

const deterministicRandom = () => 0.42;

describe('Mahjong engine', () => {
  test('creates a 40-tile board with two copies of every face', () => {
    const tiles = createMahjongBoard(deterministicRandom);
    const counts = tiles.reduce((result, tile) => {
      result[tile.key] = (result[tile.key] ?? 0) + 1;
      return result;
    }, {});

    expect(tiles).toHaveLength(40);
    expect(Object.values(counts).every(count => count === 2)).toBe(true);
    expect(tiles.some(tile => tile.faceUp)).toBe(true);
    expect(tiles.some(tile => !tile.faceUp)).toBe(true);
    expect(findAvailablePair(tiles)).not.toBeNull();
  });

  test('creates a board using the rendered tile geometry', () => {
    const geometry = { tileWidth: 86, tileHeight: 110, rowStep: 55 };
    const tiles = createMahjongBoard(deterministicRandom, geometry);

    expect(tiles).toHaveLength(40);
    expect(getFreeTiles(tiles, geometry).length).toBeGreaterThanOrEqual(2);
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

  test('blocks a tile covered by the rendered bounds of an upper layer tile', () => {
    const tiles = [
      {
        id: 'under',
        x: 1,
        y: 1,
        layer: 0,
        active: true,
        faceUp: false,
      },
      {
        id: 'upper',
        x: 0.5,
        y: 2,
        layer: 1,
        active: true,
        faceUp: true,
      },
    ];
    const geometry = { tileWidth: 100, tileHeight: 128, rowStep: 66 };

    expect(isTileFree(tiles[0], tiles, geometry)).toBe(false);
    expect(revealTile(tiles, 'under', geometry)).toBe(tiles);
  });

  test('blocks a tile overlapped by a later row in the rendered stack', () => {
    const tiles = [
      {
        id: 'under',
        x: 1,
        y: 1,
        layer: 0,
        active: true,
        faceUp: false,
      },
      {
        id: 'over',
        x: 1,
        y: 2,
        layer: 0,
        active: true,
        faceUp: true,
      },
    ];
    const geometry = { tileWidth: 86, tileHeight: 110, rowStep: 55 };

    expect(isTileFree(tiles[0], tiles, geometry)).toBe(false);
    expect(revealTile(tiles, 'under', geometry)).toBe(tiles);
  });

  test('reveals a face-down free tile but not one covered by another tile', () => {
    const tiles = [
      {
        id: 'free',
        x: 2,
        y: 0,
        layer: 0,
        active: true,
        faceUp: false,
      },
      {
        id: 'covered',
        x: 0,
        y: 0,
        layer: 0,
        active: true,
        faceUp: false,
      },
      { id: 'cover', x: 0, y: 0, layer: 1, active: true, faceUp: true },
    ];

    const revealedFreeTile = revealTile(tiles, 'free');

    expect(revealedFreeTile.find(tile => tile.id === 'free').faceUp).toBe(true);
    expect(revealTile(tiles, 'covered')).toBe(tiles);
    expect(tiles.find(tile => tile.id === 'covered').faceUp).toBe(false);
  });

  test('restores each mismatched tile to its original face-up state', () => {
    const tiles = [
      { id: 'was-down', active: true, faceUp: true },
      { id: 'was-up', active: true, faceUp: true },
    ];
    const restoredTiles = restoreTileFaceUpStates(tiles, [
      { id: 'was-down', faceUp: false },
      { id: 'was-up', faceUp: true },
    ]);

    expect(restoredTiles.map(tile => tile.faceUp)).toEqual([false, true]);
    expect(tiles.map(tile => tile.faceUp)).toEqual([true, true]);
  });

  test('removes only a matching free pair', () => {
    const board = createMahjongBoard(deterministicRandom);
    const pair = findAvailablePair(board);
    const nextBoard = removePair(board, pair[0].id, pair[1].id);

    expect(nextBoard.filter(tile => tile.active)).toHaveLength(38);
    expect(board.filter(tile => tile.active)).toHaveLength(40);
  });

  test('keeps an available pair after shuffling remaining tiles', () => {
    const board = createMahjongBoard(deterministicRandom);
    const pair = findAvailablePair(board);
    const reducedBoard = removePair(board, pair[0].id, pair[1].id);
    const shuffled = shuffleRemainingTiles(reducedBoard, () => 0.73);

    expect(getFreeTiles(shuffled).length).toBeGreaterThanOrEqual(2);
    expect(findAvailablePair(shuffled)).not.toBeNull();
  });

  test('preserves every tile face-up state when shuffling', () => {
    const geometry = { tileWidth: 86, tileHeight: 110, rowStep: 55 };
    const board = createMahjongBoard(
      deterministicRandom,
      geometry,
    );

    const shuffled = shuffleRemainingTiles(
      board,
      deterministicRandom,
      geometry,
    );

    expect(shuffled.map(tile => [tile.id, tile.faceUp])).toEqual(
      board.map(tile => [tile.id, tile.faceUp]),
    );
  });
});
