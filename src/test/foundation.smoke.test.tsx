import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';

import { AppText } from '@/components/app-text';
import { APP_BRAND } from '@/config/branding';

describe('Phase 0 test foundation', () => {
  it('renders branded React Native UI through the Expo Jest preset', async () => {
    const result = await render(<AppText accessibilityRole="header">{APP_BRAND.name}</AppText>);

    expect(result.getByRole('header', { name: APP_BRAND.name })).toBeTruthy();
  });
});
