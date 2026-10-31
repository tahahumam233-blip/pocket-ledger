import { describe, expect, it } from '@jest/globals';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  COLOR_CHOICES,
  DEFAULT_ACCOUNT_TEMPLATES,
  DEFAULT_CATEGORY_TEMPLATES,
  ICON_CHOICES,
} from './defaults';

const glyphs = Ionicons.glyphMap as Record<string, number>;

describe('default templates', () => {
  it('only use icons that exist in Ionicons, in filled and outline variants', () => {
    const icons = new Set<string>([
      ...ICON_CHOICES,
      ...DEFAULT_ACCOUNT_TEMPLATES.map((template) => template.icon),
      ...DEFAULT_CATEGORY_TEMPLATES.map((template) => template.icon),
    ]);
    for (const icon of icons) {
      expect(glyphs[icon]).toBeDefined();
      expect(glyphs[`${icon}-outline`]).toBeDefined();
    }
  });

  it('uses unique category keys and valid hex colors', () => {
    const keys = DEFAULT_CATEGORY_TEMPLATES.map((template) => template.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const color of [
      ...COLOR_CHOICES,
      ...DEFAULT_CATEGORY_TEMPLATES.map((t) => t.color),
      ...DEFAULT_ACCOUNT_TEMPLATES.map((t) => t.color),
    ]) {
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});
