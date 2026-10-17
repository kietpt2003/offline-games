import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Image,
  Modal,
  NativeModules,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  countRemainingTiles,
  createBoard,
  findAvailablePair,
  findConnectionPath,
  getLevelConfig,
  removePair,
  shiftBoard,
  shuffleBoard,
} from './pikachuEngine';
import { createPikachuAudio } from './pikachuAudio';

const GAME_KEY = '@offline-games/pikachu-state-v2';
const BEST_KEY = '@offline-games/pikachu-best-v1';
const SOUND_KEY = '@offline-games/pikachu-sound-enabled-v1';
const CONNECT_DELAY = 260;
const BOARD_GUTTER_RATIO = 0.32;
const { ScreenOrientation } = NativeModules;

const TILE_IMAGES = [
  require('./assets/tile_01.png'),
  require('./assets/tile_02.png'),
  require('./assets/tile_03.png'),
  require('./assets/tile_04.png'),
  require('./assets/tile_05.png'),
  require('./assets/tile_06.png'),
  require('./assets/tile_07.png'),
  require('./assets/tile_08.png'),
  require('./assets/tile_09.png'),
  require('./assets/tile_10.png'),
  require('./assets/tile_11.png'),
  require('./assets/tile_12.png'),
  require('./assets/tile_13.png'),
  require('./assets/tile_14.png'),
  require('./assets/tile_15.png'),
  require('./assets/tile_16.png'),
  require('./assets/tile_17.png'),
  require('./assets/tile_18.png'),
  require('./assets/tile_19.png'),
  require('./assets/tile_20.png'),
  require('./assets/tile_21.png'),
  require('./assets/tile_22.png'),
  require('./assets/tile_23.png'),
  require('./assets/tile_24.png'),
  require('./assets/tile_25.png'),
  require('./assets/tile_26.png'),
  require('./assets/tile_27.png'),
  require('./assets/tile_28.png'),
  require('./assets/tile_29.png'),
  require('./assets/tile_30.png'),
  require('./assets/tile_31.png'),
  require('./assets/tile_32.png'),
  require('./assets/tile_33.png'),
  require('./assets/tile_34.png'),
  require('./assets/tile_35.png'),
  require('./assets/tile_36.png'),
];

function createLevel(level) {
  const config = getLevelConfig(level);
  return { config, board: createBoard(config), timeLeft: config.seconds };
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function IconButton({ label, icon, disabled = false, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        disabled ? styles.disabledButton : null,
        pressed ? styles.buttonPressed : null,
      ]}
    >
      <Text style={styles.iconButtonText}>{icon}</Text>
    </Pressable>
  );
}

export function PikachuScreen({ onBack }) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const initialLevel = useMemo(() => createLevel(1), []);
  const [level, setLevel] = useState(1);
  const [board, setBoard] = useState(initialLevel.board);
  const [timeLeft, setTimeLeft] = useState(initialLevel.timeLeft);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [hint, setHint] = useState([]);
  const [connectionPath, setConnectionPath] = useState([]);
  const [message, setMessage] = useState('Chọn hai hình giống nhau để nối');
  const [isResolving, setIsResolving] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const timeoutRef = useRef(null);
  const audioRef = useRef(null);
  const config = getLevelConfig(level);
  const remainingTiles = countRemainingTiles(board);
  const isLandscape = windowWidth > windowHeight;
  const cellSize = Math.min(
    44,
    Math.floor((windowWidth - 220) / (config.columns + BOARD_GUTTER_RATIO * 2)),
    Math.floor((windowHeight - 12) / (config.rows + BOARD_GUTTER_RATIO * 2)),
  );
  const boardGutter = cellSize * BOARD_GUTTER_RATIO;
  const boardWidth = cellSize * config.columns + boardGutter * 2;
  const boardHeight = cellSize * config.rows + boardGutter * 2;
  const sidePanelWidth = Math.max(84, (windowWidth - boardWidth - 36) / 2);
  const pathSize = Math.max(5, cellSize * 0.15);

  const getPathOffset = (index, count) => {
    if (index === 0) {
      return boardGutter / 2;
    }

    if (index === count + 1) {
      return boardGutter + count * cellSize + boardGutter / 2;
    }

    return boardGutter + (index - 0.5) * cellSize;
  };

  useEffect(() => {
    ScreenOrientation?.lockLandscape();

    return () => ScreenOrientation?.lockPortrait();
  }, []);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(GAME_KEY),
      AsyncStorage.getItem(BEST_KEY),
      AsyncStorage.getItem(SOUND_KEY),
    ])
      .then(([savedGame, savedBest, savedSoundEnabled]) => {
        if (savedBest) {
          setBestScore(Number(savedBest) || 0);
        }

        if (savedGame) {
          const state = JSON.parse(savedGame);
          const savedConfig = getLevelConfig(state.level);

          if (
            Array.isArray(state.board) &&
            state.board.length === savedConfig.rows &&
            state.board[0]?.length === savedConfig.columns &&
            state.timeLeft > 0
          ) {
            setLevel(state.level);
            setBoard(state.board);
            setTimeLeft(state.timeLeft);
            setScore(state.score || 0);
            setMessage('Đã tiếp tục ván chơi trước');
          }
        }

        if (savedSoundEnabled !== null) {
          setSoundEnabled(savedSoundEnabled === 'true');
        }
      })
      .catch(() => {})
      .finally(() => setIsHydrated(true));

    return () => clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => {
    const audio = createPikachuAudio(soundEnabled);
    const appStateSubscription = AppState.addEventListener(
      'change',
      nextState => audio.setAppActive(nextState === 'active'),
    );

    audioRef.current = audio;

    return () => {
      appStateSubscription.remove();
      audioRef.current = null;
      audio.release();
    };
    // Audio is created once; later changes are handled by setEnabled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    audioRef.current?.setEnabled(soundEnabled);

    if (isHydrated) {
      AsyncStorage.setItem(SOUND_KEY, String(soundEnabled)).catch(() => {});
    }
  }, [isHydrated, soundEnabled]);

  useEffect(() => {
    if (!isHydrated || gameOver || levelComplete || isResolving) {
      return undefined;
    }

    const timer = setInterval(() => {
      setTimeLeft(currentTime => {
        if (currentTime <= 1) {
          setGameOver(true);
          return 0;
        }

        return currentTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameOver, isHydrated, isResolving, levelComplete]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    AsyncStorage.setItem(
      GAME_KEY,
      JSON.stringify({ level, board, timeLeft, score }),
    ).catch(() => {});
  }, [board, isHydrated, level, score, timeLeft]);

  useEffect(() => {
    if (score <= bestScore) {
      return;
    }

    setBestScore(score);
    AsyncStorage.setItem(BEST_KEY, String(score)).catch(() => {});
  }, [bestScore, score]);

  const resetSelection = () => {
    setSelected(null);
    setHint([]);
    setConnectionPath([]);
  };

  const startLevel = nextLevel => {
    const next = createLevel(nextLevel);
    clearTimeout(timeoutRef.current);
    setLevel(nextLevel);
    setBoard(next.board);
    setTimeLeft(next.timeLeft);
    resetSelection();
    setIsResolving(false);
    setLevelComplete(false);
    setGameOver(false);
    setMessage(`Cấp ${nextLevel} • ${next.config.faceCount} loại hình`);
  };

  const startNewGame = () => {
    setScore(0);
    startLevel(1);
  };

  const handleTilePress = position => {
    if (isResolving || gameOver || levelComplete) {
      return;
    }

    setHint([]);

    if (!selected) {
      audioRef.current?.playSelect();
      setSelected(position);
      setMessage('Chọn hình thứ hai giống hình này');
      return;
    }

    if (selected.row === position.row && selected.column === position.column) {
      setSelected(null);
      setMessage('Đã bỏ chọn');
      return;
    }

    const firstTile = board[selected.row][selected.column];
    const secondTile = board[position.row][position.column];

    if (!firstTile || firstTile.face !== secondTile.face) {
      audioRef.current?.playError();
      setSelected(position);
      setMessage('Hai hình chưa giống nhau');
      return;
    }

    const path = findConnectionPath(board, selected, position);

    if (!path) {
      audioRef.current?.playError();
      setSelected(position);
      setMessage('Không thể nối bằng đường tối đa 2 lần rẽ');
      return;
    }

    setIsResolving(true);
    audioRef.current?.playSuccess();
    setConnectionPath(path);
    setMessage('Nối thành công!');

    timeoutRef.current = setTimeout(() => {
      const removedBoard = removePair(board, selected, position);
      let nextBoard = shiftBoard(removedBoard, config.shift);
      const nextRemaining = countRemainingTiles(nextBoard);

      if (nextRemaining > 0 && !findAvailablePair(nextBoard)) {
        nextBoard = shuffleBoard(nextBoard);
        setMessage('Tự động xáo vì không còn đường nối');
      } else {
        setMessage(`+${100 + level * 20} điểm`);
      }

      setBoard(nextBoard);
      setScore(currentScore => currentScore + 100 + level * 20);
      resetSelection();
      setIsResolving(false);

      if (nextRemaining === 0) {
        setScore(currentScore => currentScore + timeLeft * 5);
        setLevelComplete(true);
      }
    }, CONNECT_DELAY);
  };

  const handleHint = () => {
    audioRef.current?.playSelect();
    const pair = findAvailablePair(board);

    if (!pair) {
      setBoard(currentBoard => shuffleBoard(currentBoard));
      setMessage('Đã xáo lại bàn chơi');
      return;
    }

    setSelected(null);
    setHint([pair.first, pair.second]);
    setScore(currentScore => Math.max(0, currentScore - 20));
    setMessage('Hai ô sáng có thể nối • -20 điểm');
  };

  const handleShuffle = () => {
    audioRef.current?.playSelect();
    setBoard(currentBoard => shuffleBoard(currentBoard));
    setScore(currentScore => Math.max(0, currentScore - 50));
    resetSelection();
    setMessage('Đã xáo bàn • -50 điểm');
  };

  const toggleSound = () => {
    setSoundEnabled(currentValue => !currentValue);
  };

  const isPositionIn = (positions, row, column) =>
    positions.some(item => item.row === row && item.column === column);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View
        style={[
          styles.container,
          isLandscape ? styles.landscapeContainer : null,
        ]}
      >
        <View
          style={[
            styles.sidePanel,
            isLandscape ? { width: sidePanelWidth } : null,
          ]}
        >
          <View style={styles.header}>
            <IconButton
              label="Quay lại danh sách game"
              icon="‹"
              onPress={onBack}
            />
            <View style={styles.titleGroup}>
              <Text style={styles.title}>NỐI HÌNH</Text>
              <Text style={styles.subtitle}>
                CẤP {level} • {config.faceCount} LOẠI
              </Text>
            </View>
            <View style={styles.headerActions}>
              <IconButton
                label={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
                icon={soundEnabled ? '♪' : '—'}
                onPress={toggleSound}
              />
              <IconButton
                label="Chơi ván mới"
                icon="↻"
                onPress={startNewGame}
              />
            </View>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>ĐIỂM</Text>
              <Text style={styles.statValue}>{score}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>THỜI GIAN</Text>
              <Text
                style={[
                  styles.statValue,
                  timeLeft <= 20 ? styles.dangerText : null,
                ]}
              >
                {formatTime(timeLeft)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>KỶ LỤC</Text>
              <Text style={styles.statValue}>{bestScore}</Text>
            </View>
          </View>

          <Text numberOfLines={1} style={styles.message}>
            {message}
          </Text>

          <View style={styles.footer}>
            <Pressable
              onPress={handleHint}
              style={({ pressed }) => [
                styles.actionButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.actionIcon}>✦</Text>
              <Text style={styles.actionText}>Gợi ý</Text>
            </Pressable>
            <View style={styles.remainingBadge}>
              <Text style={styles.remainingValue}>{remainingTiles / 2}</Text>
              <Text style={styles.remainingLabel}>CẶP</Text>
            </View>
            <Pressable
              onPress={handleShuffle}
              style={({ pressed }) => [
                styles.actionButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.actionIcon}>⤨</Text>
              <Text style={styles.actionText}>Xáo</Text>
            </Pressable>
          </View>
        </View>

        <View
          accessibilityLabel={`Bàn nối hình còn ${remainingTiles} ô`}
          style={[
            styles.board,
            {
              width: boardWidth,
              height: boardHeight,
              marginLeft: -boardWidth / 2,
              marginTop: -boardHeight / 2,
            },
          ]}
        >
          {connectionPath.map((point, index) => (
            <View
              key={`${point.row}-${point.column}-${index}`}
              style={[
                styles.pathPoint,
                {
                  height: pathSize,
                  width: pathSize,
                  borderRadius: cellSize,
                  left:
                    getPathOffset(point.column, config.columns) - pathSize / 2,
                  top: getPathOffset(point.row, config.rows) - pathSize / 2,
                },
              ]}
            />
          ))}

          {board.map((row, rowIndex) =>
            row.map((tile, columnIndex) => {
              if (!tile) {
                return null;
              }

              const isSelected =
                selected?.row === rowIndex && selected?.column === columnIndex;
              const isHinted = isPositionIn(hint, rowIndex, columnIndex);

              return (
                <Pressable
                  key={tile.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Hình số ${tile.face + 1}`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() =>
                    handleTilePress({ row: rowIndex, column: columnIndex })
                  }
                  style={({ pressed }) => [
                    styles.tile,
                    {
                      width: cellSize - 1,
                      height: cellSize - 1,
                      left: boardGutter + columnIndex * cellSize + 0.5,
                      top: boardGutter + rowIndex * cellSize + 0.5,
                      borderRadius: Math.max(5, cellSize * 0.15),
                    },
                    isSelected ? styles.selectedTile : null,
                    isHinted ? styles.hintedTile : null,
                    pressed ? styles.pressedTile : null,
                  ]}
                >
                  <Image
                    source={TILE_IMAGES[tile.face]}
                    resizeMode="contain"
                    style={styles.tileImage}
                  />
                </Pressable>
              );
            }),
          )}
        </View>
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={levelComplete || gameOver}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>{levelComplete ? '🏆' : '⏰'}</Text>
            <Text style={styles.modalTitle}>
              {levelComplete ? `Qua cấp ${level}!` : 'Hết thời gian'}
            </Text>
            <Text style={styles.modalDescription}>
              {levelComplete
                ? `Cấp tiếp theo khó hơn với ${
                    getLevelConfig(level + 1).faceCount
                  } loại hình và ít thời gian hơn.`
                : `Bạn đạt ${score} điểm ở cấp ${level}.`}
            </Text>
            <Pressable
              onPress={() =>
                levelComplete ? startLevel(level + 1) : startNewGame()
              }
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {levelComplete ? 'CHƠI CẤP TIẾP' : 'CHƠI LẠI'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#123C3A' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#123C3A',
  },
  landscapeContainer: {
    position: 'relative',
  },
  sidePanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
  },
  header: {
    width: '100%',
    height: 78,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  titleGroup: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  title: {
    color: '#FFF8D7',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  subtitle: {
    marginTop: 2,
    color: '#8ED9C5',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF18',
    borderWidth: 1,
    borderColor: '#FFFFFF24',
  },
  iconButtonText: {
    color: '#FFF8D7',
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '700',
  },
  headerActions: { flexDirection: 'row', gap: 6 },
  disabledButton: { opacity: 0.35 },
  buttonPressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  statsCard: {
    width: '100%',
    height: 94,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    borderRadius: 17,
    backgroundColor: '#0C302F',
    borderWidth: 1,
    borderColor: '#2B625D',
  },
  statItem: {
    width: '100%',
    flex: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    color: '#7EB8AE',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  statDivider: { width: '82%', height: 1, backgroundColor: '#FFFFFF18' },
  dangerText: { color: '#FF8278' },
  message: {
    height: 38,
    paddingTop: 9,
    color: '#C5E8DF',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  board: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    overflow: 'visible',
    borderRadius: 20,
    backgroundColor: '#0A302D',
    borderWidth: 2,
    borderColor: '#2B6B62',
  },
  tile: {
    position: 'absolute',
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5DFC2',
    borderWidth: 1,
    borderColor: '#E4C39A',
    shadowColor: '#001C18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  tileImage: { width: '100%', height: '100%' },
  selectedTile: {
    borderColor: '#FFD747',
    backgroundColor: '#FFF2A6',
    transform: [{ scale: 1.08 }],
    zIndex: 10,
  },
  hintedTile: {
    borderColor: '#59E3FF',
    backgroundColor: '#D6FAFF',
    transform: [{ scale: 1.07 }],
    zIndex: 9,
  },
  pressedTile: { opacity: 0.72, transform: [{ scale: 0.94 }] },
  pathPoint: {
    position: 'absolute',
    zIndex: 20,
    backgroundColor: '#FFE35B',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  footer: {
    width: '100%',
    marginTop: 4,
    alignItems: 'center',
    gap: 5,
  },
  actionButton: {
    width: '100%',
    height: 36,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#FFFFFF18',
    borderWidth: 1,
    borderColor: '#FFFFFF24',
  },
  actionIcon: { color: '#FFE35B', fontSize: 18, fontWeight: '900' },
  actionText: { color: '#E6F5F0', fontSize: 10, fontWeight: '800' },
  remainingBadge: { height: 32, alignItems: 'center' },
  remainingValue: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  remainingLabel: {
    color: '#7EB8AE',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  modalBackdrop: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#001A18CC',
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    padding: 26,
    alignItems: 'center',
    borderRadius: 25,
    backgroundColor: '#FFFDF2',
  },
  modalEmoji: { fontSize: 52 },
  modalTitle: {
    marginTop: 8,
    color: '#153E3B',
    fontSize: 25,
    fontWeight: '900',
  },
  modalDescription: {
    marginTop: 9,
    color: '#58706D',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    height: 52,
    marginTop: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#20AD82',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
});
