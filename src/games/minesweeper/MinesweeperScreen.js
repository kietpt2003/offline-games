import React from 'react';
import {
  Modal,
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
import { colors } from '../../themes/colors';

const NUMBER_COLORS = [
  colors.blue_1464C0,
  colors.green_168044,
  colors.red_D13A32,
  colors.purple_663399,
  colors.brown_B15A17,
  colors.teal_285C53,
  colors.gray_333333,
  colors.gray_595B54,
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
      onPress={() => (flagMode ? onFlag(row, column) : onReveal(row, column))}
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
          { fontSize: Math.max(18, Math.round(size * 0.66)) },
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
  const [difficulty, setDifficulty] = React.useState('Beginner');
  const [game, setGame] = React.useState(() => createGame('Beginner'));
  const [flagMode, setFlagMode] = React.useState(false);
  const [isLossDismissed, setIsLossDismissed] = React.useState(false);
  const { width } = useWindowDimensions();
  const cellSize = 2 * Math.max(25, Math.min(38, (width - 40) / game.columns));

  const startGame = nextDifficulty => {
    setDifficulty(nextDifficulty);
    setGame(createGame(nextDifficulty));
    setFlagMode(false);
    setIsLossDismissed(false);
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bắt đầu ván mới"
            onPress={() => startGame(difficulty)}
            style={styles.resetButton}
          >
            <Text style={styles.resetText}>Ván mới</Text>
          </Pressable>
          <Text style={styles.statusText} accessibilityLiveRegion="polite">
            {statusMessage}
          </Text>
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
            style={[styles.flagModeText, flagMode && styles.flagModeActiveText]}
          >
            {flagMode ? '🚩 Đang bật chế độ cắm cờ' : '🚩 Bật chế độ cắm cờ'}
          </Text>
        </Pressable>

        <ScrollView
          horizontal
          nestedScrollEnabled
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
          Vuốt ngang hoặc dọc để xem bàn cờ. Nhấn giữ một ô để cắm cờ.
        </Text>
      </ScrollView>
      <Modal
        animationType="fade"
        transparent
        statusBarTranslucent
        visible={game.status === 'lost' && !isLossDismissed}
        onRequestClose={() => setIsLossDismissed(true)}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityViewIsModal style={styles.lossCard}>
            <Text style={styles.lossIcon}>✹</Text>
            <Text accessibilityRole="header" style={styles.lossTitle}>
              Bạn đã trúng mìn!
            </Text>
            <Text style={styles.lossDescription}>
              Ván chơi đã kết thúc. Bắt đầu ván mới để thử lại nhé.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chơi ván mới"
              onPress={() => startGame(difficulty)}
              style={styles.playAgainButton}
            >
              <Text style={styles.playAgainText}>Chơi ván mới</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsLossDismissed(true)}
              style={styles.reviewButton}
            >
              <Text style={styles.reviewText}>Xem bàn chơi</Text>
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
    backgroundColor: colors.green_F4F7F5,
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
    minWidth: 96,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    color: colors.green_246447,
    fontSize: 18,
    fontWeight: '700',
  },
  title: {
    color: colors.green_183B2D,
    fontSize: 28,
    fontWeight: '800',
  },
  headerSpacer: {
    minWidth: 96,
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
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.green_C9D6CE,
    backgroundColor: colors.white_FFFFFF,
  },
  selectedDifficulty: {
    backgroundColor: colors.green_246447,
    borderColor: colors.green_246447,
  },
  difficultyText: {
    color: colors.green_335144,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  selectedDifficultyText: {
    color: colors.white_FFFFFF,
  },
  statusPanel: {
    width: '100%',
    maxWidth: 620,
    minHeight: 92,
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.green_E4EEE8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  mineCounter: {
    color: colors.green_183B2D,
    fontSize: 20,
    fontWeight: '800',
    minWidth: 76,
  },
  statusText: {
    width: '100%',
    color: colors.green_355648,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
  },
  resetButton: {
    minHeight: 48,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.white_FFFFFF,
  },
  resetText: {
    color: colors.green_246447,
    fontSize: 18,
    fontWeight: '800',
  },
  flagModeButton: {
    marginTop: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white_FFFFFF,
    borderWidth: 1,
    borderColor: colors.green_C9D6CE,
  },
  flagModeActive: {
    backgroundColor: colors.orange_F6D86B,
    borderColor: colors.brown_D2A91D,
  },
  flagModeText: {
    color: colors.green_335144,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  flagModeActiveText: {
    color: colors.brown_493A0A,
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
    borderColor: colors.gray_8C9C91,
    backgroundColor: colors.gray_B8C7BC,
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
    borderColor: colors.gray_86978B,
    backgroundColor: colors.green_DFE8E1,
  },
  revealedCell: {
    backgroundColor: colors.white_FFFFFF,
    borderColor: colors.green_D2DDD5,
  },
  flaggedCell: {
    backgroundColor: colors.beige_F7E9A7,
  },
  cellText: {
    color: colors.red_C92D26,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },
  boardHint: {
    marginTop: 8,
    color: colors.green_355648,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.blue_171A32B8,
  },
  lossCard: {
    width: '100%',
    maxWidth: 340,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: colors.white_FFFFFF,
  },
  lossIcon: {
    color: colors.red_D13A32,
    fontSize: 44,
  },
  lossTitle: {
    marginTop: 8,
    color: colors.green_183B2D,
    fontSize: 27,
    fontWeight: '800',
    textAlign: 'center',
  },
  lossDescription: {
    marginTop: 12,
    color: colors.green_355648,
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
  },
  playAgainButton: {
    width: '100%',
    minHeight: 48,
    marginTop: 24,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green_246447,
  },
  playAgainText: {
    color: colors.white_FFFFFF,
    fontSize: 20,
    fontWeight: '800',
  },
  reviewButton: {
    minHeight: 48,
    marginTop: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewText: {
    color: colors.green_246447,
    fontSize: 18,
    fontWeight: '700',
  },
});
