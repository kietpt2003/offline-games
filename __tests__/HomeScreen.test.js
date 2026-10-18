import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Text, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import { games } from '../src/data/games';
import { HomeScreen } from '../src/screens/HomeScreen';

const PLAYER_NAME_KEY = '@offline-games/player-name-v1';

describe('HomeScreen player name', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('requests, saves, and allows changing the player name', async () => {
    let renderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <HomeScreen appVersion="1.0" onOpenGame={jest.fn()} />,
      );
    });

    const getNameInput = () =>
      renderer.root
        .findAllByType(TextInput)
        .find(input => input.props.placeholder === 'Tên người chơi');

    await ReactTestRenderer.act(async () => {
      getNameInput().props.onChangeText('  Minh   Anh  ');
    });

    await ReactTestRenderer.act(async () => {
      await getNameInput().props.onSubmitEditing();
    });

    expect(await AsyncStorage.getItem(PLAYER_NAME_KEY)).toBe('Minh Anh');
    expect(
      renderer.root
        .findAllByType(Text)
        .some(text => String(text.props.children).includes('Minh Anh')),
    ).toBe(true);

    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({
        accessibilityLabel: 'Đổi tên người chơi',
      }).props.onPress();
    });

    await ReactTestRenderer.act(async () => {
      getNameInput().props.onChangeText('Lan');
    });

    await ReactTestRenderer.act(async () => {
      await getNameInput().props.onSubmitEditing();
    });

    expect(await AsyncStorage.getItem(PLAYER_NAME_KEY)).toBe('Lan');

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  it('opens each newly added game from its home card', async () => {
    await AsyncStorage.setItem(PLAYER_NAME_KEY, 'Tester');
    const onOpenGame = jest.fn();
    let renderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <HomeScreen appVersion="1.0" onOpenGame={onOpenGame} />,
      );
    });

    const addedGames = games.filter(game =>
      ['game-2048', 'gomoku', 'sudoku', 'minesweeper'].includes(game.id),
    );

    for (const game of addedGames) {
      await ReactTestRenderer.act(() => {
        renderer.root
          .findByProps({ accessibilityLabel: `Chơi ${game.name}` })
          .props.onPress();
      });
    }

    expect(onOpenGame.mock.calls.map(([gameId]) => gameId)).toEqual(
      addedGames.map(game => game.id),
    );

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });
});
