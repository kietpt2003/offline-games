import Sound from 'react-native-sound';

const SOUND_FILES = {
  background: 'block_bgm.wav',
  clear: 'block_clear.wav',
  place: 'block_place.wav',
  praise: {
    1: 'block_voice_gioi_qua.wav',
    2: 'block_voice_tuyet_voi.wav',
    3: 'block_voice_that_kho_tin.wav',
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

export function createBlockBlastAudio() {
  Sound.setCategory('Playback');

  let isReleased = false;
  let shouldPlayBackground = true;
  let activeVoice = null;
  const background = loadSound(SOUND_FILES.background, 0.14, sound => {
    if (isReleased || !shouldPlayBackground) {
      return;
    }

    sound.setNumberOfLoops(-1);
    sound.play();
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

  return {
    playPlacement() {
      if (!isReleased) {
        replaySound(place);
      }
    },

    playLineClear() {
      if (!isReleased) {
        replaySound(clear);
      }
    },

    playPraise(level) {
      const voice = praise[Math.min(3, Math.max(1, level))];

      if (isReleased || !voice?.isLoaded()) {
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

    pauseBackground() {
      shouldPlayBackground = false;
      background.pause();
    },

    resumeBackground() {
      shouldPlayBackground = true;

      if (!isReleased && background.isLoaded()) {
        background.play();
      }
    },

    release() {
      isReleased = true;
      shouldPlayBackground = false;
      activeVoice = null;
      allSounds.forEach(sound => {
        sound.stop();
        sound.release();
      });
    },
  };
}
