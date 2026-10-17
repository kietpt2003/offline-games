import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameCard } from '../components/GameCard';
import { games } from '../data/games';

function normalizeSearch(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export function HomeScreen({ onOpenGame }) {
  const [searchText, setSearchText] = useState('');

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
      game.id === 'pikachu'
    ) {
      onOpenGame(game.id);
    }
  };

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
              <View>
                <Text style={styles.eyebrow}>CHƠI MỌI LÚC</Text>
                <Text style={styles.heading}>Trò chơi Offline</Text>
              </View>

              <View style={styles.offlineBadge}>
                <View style={styles.offlineDot} />
                <Text style={styles.offlineText}>Offline</Text>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>⌕</Text>
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
                  <Text style={styles.clearIcon}>×</Text>
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
            <Text style={styles.emptyIcon}>⌕</Text>
            <Text style={styles.emptyTitle}>Không tìm thấy game</Text>
            <Text style={styles.emptyDescription}>
              Thử tìm với một tên khác nhé.
            </Text>
          </View>
        }
      />
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
  eyebrow: {
    color: '#69718A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  heading: {
    marginTop: 5,
    color: '#22263A',
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -0.8,
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
  searchIcon: {
    color: '#5E657B',
    fontSize: 27,
    lineHeight: 30,
    transform: [{ rotate: '-18deg' }],
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
  clearIcon: {
    marginTop: -2,
    color: '#6F768B',
    fontSize: 20,
    lineHeight: 22,
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
  emptyIcon: {
    color: '#A4A9B8',
    fontSize: 52,
    transform: [{ rotate: '-18deg' }],
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
});
