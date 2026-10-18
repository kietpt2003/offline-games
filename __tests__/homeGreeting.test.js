import {
  getGreeting,
  normalizePlayerName,
} from '../src/screens/homeGreeting';

describe('home greeting', () => {
  test.each([
    [5, 'Chào buổi sáng'],
    [10, 'Chào buổi sáng'],
    [11, 'Chào buổi trưa'],
    [17, 'Chào buổi trưa'],
    [18, 'Chào buổi tối'],
    [0, 'Chào buổi tối'],
  ])('returns the greeting for hour %s', (hour, expectedGreeting) => {
    expect(getGreeting(hour)).toBe(expectedGreeting);
  });

  it('trims and collapses whitespace in the player name', () => {
    expect(normalizePlayerName('  Nguyễn   Văn An  ')).toBe('Nguyễn Văn An');
  });
});
