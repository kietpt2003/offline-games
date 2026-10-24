import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameArtwork } from './GameArtwork';
import { IconPlay } from '../icons';
import { colors } from '../themes/colors';

export function GameCard({ game, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Chơi ${game.name}`}
      onPress={() => onPress(game)}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: game.color },
        pressed && styles.pressed,
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.accentCircle, { backgroundColor: game.accentColor }]}
      />

      <View style={styles.artwork}>
        <GameArtwork theme={game.theme} />
      </View>

      <View style={styles.content}>
        <View style={styles.titleGroup}>
          <Text numberOfLines={1} style={styles.title}>
            {game.name}
          </Text>
          <Text numberOfLines={1} style={styles.description}>
            {game.description}
          </Text>
        </View>

        <View style={styles.playButton}>
          <IconPlay width={13} height={13} color={colors.blue_343A52} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: 14,
    shadowColor: colors.blue_20263A,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 5,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  accentCircle: {
    position: 'absolute',
    width: 136,
    height: 136,
    top: -42,
    right: -38,
    borderRadius: 68,
    opacity: 0.56,
  },
  artwork: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    color: colors.blue_263650,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  description: {
    marginTop: 3,
    color: colors.blue_607087,
    fontSize: 11,
    fontWeight: '500',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    flexShrink: 0,
    overflow: 'hidden',
    backgroundColor: colors.white_FFFFFF,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
