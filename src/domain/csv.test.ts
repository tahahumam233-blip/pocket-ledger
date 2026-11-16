import { describe, expect, it } from '@jest/globals';

import { escapeCsvCell } from './csv';

describe('csv', () => {
  it('escapes quotes, commas and newlines', () => {
    expect(escapeCsvCell('plain')).toBe('plain');
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('line\nbreak')).toBe('"line\nbreak"');
    expect(escapeCsvCell(12)).toBe('12');
  });
});
