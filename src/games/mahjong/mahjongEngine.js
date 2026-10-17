export const MAHJONG_FACES = [
  { key: 'wan-1', value: '一', suit: '萬', color: '#D64B3C' },
  { key: 'wan-2', value: '二', suit: '萬', color: '#D64B3C' },
  { key: 'wan-3', value: '三', suit: '萬', color: '#D64B3C' },
  { key: 'wan-4', value: '四', suit: '萬', color: '#D64B3C' },
  { key: 'wan-5', value: '五', suit: '萬', color: '#D64B3C' },
  { key: 'wan-6', value: '六', suit: '萬', color: '#D64B3C' },
  { key: 'wan-7', value: '七', suit: '萬', color: '#D64B3C' },
  { key: 'tong-1', value: '1', suit: '筒', color: '#168B73' },
  { key: 'tong-2', value: '2', suit: '筒', color: '#168B73' },
  { key: 'tong-3', value: '3', suit: '筒', color: '#168B73' },
  { key: 'tong-4', value: '4', suit: '筒', color: '#168B73' },
  { key: 'tong-5', value: '5', suit: '筒', color: '#168B73' },
  { key: 'tong-6', value: '6', suit: '筒', color: '#168B73' },
  { key: 'tong-7', value: '7', suit: '筒', color: '#168B73' },
  { key: 'east', value: '東', suit: 'Gió', color: '#244F83' },
  { key: 'south', value: '南', suit: 'Gió', color: '#244F83' },
  { key: 'west', value: '西', suit: 'Gió', color: '#244F83' },
  { key: 'north', value: '北', suit: 'Gió', color: '#244F83' },
  { key: 'red', value: '中', suit: 'Rồng', color: '#C83D36' },
  { key: 'green', value: '發', suit: 'Rồng', color: '#168B59' },
];

function shuffle(items, random) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(random() * (index + 1));
    const current = shuffled[index];

    shuffled[index] = shuffled[targetIndex];
    shuffled[targetIndex] = current;
  }

  return shuffled;
}

export function createMahjongLayout() {
  const positions = [];
  let id = 0;

  const addLayer = (columns, rows, startX, startY, layer) => {
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        positions.push({
          id: `mahjong-${id}`,
          x: startX + column,
          y: startY + row,
          layer,
        });
        id += 1;
      }
    }
  };

  addLayer(8, 6, 0, 0, 0);
  addLayer(6, 4, 1, 1, 1);
  addLayer(4, 2, 2, 2, 2);

  return positions;
}

function overlaps(first, second) {
  return Math.abs(first.x - second.x) < 1 && Math.abs(first.y - second.y) < 1;
}

export function isTileFree(tile, tiles) {
  if (!tile?.active) {
    return false;
  }

  const activeTiles = tiles.filter(item => item.active && item.id !== tile.id);
  const hasTileAbove = activeTiles.some(
    item => item.layer > tile.layer && overlaps(item, tile),
  );

  if (hasTileAbove) {
    return false;
  }

  const hasLeftNeighbor = activeTiles.some(
    item =>
      item.layer === tile.layer &&
      Math.abs(item.x - (tile.x - 1)) < 0.01 &&
      Math.abs(item.y - tile.y) < 0.9,
  );
  const hasRightNeighbor = activeTiles.some(
    item =>
      item.layer === tile.layer &&
      Math.abs(item.x - (tile.x + 1)) < 0.01 &&
      Math.abs(item.y - tile.y) < 0.9,
  );

  return !hasLeftNeighbor || !hasRightNeighbor;
}

export function getFreeTiles(tiles) {
  return tiles.filter(tile => isTileFree(tile, tiles));
}

function createRemovalPairs(positions, random) {
  let remaining = positions.map(position => ({ ...position, active: true }));
  const pairs = [];

  while (remaining.length > 0) {
    const freeTiles = shuffle(getFreeTiles(remaining), random);

    if (freeTiles.length < 2) {
      throw new Error('Không thể tạo bàn Mahjong có lời giải');
    }

    const pair = freeTiles.slice(0, 2);
    const removedIds = new Set(pair.map(tile => tile.id));

    pairs.push(pair);
    remaining = remaining.filter(tile => !removedIds.has(tile.id));
  }

  return pairs;
}

function createFacePairs(pairCount, random) {
  const pairsPerFace = pairCount / MAHJONG_FACES.length;
  const pairFaces = [];

  MAHJONG_FACES.forEach(face => {
    for (let index = 0; index < pairsPerFace; index += 1) {
      pairFaces.push(face);
    }
  });

  return shuffle(pairFaces, random);
}

export function createMahjongBoard(random = Math.random) {
  const positions = createMahjongLayout();
  const removalPairs = createRemovalPairs(positions, random);
  const facePairs = createFacePairs(removalPairs.length, random);
  const facesById = new Map();

  removalPairs.forEach((pair, index) => {
    pair.forEach(tile => facesById.set(tile.id, facePairs[index]));
  });

  return positions.map(position => ({
    ...position,
    ...facesById.get(position.id),
    active: true,
  }));
}

export function findAvailablePair(tiles) {
  const freeTiles = getFreeTiles(tiles);

  for (let firstIndex = 0; firstIndex < freeTiles.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < freeTiles.length;
      secondIndex += 1
    ) {
      if (freeTiles[firstIndex].key === freeTiles[secondIndex].key) {
        return [freeTiles[firstIndex], freeTiles[secondIndex]];
      }
    }
  }

  return null;
}

export function removePair(tiles, firstId, secondId) {
  const first = tiles.find(tile => tile.id === firstId);
  const second = tiles.find(tile => tile.id === secondId);

  if (
    !first ||
    !second ||
    first.id === second.id ||
    first.key !== second.key ||
    !isTileFree(first, tiles) ||
    !isTileFree(second, tiles)
  ) {
    return tiles;
  }

  return tiles.map(tile =>
    tile.id === firstId || tile.id === secondId
      ? { ...tile, active: false }
      : tile,
  );
}

export function shuffleRemainingTiles(tiles, random = Math.random) {
  const activeTiles = tiles.filter(tile => tile.active);

  if (activeTiles.length < 2) {
    return tiles;
  }

  const counts = activeTiles.reduce((result, tile) => {
    result.set(tile.key, (result.get(tile.key) ?? 0) + 1);
    return result;
  }, new Map());
  const faceByKey = new Map(tiles.map(tile => [tile.key, tile]));
  const pairFaces = [];

  counts.forEach((count, key) => {
    for (let index = 0; index < count / 2; index += 1) {
      pairFaces.push(faceByKey.get(key));
    }
  });

  const removalPairs = createRemovalPairs(activeTiles, random);
  const shuffledFaces = shuffle(pairFaces, random);
  const facesById = new Map();

  removalPairs.forEach((pair, index) => {
    pair.forEach(tile => facesById.set(tile.id, shuffledFaces[index]));
  });

  return tiles.map(tile => {
    const face = facesById.get(tile.id);

    return face
      ? {
          ...tile,
          key: face.key,
          value: face.value,
          suit: face.suit,
          color: face.color,
        }
      : tile;
  });
}
