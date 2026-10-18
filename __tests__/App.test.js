/**
 * @format
 */

import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import { GomokuScreen } from '../src/games/gomoku/GomokuScreen';
import MinesweeperScreen from '../src/games/minesweeper/MinesweeperScreen';

test('renders the JavaScript app correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

test('mounts the Minesweeper screen', async () => {
  let renderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <MinesweeperScreen onBack={jest.fn()} />,
    );
  });

  expect(
    renderer.root
      .findAllByType(Text)
      .some(text => text.props.children === 'Dò mìn'),
  ).toBe(true);

  await ReactTestRenderer.act(async () => {
    renderer.unmount();
  });
});

test('renders clear X and O marks after making moves in Caro', async () => {
  let renderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<GomokuScreen onBack={jest.fn()} />);
  });

  const doubleMode = renderer.root.findByProps({
    accessibilityLabel: 'Chơi đôi, Đấu với người',
  });
  await ReactTestRenderer.act(() => {
    doubleMode.props.onPress();
  });

  const firstCell = renderer.root.findByProps({
    accessibilityLabel: 'Hàng 1, cột 1, ô trống',
  });
  const secondCell = renderer.root.findByProps({
    accessibilityLabel: 'Hàng 1, cột 2, ô trống',
  });

  await ReactTestRenderer.act(() => {
    firstCell.props.onPress();
    secondCell.props.onPress();
  });

  const marks = renderer.root
    .findAllByType(Text)
    .map(text => text.props.children)
    .filter(mark => mark === 'X' || mark === 'O');

  expect(marks).toEqual(['X', 'O']);

  await ReactTestRenderer.act(async () => {
    renderer.unmount();
  });
});

test('plays against the computer in single-player mode', async () => {
  let renderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<GomokuScreen onBack={jest.fn()} />);
  });

  const firstCell = renderer.root.findByProps({
    accessibilityLabel: 'Hàng 1, cột 1, ô trống',
  });
  await ReactTestRenderer.act(() => {
    firstCell.props.onPress();
  });

  const marks = renderer.root
    .findAllByType(Text)
    .map(text => text.props.children)
    .filter(mark => mark === 'X' || mark === 'O');

  expect(marks).toHaveLength(2);
  expect(
    renderer.root
      .findAllByType(Text)
      .some(text => text.props.children === 'Lượt của bạn'),
  ).toBe(true);

  await ReactTestRenderer.act(async () => {
    renderer.unmount();
  });
});
