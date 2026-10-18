import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
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
  shuffleRemainingTiles,
} from './mahjongEngine';
import { createMahjongAudio } from './mahjongAudio';

const MAX_UNDO_STEPS = 20;
const SOUND_KEY = '@offline-games/mahjong-sound-enabled-v1';

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
      <Icon width={24} height={24} color="#FFF8E8" />
    </Pressable>
  );
}

export function MahjongScreen({ onBack }) {
  const { width: windowWidth } = useWindowDimensions();
  const audioRef = useRef(null);
  const [tiles, setTiles] = useState(() => createMahjongBoard());
  const [selectedId, setSelectedId] = useState(null);
  const [hintIds, setHintIds] = useState([]);
  const [score, setScore] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState('Chọn hai quân giống nhau đang mở');
  const [hasWon, setHasWon] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSoundHydrated, setIsSoundHydrated] = useState(false);

  const tileWidth = Math.min(43, Math.floor((windowWidth - 34) / 8));
  const tileHeight = Math.round(tileWidth * 1.28);
  const rowStep = Math.round(tileHeight * 0.82);
  const boardWidth = tileWidth * 8 + 14;
  const boardHeight = rowStep * 5 + tileHeight + 24;
  const freeTileIds = useMemo(
    () => new Set(getFreeTiles(tiles).map(tile => tile.id)),
    [tiles],
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

  const startNewGame = () => {
    audioRef.current?.playShuffle();
    setTiles(createMahjongBoard());
    setSelectedId(null);
    setHintIds([]);
    setScore(0);
    setMatchedPairs(0);
    setHistory([]);
    setMessage('Chọn hai quân giống nhau đang mở');
    setHasWon(false);
  };

  const handleUndo = () => {
    const snapshot = history[history.length - 1];

    if (!snapshot) {
      return;
    }

    audioRef.current?.playSelect();
    setTiles(snapshot.tiles);
    setScore(snapshot.score);
    setMatchedPairs(snapshot.matchedPairs);
    setHistory(currentHistory => currentHistory.slice(0, -1));
    setSelectedId(null);
    setHintIds([]);
    setHasWon(false);
    setMessage('Đã hoàn tác lượt gần nhất');
  };

  const handleTilePress = tile => {
    if (!freeTileIds.has(tile.id)) {
      return;
    }

    setHintIds([]);

    if (!selectedId) {
      audioRef.current?.playSelect();
      setSelectedId(tile.id);
      setMessage('Chọn thêm một quân giống như vậy');
      return;
    }

    if (selectedId === tile.id) {
      audioRef.current?.playSelect();
      setSelectedId(null);
      setMessage('Đã bỏ chọn quân bài');
      return;
    }

    const selectedTile = tiles.find(item => item.id === selectedId);

    if (selectedTile?.key !== tile.key) {
      audioRef.current?.playError();
      setSelectedId(tile.id);
      setMessage('Hai quân không giống nhau');
      return;
    }

    saveHistory();

    const nextTiles = removePair(tiles, selectedTile.id, tile.id);
    const nextActiveCount = nextTiles.filter(item => item.active).length;
    const nextScore = score + 100;

    setTiles(nextTiles);
    setScore(nextScore);
    setMatchedPairs(currentPairs => currentPairs + 1);
    setSelectedId(null);

    if (nextActiveCount === 0) {
      audioRef.current?.playWin();
      setMessage('Bạn đã ghép hết tất cả quân bài!');
      setHasWon(true);
      return;
    }

    audioRef.current?.playMatch();

    if (!findAvailablePair(nextTiles)) {
      setMessage('Không còn cặp mở — hãy xáo bài');
      return;
    }

    setMessage('+100 điểm • Ghép cặp thành công');
  };

  const handleHint = () => {
    const pair = findAvailablePair(tiles);

    if (!pair) {
      audioRef.current?.playError();
      setHintIds([]);
      setMessage('Không còn cặp mở — hãy xáo bài');
      return;
    }

    audioRef.current?.playSelect();
    setSelectedId(null);
    setHintIds(pair.map(tile => tile.id));
    setMessage('Hai quân viền xanh có thể ghép với nhau');
  };

  const handleShuffle = () => {
    if (remainingPairs === 0) {
      return;
    }

    audioRef.current?.playShuffle();
    saveHistory();
    setTiles(currentTiles => shuffleRemainingTiles(currentTiles));
    setScore(currentScore => Math.max(0, currentScore - 50));
    setSelectedId(null);
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
            <Text style={styles.subtitle}>GHÉP ĐÔI QUÂN BÀI</Text>
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
              <Pressable
                key={tile.id}
                accessibilityRole="button"
                accessibilityLabel={`${tile.value} ${tile.suit}${
                  isFree ? ', đang mở' : ', đang bị khóa'
                }`}
                accessibilityState={{
                  selected: isSelected,
                  disabled: !isFree,
                }}
                disabled={!isFree}
                onPress={() => handleTilePress(tile)}
                style={({ pressed }) => [
                  styles.tile,
                  {
                    width: tileWidth - 2,
                    height: tileHeight - 2,
                    left: 7 + tile.x * tileWidth + tile.layer * 2,
                    top: 12 + tile.y * rowStep - tile.layer * 3,
                    zIndex: tile.layer * 100 + tile.y * 10 + tile.x,
                  },
                  !isFree ? styles.lockedTile : null,
                  isSelected ? styles.selectedTile : null,
                  isHinted ? styles.hintedTile : null,
                  pressed ? styles.pressedTile : null,
                ]}
              >
                <Text style={[styles.tileValue, { color: tile.color }]}>
                  {tile.value}
                </Text>
                <Text style={styles.tileSuit}>{tile.suit}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.rulesRow}>
          <View style={styles.rulePill}>
            <View style={styles.freeDot} />
            <Text style={styles.ruleText}>Quân đang mở</Text>
          </View>
          <Text style={styles.ruleDescription}>
            Không bị đè và trống một bên
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
            <IconHint width={20} height={20} color="#75E6BE" />
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
            <IconShuffle width={20} height={20} color="#4E2B0C" />
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
    backgroundColor: '#123C3A',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  header: {
    width: '100%',
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D514D',
    borderWidth: 1,
    borderColor: '#37706A',
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
    color: '#FFF8E8',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  subtitle: {
    marginTop: 2,
    color: '#8EC3B9',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statsCard: {
    width: '100%',
    maxWidth: 410,
    height: 66,
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#184844',
    borderWidth: 1,
    borderColor: '#2B615C',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: '#88B6AE',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statValue: {
    marginTop: 1,
    color: '#FFD076',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
  },
  statDivider: {
    width: 1,
    height: 31,
    backgroundColor: '#39716B',
  },
  message: {
    width: '100%',
    height: 36,
    color: '#C8DDD8',
    fontSize: 12,
    lineHeight: 36,
    fontWeight: '700',
    textAlign: 'center',
  },
  board: {
    position: 'relative',
    overflow: 'visible',
    borderRadius: 24,
    backgroundColor: '#0F312F',
    borderWidth: 1,
    borderColor: '#285956',
  },
  boardGlow: {
    position: 'absolute',
    top: 14,
    right: 14,
    bottom: 14,
    left: 14,
    borderRadius: 18,
    backgroundColor: '#16433F',
  },
  tile: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#FFF9E9',
    borderWidth: 1,
    borderColor: '#E7D9B8',
    borderBottomWidth: 5,
    borderBottomColor: '#C9B88F',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 7,
  },
  lockedTile: {
    opacity: 0.72,
    backgroundColor: '#DDD8C9',
    borderBottomColor: '#9F998B',
  },
  selectedTile: {
    borderWidth: 3,
    borderColor: '#FFD35F',
    backgroundColor: '#FFFDF4',
    transform: [{ translateY: -5 }, { scale: 1.05 }],
  },
  hintedTile: {
    borderWidth: 3,
    borderColor: '#55E6B2',
    backgroundColor: '#F1FFF8',
    transform: [{ translateY: -4 }],
  },
  pressedTile: {
    transform: [{ scale: 0.94 }],
  },
  tileValue: {
    fontSize: 21,
    lineHeight: 23,
    fontWeight: '900',
  },
  tileSuit: {
    marginTop: -1,
    color: '#796D56',
    fontSize: 7,
    fontWeight: '800',
  },
  rulesRow: {
    width: '100%',
    maxWidth: 410,
    marginTop: 12,
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
    backgroundColor: '#55E6B2',
  },
  ruleText: {
    color: '#E9F4F0',
    fontSize: 11,
    fontWeight: '800',
  },
  ruleDescription: {
    color: '#83AAA4',
    fontSize: 10,
    fontWeight: '600',
  },
  controls: {
    width: '100%',
    maxWidth: 410,
    height: 54,
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 17,
    backgroundColor: '#1B4C48',
    borderWidth: 1,
    borderColor: '#3B716B',
  },
  secondaryButtonText: {
    color: '#E9F6F2',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 17,
    backgroundColor: '#F3A449',
  },
  primaryButtonText: {
    color: '#4A290B',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#071D1BCC',
  },
  winCard: {
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    padding: 24,
    borderRadius: 28,
    backgroundColor: '#FFF8E9',
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
    fontSize: 27,
    fontWeight: '900',
  },
  winScore: {
    marginTop: 6,
    color: '#6B7772',
    fontSize: 15,
    fontWeight: '700',
  },
  playAgainButton: {
    width: '100%',
    height: 52,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#F3A449',
  },
  playAgainText: {
    color: '#4A290B',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  leaveButton: {
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  leaveText: {
    color: '#65726E',
    fontSize: 13,
    fontWeight: '700',
  },
});
