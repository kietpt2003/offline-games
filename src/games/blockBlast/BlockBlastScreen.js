import AsyncStorage from '@react-native-async-storage/async-storage';
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
  IconBlocks,
  IconChevronLeft,
  IconMuted,
  IconRestart,
  IconUndo,
  IconVolume,
} from '../../icons';
import {
  BLOCK_COLOR,
  BOARD_SIZE,
  canPieceFit,
  canPlacePiece,
  clearCompletedLines,
  createEmptyBoard,
  generatePieceSet,
  getCompletedLines,
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

const BOARD_PADDING = 6;
const BOARD_BORDER_WIDTH = 5;
const CELL_GAP = 2;
const PIECE_CELL_SIZE = 27;
const PIECE_CELL_GAP = 4;
const DRAG_LIFT_OFFSET = 80;
const SOUND_KEY = '@offline-games/block-blast-sound-enabled-v1';

function PiecePreview({
  piece,
  cellSize = PIECE_CELL_SIZE,
  cellGap = PIECE_CELL_GAP,
}) {
  if (!piece) {
    return <View style={styles.usedPiece} />;
  }

  const { rows: rowCount, columns: columnCount } = getPieceBounds(piece);
  const width = columnCount * cellSize + (columnCount - 1) * cellGap;
  const height = rowCount * cellSize + (rowCount - 1) * cellGap;

  return (
    <View style={[styles.piecePreview, { width, height }]}>
      {piece.cells.map(([row, column]) => (
        <View
          key={`${row}-${column}`}
          style={[
            styles.pieceCell,
            {
              width: cellSize,
              height: cellSize,
              backgroundColor: BLOCK_COLOR,
              left: column * (cellSize + cellGap),
              top: row * (cellSize + cellGap),
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
  boardCellSize,
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [isDragging, setIsDragging] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const isDisabled = !piece || !canFit;
  const interactionRef = useRef(null);
  const slotRef = useRef(null);
  const slotWindowLayoutRef = useRef(null);
  const dragFrameRef = useRef(null);
  const pendingDragRef = useRef(null);

  interactionRef.current = {
    index,
    isDisabled: isDisabled || isReturning,
    onDragStart,
    onDragMove,
    onDragEnd,
    onDragCancel,
  };

  const measureSlot = () => {
    slotRef.current?.measureInWindow((x, y, width, height) => {
      slotWindowLayoutRef.current = { x, y, width, height };
    });
  };

  const movePieceCenterToPointer = (pointerX, pointerY) => {
    const layout = slotWindowLayoutRef.current;

    if (!layout) {
      return;
    }

    pan.setValue({
      x: pointerX - (layout.x + layout.width / 2),
      y: pointerY - (layout.y + layout.height / 2),
    });
  };

  const cancelPendingDragMove = () => {
    if (dragFrameRef.current !== null) {
      cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }

    pendingDragRef.current = null;
  };

  const scheduleDragMove = (pieceIndex, pointerX, pointerY) => {
    pendingDragRef.current = { pieceIndex, pointerX, pointerY };

    if (dragFrameRef.current !== null) {
      return;
    }

    dragFrameRef.current = requestAnimationFrame(() => {
      dragFrameRef.current = null;
      const pendingDrag = pendingDragRef.current;

      if (!pendingDrag) {
        return;
      }

      pendingDragRef.current = null;
      interactionRef.current.onDragMove(
        pendingDrag.pieceIndex,
        pendingDrag.pointerX,
        pendingDrag.pointerY,
      );
    });
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
      onPanResponderGrant: event => {
        const interaction = interactionRef.current;
        const { pageX, pageY } = event.nativeEvent;

        pan.stopAnimation();
        movePieceCenterToPointer(pageX, pageY);
        setIsDragging(true);
        interaction.onDragStart(interaction.index);
      },
      onPanResponderMove: (_, gestureState) => {
        const interaction = interactionRef.current;

        movePieceCenterToPointer(gestureState.moveX, gestureState.moveY);
        scheduleDragMove(
          interaction.index,
          gestureState.moveX,
          gestureState.moveY,
        );
      },
      onPanResponderRelease: (_, gestureState) => {
        const interaction = interactionRef.current;

        cancelPendingDragMove();
        const didPlace = interaction.onDragEnd(
          interaction.index,
          gestureState.moveX,
          gestureState.moveY,
        );

        setIsDragging(false);

        if (!didPlace) {
          resetPosition();
        } else {
          pan.stopAnimation();
          pan.setValue({ x: 0, y: 0 });
        }
      },
      onPanResponderTerminate: () => {
        cancelPendingDragMove();
        setIsDragging(false);
        interactionRef.current.onDragCancel();
        resetPosition();
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  return (
    <View
      ref={slotRef}
      {...panResponder.panHandlers}
      onLayout={measureSlot}
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
            ],
          }}
        >
          <PiecePreview
            piece={piece}
            cellGap={isDragging ? CELL_GAP : PIECE_CELL_GAP}
            cellSize={isDragging ? boardCellSize : PIECE_CELL_SIZE}
          />
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

function WoodBackdrop() {
  return (
    <>
      <View pointerEvents="none" style={styles.woodBackdrop}>
        {Array.from({ length: 10 }, (_, index) => (
          <View
            key={index}
            style={[styles.woodGrain, { top: `${index * 11 + 3}%` }]}
          />
        ))}
      </View>
      <View pointerEvents="none" style={styles.foliageOverlay}>
        <View style={styles.foliageLeft}>
          <View style={[styles.leaf, styles.leafOne]} />
          <View style={[styles.leaf, styles.leafTwo]} />
          <View style={[styles.leaf, styles.leafThree]} />
          <View style={[styles.leaf, styles.leafFour]} />
        </View>
        <View style={styles.foliageRight}>
          <View style={[styles.leaf, styles.leafOne]} />
          <View style={[styles.leaf, styles.leafTwo]} />
          <View style={[styles.leaf, styles.leafThree]} />
          <View style={[styles.leaf, styles.leafFour]} />
        </View>
      </View>
    </>
  );
}

export function BlockBlastScreen({ onBack }) {
  const { width: windowWidth } = useWindowDimensions();
  const boardRef = useRef(null);
  const boardLayoutRef = useRef(null);
  const dragPreviewRef = useRef(null);
  const persistenceQueueRef = useRef(Promise.resolve());
  const audioRef = useRef(null);
  const boardSize = Math.min(windowWidth - 4, 450);
  const cellSize = Math.floor(
    (boardSize -
      (BOARD_PADDING + BOARD_BORDER_WIDTH) * 2 -
      CELL_GAP * (BOARD_SIZE - 1)) /
      BOARD_SIZE,
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSoundHydrated, setIsSoundHydrated] = useState(false);

  useEffect(() => {
    const audio = createBlockBlastAudio(false);
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
    if (!dragPreview?.isValid) {
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

  const clearingCellKeys = useMemo(() => {
    if (!dragPreview?.isValid) {
      return new Set();
    }

    const previewPiece = pieces[dragPreview.pieceIndex];

    if (!previewPiece) {
      return new Set();
    }

    const previewBoard = placePiece(
      board,
      previewPiece,
      dragPreview.row,
      dragPreview.column,
    );
    const completedLines = getCompletedLines(previewBoard);
    const cellKeys = new Set();

    completedLines.rows.forEach(row => {
      for (let column = 0; column < BOARD_SIZE; column += 1) {
        cellKeys.add(`${row}-${column}`);
      }
    });

    completedLines.columns.forEach(column => {
      for (let row = 0; row < BOARD_SIZE; row += 1) {
        cellKeys.add(`${row}-${column}`);
      }
    });

    return cellKeys;
  }, [board, dragPreview, pieces]);

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

  const toggleSound = () => {
    setSoundEnabled(currentValue => !currentValue);
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

  const getPreviewAtPointer = (pieceIndex, pointerX, pointerY) => {
    const layout = boardLayoutRef.current;
    const draggedPiece = pieces[pieceIndex];

    if (!layout || !draggedPiece) {
      return null;
    }

    const liftedPointerY = pointerY - DRAG_LIFT_OFFSET;
    const isNearBoard =
      pointerX >= layout.x - cellSize &&
      pointerX <= layout.x + layout.width + cellSize &&
      liftedPointerY >= layout.y - cellSize &&
      liftedPointerY <= layout.y + layout.height + cellSize;

    if (!isNearBoard) {
      return null;
    }

    const origin = getDropOrigin({
      piece: draggedPiece,
      pointerX,
      pointerY,
      boardX: layout.x,
      boardY: layout.y,
      boardPadding: BOARD_PADDING + BOARD_BORDER_WIDTH,
      cellSize,
      cellGap: CELL_GAP,
      liftOffset: DRAG_LIFT_OFFSET,
    });
    return {
      pieceIndex,
      ...origin,
      isValid: canPlacePiece(board, draggedPiece, origin.row, origin.column),
    };
  };

  const handleDragMove = (pieceIndex, pointerX, pointerY) => {
    const nextPreview = getPreviewAtPointer(pieceIndex, pointerX, pointerY);

    updateDragPreview(nextPreview?.isValid ? nextPreview : null);
  };

  const handleDragEnd = (pieceIndex, pointerX, pointerY) => {
    const preview = getPreviewAtPointer(pieceIndex, pointerX, pointerY);

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
        <WoodBackdrop />
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
              <IconChevronLeft width={27} height={27} color="#4A2613" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'
              }
              accessibilityState={{ disabled: !isSoundHydrated }}
              disabled={!isSoundHydrated}
              hitSlop={6}
              onPress={toggleSound}
              style={({ pressed }) => [
                styles.headerButton,
                !isSoundHydrated ? styles.disabledHeaderButton : null,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              {soundEnabled ? (
                <IconVolume width={22} height={22} color="#4A2613" />
              ) : (
                <IconMuted width={22} height={22} color="#4A2613" />
              )}
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
              <IconUndo width={23} height={23} color="#4A2613" />
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
              <IconRestart width={24} height={24} color="#4A2613" />
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
          accessibilityLabel={`Bàn chơi Block Blast ${BOARD_SIZE} nhân ${BOARD_SIZE}`}
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
                    cellColor ? { backgroundColor: BLOCK_COLOR } : null,
                    previewCellKeys.has(`${rowIndex}-${columnIndex}`)
                      ? [
                          styles.previewCell,
                          {
                            backgroundColor: BLOCK_COLOR,
                            borderColor: '#FFFFFF',
                          },
                        ]
                      : null,
                    clearingCellKeys.has(`${rowIndex}-${columnIndex}`)
                      ? styles.clearingCell
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
              boardCellSize={cellSize}
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
              <IconBlocks width={28} height={28} color="#5B2D17" />
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
              <IconUndo width={20} height={20} color="#FFFFFF" />
              <Text style={styles.undoGameOverText}>HOÀN TÁC</Text>
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
    backgroundColor: '#673719',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingBottom: 16,
    backgroundColor: '#A55F30',
    overflow: 'hidden',
  },
  woodBackdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  woodGrain: {
    position: 'absolute',
    left: -30,
    right: -30,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#6E351A24',
    transform: [{ rotate: '-1deg' }],
  },
  foliageOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 82,
    zIndex: 20,
  },
  foliageLeft: {
    position: 'absolute',
    top: -7,
    left: -8,
    width: 118,
    height: 76,
  },
  foliageRight: {
    position: 'absolute',
    top: -7,
    right: -8,
    width: 118,
    height: 76,
    transform: [{ scaleX: -1 }],
  },
  leaf: {
    position: 'absolute',
    width: 43,
    height: 20,
    borderTopLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: '#315E25',
    borderWidth: 1,
    borderColor: '#214718',
  },
  leafOne: {
    top: 1,
    left: 0,
    transform: [{ rotate: '24deg' }],
  },
  leafTwo: {
    top: 23,
    left: 18,
    backgroundColor: '#477A31',
    transform: [{ rotate: '-20deg' }],
  },
  leafThree: {
    top: 3,
    left: 52,
    transform: [{ rotate: '48deg' }],
  },
  leafFour: {
    top: 38,
    left: 66,
    backgroundColor: '#3D6C2C',
    transform: [{ rotate: '12deg' }],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A55F30',
  },
  loadingText: {
    color: '#FFE2A1',
    fontSize: 14,
    fontWeight: '700',
  },
  header: {
    width: '100%',
    height: 66,
    zIndex: 30,
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
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C48849',
    borderWidth: 2,
    borderColor: '#E0AF6B',
  },
  disabledHeaderButton: {
    opacity: 0.35,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  titleGroup: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 5,
    backgroundColor: '#683719',
    borderWidth: 2,
    borderColor: '#9D6334',
  },
  title: {
    color: '#FFD982',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  subtitle: {
    marginTop: 2,
    color: '#E9BA72',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scoreRow: {
    width: '76%',
    maxWidth: 330,
    height: 70,
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: '#B97538',
    borderWidth: 2,
    borderColor: '#DAA15D',
    shadowColor: '#3A180C',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 5,
  },
  scoreCard: {
    width: 112,
    alignItems: 'center',
  },
  scoreLabel: {
    color: '#5A2C16',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  scoreValue: {
    marginTop: 1,
    color: '#FFE18F',
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '900',
    textShadowColor: '#673216',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 1,
  },
  scoreDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#6E371B66',
  },
  message: {
    width: '94%',
    height: 25,
    marginTop: 7,
    marginBottom: 5,
    color: '#FFF3C8',
    fontSize: 13,
    lineHeight: 25,
    fontWeight: '800',
    textAlign: 'center',
    borderRadius: 13,
    backgroundColor: '#D99625',
    borderWidth: 2,
    borderColor: '#F0BF4D',
  },
  board: {
    borderRadius: 7,
    backgroundColor: '#35180D',
    borderWidth: BOARD_BORDER_WIDTH,
    borderColor: '#7E431F',
    shadowColor: '#271006',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 10,
  },
  boardRow: {
    flexDirection: 'row',
  },
  boardCell: {
    borderRadius: 2,
    backgroundColor: '#2B120A',
    borderWidth: 1,
    borderColor: '#57301C',
  },
  previewCell: {
    opacity: 0.72,
    borderWidth: 2,
    borderColor: '#FFFFFFAA',
  },
  clearingCell: {
    zIndex: 2,
    opacity: 1,
    backgroundColor: '#FFE096',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#FFF1A8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 8,
    elevation: 8,
  },
  trayHeader: {
    width: '100%',
    marginTop: 11,
    marginBottom: 5,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trayTitle: {
    color: '#FFE0A0',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  trayHint: {
    color: '#E9BC7C',
    fontSize: 13,
    fontWeight: '600',
  },
  pieceTray: {
    width: '100%',
    height: 112,
    flexDirection: 'row',
    gap: 9,
    padding: 6,
    backgroundColor: '#8B4925',
    borderTopWidth: 3,
    borderBottomWidth: 3,
    borderColor: '#C17C3E',
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
    borderRadius: 5,
    backgroundColor: '#6B351C66',
    borderWidth: 2,
    borderColor: '#B66C35',
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
    borderColor: '#FFF0C2',
  },
  usedPiece: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D29A5D',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#281006CC',
  },
  gameOverCard: {
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    borderRadius: 28,
    backgroundColor: '#C18448',
    borderWidth: 1,
    borderColor: '#E1AE6A',
  },
  gameOverIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3C779',
  },
  gameOverTitle: {
    marginTop: 18,
    color: '#4C2512',
    fontSize: 26,
    fontWeight: '900',
  },
  gameOverScore: {
    marginTop: 7,
    color: '#684022',
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
    backgroundColor: '#6B351B',
  },
  undoGameOverButton: {
    width: '100%',
    height: 48,
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    backgroundColor: '#4B2412',
    borderWidth: 1,
    borderColor: '#8C572E',
  },
  undoGameOverText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  playAgainText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  leaveButton: {
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  leaveText: {
    color: '#5E351C',
    fontSize: 13,
    fontWeight: '700',
  },
});
