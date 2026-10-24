import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createPuzzle, getConflicts, isComplete } from './sudokuEngine';
import { colors } from '../../themes/colors';

const DIFFICULTY_LABELS = {
  easy: 'Dễ',
  medium: 'Vừa',
  hard: 'Khó',
};

function findFirstEmpty(grid) {
  for (let row = 0; row < 9; row += 1) {
    for (let column = 0; column < 9; column += 1) {
      if (grid[row][column] === 0) {
        return { row, column };
      }
    }
  }
  return { row: 0, column: 0 };
}

export function SudokuScreen({ onBack }) {
  const { width } = useWindowDimensions();
  const boardSize = 2 * Math.min(width - 32, 480);
  const cellSize = boardSize / 9;
  const [difficulty, setDifficulty] = React.useState('easy');
  const [game, setGame] = React.useState(() => createPuzzle('easy'));
  const [grid, setGrid] = React.useState(() =>
    game.puzzle.map(row => [...row]),
  );
  const [selected, setSelected] = React.useState(() =>
    findFirstEmpty(game.puzzle),
  );
  const conflicts = React.useMemo(() => getConflicts(grid), [grid]);
  const completed = isComplete(grid, game.solution);
  const selectedValue = selected ? grid[selected.row][selected.column] : 0;
  const selectedIsEditable =
    selected && game.puzzle[selected.row][selected.column] === 0;

  const startNewPuzzle = nextDifficulty => {
    const nextGame = createPuzzle(nextDifficulty);
    setDifficulty(nextDifficulty);
    setGame(nextGame);
    setGrid(nextGame.puzzle.map(row => [...row]));
    setSelected(findFirstEmpty(nextGame.puzzle));
  };

  const enterValue = value => {
    if (
      !selected ||
      completed ||
      game.puzzle[selected.row][selected.column] !== 0
    ) {
      return;
    }

    setGrid(current =>
      current.map((row, rowIndex) =>
        rowIndex === selected.row
          ? row.map((cell, columnIndex) =>
              columnIndex === selected.column ? value : cell,
            )
          : row,
      ),
    );
  };

  const isRelatedCell = (row, column) =>
    selected &&
    (row === selected.row ||
      column === selected.column ||
      (Math.floor(row / 3) === Math.floor(selected.row / 3) &&
        Math.floor(column / 3) === Math.floor(selected.column / 3)));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            hitSlop={10}
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backText}>Quay lại</Text>
          </Pressable>
          <Text style={styles.eyebrow}>TƯ DUY CON SỐ</Text>
          <Text style={styles.title}>Sudoku</Text>
          <Text style={styles.subtitle}>
            Điền số vào từng hàng, cột và ô vuông.
          </Text>
        </View>

        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Độ khó"
          style={styles.difficultyRow}
        >
          {Object.entries(DIFFICULTY_LABELS).map(([key, label]) => (
            <Pressable
              key={key}
              accessibilityRole="radio"
              accessibilityLabel={`Độ khó ${label.toLowerCase()}`}
              accessibilityState={{ selected: difficulty === key }}
              onPress={() => startNewPuzzle(key)}
              style={({ pressed }) => [
                styles.difficultyButton,
                difficulty === key ? styles.activeDifficulty : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text
                style={[
                  styles.difficultyText,
                  difficulty === key ? styles.activeDifficultyText : null,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          horizontal
          nestedScrollEnabled
          style={styles.boardScroller}
          contentContainerStyle={styles.boardScrollContent}
          accessibilityLabel="Bàn Sudoku có thể cuộn ngang"
          showsHorizontalScrollIndicator
        >
          <View
            accessibilityLabel="Bàn Sudoku"
            style={[styles.board, { width: boardSize, height: boardSize }]}
          >
            {grid.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.boardRow}>
                {row.map((value, columnIndex) => {
                  const key = `${rowIndex}-${columnIndex}`;
                  const isGiven = game.puzzle[rowIndex][columnIndex] !== 0;
                  const isSelected =
                    selected?.row === rowIndex &&
                    selected?.column === columnIndex;
                  const isConflict = conflicts.has(key);
                  const isSameValue = Boolean(value && value === selectedValue);

                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      accessibilityLabel={[
                        `Hàng ${rowIndex + 1}, cột ${columnIndex + 1}`,
                        value ? `số ${value}` : 'ô trống',
                        isGiven ? 'số cho sẵn' : 'có thể điền',
                        isConflict ? 'bị trùng' : '',
                      ]
                        .filter(Boolean)
                        .join(', ')}
                      accessibilityState={{
                        selected: isSelected,
                        disabled: completed,
                      }}
                      disabled={completed}
                      onPress={() =>
                        setSelected({ row: rowIndex, column: columnIndex })
                      }
                      style={[
                        styles.cell,
                        { width: cellSize, height: cellSize },
                        isRelatedCell(rowIndex, columnIndex)
                          ? styles.relatedCell
                          : null,
                        isSameValue ? styles.sameValueCell : null,
                        isSelected ? styles.selectedCell : null,
                        isConflict ? styles.conflictCell : null,
                        columnIndex % 3 === 2 && columnIndex !== 8
                          ? styles.boxRightBorder
                          : null,
                        rowIndex % 3 === 2 && rowIndex !== 8
                          ? styles.boxBottomBorder
                          : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          {
                            fontSize: Math.max(
                              36,
                              Math.min(64, cellSize * 0.66),
                            ),
                          },
                          isGiven ? styles.givenText : styles.enteredText,
                          isConflict ? styles.conflictText : null,
                        ]}
                      >
                        {value || ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>

        <Text
          accessibilityLiveRegion="polite"
          style={[styles.message, completed ? styles.successMessage : null]}
        >
          {completed
            ? 'Hoàn thành Sudoku — giỏi lắm!'
            : conflicts.size
            ? 'Các số bị trùng đã được tô màu. Hãy tiếp tục!'
            : 'Chọn một ô rồi chọn số cần điền.'}
        </Text>

        <View style={styles.numberPad} accessibilityLabel="Bàn phím số">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(value => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={`Nhập số ${value}`}
              accessibilityState={{
                disabled: completed || !selectedIsEditable,
              }}
              disabled={completed || !selectedIsEditable}
              onPress={() => enterValue(value)}
              style={({ pressed }) => [
                styles.numberButton,
                pressed ? styles.numberButtonPressed : null,
              ]}
            >
              <Text style={styles.numberButtonText}>{value}</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xóa số trong ô đã chọn"
            accessibilityState={{ disabled: completed || !selectedIsEditable }}
            disabled={completed || !selectedIsEditable}
            onPress={() => enterValue(0)}
            style={({ pressed }) => [
              styles.eraseButton,
              pressed ? styles.numberButtonPressed : null,
            ]}
          >
            <Text style={styles.eraseText}>Xóa số</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Tạo câu đố mới mức ${DIFFICULTY_LABELS[
            difficulty
          ].toLowerCase()}`}
          onPress={() => startNewPuzzle(difficulty)}
          style={({ pressed }) => [
            styles.newPuzzleButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.newPuzzleText}>Câu đố mới</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.green_F4F7F5,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 18,
  },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  backArrow: {
    color: colors.teal_285C53,
    fontSize: 32,
    lineHeight: 34,
    marginRight: 4,
  },
  backText: {
    color: colors.teal_285C53,
    fontSize: 18,
    fontWeight: '700',
  },
  eyebrow: {
    color: colors.teal_285C53,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginTop: 8,
  },
  title: {
    color: colors.teal_193B34,
    fontSize: 36,
    fontWeight: '800',
    marginTop: 2,
  },
  subtitle: {
    color: colors.teal_285C53,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  difficultyRow: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    backgroundColor: colors.green_E6ECE9,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  difficultyButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  activeDifficulty: {
    backgroundColor: colors.white_FFFFFF,
    elevation: 1,
    shadowColor: colors.green_203B34,
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  difficultyText: {
    color: colors.teal_285C53,
    fontSize: 18,
    fontWeight: '800',
  },
  activeDifficultyText: {
    color: colors.teal_285C53,
    fontWeight: '800',
  },
  boardScroller: {
    width: '100%',
    flexGrow: 0,
  },
  boardScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  board: {
    flexDirection: 'column',
    borderWidth: 2,
    borderColor: colors.teal_244B42,
    backgroundColor: colors.white_FFFFFF,
    alignSelf: 'center',
  },
  boardRow: {
    flex: 1,
    flexDirection: 'row',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray_C8D3CF,
    backgroundColor: colors.white_FFFFFF,
  },
  relatedCell: {
    backgroundColor: colors.green_EDF3F0,
  },
  sameValueCell: {
    backgroundColor: colors.green_DCEBE5,
  },
  selectedCell: {
    backgroundColor: colors.green_C5E6D9,
    borderWidth: 2,
    borderColor: colors.green_278263,
    zIndex: 1,
  },
  conflictCell: {
    backgroundColor: colors.pink_FBE2DE,
  },
  boxRightBorder: {
    borderRightWidth: 2,
    borderRightColor: colors.green_58756C,
  },
  boxBottomBorder: {
    borderBottomWidth: 2,
    borderBottomColor: colors.green_58756C,
  },
  cellText: {
    color: colors.green_21473D,
    textAlign: 'center',
    includeFontPadding: false,
  },
  givenText: {
    color: colors.teal_193B34,
    fontWeight: '900',
  },
  enteredText: {
    color: colors.green_27745A,
    fontWeight: '800',
  },
  conflictText: {
    color: colors.red_B33A2E,
  },
  message: {
    minHeight: 38,
    color: colors.teal_285C53,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    textAlign: 'center',
    paddingTop: 12,
  },
  successMessage: {
    color: colors.green_18734E,
    fontWeight: '800',
  },
  numberPad: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  numberButton: {
    width: '17%',
    minWidth: 48,
    maxWidth: 72,
    minHeight: 60,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.white_FFFFFF,
    borderWidth: 1,
    borderColor: colors.green_DCE5E1,
  },
  numberButtonPressed: {
    backgroundColor: colors.green_DCEBE5,
    transform: [{ scale: 0.97 }],
  },
  numberButtonText: {
    color: colors.teal_285C53,
    fontSize: 28,
    fontWeight: '800',
  },
  eraseButton: {
    width: '37%',
    minWidth: 110,
    minHeight: 60,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.gray_E7ECE9,
  },
  eraseText: {
    color: colors.gray_52675F,
    fontSize: 18,
    fontWeight: '800',
  },
  newPuzzleButton: {
    width: '100%',
    maxWidth: 480,
    minHeight: 56,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.teal_285C53,
    marginTop: 14,
  },
  newPuzzleText: {
    color: colors.white_FFFFFF,
    fontSize: 20,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.8,
  },
});
