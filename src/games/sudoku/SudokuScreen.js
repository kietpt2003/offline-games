import React, { useMemo, useState } from 'react';
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
  const boardSize = Math.min(width - 32, 480);
  const cellSize = boardSize / 9;
  const [difficulty, setDifficulty] = useState('easy');
  const [game, setGame] = useState(() => createPuzzle('easy'));
  const [grid, setGrid] = useState(() => game.puzzle.map(row => [...row]));
  const [selected, setSelected] = useState(() => findFirstEmpty(game.puzzle));
  const conflicts = useMemo(() => getConflicts(grid), [grid]);
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
          <Text style={styles.subtitle}>Điền số vào từng hàng, cột và ô vuông.</Text>
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
                          fontSize: Math.max(15, Math.min(26, cellSize * 0.54)),
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
          accessibilityLabel={`Tạo câu đố mới mức ${
            DIFFICULTY_LABELS[difficulty].toLowerCase()
          }`}
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
    backgroundColor: '#F4F7F5',
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
    position: 'absolute',
    left: 0,
    top: 0,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  backArrow: {
    color: '#285C53',
    fontSize: 32,
    lineHeight: 34,
    marginRight: 4,
  },
  backText: {
    color: '#285C53',
    fontSize: 15,
    fontWeight: '600',
  },
  eyebrow: {
    color: '#658179',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginTop: 8,
  },
  title: {
    color: '#193B34',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 2,
  },
  subtitle: {
    color: '#647871',
    fontSize: 14,
    marginTop: 2,
  },
  difficultyRow: {
    flexDirection: 'row',
    backgroundColor: '#E6ECE9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  difficultyButton: {
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  activeDifficulty: {
    backgroundColor: '#FFFFFF',
    elevation: 1,
    shadowColor: '#203B34',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  difficultyText: {
    color: '#65766F',
    fontSize: 14,
    fontWeight: '600',
  },
  activeDifficultyText: {
    color: '#285C53',
    fontWeight: '800',
  },
  board: {
    flexDirection: 'column',
    borderWidth: 2,
    borderColor: '#244B42',
    backgroundColor: '#FFFFFF',
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
    borderColor: '#C8D3CF',
    backgroundColor: '#FFFFFF',
  },
  relatedCell: {
    backgroundColor: '#EDF3F0',
  },
  sameValueCell: {
    backgroundColor: '#DCEBE5',
  },
  selectedCell: {
    backgroundColor: '#C5E6D9',
    borderWidth: 2,
    borderColor: '#278263',
    zIndex: 1,
  },
  conflictCell: {
    backgroundColor: '#FBE2DE',
  },
  boxRightBorder: {
    borderRightWidth: 2,
    borderRightColor: '#58756C',
  },
  boxBottomBorder: {
    borderBottomWidth: 2,
    borderBottomColor: '#58756C',
  },
  cellText: {
    color: '#21473D',
    textAlign: 'center',
  },
  givenText: {
    color: '#193B34',
    fontWeight: '800',
  },
  enteredText: {
    color: '#27745A',
    fontWeight: '600',
  },
  conflictText: {
    color: '#B33A2E',
  },
  message: {
    minHeight: 38,
    color: '#647871',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingTop: 12,
  },
  successMessage: {
    color: '#18734E',
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
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE5E1',
  },
  numberButtonPressed: {
    backgroundColor: '#DCEBE5',
    transform: [{ scale: 0.97 }],
  },
  numberButtonText: {
    color: '#285C53',
    fontSize: 21,
    fontWeight: '700',
  },
  eraseButton: {
    width: '37%',
    minWidth: 110,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#E7ECE9',
  },
  eraseText: {
    color: '#52675F',
    fontSize: 15,
    fontWeight: '700',
  },
  newPuzzleButton: {
    width: '100%',
    maxWidth: 480,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#285C53',
    marginTop: 14,
  },
  newPuzzleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.8,
  },
});
