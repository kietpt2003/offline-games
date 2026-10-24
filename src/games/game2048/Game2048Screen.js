import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BOARD_SIZE,
  continueGame,
  createGame,
  DIRECTIONS,
  moveGame,
} from './game2048Engine';
import { colors } from '../../themes/colors';

const BEST_SCORE_KEY = '@offline-games/2048-best-score-v1';
const BOARD_PADDING = 9;
const CELL_GAP = 8;
const TILE_COLORS = {
  2: {
    background: colors.beige_F4EBDD,
    foreground: colors.gray_655B50,
  },
  4: {
    background: colors.beige_EFE0C8,
    foreground: colors.gray_655B50,
  },
  8: { background: colors.orange_F2B179, foreground: colors.white_FFFFFF },
  16: {
    background: colors.orange_F59563,
    foreground: colors.white_FFFFFF,
  },
  32: {
    background: colors.red_F67C5F,
    foreground: colors.white_FFFFFF,
  },
  64: {
    background: colors.red_F65E3B,
    foreground: colors.white_FFFFFF,
  },
  128: {
    background: colors.orange_EDCF72,
    foreground: colors.white_FFFFFF,
  },
  256: {
    background: colors.orange_EBCB5F,
    foreground: colors.white_FFFFFF,
  },
  512: {
    background: colors.orange_E8C34D,
    foreground: colors.white_FFFFFF,
  },
  1024: {
    background: colors.brown_E6B93D,
    foreground: colors.white_FFFFFF,
  },
  2048: {
    background: colors.brown_E2AE2E,
    foreground: colors.white_FFFFFF,
  },
};

function ScoreCard({ label, score }) {
  return (
    <View
      style={styles.scoreCard}
      accessible
      accessibilityLabel={`${label}: ${score}`}
    >
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={styles.scoreValue}>{score}</Text>
    </View>
  );
}

function GameTile({ value, tileSize }) {
  const tileColors = TILE_COLORS[value] || {
    background: colors.gray_3C3A32,
    foreground: colors.white_FFFFFF,
  };
  const fontSize = value >= 1024 ? tileSize * 0.32 : tileSize * 0.4;
  const cellStyle = {
    width: tileSize,
    height: tileSize,
    backgroundColor: value
      ? tileColors.background
      : colors.beige_D7CBB9,
  };

  return (
    <View
      accessible
      accessibilityLabel={String(value)}
      style={[styles.cell, cellStyle]}
    >
      {value ? (
        <Text
          adjustsFontSizeToFit
          numberOfLines={1}
          style={[styles.tileValue, { color: tileColors.foreground, fontSize }]}
        >
          {value}
        </Text>
      ) : null}
    </View>
  );
}

function DirectionButton({ direction, onPress }) {
  const labels = {
    up: 'Lên',
    right: 'Phải',
    down: 'Xuống',
    left: 'Trái',
  };
  const arrows = { up: '↑', right: '→', down: '↓', left: '←' };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Di chuyển ${labels[direction]}`}
      onPress={() => onPress(direction)}
      style={({ pressed }) => [
        styles.directionButton,
        pressed ? styles.pressedButton : null,
      ]}
    >
      <Text style={styles.directionArrow}>{arrows[direction]}</Text>
    </Pressable>
  );
}

export function Game2048Screen({ onBack }) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const boardSize = Math.max(
    220,
    Math.min(windowWidth - 36, 440, windowHeight - 370),
  );
  const tileSize =
    (boardSize - BOARD_PADDING * 2 - CELL_GAP * (BOARD_SIZE - 1)) / BOARD_SIZE;
  const [game, setGame] = React.useState(createGame);
  const gameRef = React.useRef(game);
  const [bestScore, setBestScore] = React.useState(0);
  const [storageReady, setStorageReady] = React.useState(false);
  const moveHandlerRef = React.useRef(null);

  const updateGame = nextGame => {
    gameRef.current = nextGame;
    setGame(nextGame);
  };

  const handleMove = direction => {
    const currentGame = gameRef.current;
    const nextGame = moveGame(currentGame, direction);

    if (nextGame === currentGame) {
      return;
    }

    updateGame(nextGame);
    if (nextGame.score > currentGame.score) {
      setBestScore(currentBest => Math.max(currentBest, nextGame.score));
    }
  };

  moveHandlerRef.current = handleMove;

  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 12 || Math.abs(gesture.dy) > 12,
      onPanResponderRelease: (_, gesture) => {
        if (Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) < 24) {
          return;
        }

        const direction =
          Math.abs(gesture.dx) > Math.abs(gesture.dy)
            ? gesture.dx > 0
              ? 'right'
              : 'left'
            : gesture.dy > 0
            ? 'down'
            : 'up';

        moveHandlerRef.current(direction);
      },
    }),
  ).current;

  React.useEffect(() => {
    let isActive = true;

    AsyncStorage.getItem(BEST_SCORE_KEY)
      .then(savedScore => {
        const parsedScore = Number(savedScore);
        if (isActive && Number.isFinite(parsedScore) && parsedScore > 0) {
          setBestScore(currentBest => Math.max(currentBest, parsedScore));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isActive) {
          setStorageReady(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  React.useEffect(() => {
    if (storageReady) {
      AsyncStorage.setItem(BEST_SCORE_KEY, String(bestScore)).catch(() => {});
    }
  }, [bestScore, storageReady]);

  const handleNewGame = () => updateGame(createGame());
  const handleContinue = () => updateGame(continueGame(gameRef.current));
  const isGameFinished = game.isGameOver || (game.isWon && !game.keepPlaying);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed ? styles.pressedButton : null,
            ]}
          >
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <View style={styles.heading}>
            <Text style={styles.title}>2048</Text>
            <Text style={styles.subtitle}>Gộp ô số, chạm tới 2048</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bắt đầu ván mới"
            onPress={handleNewGame}
            style={({ pressed }) => [
              styles.newGameButton,
              pressed ? styles.pressedButton : null,
            ]}
          >
            <Text style={styles.newGameLabel}>Ván mới</Text>
          </Pressable>
        </View>

        <View style={styles.scoreRow}>
          <ScoreCard label="ĐIỂM" score={game.score} />
          <ScoreCard label="KỶ LỤC" score={bestScore} />
        </View>

        <View
          {...panResponder.panHandlers}
          accessibilityLabel="Bàn chơi 2048. Vuốt lên, xuống, trái hoặc phải để di chuyển."
          style={[
            styles.board,
            { width: boardSize, height: boardSize, padding: BOARD_PADDING },
          ]}
        >
          {game.board.map((row, rowIndex) => (
            <View
              key={`row-${rowIndex}`}
              style={[
                styles.boardRow,
                rowIndex < BOARD_SIZE - 1 ? { marginBottom: CELL_GAP } : null,
              ]}
            >
              {row.map((value, columnIndex) => (
                <View
                  key={`${rowIndex}-${columnIndex}`}
                  style={
                    columnIndex < BOARD_SIZE - 1
                      ? { marginRight: CELL_GAP }
                      : null
                  }
                >
                  <GameTile value={value} tileSize={tileSize} />
                </View>
              ))}
            </View>
          ))}
          {isGameFinished ? (
            <View style={styles.overlay}>
              <Text style={styles.overlayTitle}>
                {game.isWon ? '2048! Thật tuyệt!' : 'Hết nước đi'}
              </Text>
              <Text style={styles.overlayText}>
                {game.isWon
                  ? 'Bạn đã ghép được ô 2048.'
                  : 'Thử lại để lập kỷ lục mới nhé.'}
              </Text>
              {game.isWon && !game.keepPlaying ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={handleContinue}
                  style={({ pressed }) => [
                    styles.overlayButton,
                    pressed ? styles.pressedButton : null,
                  ]}
                >
                  <Text style={styles.overlayButtonText}>Chơi tiếp</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={handleNewGame}
                style={({ pressed }) => [
                  styles.overlayButton,
                  pressed ? styles.pressedButton : null,
                ]}
              >
                <Text style={styles.overlayButtonText}>Ván mới</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <Text style={styles.instruction}>
          Vuốt bàn cờ hoặc dùng các nút mũi tên để di chuyển ô.
        </Text>

        <View
          style={styles.directionPad}
          accessibilityLabel="Điều khiển di chuyển"
        >
          {DIRECTIONS.map(direction => (
            <DirectionButton
              key={direction}
              direction={direction}
              onPress={handleMove}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.beige_FAF7F0,
  },
  screen: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  header: {
    width: '100%',
    maxWidth: 460,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.beige_EEE7DC,
  },
  backArrow: {
    color: colors.gray_4E483F,
    fontSize: 35,
    lineHeight: 39,
    marginTop: -4,
  },
  heading: {
    flex: 1,
    paddingLeft: 12,
  },
  title: {
    color: colors.gray_4E483F,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 35,
  },
  subtitle: {
    color: colors.gray_8D8377,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  newGameButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 13,
    backgroundColor: colors.green_6C8B68,
  },
  newGameLabel: {
    color: colors.white_FFFFFF,
    fontSize: 13,
    fontWeight: '800',
  },
  pressedButton: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
  scoreRow: {
    width: '100%',
    maxWidth: 460,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 14,
  },
  scoreCard: {
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: colors.beige_EDE6DB,
  },
  scoreLabel: {
    color: colors.gray_8D8377,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  scoreValue: {
    color: colors.gray_514A40,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  board: {
    position: 'relative',
    borderRadius: 18,
    backgroundColor: colors.orange_B9AA98,
    overflow: 'hidden',
  },
  boardRow: {
    flexDirection: 'row',
    flex: 1,
  },
  cell: {
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileValue: {
    fontWeight: '900',
    letterSpacing: -1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.beige_FAF7F0_88,
  },
  overlayTitle: {
    color: colors.gray_514A40,
    fontSize: 27,
    fontWeight: '900',
    textAlign: 'center',
  },
  overlayText: {
    color: colors.gray_70665A,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  overlayButton: {
    minWidth: 140,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: colors.green_6C8B68,
  },
  overlayButtonText: {
    color: colors.white_FFFFFF,
    fontSize: 14,
    fontWeight: '800',
  },
  instruction: {
    maxWidth: 310,
    marginTop: 15,
    color: colors.gray_7D7367,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    textAlign: 'center',
  },
  directionPad: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionButton: {
    width: 54,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    marginVertical: 3,
    borderRadius: 13,
    backgroundColor: colors.beige_EDE6DB,
  },
  directionArrow: {
    color: colors.gray_514A40,
    fontSize: 24,
    fontWeight: '800',
  },
});
