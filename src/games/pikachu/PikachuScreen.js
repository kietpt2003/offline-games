import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
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

const GAME_KEY = '@offline-games/pikachu-state-v1';
const BEST_KEY = '@offline-games/pikachu-best-v1';
const CONNECT_DELAY = 260;

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
  const timeoutRef = useRef(null);
  const config = getLevelConfig(level);
  const remainingTiles = countRemainingTiles(board);
  const cellSize = Math.min(
    46,
    Math.floor((windowWidth - 20) / (config.columns + 2)),
    Math.floor((windowHeight - 270) / (config.rows + 2)),
  );
  const boardWidth = cellSize * (config.columns + 2);
  const boardHeight = cellSize * (config.rows + 2);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(GAME_KEY),
      AsyncStorage.getItem(BEST_KEY),
    ])
      .then(([savedGame, savedBest]) => {
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
      })
      .catch(() => {})
      .finally(() => setIsHydrated(true));

    return () => clearTimeout(timeoutRef.current);
  }, []);

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
      setSelected(position);
      setMessage('Hai hình chưa giống nhau');
      return;
    }

    const path = findConnectionPath(board, selected, position);

    if (!path) {
      setSelected(position);
      setMessage('Không thể nối bằng đường tối đa 2 lần rẽ');
      return;
    }

    setIsResolving(true);
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
    setBoard(currentBoard => shuffleBoard(currentBoard));
    setScore(currentScore => Math.max(0, currentScore - 50));
    resetSelection();
    setMessage('Đã xáo bàn • -50 điểm');
  };

  const isPositionIn = (positions, row, column) =>
    positions.some(item => item.row === row && item.column === column);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
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
          <IconButton label="Chơi ván mới" icon="↻" onPress={startNewGame} />
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

        <View
          accessibilityLabel={`Bàn nối hình còn ${remainingTiles} ô`}
          style={[styles.board, { width: boardWidth, height: boardHeight }]}
        >
          {connectionPath.map((point, index) => (
            <View
              key={`${point.row}-${point.column}-${index}`}
              style={[
                styles.pathPoint,
                {
                  width: Math.max(5, cellSize * 0.17),
                  height: Math.max(5, cellSize * 0.17),
                  borderRadius: cellSize,
                  left: point.column * cellSize + cellSize * 0.415,
                  top: point.row * cellSize + cellSize * 0.415,
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
                      width: cellSize - 3,
                      height: cellSize - 3,
                      left: (columnIndex + 1) * cellSize + 1.5,
                      top: (rowIndex + 1) * cellSize + 1.5,
                      borderRadius: Math.max(7, cellSize * 0.22),
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

        <View style={styles.footer}>
          <Pressable
            onPress={handleHint}
            style={({ pressed }) => [
              styles.actionButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.actionIcon}>✦</Text>
            <Text style={styles.actionText}>Gợi ý (-20)</Text>
          </Pressable>
          <View style={styles.remainingBadge}>
            <Text style={styles.remainingValue}>{remainingTiles / 2}</Text>
            <Text style={styles.remainingLabel}>CẶP CÒN LẠI</Text>
          </View>
          <Pressable
            onPress={handleShuffle}
            style={({ pressed }) => [
              styles.actionButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.actionIcon}>⤨</Text>
            <Text style={styles.actionText}>Xáo (-50)</Text>
          </Pressable>
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
    paddingHorizontal: 10,
    backgroundColor: '#123C3A',
  },
  header: {
    width: '100%',
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: { alignItems: 'center' },
  title: {
    color: '#FFF8D7',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  subtitle: {
    marginTop: 2,
    color: '#8ED9C5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF18',
    borderWidth: 1,
    borderColor: '#FFFFFF24',
  },
  iconButtonText: {
    color: '#FFF8D7',
    fontSize: 28,
    lineHeight: 31,
    fontWeight: '700',
  },
  disabledButton: { opacity: 0.35 },
  buttonPressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  statsCard: {
    width: '100%',
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 17,
    backgroundColor: '#0C302F',
    borderWidth: 1,
    borderColor: '#2B625D',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: {
    color: '#7EB8AE',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statValue: {
    marginTop: 3,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  statDivider: { width: 1, height: 28, backgroundColor: '#FFFFFF18' },
  dangerText: { color: '#FF8278' },
  message: {
    height: 31,
    paddingTop: 8,
    color: '#C5E8DF',
    fontSize: 12,
    fontWeight: '700',
  },
  board: {
    position: 'relative',
    overflow: 'visible',
    borderRadius: 20,
    backgroundColor: '#0A302D',
    borderWidth: 2,
    borderColor: '#2B6B62',
  },
  tile: {
    position: 'absolute',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFCEB',
    borderWidth: 2,
    borderColor: '#D8EADD',
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
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: 103,
    height: 50,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#FFFFFF18',
    borderWidth: 1,
    borderColor: '#FFFFFF24',
  },
  actionIcon: { color: '#FFE35B', fontSize: 18, fontWeight: '900' },
  actionText: { color: '#E6F5F0', fontSize: 11, fontWeight: '800' },
  remainingBadge: { alignItems: 'center' },
  remainingValue: { color: '#FFFFFF', fontSize: 21, fontWeight: '900' },
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
