import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createGame,
  DIFFICULTIES,
  revealCell,
  toggleFlag,
} from './minesweeperEngine';

const NUMBER_COLORS = [
  '#1464C0',
  '#168044',
  '#D13A32',
  '#663399',
  '#B15A17',
  '#008B8B',
  '#333333',
  '#777777',
];

const DIFFICULTY_LABELS = {
  Beginner: 'Dễ',
  Intermediate: 'Trung bình',
  Expert: 'Khó',
};

function DifficultyButton({ name, selected, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.difficultyButton, selected && styles.selectedDifficulty]}
    >
      <Text
        style={[
          styles.difficultyText,
          selected && styles.selectedDifficultyText,
        ]}
      >
        {DIFFICULTY_LABELS[name]}
      </Text>
    </Pressable>
  );
}

function GameCell({ cell, row, column, size, flagMode, onReveal, onFlag }) {
  const description = cell.revealed
    ? cell.mine
      ? 'Có mìn'
      : cell.adjacent > 0
      ? `${cell.adjacent} mìn xung quanh`
      : 'Ô trống'
    : cell.flagged
    ? 'Đã đánh dấu cờ'
    : 'Chưa mở';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Hàng ${row + 1}, cột ${column + 1}: ${description}`}
      accessibilityHint={
        cell.revealed
          ? 'Ô đã được mở'
          : flagMode
          ? 'Chạm hai lần để đánh dấu hoặc bỏ cờ'
          : 'Chạm để mở ô; nhấn giữ để đánh dấu cờ'
      }
      accessibilityState={{ disabled: cell.revealed }}
      onPress={() =>
        flagMode ? onFlag(row, column) : onReveal(row, column)
      }
      onLongPress={() => onFlag(row, column)}
      delayLongPress={350}
      style={[
        styles.cell,
        {
          width: size,
          height: size,
        },
        cell.revealed && styles.revealedCell,
        cell.flagged && styles.flaggedCell,
      ]}
    >
      <Text
        style={[
          styles.cellText,
          { fontSize: Math.max(13, Math.round(size * 0.57)) },
          cell.revealed &&
            cell.adjacent > 0 &&
            !cell.mine && { color: NUMBER_COLORS[cell.adjacent - 1] },
        ]}
      >
        {cell.flagged && !cell.revealed
          ? '🚩'
          : cell.revealed
          ? cell.mine
            ? '✹'
            : cell.adjacent > 0
            ? cell.adjacent
            : ''
          : ''}
      </Text>
    </Pressable>
  );
}

export default function MinesweeperScreen({ onBack }) {
  const [difficulty, setDifficulty] = useState('Beginner');
  const [game, setGame] = useState(() => createGame('Beginner'));
  const [flagMode, setFlagMode] = useState(false);
  const { width } = useWindowDimensions();
  const cellSize = Math.max(25, Math.min(38, (width - 40) / game.columns));

  const startGame = nextDifficulty => {
    setDifficulty(nextDifficulty);
    setGame(createGame(nextDifficulty));
    setFlagMode(false);
  };

  const statusMessage =
    game.status === 'won'
      ? 'Bạn đã dò hết ô an toàn — chiến thắng!'
      : game.status === 'lost'
      ? 'Bạn đã trúng mìn. Hãy thử lại!'
      : 'Chạm ô để mở. Nhấn giữ hoặc bật chế độ cắm cờ để đánh dấu mìn.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.screenContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={onBack}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹ Quay lại</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Dò mìn
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Độ khó"
          style={styles.difficultyRow}
        >
          {Object.keys(DIFFICULTIES).map(name => (
            <DifficultyButton
              key={name}
              name={name}
              selected={difficulty === name}
              onPress={() => startGame(name)}
            />
          ))}
        </View>

        <View style={styles.statusPanel}>
          <Text style={styles.mineCounter} accessibilityLiveRegion="polite">
            🚩 Còn {game.flagsRemaining} cờ
          </Text>
          <Text style={styles.statusText} accessibilityLiveRegion="polite">
            {statusMessage}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bắt đầu ván mới"
            onPress={() => startGame(difficulty)}
            style={styles.resetButton}
          >
            <Text style={styles.resetText}>Ván mới</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            flagMode ? 'Tắt chế độ cắm cờ' : 'Bật chế độ cắm cờ'
          }
          accessibilityState={{ selected: flagMode }}
          onPress={() => setFlagMode(mode => !mode)}
          style={[styles.flagModeButton, flagMode && styles.flagModeActive]}
        >
          <Text
            style={[
              styles.flagModeText,
              flagMode && styles.flagModeActiveText,
            ]}
          >
            {flagMode ? '🚩 Đang bật chế độ cắm cờ' : '🚩 Bật chế độ cắm cờ'}
          </Text>
        </Pressable>

        <ScrollView
          horizontal
          style={styles.boardScroller}
          contentContainerStyle={styles.boardScrollerContent}
          accessibilityLabel="Bàn dò mìn có thể cuộn"
          directionalLockEnabled
          showsHorizontalScrollIndicator
        >
          <View style={styles.board}>
            {game.board.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.boardRow}>
                {row.map((cell, columnIndex) => (
                  <GameCell
                    key={`${rowIndex}-${columnIndex}`}
                    cell={cell}
                    row={rowIndex}
                    column={columnIndex}
                    size={cellSize}
                    flagMode={flagMode}
                    onReveal={(targetRow, targetColumn) =>
                      setGame(current =>
                        revealCell(current, targetRow, targetColumn),
                      )
                    }
                    onFlag={(targetRow, targetColumn) =>
                      setGame(current =>
                        toggleFlag(current, targetRow, targetColumn),
                      )
                    }
                  />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
        <Text style={styles.boardHint}>
          {game.columns > 12
            ? 'Vuốt ngang để xem toàn bộ bàn cờ.'
            : 'Nhấn giữ một ô để cắm cờ.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7F5',
  },
  screenContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  header: {
    width: '100%',
    maxWidth: 620,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    minWidth: 76,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    color: '#246447',
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    color: '#183B2D',
    fontSize: 23,
    fontWeight: '800',
  },
  headerSpacer: {
    minWidth: 76,
  },
  difficultyRow: {
    width: '100%',
    maxWidth: 620,
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  difficultyButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C9D6CE',
    backgroundColor: '#FFFFFF',
  },
  selectedDifficulty: {
    backgroundColor: '#246447',
    borderColor: '#246447',
  },
  difficultyText: {
    color: '#335144',
    fontSize: 13,
    fontWeight: '700',
  },
  selectedDifficultyText: {
    color: '#FFFFFF',
  },
  statusPanel: {
    width: '100%',
    maxWidth: 620,
    minHeight: 92,
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#E4EEE8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  mineCounter: {
    color: '#183B2D',
    fontSize: 15,
    fontWeight: '800',
    minWidth: 76,
  },
  statusText: {
    flex: 1,
    color: '#355648',
    fontSize: 12,
    lineHeight: 17,
  },
  resetButton: {
    minHeight: 40,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  resetText: {
    color: '#246447',
    fontSize: 13,
    fontWeight: '700',
  },
  flagModeButton: {
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C9D6CE',
  },
  flagModeActive: {
    backgroundColor: '#F6D86B',
    borderColor: '#D2A91D',
  },
  flagModeText: {
    color: '#335144',
    fontWeight: '700',
  },
  flagModeActiveText: {
    color: '#493A0A',
  },
  boardScroller: {
    flexGrow: 0,
    maxWidth: '100%',
    marginTop: 16,
  },
  boardScrollerContent: {
    alignSelf: 'center',
  },
  board: {
    padding: 5,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#8C9C91',
    backgroundColor: '#B8C7BC',
  },
  boardRow: {
    flexDirection: 'row',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#86978B',
    backgroundColor: '#DFE8E1',
  },
  revealedCell: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D2DDD5',
  },
  flaggedCell: {
    backgroundColor: '#F7E9A7',
  },
  cellText: {
    color: '#C92D26',
    fontWeight: '900',
    textAlign: 'center',
  },
  boardHint: {
    marginTop: 8,
    color: '#617268',
    fontSize: 12,
  },
});
