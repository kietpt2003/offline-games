import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameCard } from '../components/GameCard';
import { games } from '../data/games';
import { IconClose, IconEdit, IconSearch } from '../icons';
import {
  getGreeting,
  MAX_PLAYER_NAME_LENGTH,
  normalizePlayerName,
} from './homeGreeting';

const PLAYER_NAME_KEY = '@offline-games/player-name-v1';

function normalizeSearch(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export function HomeScreen({ appVersion, onOpenGame }) {
  const [searchText, setSearchText] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [draftName, setDraftName] = useState('');
  const [nameError, setNameError] = useState('');
  const [isNameHydrated, setIsNameHydrated] = useState(false);
  const [isNameModalVisible, setIsNameModalVisible] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());

  useEffect(() => {
    let isActive = true;

    AsyncStorage.getItem(PLAYER_NAME_KEY)
      .then(savedName => {
        if (!isActive) {
          return;
        }

        const normalizedName = normalizePlayerName(savedName ?? '');

        if (normalizedName) {
          setPlayerName(normalizedName);
          return;
        }

        setIsNameModalVisible(true);
      })
      .catch(() => {
        if (isActive) {
          setIsNameModalVisible(true);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsNameHydrated(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60_000);

    return () => clearInterval(timer);
  }, []);

  const filteredGames = useMemo(() => {
    const keyword = normalizeSearch(searchText);

    if (!keyword) {
      return games;
    }

    return games.filter(game => normalizeSearch(game.name).includes(keyword));
  }, [searchText]);

  const handleGamePress = game => {
    Keyboard.dismiss();

    if (
      game.id === 'block-blast' ||
      game.id === 'mahjong' ||
      game.id === 'pikachu' ||
      game.id === 'game-2048' ||
      game.id === 'gomoku' ||
      game.id === 'sudoku' ||
      game.id === 'minesweeper'
    ) {
      onOpenGame(game.id);
    }
  };

  const openNameEditor = () => {
    setDraftName(playerName);
    setNameError('');
    setIsNameModalVisible(true);
  };

  const closeNameEditor = () => {
    if (!playerName || isSavingName) {
      return;
    }

    Keyboard.dismiss();
    setDraftName(playerName);
    setNameError('');
    setIsNameModalVisible(false);
  };

  const savePlayerName = async () => {
    const normalizedName = normalizePlayerName(draftName);

    if (!normalizedName) {
      setNameError('Vui lòng nhập tên của bạn.');
      return;
    }

    if (normalizedName.length > MAX_PLAYER_NAME_LENGTH) {
      setNameError(`Tên tối đa ${MAX_PLAYER_NAME_LENGTH} ký tự.`);
      return;
    }

    setIsSavingName(true);
    setNameError('');

    try {
      await AsyncStorage.setItem(PLAYER_NAME_KEY, normalizedName);
      setPlayerName(normalizedName);
      setDraftName(normalizedName);
      setIsNameModalVisible(false);
      Keyboard.dismiss();
    } catch {
      setNameError('Không thể lưu tên. Vui lòng thử lại.');
    } finally {
      setIsSavingName(false);
    }
  };

  const greeting = getGreeting(currentHour);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FlatList
        data={filteredGames}
        keyExtractor={item => item.id}
        numColumns={2}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.cardColumn,
              index % 2 === 0 ? styles.leftColumn : styles.rightColumn,
            ]}
          >
            <GameCard game={item} onPress={handleGamePress} />
          </View>
        )}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.headerTitleGroup}>
                <Text style={styles.eyebrow}>CHƠI MỌI LÚC</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Đổi tên người chơi"
                  disabled={!isNameHydrated}
                  hitSlop={8}
                  onPress={openNameEditor}
                  style={styles.greetingButton}
                >
                  <Text numberOfLines={2} style={styles.heading}>
                    {playerName ? `${greeting}, ${playerName}!` : greeting}
                  </Text>
                  {!!playerName && (
                    <IconEdit width={17} height={17} color="#69718A" />
                  )}
                </Pressable>
              </View>

              <View style={styles.offlineBadge}>
                <View style={styles.offlineDot} />
                <Text style={styles.offlineText}>Chơi vui</Text>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <IconSearch width={24} height={24} color="#5E657B" />
              <TextInput
                accessibilityLabel="Tìm kiếm game"
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Tìm kiếm tên game..."
                placeholderTextColor="#9298AA"
                returnKeyType="search"
                autoCorrect={false}
                style={styles.searchInput}
              />

              {searchText.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Xóa nội dung tìm kiếm"
                  hitSlop={10}
                  onPress={() => setSearchText('')}
                  style={styles.clearButton}
                >
                  <IconClose width={16} height={16} color="#6F768B" />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tất cả trò chơi</Text>
              <Text style={styles.gameCount}>{filteredGames.length} game</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSearch width={52} height={52} color="#A4A9B8" />
            <Text style={styles.emptyTitle}>Không tìm thấy game</Text>
            <Text style={styles.emptyDescription}>
              Thử tìm với một tên khác nhé.
            </Text>
          </View>
        }
      />
      {!!appVersion && (
        <Text style={styles.version}>
          Góc Trò Chơi · Phiên bản {appVersion}
        </Text>
      )}

      <Modal
        animationType="fade"
        transparent
        statusBarTranslucent
        visible={isNameModalVisible}
        onRequestClose={closeNameEditor}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.nameCard}>
            <Text style={styles.nameTitle}>
              {playerName ? 'Đổi tên người chơi' : 'Bạn tên là gì?'}
            </Text>
            <Text style={styles.nameDescription}>Nhập tên của bạn.</Text>
            <TextInput
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              editable={!isSavingName}
              maxLength={MAX_PLAYER_NAME_LENGTH}
              placeholder="Tên người chơi"
              placeholderTextColor="#9298AA"
              returnKeyType="done"
              value={draftName}
              onChangeText={value => {
                setDraftName(value);
                setNameError('');
              }}
              onSubmitEditing={savePlayerName}
              style={[
                styles.nameInput,
                nameError ? styles.nameInputError : null,
              ]}
            />
            {!!nameError && <Text style={styles.nameError}>{nameError}</Text>}
            <View style={styles.nameActions}>
              {!!playerName && (
                <Pressable
                  accessibilityRole="button"
                  disabled={isSavingName}
                  onPress={closeNameEditor}
                  style={({ pressed }) => [
                    styles.cancelNameButton,
                    pressed ? styles.nameButtonPressed : null,
                  ]}
                >
                  <Text style={styles.cancelNameText}>HUỶ</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                disabled={isSavingName}
                onPress={savePlayerName}
                style={({ pressed }) => [
                  styles.saveNameButton,
                  pressed ? styles.nameButtonPressed : null,
                  isSavingName ? styles.nameButtonDisabled : null,
                ]}
              >
                <Text style={styles.saveNameText}>
                  {isSavingName ? 'ĐANG LƯU...' : 'LƯU TÊN'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
  },
  row: {
    marginBottom: 14,
  },
  cardColumn: {
    width: '50%',
  },
  leftColumn: {
    paddingRight: 7,
  },
  rightColumn: {
    paddingLeft: 7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleGroup: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
    color: '#69718A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  heading: {
    flexShrink: 1,
    color: '#22263A',
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  greetingButton: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#E4F7EF',
  },
  offlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#1EAC7E',
  },
  offlineText: {
    color: '#16815F',
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    height: 54,
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEEF5',
    shadowColor: '#22263A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 10,
    paddingVertical: 0,
    color: '#252A3D',
    fontSize: 15,
    fontWeight: '500',
  },
  clearButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF1F6',
  },
  sectionHeader: {
    marginTop: 28,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#2A2E42',
    fontSize: 18,
    fontWeight: '800',
  },
  gameCount: {
    color: '#858B9E',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 54,
  },
  emptyTitle: {
    marginTop: 10,
    color: '#34384C',
    fontSize: 17,
    fontWeight: '800',
  },
  emptyDescription: {
    marginTop: 6,
    color: '#858B9E',
    fontSize: 14,
  },
  version: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: '#858B9E',
    fontSize: 12,
    textAlign: 'center',
    backgroundColor: '#F7F8FC',
  },
  modalBackdrop: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171A32B8',
  },
  nameCard: {
    width: '100%',
    maxWidth: 360,
    padding: 24,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
  },
  nameTitle: {
    color: '#22263A',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  nameDescription: {
    marginTop: 8,
    color: '#69718A',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  nameInput: {
    height: 54,
    marginTop: 22,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDE0EA',
    color: '#252A3D',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: '#F8F9FC',
  },
  nameInputError: {
    borderColor: '#D95757',
  },
  nameError: {
    marginTop: 7,
    color: '#C94848',
    fontSize: 12,
    fontWeight: '600',
  },
  nameActions: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 10,
  },
  cancelNameButton: {
    height: 50,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDE0EA',
    backgroundColor: '#F4F5F9',
  },
  cancelNameText: {
    color: '#60677D',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  saveNameButton: {
    height: 50,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#5D67D8',
  },
  saveNameText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  nameButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  nameButtonDisabled: {
    opacity: 0.55,
  },
});
