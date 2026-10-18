import {
  createGame,
  DIFFICULTIES,
  revealCell,
  toggleFlag,
} from '../src/games/minesweeper/minesweeperEngine';

describe('Minesweeper engine', () => {
  test('provides standard board sizes and mine counts', () => {
    expect(DIFFICULTIES).toEqual({
      Beginner: { rows: 9, columns: 9, mines: 10 },
      Intermediate: { rows: 16, columns: 16, mines: 40 },
      Expert: { rows: 16, columns: 30, mines: 99 },
    });

    Object.entries(DIFFICULTIES).forEach(([difficulty, settings]) => {
      const game = createGame(difficulty, () => 0);
      expect(game.board).toHaveLength(settings.rows);
      expect(game.board[0]).toHaveLength(settings.columns);
      expect(game.board.flat().filter(cell => cell.mine)).toHaveLength(
        settings.mines,
      );
    });
  });

  test('relocates a mine under the first reveal and recalculates numbers', () => {
    const game = createGame({ rows: 2, columns: 2, mines: 1 }, () => 0);
    const nextGame = revealCell(game, 0, 0);

    expect(nextGame.status).toBe('playing');
    expect(nextGame.firstReveal).toBe(false);
    expect(nextGame.board[0][0]).toMatchObject({
      mine: false,
      revealed: true,
      adjacent: 1,
    });
    expect(nextGame.board.flat().filter(cell => cell.mine)).toHaveLength(1);
    expect(game.board[0][0]).toMatchObject({ mine: true, revealed: false });
  });

  test('reveals numbers and floods connected zero areas without opening mines', () => {
    const game = createGame({ rows: 3, columns: 3, mines: 1 }, () => 0);
    const adjacentReveal = revealCell(game, 0, 1);

    expect(adjacentReveal.board[0][1]).toMatchObject({
      revealed: true,
      adjacent: 1,
    });

    const zeroReveal = revealCell(game, 2, 2);
    expect(zeroReveal.board[2][2]).toMatchObject({
      revealed: true,
      adjacent: 0,
    });
    expect(zeroReveal.board[0][0].revealed).toBe(false);
    expect(zeroReveal.board[1][1]).toMatchObject({
      revealed: true,
      adjacent: 1,
    });
    expect(zeroReveal.board.flat().filter(cell => cell.revealed)).toHaveLength(
      8,
    );
    expect(zeroReveal.status).toBe('won');
  });

  test('flags and unflags cells, and prevents revealing a flagged cell', () => {
    const game = createGame({ rows: 3, columns: 3, mines: 1 }, () => 0);
    const flagged = toggleFlag(game, 2, 2);

    expect(flagged.flagsRemaining).toBe(0);
    expect(flagged.board[2][2].flagged).toBe(true);
    expect(revealCell(flagged, 2, 2)).toBe(flagged);

    const unflagged = toggleFlag(flagged, 2, 2);
    expect(unflagged.flagsRemaining).toBe(1);
    expect(unflagged.board[2][2].flagged).toBe(false);
    expect(game.board[2][2].flagged).toBe(false);
  });

  test('wins after revealing all safe cells and loses on a later mine reveal', () => {
    const game = createGame({ rows: 2, columns: 2, mines: 1 }, () => 0);
    const revealed = revealCell(
      revealCell(revealCell(game, 0, 1), 1, 0),
      1,
      1,
    );

    expect(revealed.status).toBe('won');
    expect(revealCell(revealed, 0, 0)).toBe(revealed);

    const started = revealCell(game, 0, 1);
    const lost = revealCell(started, 0, 0);
    expect(lost.status).toBe('lost');
    expect(lost.board[0][0]).toMatchObject({ mine: true, revealed: true });
  });
});
