/* global jest */

jest.mock('@react-native-async-storage/async-storage', () => {
  let storage = {};
  const asyncStorage = {
    clear: jest.fn(async () => {
      storage = {};
    }),
    getItem: jest.fn(async key => storage[key] ?? null),
    getMany: jest.fn(async keys =>
      keys.reduce((entries, key) => {
        entries[key] = storage[key] ?? null;
        return entries;
      }, {}),
    ),
    multiGet: jest.fn(async keys =>
      keys.map(key => [key, storage[key] ?? null]),
    ),
    multiSet: jest.fn(async entries => {
      entries.forEach(([key, value]) => {
        storage[key] = value;
      });
    }),
    removeItem: jest.fn(async key => {
      delete storage[key];
    }),
    setMany: jest.fn(async entries => {
      Object.entries(entries).forEach(([key, value]) => {
        storage[key] = value;
      });
    }),
    setItem: jest.fn(async (key, value) => {
      storage[key] = value;
    }),
  };

  return {
    __esModule: true,
    default: asyncStorage,
  };
});

jest.mock('react-native-sound', () => {
  class MockSound {
    isLoaded() {
      return true;
    }

    pause() {}

    play(callback) {
      callback?.(true);
    }

    release() {}

    setNumberOfLoops() {}

    setVolume() {}

    stop(callback) {
      callback?.();
    }
  }

  MockSound.MAIN_BUNDLE = '';
  MockSound.setCategory = jest.fn();

  return {
    __esModule: true,
    default: MockSound,
  };
});
