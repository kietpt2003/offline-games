import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../themes/colors';

const PIKACHU_PREVIEW = require('../games/pikachu/assets/tile_01.png');

function BlockArtwork() {
  const blockStyles = [
    styles.blueBlock,
    styles.blueBlock,
    styles.emptyBlock,
    styles.blueBlock,
    styles.blueBlock,
    styles.blueBlock,
    styles.emptyBlock,
    styles.blueBlock,
    styles.blueBlock,
  ];

  return (
    <View style={styles.blockGrid}>
      {blockStyles.map((blockStyle, index) => (
        <View key={index} style={[styles.block, blockStyle]} />
      ))}
    </View>
  );
}

function MahjongArtwork() {
  return (
    <View style={styles.mahjongGroup}>
      <View style={[styles.mahjongTile, styles.mahjongTileBack]}>
        <Text style={styles.mahjongCharacter}>萬</Text>
      </View>
      <View style={[styles.mahjongTile, styles.mahjongTileFront]}>
        <View style={styles.mahjongDots}>
          {[0, 1, 2, 3].map(dot => (
            <View key={dot} style={styles.mahjongDot} />
          ))}
        </View>
      </View>
    </View>
  );
}

function PikachuArtwork() {
  return (
    <View style={styles.pikachuGroup}>
      <View style={styles.pikachuTile}>
        <Image source={PIKACHU_PREVIEW} style={styles.pikachuImage} />
      </View>
      <View style={styles.connector}>
        <View style={styles.connectorDot} />
        <View style={styles.connectorLine} />
        <View style={styles.connectorDot} />
      </View>
      <View style={styles.pikachuTile}>
        <Image source={PIKACHU_PREVIEW} style={styles.pikachuImage} />
      </View>
    </View>
  );
}

function Game2048Artwork() {
  return (
    <View style={styles.numberGrid}>
      <Text style={[styles.numberTile, styles.numberTileLight]}>2</Text>
      <Text style={[styles.numberTile, styles.numberTileMedium]}>4</Text>
      <Text style={[styles.numberTile, styles.numberTileStrong]}>8</Text>
      <Text style={[styles.numberTile, styles.numberTileBright]}>16</Text>
    </View>
  );
}

function GomokuArtwork() {
  return (
    <View style={styles.gomokuBoard}>
      <View style={styles.gomokuLineVertical} />
      <View style={styles.gomokuLineHorizontal} />
      <View style={[styles.gomokuStone, styles.gomokuStoneDark]} />
      <View style={[styles.gomokuStone, styles.gomokuStoneLight]} />
      <View style={[styles.gomokuStone, styles.gomokuStoneDarkSecond]} />
    </View>
  );
}

function SudokuArtwork() {
  return (
    <View style={styles.sudokuGrid}>
      {['1', '', '3', '4', '5', '', '7', '8', '9'].map((digit, index) => (
        <View
          key={index}
          style={[
            styles.sudokuCell,
            index === 2 || index === 5 ? styles.sudokuCellDivider : null,
          ]}
        >
          <Text style={styles.sudokuDigit}>{digit}</Text>
        </View>
      ))}
    </View>
  );
}

function MinesweeperArtwork() {
  return (
    <View style={styles.mineBoard}>
      <View style={styles.mineCell}>
        <Text style={styles.mineNumber}>1</Text>
      </View>
      <View style={styles.mineCellOpen}>
        <Text style={styles.mineNumberTwo}>2</Text>
      </View>
      <View style={styles.mineCell}>
        <Text style={styles.mineFlag}>⚑</Text>
      </View>
      <View style={styles.mineCell}>
        <Text style={styles.mineMark}>✹</Text>
      </View>
    </View>
  );
}

export function GameArtwork({ theme }) {
  if (theme === 'blocks') {
    return <BlockArtwork />;
  }

  if (theme === 'mahjong') {
    return <MahjongArtwork />;
  }

  if (theme === 'pikachu') {
    return <PikachuArtwork />;
  }

  if (theme === '2048') {
    return <Game2048Artwork />;
  }

  if (theme === 'gomoku') {
    return <GomokuArtwork />;
  }

  if (theme === 'sudoku') {
    return <SudokuArtwork />;
  }

  return <MinesweeperArtwork />;
}

const styles = StyleSheet.create({
  blockGrid: {
    width: 76,
    height: 76,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    transform: [{ rotate: '-5deg' }],
  },
  block: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1,
  },
  blueBlock: {
    backgroundColor: colors.orange_E5B46F,
    borderColor: colors.white_FFFFFFAA,
  },
  emptyBlock: {
    backgroundColor: colors.transparent,
    borderColor: colors.transparent,
  },
  mahjongGroup: {
    width: 92,
    height: 82,
  },
  mahjongTile: {
    position: 'absolute',
    width: 56,
    height: 72,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.beige_FFF9EA,
    borderBottomWidth: 5,
    borderBottomColor: colors.beige_E3D7B8,
  },
  mahjongTileBack: {
    left: 4,
    top: 0,
    transform: [{ rotate: '-10deg' }],
  },
  mahjongTileFront: {
    right: 2,
    bottom: 0,
    transform: [{ rotate: '8deg' }],
  },
  mahjongCharacter: {
    color: colors.red_E45454,
    fontSize: 26,
    fontWeight: '900',
  },
  mahjongDots: {
    width: 32,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  mahjongDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.green_2FA77C,
    borderWidth: 2,
    borderColor: colors.green_176A52,
  },
  pikachuGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pikachuTile: {
    width: 44,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orange_FFE268,
    borderWidth: 3,
    borderColor: colors.yellow_FFF4B8,
  },
  pikachuImage: {
    width: 38,
    height: 42,
  },
  connector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectorDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.white_FFFFFF,
  },
  connectorLine: {
    width: 14,
    height: 2,
    backgroundColor: colors.white_FFFFFF,
  },
  numberGrid: {
    width: 112,
    height: 112,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    transform: [{ rotate: '-7deg' }],
  },
  numberTile: {
    width: 51,
    height: 51,
    borderRadius: 9,
    color: colors.brown_6D5038,
    fontSize: 24,
    lineHeight: 51,
    fontWeight: '900',
    textAlign: 'center',
    overflow: 'hidden',
  },
  numberTileLight: {
    backgroundColor: colors.beige_F5E8D5,
  },
  numberTileMedium: {
    backgroundColor: colors.beige_EBD5B7,
  },
  numberTileStrong: {
    backgroundColor: colors.orange_D6AE7D,
  },
  numberTileBright: {
    backgroundColor: colors.brown_C88E55,
    color: colors.white_FFFFFF,
  },
  gomokuBoard: {
    width: 102,
    height: 102,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orange_E8C989,
    borderRadius: 12,
  },
  gomokuLineVertical: {
    position: 'absolute',
    width: 2,
    height: 76,
    backgroundColor: colors.brown_8C6635,
  },
  gomokuLineHorizontal: {
    position: 'absolute',
    width: 76,
    height: 2,
    backgroundColor: colors.brown_8C6635,
  },
  gomokuStone: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  gomokuStoneDark: {
    left: 23,
    top: 23,
    backgroundColor: colors.blue_26313A,
  },
  gomokuStoneLight: {
    right: 23,
    top: 23,
    backgroundColor: colors.yellow_FFFDF3,
    borderWidth: 1,
    borderColor: colors.brown_A89370,
  },
  gomokuStoneDarkSecond: {
    left: 23,
    bottom: 23,
    backgroundColor: colors.blue_26313A,
  },
  sudokuGrid: {
    width: 104,
    height: 104,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.white_FFFFFF,
    borderWidth: 3,
    borderColor: colors.blue_4975A7,
    borderRadius: 8,
    overflow: 'hidden',
  },
  sudokuCell: {
    width: '33.33%',
    height: '33.33%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.blue_B7C9DC,
  },
  sudokuCellDivider: {
    backgroundColor: colors.blue_E2ECF6,
  },
  sudokuDigit: {
    color: colors.blue_355E8C,
    fontSize: 18,
    fontWeight: '800',
  },
  mineBoard: {
    width: 102,
    height: 102,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignContent: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray_AAB7B2,
    borderRadius: 12,
    padding: 10,
  },
  mineCell: {
    width: 35,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green_D8E2DE,
    borderRadius: 5,
  },
  mineCellOpen: {
    width: 35,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green_F3F6F4,
    borderRadius: 5,
  },
  mineNumber: {
    color: colors.blue_2674C6,
    fontSize: 21,
    fontWeight: '900',
  },
  mineNumberTwo: {
    color: colors.green_36934E,
    fontSize: 21,
    fontWeight: '900',
  },
  mineFlag: {
    color: colors.red_D44D48,
    fontSize: 22,
    fontWeight: '900',
  },
  mineMark: {
    color: colors.gray_303B38,
    fontSize: 24,
    fontWeight: '900',
  },
});
