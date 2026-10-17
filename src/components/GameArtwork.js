import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const PIKACHU_PREVIEW = require('../games/pikachu/assets/tile_01.png');

function BlockArtwork() {
  const blockStyles = [
    styles.yellowBlock,
    styles.yellowBlock,
    styles.emptyBlock,
    styles.blueBlock,
    styles.redBlock,
    styles.yellowBlock,
    styles.emptyBlock,
    styles.blueBlock,
    styles.redBlock,
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

export function GameArtwork({ theme }) {
  if (theme === 'blocks') {
    return <BlockArtwork />;
  }

  if (theme === 'mahjong') {
    return <MahjongArtwork />;
  }

  return <PikachuArtwork />;
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
  yellowBlock: {
    backgroundColor: '#FFC83D',
    borderColor: '#FFFFFF66',
  },
  blueBlock: {
    backgroundColor: '#59D5E0',
    borderColor: '#FFFFFF66',
  },
  redBlock: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FFFFFF66',
  },
  emptyBlock: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
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
    backgroundColor: '#FFF9EA',
    borderBottomWidth: 5,
    borderBottomColor: '#E3D7B8',
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
    color: '#E45454',
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
    backgroundColor: '#2FA77C',
    borderWidth: 2,
    borderColor: '#176A52',
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
    backgroundColor: '#FFE268',
    borderWidth: 3,
    borderColor: '#FFF4B8',
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
    backgroundColor: '#FFFFFF',
  },
  connectorLine: {
    width: 14,
    height: 2,
    backgroundColor: '#FFFFFF',
  },
});
