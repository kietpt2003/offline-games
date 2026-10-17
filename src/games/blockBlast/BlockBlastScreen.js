import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BOARD_SIZE,
  canPieceFit,
  canPlacePiece,
  clearCompletedLines,
  createEmptyBoard,
  generatePieceSet,
  getDropOrigin,
  getPieceBounds,
  hasAvailableMove,
  placePiece,
} from './blockBlastEngine';
import {
  loadBlockBlastState,
  MAX_UNDO_STEPS,
  saveBlockBlastState,
} from './blockBlastStorage';
import { createBlockBlastAudio } from './blockBlastAudio';

const BOARD_PADDING = 8;
const CELL_GAP = 3;
const PIECE_CELL_SIZE = 17;
const PIECE_CELL_GAP = 3;
const DRAG_LIFT_OFFSET = 80;
const INVALID_PREVIEW_COLOR = '#717A96';

function PiecePreview({ piece }) {
  if (!piece) {
    return <View style={styles.usedPiece} />;
  }

  const { rows: rowCount, columns: columnCount } = getPieceBounds(piece);
  const width =
    columnCount * PIECE_CELL_SIZE + (columnCount - 1) * PIECE_CELL_GAP;
  const height = rowCount * PIECE_CELL_SIZE + (rowCount - 1) * PIECE_CELL_GAP;

  return (
    <View style={[styles.piecePreview, { width, height }]}>
      {piece.cells.map(([row, column]) => (
        <View
          key={`${row}-${column}`}
          style={[
            styles.pieceCell,
            {
              backgroundColor: piece.color,
              left: column * (PIECE_CELL_SIZE + PIECE_CELL_GAP),
              top: row * (PIECE_CELL_SIZE + PIECE_CELL_GAP),
            },
          ]}
        />
      ))}
    </View>
  );
}

function DraggablePiece({
  piece,
  index,
  canFit,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [isDragging, setIsDragging] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const isDisabled = !piece || !canFit;
  const interactionRef = useRef(null);

  interactionRef.current = {
    index,
    isDisabled: isDisabled || isReturning,
    onDragStart,
    onDragMove,
    onDragEnd,
    onDragCancel,
  };

  const resetPosition = () => {
    setIsReturning(true);
    pan.stopAnimation();
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      speed: 24,
      bounciness: 0,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    }).start(() => {
      pan.setValue({ x: 0, y: 0 });
      setIsReturning(false);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        !interactionRef.current.isDisabled &&
        (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5),
      onPanResponderGrant: () => {
        const interaction = interactionRef.current;

        pan.stopAnimation();
        pan.setValue({ x: 0, y: 0 });
        setIsDragging(true);
        interaction.onDragStart(interaction.index);
      },
      onPanResponderMove: (_, gestureState) => {
        const interaction = interactionRef.current;

        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        interaction.onDragMove(
          interaction.index,
          gestureState.moveX,
          gestureState.moveY,
        );
      },
      onPanResponderRelease: () => {
        const interaction = interactionRef.current;
        const didPlace = interaction.onDragEnd(interaction.index);

        setIsDragging(false);

        if (!didPlace) {
          resetPosition();
        } else {
          pan.stopAnimation();
          pan.setValue({ x: 0, y: 0 });
        }
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
        interactionRef.current.onDragCancel();
        resetPosition();
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      style={[styles.draggablePiece, isDragging ? styles.draggingPiece : null]}
    >
      <View
        accessible
        accessibilityLabel={
          piece
            ? `Kéo khối số ${index + 1} để đặt lên bàn`
            : `Khối số ${index + 1} đã dùng`
        }
        accessibilityState={{ disabled: isDisabled }}
        style={[styles.pieceSlot, isDisabled ? styles.disabledPieceSlot : null]}
      >
        <Animated.View
          style={{
            transform: [
              { translateX: pan.x },
              {
                translateY: isDragging
                  ? Animated.subtract(pan.y, DRAG_LIFT_OFFSET)
                  : pan.y,
              },
              { scale: isDragging ? 1.22 : 1 },
            ],
          }}
        >
          <PiecePreview piece={piece} />
        </Animated.View>
      </View>
    </View>
  );
}

function ScoreCard({ label, value }) {
  return (
    <View style={styles.scoreCard}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={styles.scoreValue}>{value}</Text>
    </View>
  );
}

export function BlockBlastScreen({ onBack }) {
  const { width: windowWidth } = useWindowDimensions();
  const boardRef = useRef(null);
  const boardLayoutRef = useRef(null);
  const dragPreviewRef = useRef(null);
  const persistenceQueueRef = useRef(Promise.resolve());
  const audioRef = useRef(null);
  const boardSize = Math.min(windowWidth - 32, 400);
  const cellSize = Math.floor(
    (boardSize - BOARD_PADDING * 2 - CELL_GAP * (BOARD_SIZE - 1)) / BOARD_SIZE,
  );

  const [board, setBoard] = useState(createEmptyBoard);
  const [pieces, setPieces] = useState(() => generatePieceSet());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [message, setMessage] = useState('Kéo một khối lên bàn để chơi');
  const [isGameOver, setIsGameOver] = useState(false);
  const [combo, setCombo] = useState(0);
  const [dragPreview, setDragPreview] = useState(null);
  const [undoHistory, setUndoHistory] = useState([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const audio = createBlockBlastAudio();
    const appStateSubscription = AppState.addEventListener(
      'change',
      nextState => {
        if (nextState === 'active') {
          audio.resumeBackground();
        } else {
          audio.pauseBackground();
        }
      },
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

    loadBlockBlastState()
      .then(savedState => {
        if (!isActive) {
          return;
        }

        if (savedState.game) {
          const savedGame = savedState.game;

          setBoard(savedGame.board);
          setPieces(savedGame.pieces);
          setScore(savedGame.score);
          setIsGameOver(savedGame.isGameOver);
          setCombo(savedGame.combo);
          setUndoHistory(savedGame.undoHistory);
          setBestScore(Math.max(savedState.bestScore, savedGame.score));
          setMessage(
            savedGame.score > 0
              ? 'Đã khôi phục ván chơi trước'
              : 'Kéo một khối lên bàn để chơi',
          );
        } else {
          setBestScore(savedState.bestScore);
        }
      })
      .catch(() => {
        if (isActive) {
          setMessage('Không thể đọc ván cũ, đã tạo ván mới');
        }
      })
      .finally(() => {
        if (isActive) {
          setIsHydrated(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const gameState = {
      board,
      pieces,
      score,
      isGameOver,
      combo,
      undoHistory,
    };

    persistenceQueueRef.current = persistenceQueueRef.current
      .catch(() => undefined)
      .then(() => saveBlockBlastState(gameState, bestScore))
      .catch(() => undefined);
  }, [
    bestScore,
    board,
    combo,
    isGameOver,
    isHydrated,
    pieces,
    score,
    undoHistory,
  ]);

  const previewCellKeys = useMemo(() => {
    if (!dragPreview) {
      return new Set();
    }

    const previewPiece = pieces[dragPreview.pieceIndex];

    if (!previewPiece) {
      return new Set();
    }

    return previewPiece.cells.reduce((cellKeys, [rowOffset, columnOffset]) => {
      const row = dragPreview.row + rowOffset;
      const column = dragPreview.column + columnOffset;

      if (row >= 0 && row < BOARD_SIZE && column >= 0 && column < BOARD_SIZE) {
        cellKeys.add(`${row}-${column}`);
      }

      return cellKeys;
    }, new Set());
  }, [dragPreview, pieces]);

  const updateDragPreview = nextPreview => {
    const currentPreview = dragPreviewRef.current;

    if (
      currentPreview?.pieceIndex === nextPreview?.pieceIndex &&
      currentPreview?.row === nextPreview?.row &&
      currentPreview?.column === nextPreview?.column &&
      currentPreview?.isValid === nextPreview?.isValid
    ) {
      return;
    }

    dragPreviewRef.current = nextPreview;
    setDragPreview(nextPreview);
  };

  const clearDragPreview = () => {
    dragPreviewRef.current = null;
    setDragPreview(null);
  };

  const measureBoard = () => {
    boardRef.current?.measureInWindow((x, y, width, height) => {
      boardLayoutRef.current = { x, y, width, height };
    });
  };

  const startNewGame = () => {
    setBoard(createEmptyBoard());
    setPieces(generatePieceSet());
    setScore(0);
    setCombo(0);
    setMessage('Kéo một khối lên bàn để chơi');
    setIsGameOver(false);
    setUndoHistory([]);
    clearDragPreview();
  };

  const handleUndo = () => {
    const previousState = undoHistory[undoHistory.length - 1];

    if (!previousState) {
      return;
    }

    setBoard(previousState.board);
    setPieces(previousState.pieces);
    setScore(previousState.score);
    setIsGameOver(previousState.isGameOver);
    setCombo(previousState.combo);
    setUndoHistory(currentHistory => currentHistory.slice(0, -1));
    setMessage('Đã hoàn tác nước đi gần nhất');
    clearDragPreview();
  };

  const commitPiecePlacement = (pieceIndex, row, column) => {
    const selectedPiece = pieces[pieceIndex];

    if (!selectedPiece || isGameOver) {
      return false;
    }

    if (!canPlacePiece(board, selectedPiece, row, column)) {
      setMessage('Không thể đặt khối ở vị trí này');
      return false;
    }

    const placedBoard = placePiece(board, selectedPiece, row, column);
    const result = clearCompletedLines(placedBoard);
    const gainedScore =
      selectedPiece.cells.length + result.clearedLines * BOARD_SIZE * 2;
    const nextScore = score + gainedScore;
    const nextCombo = result.clearedLines > 0 ? combo + 1 : 0;
    let nextPieces = pieces.map((piece, index) =>
      index === pieceIndex ? null : piece,
    );

    if (nextPieces.every(piece => piece === null)) {
      nextPieces = generatePieceSet();
    }

    const previousState = {
      board,
      pieces,
      score,
      isGameOver,
      combo,
    };

    setUndoHistory(currentHistory =>
      [...currentHistory, previousState].slice(-MAX_UNDO_STEPS),
    );
    setBoard(result.board);
    setPieces(nextPieces);
    setScore(nextScore);
    setCombo(nextCombo);
    setBestScore(currentBest => Math.max(currentBest, nextScore));
    audioRef.current?.playPlacement();

    if (result.clearedLines > 0) {
      const praiseLevel = Math.min(
        3,
        nextCombo + Math.max(0, result.clearedLines - 1),
      );

      audioRef.current?.playLineClear();
      audioRef.current?.playPraise(praiseLevel);
      setMessage(
        nextCombo > 1
          ? `COMBO x${nextCombo} • Đã xoá ${result.clearedLines} hàng/cột`
          : `Tuyệt vời! Đã xoá ${result.clearedLines} hàng/cột`,
      );
    } else {
      setMessage(`+${gainedScore} điểm`);
    }

    if (!hasAvailableMove(result.board, nextPieces)) {
      setIsGameOver(true);
    }

    return true;
  };

  const handleDragStart = () => {
    setMessage('Di chuyển khối đến vị trí muốn đặt');
    measureBoard();
  };

  const handleDragMove = (pieceIndex, pointerX, pointerY) => {
    const layout = boardLayoutRef.current;
    const draggedPiece = pieces[pieceIndex];

    if (!layout || !draggedPiece) {
      return;
    }

    const liftedPointerY = pointerY - DRAG_LIFT_OFFSET;
    const isNearBoard =
      pointerX >= layout.x - cellSize &&
      pointerX <= layout.x + layout.width + cellSize &&
      liftedPointerY >= layout.y - cellSize &&
      liftedPointerY <= layout.y + layout.height + cellSize;

    if (!isNearBoard) {
      updateDragPreview(null);
      return;
    }

    const origin = getDropOrigin({
      piece: draggedPiece,
      pointerX,
      pointerY,
      boardX: layout.x,
      boardY: layout.y,
      boardPadding: BOARD_PADDING,
      cellSize,
      cellGap: CELL_GAP,
      liftOffset: DRAG_LIFT_OFFSET,
    });
    const nextPreview = {
      pieceIndex,
      ...origin,
      isValid: canPlacePiece(board, draggedPiece, origin.row, origin.column),
    };

    updateDragPreview(nextPreview);
  };

  const handleDragEnd = pieceIndex => {
    const preview = dragPreviewRef.current;

    clearDragPreview();

    if (!preview || preview.pieceIndex !== pieceIndex || !preview.isValid) {
      setMessage('Thả khối vào một vị trí hợp lệ trên bàn');
      return false;
    }

    return commitPiecePlacement(pieceIndex, preview.row, preview.column);
  };

  if (!isHydrated) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Đang tải ván chơi...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerSide}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại danh sách game"
              hitSlop={10}
              onPress={onBack}
              style={({ pressed }) => [
                styles.headerButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
          </View>

          <View style={styles.titleGroup}>
            <Text style={styles.title}>BLOCK BLAST</Text>
            <Text style={styles.subtitle}>XẾP KHỐI • XOÁ HÀNG</Text>
          </View>

          <View style={[styles.headerSide, styles.headerActions]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hoàn tác nước đi gần nhất"
              accessibilityState={{ disabled: undoHistory.length === 0 }}
              disabled={undoHistory.length === 0}
              hitSlop={6}
              onPress={handleUndo}
              style={({ pressed }) => [
                styles.headerButton,
                undoHistory.length === 0 ? styles.disabledHeaderButton : null,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.undoIcon}>↶</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chơi lại"
              hitSlop={6}
              onPress={startNewGame}
              style={({ pressed }) => [
                styles.headerButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.restartIcon}>↻</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.scoreRow}>
          <ScoreCard label="ĐIỂM" value={score} />
          <View style={styles.scoreDivider} />
          <ScoreCard label="KỶ LỤC" value={bestScore} />
        </View>

        <Text numberOfLines={1} style={styles.message}>
          {message}
        </Text>

        <View
          ref={boardRef}
          accessibilityLabel="Bàn chơi Block Blast 8 nhân 8"
          onLayout={measureBoard}
          style={[
            styles.board,
            {
              width: boardSize,
              height: boardSize,
              gap: CELL_GAP,
              padding: BOARD_PADDING,
            },
          ]}
        >
          {board.map((boardRow, rowIndex) => (
            <View key={rowIndex} style={[styles.boardRow, { gap: CELL_GAP }]}>
              {boardRow.map((cellColor, columnIndex) => (
                <View
                  key={`${rowIndex}-${columnIndex}`}
                  accessibilityLabel={`Ô hàng ${rowIndex + 1}, cột ${
                    columnIndex + 1
                  }${cellColor ? ', đã có khối' : ', đang trống'}`}
                  style={[
                    styles.boardCell,
                    { width: cellSize, height: cellSize },
                    cellColor ? { backgroundColor: cellColor } : null,
                    previewCellKeys.has(`${rowIndex}-${columnIndex}`)
                      ? [
                          styles.previewCell,
                          {
                            backgroundColor: dragPreview.isValid
                              ? pieces[dragPreview.pieceIndex].color
                              : INVALID_PREVIEW_COLOR,
                            borderColor: dragPreview.isValid
                              ? '#FFFFFFAA'
                              : '#E5E8F2',
                          },
                        ]
                      : null,
                  ]}
                />
              ))}
            </View>
          ))}
        </View>

        <View style={styles.trayHeader}>
          <Text style={styles.trayTitle}>KHỐI CỦA BẠN</Text>
          <Text style={styles.trayHint}>Kéo khối để đặt</Text>
        </View>

        <View style={styles.pieceTray}>
          {pieces.map((piece, index) => (
            <DraggablePiece
              key={piece?.id ?? `used-${index}`}
              piece={piece}
              index={index}
              canFit={canPieceFit(board, piece)}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
              onDragCancel={clearDragPreview}
            />
          ))}
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        statusBarTranslucent
        visible={isGameOver}
        onRequestClose={onBack}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.gameOverCard}>
            <View style={styles.gameOverIcon}>
              <Text style={styles.gameOverIconText}>◆</Text>
            </View>
            <Text style={styles.gameOverTitle}>Hết nước đi!</Text>
            <Text style={styles.gameOverScore}>Bạn đạt {score} điểm</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hoàn tác nước đi gần nhất"
              disabled={undoHistory.length === 0}
              onPress={handleUndo}
              style={({ pressed }) => [
                styles.undoGameOverButton,
                undoHistory.length === 0 ? styles.disabledHeaderButton : null,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.undoGameOverText}>↶ HOÀN TÁC</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={startNewGame}
              style={({ pressed }) => [
                styles.playAgainButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.playAgainText}>CHƠI LẠI</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onBack}
              style={styles.leaveButton}
            >
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
    backgroundColor: '#171A32',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171A32',
  },
  loadingText: {
    color: '#B4B9D1',
    fontSize: 14,
    fontWeight: '700',
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
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252947',
    borderWidth: 1,
    borderColor: '#383D66',
  },
  disabledHeaderButton: {
    opacity: 0.35,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  backIcon: {
    marginTop: -4,
    color: '#FFFFFF',
    fontSize: 38,
    lineHeight: 40,
  },
  restartIcon: {
    color: '#FFFFFF',
    fontSize: 25,
    lineHeight: 28,
  },
  undoIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 27,
  },
  titleGroup: {
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  subtitle: {
    marginTop: 2,
    color: '#8D93B5',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scoreRow: {
    width: '100%',
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCard: {
    width: 112,
    alignItems: 'center',
  },
  scoreLabel: {
    color: '#8D93B5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  scoreValue: {
    marginTop: 1,
    color: '#FFD447',
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '900',
  },
  scoreDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#383D5D',
  },
  message: {
    height: 30,
    marginTop: 2,
    color: '#B4B9D1',
    fontSize: 12,
    lineHeight: 30,
    fontWeight: '600',
  },
  board: {
    borderRadius: 19,
    backgroundColor: '#222642',
    borderWidth: 1,
    borderColor: '#343958',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
  boardRow: {
    flexDirection: 'row',
  },
  boardCell: {
    borderRadius: 6,
    backgroundColor: '#303552',
    borderWidth: 1,
    borderColor: '#3B4163',
  },
  previewCell: {
    opacity: 0.72,
    borderWidth: 2,
    borderColor: '#FFFFFFAA',
  },
  trayHeader: {
    width: '100%',
    marginTop: 18,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trayTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  trayHint: {
    color: '#777E9F',
    fontSize: 11,
    fontWeight: '600',
  },
  pieceTray: {
    width: '100%',
    height: 104,
    flexDirection: 'row',
    gap: 9,
  },
  draggablePiece: {
    flex: 1,
    minWidth: 0,
    overflow: 'visible',
  },
  draggingPiece: {
    zIndex: 100,
    elevation: 30,
  },
  pieceSlot: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#202440',
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'visible',
  },
  disabledPieceSlot: {
    opacity: 0.3,
  },
  piecePreview: {
    position: 'relative',
  },
  pieceCell: {
    position: 'absolute',
    width: PIECE_CELL_SIZE,
    height: PIECE_CELL_SIZE,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#FFFFFF55',
  },
  usedPiece: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#484D6C',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#090B18CC',
  },
  gameOverCard: {
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    borderRadius: 28,
    backgroundColor: '#252947',
    borderWidth: 1,
    borderColor: '#41476E',
  },
  gameOverIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD447',
  },
  gameOverIconText: {
    color: '#292D4C',
    fontSize: 28,
  },
  gameOverTitle: {
    marginTop: 18,
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
  gameOverScore: {
    marginTop: 7,
    color: '#AEB3CA',
    fontSize: 15,
    fontWeight: '600',
  },
  playAgainButton: {
    width: '100%',
    height: 52,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#FFD447',
  },
  undoGameOverButton: {
    width: '100%',
    height: 48,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#313758',
    borderWidth: 1,
    borderColor: '#59617E',
  },
  undoGameOverText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  playAgainText: {
    color: '#252947',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  leaveButton: {
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  leaveText: {
    color: '#AEB3CA',
    fontSize: 13,
    fontWeight: '700',
  },
});
