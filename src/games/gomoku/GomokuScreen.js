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

import {
  BOARD_SIZE,
  createGameState,
  makeComputerMove,
  makeMove,
} from './gomokuEngine';
import { colors } from '../../themes/colors';

const CELL_GAP = 1;
const CELL_MIN_SIZE = 20;
const CELL_MAX_SIZE = 36;

export function GomokuScreen({ onBack }) {
  const { width } = useWindowDimensions();
  const [game, setGame] = React.useState(createGameState);
  const [mode, setMode] = React.useState('single');
  const cellSize =
    2 *
    Math.max(
      CELL_MIN_SIZE,
      Math.min(CELL_MAX_SIZE, Math.floor((width - 32) / BOARD_SIZE)),
    );
  const boardExtent = BOARD_SIZE * cellSize + (BOARD_SIZE - 1) * CELL_GAP;
  const isFinished = Boolean(game.winner) || game.draw;
  const status = game.winner
    ? mode === 'single'
      ? game.winner === 'X'
        ? 'Bạn đã thắng!'
        : 'Máy đã thắng!'
      : `${game.winner} đã thắng!`
    : game.draw
    ? 'Ván đấu hòa!'
    : mode === 'single'
    ? game.turn === 'X'
      ? 'Lượt của bạn'
      : 'Đến lượt máy'
    : `Lượt của ${game.turn}`;

  const handleCellPress = (row, column) => {
    setGame(currentGame => {
      const nextGame = makeMove(currentGame, row, column);
      return mode === 'single' && nextGame.turn === 'O' && !nextGame.winner
        ? makeComputerMove(nextGame)
        : nextGame;
    });
  };

  const startGame = nextMode => {
    setMode(nextMode);
    setGame(createGameState());
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [
            styles.headerButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.headerButtonText}>Quay lại</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          Caro
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bắt đầu ván mới"
          onPress={() => setGame(createGameState())}
          style={({ pressed }) => [
            styles.headerButton,
            styles.resetButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.headerButtonText}>Ván mới</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Chế độ chơi"
          style={styles.modeSelector}
        >
          {[
            { key: 'single', label: 'Chơi đơn', hint: 'Đấu với máy' },
            { key: 'double', label: 'Chơi đôi', hint: 'Đấu với người' },
          ].map(option => (
            <Pressable
              key={option.key}
              accessibilityRole="radio"
              accessibilityLabel={`${option.label}, ${option.hint}`}
              accessibilityState={{ selected: mode === option.key }}
              onPress={() => startGame(option.key)}
              style={({ pressed }) => [
                styles.modeButton,
                mode === option.key ? styles.selectedModeButton : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === option.key ? styles.selectedModeText : null,
                ]}
              >
                {option.label}
              </Text>
              <Text
                style={[
                  styles.modeHint,
                  mode === option.key ? styles.selectedModeText : null,
                ]}
              >
                {option.hint}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="header"
          style={[styles.status, isFinished ? styles.finishedStatus : null]}
        >
          {status}
        </Text>
        <Text style={styles.instructions}>
          {mode === 'single'
            ? 'Bạn cầm X, máy cầm O. Nối đủ 5 quân liên tiếp để thắng.'
            : 'Hai người lần lượt đánh X và O. Nối đủ 5 quân liên tiếp để thắng.'}
        </Text>

        <ScrollView
          horizontal
          style={styles.boardScroller}
          contentContainerStyle={styles.boardScrollContent}
          nestedScrollEnabled
          showsHorizontalScrollIndicator
        >
          <View
            accessibilityLabel="Bàn cờ Caro 15 nhân 15"
            style={[
              styles.board,
              {
                width: boardExtent,
                height: boardExtent,
              },
            ]}
          >
            {game.board.map((boardRow, row) => (
              <View key={row} style={styles.row}>
                {boardRow.map((cell, column) => (
                  <Pressable
                    key={column}
                    accessibilityRole="button"
                    accessibilityLabel={`Hàng ${row + 1}, cột ${column + 1}, ${
                      cell ? `quân ${cell}` : 'ô trống'
                    }`}
                    accessibilityState={{
                      disabled: isFinished || Boolean(cell),
                    }}
                    disabled={isFinished || Boolean(cell)}
                    onPress={() => handleCellPress(row, column)}
                    style={({ pressed }) => [
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        marginRight: column === BOARD_SIZE - 1 ? 0 : CELL_GAP,
                        marginBottom: row === BOARD_SIZE - 1 ? 0 : CELL_GAP,
                      },
                      pressed ? styles.cellPressed : null,
                    ]}
                  >
                    {cell ? (
                      <Text
                        accessible={false}
                        style={[
                          styles.mark,
                          cell === 'O' ? styles.oMark : styles.xMark,
                          {
                            fontSize: Math.round(cellSize * 0.78),
                            lineHeight: cellSize,
                          },
                        ]}
                      >
                        {cell}
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
        <Text style={styles.boardHint}>
          Vuốt ngang hoặc dọc để xem toàn bộ bàn cờ.
        </Text>
        {isFinished ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chơi lại"
            onPress={() => setGame(createGameState())}
            style={({ pressed }) => [
              styles.playAgainButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.playAgainText}>Chơi lại</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.beige_F7F4EC,
  },
  header: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.beige_D8D2C5,
  },
  headerButton: {
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  backIcon: {
    color: colors.green_274D42,
    fontSize: 30,
    lineHeight: 34,
    marginRight: 2,
  },
  headerButtonText: {
    color: colors.green_274D42,
    fontSize: 15,
    fontWeight: '600',
  },
  resetButton: {
    minWidth: 86,
    backgroundColor: colors.green_E6EDE5,
  },
  title: {
    color: colors.green_253D35,
    fontSize: 21,
    fontWeight: '700',
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  modeSelector: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.green_C8D5CC,
    backgroundColor: colors.white_FFFFFF,
  },
  selectedModeButton: {
    backgroundColor: colors.green_315E4E,
    borderColor: colors.green_315E4E,
  },
  modeButtonText: {
    color: colors.green_274D42,
    fontSize: 15,
    fontWeight: '700',
  },
  modeHint: {
    marginTop: 2,
    color: colors.gray_65665F,
    fontSize: 12,
  },
  selectedModeText: {
    color: colors.white_FFFFFF,
  },
  status: {
    color: colors.green_274D42,
    fontSize: 27,
    fontWeight: '700',
    textAlign: 'center',
  },
  finishedStatus: {
    color: colors.brown_A44C19,
  },
  instructions: {
    marginTop: 7,
    marginBottom: 20,
    color: colors.gray_595B54,
    fontSize: 15,
    textAlign: 'center',
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
    backgroundColor: colors.brown_6E5330,
    borderRadius: 5,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    marginRight: CELL_GAP,
    marginBottom: CELL_GAP,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orange_EBCB8B,
    borderColor: colors.brown_9B7742,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cellPressed: {
    backgroundColor: colors.beige_F5DDA8,
  },
  mark: {
    fontWeight: '900',
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  xMark: {
    color: colors.blue_254E73,
  },
  oMark: {
    color: colors.red_A33E39,
  },
  boardHint: {
    marginTop: 12,
    color: colors.gray_65665F,
    fontSize: 13,
    textAlign: 'center',
  },
  playAgainButton: {
    minHeight: 48,
    marginTop: 20,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.green_315E4E,
  },
  playAgainText: {
    color: colors.white_FFFFFF,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
