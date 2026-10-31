import { SegmentedControl } from './segmented-control';

type CurrencyToggleProps = {
  currencies: string[];
  value: string;
  onChange: (code: string) => void;
  size?: 'sm' | 'md';
};

export function CurrencyToggle({ currencies, value, onChange, size = 'sm' }: CurrencyToggleProps) {
  return (
    <SegmentedControl
      options={currencies.map((code) => ({ value: code, label: code }))}
      value={value}
      onChange={onChange}
      size={size}
    />
  );
}
