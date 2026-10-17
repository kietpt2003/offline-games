import Sound from 'react-native-sound';

const SOUND_FILES = {
  background: 'sound_background_pikachu.mp3',
  error: 'pikachu_error.mp3',
  select: 'pikachu_select.mp3',
  success: 'pikachu_success.mp3',
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

function replay(sound) {
  if (!sound?.isLoaded()) {
    return;
  }

  sound.stop(() => sound.play());
}

export function createPikachuAudio(initiallyEnabled = true) {
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
  const select = loadSound(SOUND_FILES.select, 0.55);
  const success = loadSound(SOUND_FILES.success, 0.7);
  const error = loadSound(SOUND_FILES.error, 0.65);
  const allSounds = [background, select, success, error];

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

  return {
    playSelect() {
      if (enabled && !isReleased) {
        replay(select);
      }
    },

    playSuccess() {
      if (enabled && !isReleased) {
        replay(success);
      }
    },

    playError() {
      if (enabled && !isReleased) {
        replay(error);
      }
    },

    setEnabled(nextEnabled) {
      enabled = nextEnabled;
      syncBackground();
    },

    setAppActive(nextIsActive) {
      isActive = nextIsActive;
      syncBackground();
    },

    release() {
      isReleased = true;
      enabled = false;
      allSounds.forEach(sound => {
        sound.stop();
        sound.release();
      });
    },
  };
}
