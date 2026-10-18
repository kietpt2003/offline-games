import Sound from 'react-native-sound';

const SOUND_FILES = {
  background: 'block_bgm.wav',
  clear: 'block_clear.wav',
  place: 'block_place.wav',
  praise: {
    1: 'success_1.mp3',
    2: 'success_2.mp3',
    3: 'success_3.mp3',
  },
};

function loadSound(filename, volume, onLoad) {
  let sound;

  sound = new Sound(filename, Sound.MAIN_BUNDLE, error => {
    if (error) {
      return;
    }

    sound.setVolume(volume);
    onLoad?.(sound);
  });

  return sound;
}

function replaySound(sound) {
  if (!sound?.isLoaded()) {
    return;
  }

  sound.stop(() => sound.play());
}

export function createBlockBlastAudio(initiallyEnabled = true) {
  Sound.setCategory('Playback');

  let enabled = initiallyEnabled;
  let isActive = true;
  let isReleased = false;
  let activeVoice = null;
  const background = loadSound(SOUND_FILES.background, 0.44, sound => {
    sound.setNumberOfLoops(-1);

    if (enabled && isActive && !isReleased) {
      sound.play();
    }
  });
  const place = loadSound(SOUND_FILES.place, 0.42);
  const clear = loadSound(SOUND_FILES.clear, 0.55);
  const praise = Object.fromEntries(
    Object.entries(SOUND_FILES.praise).map(([level, filename]) => [
      level,
      loadSound(filename, 0.9),
    ]),
  );
  const allSounds = [background, place, clear, ...Object.values(praise)];
  const effectSounds = [place, clear, ...Object.values(praise)];

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

  const stopEffects = () => {
    activeVoice = null;
    effectSounds.forEach(sound => sound.stop());
  };

  return {
    playPlacement() {
      if (enabled && isActive && !isReleased) {
        replaySound(place);
      }
    },

    playLineClear() {
      if (enabled && isActive && !isReleased) {
        replaySound(clear);
      }
    },

    playPraise(level) {
      const voice = praise[Math.min(3, Math.max(1, level))];

      if (!enabled || !isActive || isReleased || !voice?.isLoaded()) {
        return;
      }

      if (activeVoice && activeVoice !== voice) {
        activeVoice.stop();
      }

      activeVoice = voice;
      voice.stop(() => {
        voice.play(() => {
          if (activeVoice === voice) {
            activeVoice = null;
          }
        });
      });
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
      activeVoice = null;
      allSounds.forEach(sound => {
        sound.stop();
        sound.release();
      });
    },
  };
}
