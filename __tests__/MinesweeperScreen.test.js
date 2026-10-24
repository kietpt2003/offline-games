import React from 'react';
import { Modal } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import MinesweeperScreen from '../src/games/minesweeper/MinesweeperScreen';
import * as engine from '../src/games/minesweeper/minesweeperEngine';

const createGame = engine.createGame;

beforeEach(() => {
  jest
    .spyOn(engine, 'createGame')
    .mockImplementation(difficulty => createGame(difficulty, () => 0));
});

afterEach(() => {
  jest.restoreAllMocks();
});

test.each(['Beginner', 'Intermediate'])(
  'shows a loss popup and restarts the %s difficulty',
  async difficulty => {
    let renderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <MinesweeperScreen onBack={jest.fn()} />,
      );
    });

    const root = renderer.root;
    await ReactTestRenderer.act(async () => {
      root.findByProps({ name: difficulty }).props.onPress();
    });

    expect(root.findByType(Modal).props.visible).toBe(false);
    const settings = engine.DIFFICULTIES[difficulty];
    const safeRow = Math.ceil(settings.mines / settings.columns) + 1;
    await ReactTestRenderer.act(async () => {
      root
        .findByProps({
          accessibilityLabel: `Hàng ${safeRow}, cột 1: Chưa mở`,
        })
        .props.onPress();
    });
    expect(root.findByType(Modal).props.visible).toBe(false);

    await ReactTestRenderer.act(async () => {
      root
        .findByProps({ accessibilityLabel: 'Hàng 1, cột 1: Chưa mở' })
        .props.onPress();
    });
    expect(root.findByType(Modal).props.visible).toBe(true);

    await ReactTestRenderer.act(async () => {
      root.findByProps({ accessibilityLabel: 'Chơi ván mới' }).props.onPress();
    });
    expect(root.findByType(Modal).props.visible).toBe(false);
    expect(engine.createGame).toHaveBeenLastCalledWith(difficulty);
    expect(
      root.findByProps({
        accessibilityLabel: 'Hàng 1, cột 1: Chưa mở',
      }),
    ).toBeDefined();

    // Losing again after restarting must open a fresh popup.
    await ReactTestRenderer.act(async () => {
      root
        .findByProps({
          accessibilityLabel: `Hàng ${safeRow}, cột 1: Chưa mở`,
        })
        .props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      root
        .findByProps({ accessibilityLabel: 'Hàng 1, cột 1: Chưa mở' })
        .props.onPress();
    });
    expect(root.findByType(Modal).props.visible).toBe(true);
    await ReactTestRenderer.act(async () => {
      root.findByType(Modal).props.onRequestClose();
    });
    expect(root.findByType(Modal).props.visible).toBe(false);
    expect(
      root.findByProps({
        accessibilityLabel: 'Hàng 1, cột 1: Có mìn',
      }),
    ).toBeDefined();

    await ReactTestRenderer.act(async () => renderer.unmount());
  },
);
