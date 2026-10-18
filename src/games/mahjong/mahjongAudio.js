import Sound from 'react-native-sound';

const SOUND_FILES = {
  background: 'sound_background_mahjong.mp3',
  error: 'pikachu_error.mp3',
  match: 'pikachu_success.mp3',
  select: 'pikachu_select.mp3',
  shuffle: 'block_clear.wav',
  win: 'success_3.mp3',
};

function loadSound(filename, volume, onLoad) {
  let sound;

  sound = new Sound(filename, Sound.MAIN_BUNDLE, error => {
    if (!error) {
      sound.setVolume(volume);
      onLoad?.(sound);
    }
  });

  return sound;
}

function replay(sound) {
  if (!sound?.isLoaded()) {
    return;
  }

  sound.stop(() => sound.play());
}

export function createMahjongAudio(initiallyEnabled = true) {
  Sound.setCategory('Playback');

  let enabled = initiallyEnabled;
  let isActive = true;
  let isReleased = false;
  const background = loadSound(SOUND_FILES.background, 0.18, sound => {
    sound.setNumberOfLoops(-1);

    if (enabled && isActive && !isReleased) {
      sound.play();
    }
  });
  const select = loadSound(SOUND_FILES.select, 0.5);
  const error = loadSound(SOUND_FILES.error, 0.55);
  const match = loadSound(SOUND_FILES.match, 0.7);
  const shuffle = loadSound(SOUND_FILES.shuffle, 0.45);
  const win = loadSound(SOUND_FILES.win, 0.9);
  const effectSounds = [select, error, match, shuffle, win];
  const allSounds = [background, ...effectSounds];

  const syncBackground = () => {
    if (isReleased || !background.isLoaded()) {
      return;
    }

    if (enabled && isActive) {
      background.play();
    } else {
      background.pause();
    }
  };

  const play = sound => {
    if (enabled && isActive && !isReleased) {
      replay(sound);
    }
  };

  const stopEffects = () => {
    effectSounds.forEach(sound => sound.stop());
  };

  return {
    playSelect() {
      play(select);
    },

    playError() {
      play(error);
    },

    playMatch() {
      play(match);
    },

    playShuffle() {
      play(shuffle);
    },

    playWin() {
      play(win);
    },

    setEnabled(nextEnabled) {
      enabled = nextEnabled;

      if (!enabled) {
        stopEffects();
      }

      syncBackground();
    },

    setAppActive(nextIsActive) {
      isActive = nextIsActive;

      if (!isActive) {
        stopEffects();
      }

      syncBackground();
    },

    release() {
      isReleased = true;
      enabled = false;
      allSounds.forEach(sound => sound.stop());
      allSounds.forEach(sound => sound.release());
    },
  };
}
