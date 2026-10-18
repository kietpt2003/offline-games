import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  IconChevronLeft,
  IconHint,
  IconMuted,
  IconRestart,
  IconShuffle,
  IconTrophy,
  IconUndo,
  IconVolume,
} from '../../icons';
import {
  createMahjongBoard,
  findAvailablePair,
  getFreeTiles,
  removePair,
  revealTile,
  restoreTileFaceUpStates,
  shuffleRemainingTiles,
} from './mahjongEngine';
import { createMahjongAudio } from './mahjongAudio';

const MAX_UNDO_STEPS = 20;
const SOUND_KEY = '@offline-games/mahjong-sound-enabled-v1';
const MATCH_FLIP_DURATION = 320;
const BLUE_INK = '#0A4A78';
const GREEN_INK = '#08733E';
const RED_INK = '#C62421';

function MahjongFace({ tile, tileWidth }) {
  const pipSize = Math.max(10, Math.round(tileWidth * 0.17));
  const bambooWidth = Math.max(7, Math.round(tileWidth * 0.11));

  if (tile.type === 'tong') {
    return (
      <View style={styles.pipGrid}>
        {Array.from({ length: tile.rank }, (_, index) => (
          <View
            key={index}
            style={[
              styles.pip,
              {
                width: pipSize,
                height: pipSize,
                borderRadius: pipSize / 2,
                borderColor: index % 2 === 0 ? BLUE_INK : GREEN_INK,
              },
            ]}
          >
            <View
              style={[
                styles.pipCenter,
                {
                  backgroundColor: index === 0 ? RED_INK : GREEN_INK,
                },
              ]}
            />
          </View>
        ))}
      </View>
    );
  }

  if (tile.type === 'suo') {
    return (
      <View style={styles.bambooGrid}>
        {Array.from({ length: tile.rank }, (_, index) => (
          <View
            key={index}
            style={[
              styles.bamboo,
              {
                width: bambooWidth,
                height: Math.round(tileWidth * 0.34),
                backgroundColor: index === 0 ? RED_INK : GREEN_INK,
              },
            ]}
          >
            <View style={styles.bambooJoint} />
          </View>
        ))}
      </View>
    );
  }

  if (tile.type === 'wan') {
    return (
      <View style={styles.characterFace}>
        <Text
          style={[styles.wanNumber, { fontSize: Math.round(tileWidth * 0.4) }]}
        >
          {tile.value}
        </Text>
        <Text
          style={[styles.wanSuit, { fontSize: Math.round(tileWidth * 0.34) }]}
        >
          萬
        </Text>
      </View>
    );
  }

  if (tile.type === 'white') {
    return <View style={styles.whiteDragon} />;
  }

  return (
    <View style={styles.characterFace}>
      {tile.type === 'flower' ? (
        <Text style={styles.flowerMark}>秋</Text>
      ) : null}
      <Text
        style={[
          styles.honorCharacter,
          {
            color:
              tile.key === 'red'
                ? RED_INK
                : tile.key === 'green' || tile.type === 'flower'
                ? GREEN_INK
                : BLUE_INK,
            fontSize: Math.round(tileWidth * 0.58),
          },
        ]}
      >
        {tile.value}
      </Text>
    </View>
  );
}

function MahjongTile({
  tile,
  tileWidth,
  tileHeight,
  rowStep,
  isFree,
  isSelected,
  isHinted,
  isFaceDown,
  disabled,
  onPress,
}) {
  const flipProgress = useRef(new Animated.Value(isFaceDown ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(flipProgress, {
      toValue: isFaceDown ? 1 : 0,
      duration: MATCH_FLIP_DURATION,
      useNativeDriver: true,
    }).start();
  }, [flipProgress, isFaceDown]);

  const frontOpacity = flipProgress.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = flipProgress.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });
  const frontRotation = flipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });
  const backRotation = flipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-90deg', '0deg'],
  });

  return (
    <View
      style={[
        styles.tilePosition,
        {
          width: tileWidth - 2,
          height: tileHeight - 2,
          left: 7 + tile.x * tileWidth + tile.layer * 3,
          top: 14 + tile.y * rowStep - tile.layer * 5,
          zIndex: tile.layer * 100 + tile.y * 10 + tile.x,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${
          tile.faceUp ? `${tile.value} ${tile.suit}` : 'Quân bài úp'
        }${
          isFree
            ? tile.faceUp
              ? ', đang mở'
              : ', có thể lật'
            : ', đang bị khóa'
        }`}
        accessibilityState={{ selected: isSelected, disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.tileTouch,
          isSelected ? styles.selectedTile : null,
          isHinted ? styles.hintedTile : null,
          pressed ? styles.pressedTile : null,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tile,
            styles.tileFront,
            !isFree ? styles.lockedTile : null,
            {
              opacity: frontOpacity,
              transform: [{ perspective: 700 }, { rotateY: frontRotation }],
            },
          ]}
        >
          <MahjongFace tile={tile} tileWidth={tileWidth} />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tile,
            styles.tileBack,
            !isFree ? styles.lockedTileBack : null,
            {
              opacity: backOpacity,
              transform: [{ perspective: 700 }, { rotateY: backRotation }],
            },
          ]}
        />
      </Pressable>
      {isSelected || isHinted ? (
        <View
          pointerEvents="none"
          style={[
            styles.tileHighlight,
            isSelected ? styles.selectedTileHighlight : styles.hintedTileHighlight,
          ]}
        />
      ) : null}
    </View>
  );
}

function IconButton({ label, icon, disabled = false, onPress }) {
  const Icon = icon;

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
      <Icon width={24} height={24} color="#285C53" />
    </Pressable>
  );
}

export function MahjongScreen({ onBack }) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const tileWidth = Math.min(86, Math.floor((windowWidth - 30) / 4));
  const tileHeight = Math.round(tileWidth * 1.28);
  const availableRowStep = Math.floor(
    (windowHeight - 315 - tileHeight - 28) / 7,
  );
  const rowStep = Math.max(
    28,
    Math.min(Math.round(tileHeight * 0.52), availableRowStep),
  );
  const boardGeometry = useMemo(
    () => ({ tileWidth, tileHeight, rowStep }),
    [rowStep, tileHeight, tileWidth],
  );
  const audioRef = useRef(null);
  const matchTimeoutRef = useRef(null);
  const selectedOriginalFaceUpRef = useRef(null);
  const [tiles, setTiles] = useState(() =>
    createMahjongBoard(Math.random, boardGeometry),
  );
  const [selectedId, setSelectedId] = useState(null);
  const [hintIds, setHintIds] = useState([]);
  const [score, setScore] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState(
    'Lật quân đang mở hoặc ghép hai quân giống nhau',
  );
  const [hasWon, setHasWon] = useState(false);
  const [faceDownIds, setFaceDownIds] = useState([]);
  const [isResolving, setIsResolving] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSoundHydrated, setIsSoundHydrated] = useState(false);

  const boardWidth = tileWidth * 4 + 14;
  const boardHeight = rowStep * 7 + tileHeight + 28;
  const freeTileIds = useMemo(
    () => new Set(getFreeTiles(tiles, boardGeometry).map(tile => tile.id)),
    [boardGeometry, tiles],
  );
  const activeTiles = useMemo(
    () =>
      tiles
        .filter(tile => tile.active)
        .sort(
          (first, second) =>
            first.layer - second.layer ||
            first.y - second.y ||
            first.x - second.x,
        ),
    [tiles],
  );
  const remainingPairs = activeTiles.length / 2;

  useEffect(() => {
    if (
      isResolving ||
      selectedId ||
      remainingPairs === 0 ||
      tiles.some(
        tile =>
          tile.active &&
          !tile.faceUp &&
          freeTileIds.has(tile.id),
      ) ||
      findAvailablePair(tiles, boardGeometry)
    ) {
      return;
    }

    setTiles(shuffleRemainingTiles(tiles, Math.random, boardGeometry));
    setHintIds([]);
    audioRef.current?.playShuffle();
    setMessage('Không còn nước đi • đã tự động xáo bài');
  }, [
    boardGeometry,
    freeTileIds,
    isResolving,
    matchedPairs,
    remainingPairs,
    score,
    selectedId,
    tiles,
  ]);

  useEffect(() => {
    const audio = createMahjongAudio(false);
    audio.setAppActive(AppState.currentState === 'active');
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
  }, []);

  useEffect(
    () => () => {
      if (matchTimeoutRef.current) {
        clearTimeout(matchTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    let isActive = true;

    AsyncStorage.getItem(SOUND_KEY)
      .then(savedSoundEnabled => {
        if (isActive && savedSoundEnabled !== null) {
          setSoundEnabled(savedSoundEnabled === 'true');
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isActive) {
          setIsSoundHydrated(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isSoundHydrated) {
      return;
    }

    audioRef.current?.setEnabled(soundEnabled);
    AsyncStorage.setItem(SOUND_KEY, String(soundEnabled)).catch(() => {});
  }, [isSoundHydrated, soundEnabled]);

  const saveHistory = () => {
    const snapshot = { tiles, score, matchedPairs };

    setHistory(currentHistory =>
      [...currentHistory, snapshot].slice(-MAX_UNDO_STEPS),
    );
  };

  const cancelPendingMatch = () => {
    if (matchTimeoutRef.current) {
      clearTimeout(matchTimeoutRef.current);
      matchTimeoutRef.current = null;
    }

    setFaceDownIds([]);
    setIsResolving(false);
  };

  const startNewGame = () => {
    cancelPendingMatch();
    audioRef.current?.playShuffle();
    setTiles(createMahjongBoard(Math.random, boardGeometry));
    setSelectedId(null);
    selectedOriginalFaceUpRef.current = null;
    setHintIds([]);
    setScore(0);
    setMatchedPairs(0);
    setHistory([]);
    setMessage('Lật quân đang mở hoặc ghép hai quân giống nhau');
    setHasWon(false);
  };

  const handleUndo = () => {
    const snapshot = history[history.length - 1];

    if (!snapshot) {
      return;
    }

    cancelPendingMatch();
    audioRef.current?.playSelect();
    setTiles(snapshot.tiles);
    setScore(snapshot.score);
    setMatchedPairs(snapshot.matchedPairs);
    setHistory(currentHistory => currentHistory.slice(0, -1));
    setSelectedId(null);
    selectedOriginalFaceUpRef.current = null;
    setHintIds([]);
    setHasWon(false);
    setMessage('Đã hoàn tác lượt gần nhất');
  };

  const handleTilePress = tile => {
    if (isResolving || !freeTileIds.has(tile.id)) {
      return;
    }

    setHintIds([]);

    if (!selectedId) {
      audioRef.current?.playSelect();
      if (!tile.faceUp) {
        setTiles(currentTiles =>
          revealTile(currentTiles, tile.id, boardGeometry),
        );
      }
      setSelectedId(tile.id);
      selectedOriginalFaceUpRef.current = tile.faceUp;
      setMessage('Chọn thêm một quân giống như vậy');
      return;
    }

    if (selectedId === tile.id) {
      audioRef.current?.playSelect();
      if (selectedOriginalFaceUpRef.current === false) {
        setTiles(currentTiles =>
          restoreTileFaceUpStates(currentTiles, [
            { id: tile.id, faceUp: false },
          ]),
        );
      }
      setSelectedId(null);
      selectedOriginalFaceUpRef.current = null;
      setMessage('Đã bỏ chọn quân bài');
      return;
    }

    const selectedTile = tiles.find(item => item.id === selectedId);
    if (!selectedTile) {
      setSelectedId(null);
      selectedOriginalFaceUpRef.current = null;
      return;
    }

    const selectedOriginalFaceUp =
      selectedOriginalFaceUpRef.current ?? selectedTile.faceUp;
    const candidateTiles = tile.faceUp
      ? tiles
      : revealTile(tiles, tile.id, boardGeometry);
    const revealDelay = tile.faceUp ? 0 : MATCH_FLIP_DURATION;

    if (selectedTile.key !== tile.key) {
      audioRef.current?.playError();
      setTiles(candidateTiles);
      setSelectedId(null);
      selectedOriginalFaceUpRef.current = null;
      setIsResolving(true);
      setMessage('Hai quân không giống nhau • đang lật lại');
      const faceDownOnRollback = [
        { id: selectedTile.id, faceUp: selectedOriginalFaceUp },
        { id: tile.id, faceUp: tile.faceUp },
      ]
        .filter(item => !item.faceUp)
        .map(item => item.id);
      matchTimeoutRef.current = setTimeout(() => {
        setFaceDownIds(faceDownOnRollback);
        matchTimeoutRef.current = setTimeout(() => {
          matchTimeoutRef.current = null;
          setTiles(currentTiles =>
            restoreTileFaceUpStates(currentTiles, [
              { id: selectedTile.id, faceUp: selectedOriginalFaceUp },
              { id: tile.id, faceUp: tile.faceUp },
            ]),
          );
          setFaceDownIds([]);
          setIsResolving(false);
          setMessage('Chọn lại hai quân giống nhau');
        }, MATCH_FLIP_DURATION);
      }, revealDelay);
      return;
    }

    saveHistory();

    const matchedIds = [selectedTile.id, tile.id];
    const nextTiles = removePair(candidateTiles, ...matchedIds, boardGeometry);
    const nextActiveCount = nextTiles.filter(item => item.active).length;
    const nextScore = score + 100;

    setSelectedId(null);
    selectedOriginalFaceUpRef.current = null;
    setTiles(candidateTiles);
    setIsResolving(true);
    setMessage('Ghép cặp thành công • +100 điểm');
    audioRef.current?.playMatch();

    matchTimeoutRef.current = setTimeout(() => {
      matchTimeoutRef.current = null;
      setTiles(nextTiles);
      setScore(nextScore);
      setMatchedPairs(currentPairs => currentPairs + 1);
      setIsResolving(false);

      if (nextActiveCount === 0) {
        audioRef.current?.playWin();
        setMessage('Bạn đã ghép hết tất cả quân bài!');
        setHasWon(true);
      } else if (!findAvailablePair(nextTiles, boardGeometry)) {
        setMessage('Không còn cặp mở — hãy xáo bài');
      } else {
        setMessage('+100 điểm • Ghép cặp thành công');
      }
    }, revealDelay + MATCH_FLIP_DURATION + 80);
  };

  const handleHint = () => {
    if (isResolving) {
      return;
    }
    const pair = findAvailablePair(tiles, boardGeometry);

    if (!pair) {
      audioRef.current?.playError();
      setHintIds([]);
      setMessage('Không còn cặp mở — hãy xáo bài');
      return;
    }

    audioRef.current?.playSelect();
    setSelectedId(null);
    selectedOriginalFaceUpRef.current = null;
    setHintIds(pair.map(tile => tile.id));
    setMessage('Hai quân viền xanh có thể ghép với nhau');
  };

  const handleShuffle = () => {
    if (isResolving || remainingPairs === 0) {
      return;
    }

    audioRef.current?.playShuffle();
    saveHistory();
    setTiles(currentTiles =>
      shuffleRemainingTiles(currentTiles, Math.random, boardGeometry),
    );
    setScore(currentScore => Math.max(0, currentScore - 50));
    setSelectedId(null);
    selectedOriginalFaceUpRef.current = null;
    setHintIds([]);
    setMessage('Đã xáo lại các quân còn lại • -50 điểm');
  };

  const toggleSound = () => {
    setSoundEnabled(currentValue => !currentValue);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerSide}>
            <IconButton
              label="Quay lại danh sách game"
              icon={IconChevronLeft}
              onPress={onBack}
            />
            <IconButton
              label={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
              icon={soundEnabled ? IconVolume : IconMuted}
              disabled={!isSoundHydrated}
              onPress={toggleSound}
            />
          </View>

          <View style={styles.titleGroup}>
            <Text style={styles.title}>MAHJONG</Text>
            <Text style={styles.subtitle}>THƯ GIÃN • DỄ NHÌN</Text>
          </View>

          <View style={[styles.headerSide, styles.headerActions]}>
            <IconButton
              label="Hoàn tác lượt gần nhất"
              icon={IconUndo}
              disabled={history.length === 0}
              onPress={handleUndo}
            />
            <IconButton
              label="Chơi ván mới"
              icon={IconRestart}
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
            <Text style={styles.statLabel}>ĐÃ GHÉP</Text>
            <Text style={styles.statValue}>{matchedPairs}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>CÒN LẠI</Text>
            <Text style={styles.statValue}>{remainingPairs}</Text>
          </View>
        </View>

        <Text numberOfLines={1} style={styles.message}>
          {message}
        </Text>

        <View
          accessibilityLabel={`Bàn Mahjong còn ${remainingPairs} cặp`}
          style={[styles.board, { width: boardWidth, height: boardHeight }]}
        >
          <View style={styles.boardGlow} />
          {activeTiles.map(tile => {
            const isFree = freeTileIds.has(tile.id);
            const isSelected = selectedId === tile.id;
            const isHinted = hintIds.includes(tile.id);

            return (
              <MahjongTile
                key={tile.id}
                tile={tile}
                tileWidth={tileWidth}
                tileHeight={tileHeight}
                rowStep={rowStep}
                isFree={isFree}
                isSelected={isSelected}
                isHinted={isHinted}
                isFaceDown={!tile.faceUp || faceDownIds.includes(tile.id)}
                disabled={!isFree || isResolving}
                onPress={() => handleTilePress(tile)}
              />
            );
          })}
        </View>

        <View style={styles.rulesRow}>
          <View style={styles.rulePill}>
            <View style={styles.freeDot} />
            <Text style={styles.ruleText}>Quân đang mở</Text>
          </View>
          <Text style={styles.ruleDescription}>
            Không chọn quân đang bị đè
          </Text>
        </View>

        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            onPress={handleHint}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <IconHint width={20} height={20} color="#25846F" />
            <Text style={styles.secondaryButtonText}>GỢI Ý</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleShuffle}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <IconShuffle width={20} height={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>XÁO BÀI</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        statusBarTranslucent
        visible={hasWon}
        onRequestClose={onBack}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.winCard}>
            <View style={styles.winIcon}>
              <IconTrophy width={38} height={38} color="#168B59" />
            </View>
            <Text style={styles.winTitle}>Hoàn thành!</Text>
            <Text style={styles.winScore}>Bạn đạt {score} điểm</Text>
            <Pressable
              accessibilityRole="button"
              onPress={startNewGame}
              style={({ pressed }) => [
                styles.playAgainButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.playAgainText}>CHƠI VÁN MỚI</Text>
            </Pressable>
            <Pressable onPress={onBack} style={styles.leaveButton}>
              <Text style={styles.leaveText}>Về danh sách game</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6F2E15',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 16,
    backgroundColor: '#075A47',
  },
  header: {
    width: '106%',
    height: 64,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#8A421F',
    borderBottomWidth: 3,
    borderBottomColor: '#D3974D',
  },
  headerSide: {
    width: 88,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActions: {
    justifyContent: 'flex-end',
    gap: 6,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D99A51',
    borderWidth: 2,
    borderColor: '#F0C476',
  },
  disabledButton: {
    opacity: 0.35,
  },
  buttonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  titleGroup: {
    alignItems: 'center',
  },
  title: {
    color: '#FFF0C7',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1.2,
    textShadowColor: '#3A1408',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 1,
  },
  subtitle: {
    marginTop: 2,
    color: '#F1C47C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statsCard: {
    width: '100%',
    maxWidth: 410,
    height: 64,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#064636',
    borderWidth: 2,
    borderColor: '#14745C',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: '#8DD8C0',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statValue: {
    marginTop: 1,
    color: '#FFF0B9',
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '900',
  },
  statDivider: {
    width: 1,
    height: 31,
    backgroundColor: '#2B806B',
  },
  message: {
    width: '100%',
    height: 36,
    color: '#D4F3E7',
    fontSize: 15,
    lineHeight: 36,
    fontWeight: '700',
    textAlign: 'center',
  },
  board: {
    position: 'relative',
    overflow: 'visible',
    borderRadius: 22,
    backgroundColor: '#064A3A',
    borderWidth: 3,
    borderColor: '#14725B',
    shadowColor: '#001D15',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  boardGlow: {
    position: 'absolute',
    top: 14,
    right: 14,
    bottom: 14,
    left: 14,
    borderRadius: 18,
    backgroundColor: '#075B47',
    borderWidth: 1,
    borderColor: '#0D6A53',
  },
  tilePosition: {
    position: 'absolute',
  },
  tileTouch: {
    flex: 1,
    borderRadius: 11,
  },
  tileHighlight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 11,
    borderWidth: 3,
  },
  selectedTileHighlight: {
    borderColor: '#FFD85E',
  },
  hintedTileHighlight: {
    borderColor: '#5DFFBB',
  },
  tile: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 9,
  },
  tileFront: {
    backgroundColor: '#FFFDF2',
    borderColor: '#DDD8C5',
    borderBottomWidth: 7,
    borderBottomColor: '#B7B7A3',
  },
  tileBack: {
    backgroundColor: '#946442',
    borderColor: '#BC8D62',
    borderBottomWidth: 7,
    borderBottomColor: '#5C3825',
  },
  lockedTileBack: {
    backgroundColor: '#76513B',
    borderColor: '#8E6448',
    borderBottomColor: '#4C3326',
  },
  lockedTile: {
    backgroundColor: '#E7E6D9',
    borderColor: '#C7C6B8',
    borderBottomColor: '#9FA896',
  },
  selectedTile: {
    transform: [{ translateY: -5 }, { scale: 1.05 }],
  },
  hintedTile: {
    transform: [{ translateY: -4 }],
  },
  pressedTile: {
    transform: [{ scale: 0.94 }],
  },
  characterFace: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wanNumber: {
    color: BLUE_INK,
    lineHeight: 34,
    fontWeight: '900',
  },
  wanSuit: {
    marginTop: -6,
    color: RED_INK,
    lineHeight: 29,
    fontWeight: '900',
  },
  honorCharacter: {
    fontWeight: '900',
    textShadowColor: '#FFFFFF',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  flowerMark: {
    position: 'absolute',
    top: -8,
    right: -10,
    color: RED_INK,
    fontSize: 12,
    fontWeight: '900',
  },
  whiteDragon: {
    width: '55%',
    height: '52%',
    borderWidth: 5,
    borderColor: BLUE_INK,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  pipGrid: {
    width: '70%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  pip: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  pipCenter: {
    width: '38%',
    height: '38%',
    borderRadius: 10,
  },
  bambooGrid: {
    width: '72%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bamboo: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#F4FFEE',
  },
  bambooJoint: {
    width: '140%',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E9D46D',
  },
  rulesRow: {
    width: '100%',
    maxWidth: 410,
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  freeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#63F0B8',
  },
  ruleText: {
    color: '#E4FFF4',
    fontSize: 14,
    fontWeight: '800',
  },
  ruleDescription: {
    color: '#9DD7C4',
    fontSize: 13,
    fontWeight: '600',
  },
  controls: {
    width: '100%',
    maxWidth: 410,
    height: 58,
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 29,
    backgroundColor: '#D99A51',
    borderWidth: 3,
    borderColor: '#F0C476',
  },
  secondaryButtonText: {
    color: '#48200E',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 29,
    backgroundColor: '#6E2D16',
    borderWidth: 3,
    borderColor: '#D99A51',
  },
  primaryButtonText: {
    color: '#FFE6A6',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#032A2188',
  },
  winCard: {
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    padding: 24,
    borderRadius: 28,
    backgroundColor: '#FFF8E9',
    borderWidth: 4,
    borderColor: '#D99A51',
  },
  winIcon: {
    width: 64,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E1D0AB',
    borderBottomWidth: 7,
  },
  winTitle: {
    marginTop: 18,
    color: '#173F3A',
    fontSize: 29,
    fontWeight: '900',
  },
  winScore: {
    marginTop: 6,
    color: '#6B7772',
    fontSize: 17,
    fontWeight: '700',
  },
  playAgainButton: {
    width: '100%',
    height: 52,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#3AA985',
  },
  playAgainText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  leaveButton: {
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  leaveText: {
    color: '#65726E',
    fontSize: 15,
    fontWeight: '700',
  },
});
