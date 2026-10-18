export const MAHJONG_FACES = [
  { key: 'wan-1', type: 'wan', rank: 1, value: '一', suit: '萬' },
  { key: 'wan-2', type: 'wan', rank: 2, value: '二', suit: '萬' },
  { key: 'wan-3', type: 'wan', rank: 3, value: '三', suit: '萬' },
  { key: 'wan-4', type: 'wan', rank: 4, value: '四', suit: '萬' },
  { key: 'tong-1', type: 'tong', rank: 1, value: '1', suit: '筒' },
  { key: 'tong-2', type: 'tong', rank: 2, value: '2', suit: '筒' },
  { key: 'tong-3', type: 'tong', rank: 3, value: '3', suit: '筒' },
  { key: 'tong-4', type: 'tong', rank: 4, value: '4', suit: '筒' },
  { key: 'suo-1', type: 'suo', rank: 1, value: '1', suit: '索' },
  { key: 'suo-2', type: 'suo', rank: 2, value: '2', suit: '索' },
  { key: 'suo-3', type: 'suo', rank: 3, value: '3', suit: '索' },
  { key: 'suo-4', type: 'suo', rank: 4, value: '4', suit: '索' },
  { key: 'east', type: 'honor', value: '東', suit: 'Gió Đông' },
  { key: 'south', type: 'honor', value: '南', suit: 'Gió Nam' },
  { key: 'west', type: 'honor', value: '西', suit: 'Gió Tây' },
  { key: 'north', type: 'honor', value: '北', suit: 'Gió Bắc' },
  { key: 'red', type: 'dragon', value: '中', suit: 'Rồng đỏ' },
  { key: 'green', type: 'dragon', value: '發', suit: 'Rồng xanh' },
  { key: 'white', type: 'white', value: '□', suit: 'Rồng trắng' },
  { key: 'flower', type: 'flower', value: '梅', suit: 'Hoa mai' },
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

  // A tall pyramid keeps Vita Mahjong's layered silhouette while allowing
  // four genuinely large tiles across a portrait phone.
  addLayer(2, 1, 1, 0, 0);
  addLayer(4, 6, 0, 1, 0);
  addLayer(2, 1, 1, 7, 0);
  addLayer(3, 4, 0.5, 2, 1);

  return positions;
}

function overlaps(first, second, geometry) {
  if (geometry) {
    const horizontalDistance = Math.abs(
      (first.x - second.x) * geometry.tileWidth +
        (first.layer - second.layer) * 3,
    );
    const verticalDistance = Math.abs(
      (first.y - second.y) * geometry.rowStep -
        (first.layer - second.layer) * 5,
    );

    return (
      horizontalDistance < geometry.tileWidth - 2 &&
      verticalDistance < geometry.tileHeight - 2
    );
  }

  return Math.abs(first.x - second.x) < 1 && Math.abs(first.y - second.y) < 1;
}

function getTileStackOrder(tile) {
  return tile.layer * 100 + tile.y * 10 + tile.x;
}

export function isTileFree(tile, tiles, geometry) {
  if (!tile?.active) {
    return false;
  }

  const activeTiles = tiles.filter(item => item.active && item.id !== tile.id);
  const hasTileAbove = activeTiles.some(
    item =>
      getTileStackOrder(item) > getTileStackOrder(tile) &&
      overlaps(item, tile, geometry),
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

export function getFreeTiles(tiles, geometry) {
  return tiles.filter(tile => isTileFree(tile, tiles, geometry));
}

function createRemovalPairs(positions, random, geometry) {
  const failedStates = new Set();

  const findPairs = (remaining, pairs) => {
    if (remaining.length === 0) {
      return pairs;
    }

    const stateKey = remaining.map(tile => tile.id).join(',');

    if (failedStates.has(stateKey)) {
      return null;
    }

    const freeTiles = shuffle(getFreeTiles(remaining, geometry), random);
    const candidatePairs = [];

    for (let firstIndex = 0; firstIndex < freeTiles.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < freeTiles.length;
        secondIndex += 1
      ) {
        candidatePairs.push([freeTiles[firstIndex], freeTiles[secondIndex]]);
      }
    }

    for (const pair of shuffle(candidatePairs, random)) {
      const removedIds = new Set(pair.map(tile => tile.id));
      const nextRemaining = remaining.filter(tile => !removedIds.has(tile.id));
      const result = findPairs(nextRemaining, [...pairs, pair]);

      if (result) {
        return result;
      }
    }

    failedStates.add(stateKey);
    return null;
  };

  const pairs = findPairs(
    positions.map(position => ({ ...position, active: true })),
    [],
  );

  if (!pairs) {
    throw new Error('Không thể tạo bàn Mahjong có lời giải');
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

export function createMahjongBoard(random = Math.random, geometry) {
  const positions = createMahjongLayout();
  const removalPairs = createRemovalPairs(positions, random, geometry);
  const facePairs = createFacePairs(removalPairs.length, random);
  const faceUpStates = shuffle(
    positions.map((_, index) => index % 3 !== 0),
    random,
  );
  const facesById = new Map();

  removalPairs.forEach((pair, index) => {
    pair.forEach(tile => facesById.set(tile.id, facePairs[index]));
  });

  return positions.map((position, index) => ({
    ...position,
    ...facesById.get(position.id),
    active: true,
    faceUp: faceUpStates[index],
  }));
}

export function findAvailablePair(tiles, geometry) {
  const freeTiles = getFreeTiles(tiles, geometry).filter(tile => tile.faceUp);

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

export function removePair(tiles, firstId, secondId, geometry) {
  const first = tiles.find(tile => tile.id === firstId);
  const second = tiles.find(tile => tile.id === secondId);

  if (
    !first ||
    !second ||
    first.id === second.id ||
    first.key !== second.key ||
    !first.faceUp ||
    !second.faceUp ||
    !isTileFree(first, tiles, geometry) ||
    !isTileFree(second, tiles, geometry)
  ) {
    return tiles;
  }

  return tiles.map(tile =>
    tile.id === firstId || tile.id === secondId
      ? { ...tile, active: false }
      : tile,
  );
}

export function revealTile(tiles, tileId, geometry) {
  const tile = tiles.find(item => item.id === tileId);

  if (!tile || tile.faceUp || !isTileFree(tile, tiles, geometry)) {
    return tiles;
  }

  return tiles.map(item =>
    item.id === tileId ? { ...item, faceUp: true } : item,
  );
}

export function restoreTileFaceUpStates(tiles, faceUpStates) {
  const statesById = new Map(
    faceUpStates.map(({ id, faceUp }) => [id, faceUp]),
  );

  return tiles.map(tile =>
    statesById.has(tile.id)
      ? { ...tile, faceUp: statesById.get(tile.id) }
      : tile,
  );
}

export function shuffleRemainingTiles(tiles, random = Math.random, geometry) {
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

  const removalPairs = createRemovalPairs(activeTiles, random, geometry);
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
          type: face.type,
          rank: face.rank,
          value: face.value,
          suit: face.suit,
        }
      : tile;
  });
}
