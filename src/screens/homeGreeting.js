export const MAX_PLAYER_NAME_LENGTH = 30;

export function normalizePlayerName(value) {
  return value.trim().replace(/\s+/g, ' ');
}

export function getGreeting(hour = new Date().getHours()) {
  if (hour >= 5 && hour < 11) {
    return 'Chào buổi sáng';
  }

  if (hour >= 11 && hour < 18) {
    return 'Chào buổi trưa';
  }

  return 'Chào buổi tối';
}
