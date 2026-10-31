import type { AccountKind, CategoryKind } from './ledger';

export type AccountTemplate = {
  kind: AccountKind;
  name: string;
  icon: string;
  color: string;
  description: string;
};

/** The three places money lives for most people: a safe at home, a pocket, and the bank. */
export const DEFAULT_ACCOUNT_TEMPLATES: readonly AccountTemplate[] = [
  {
    kind: 'safe',
    name: 'Safe',
    icon: 'lock-closed',
    color: '#5B5BD6',
    description: 'Cash kept at home or in a safe',
  },
  {
    kind: 'pocket',
    name: 'Pocket',
    icon: 'wallet',
    color: '#19A89D',
    description: 'Cash you carry day to day',
  },
  {
    kind: 'bank',
    name: 'Bank',
    icon: 'business',
    color: '#1F4FD8',
    description: 'Bank account or card balance',
  },
];

export const ACCOUNT_KIND_META: Record<AccountKind, { label: string; icon: string }> = {
  safe: { label: 'Safe', icon: 'lock-closed' },
  pocket: { label: 'Pocket', icon: 'wallet' },
  bank: { label: 'Bank', icon: 'business' },
  other: { label: 'Other', icon: 'cube' },
};

export type CategoryTemplate = {
  key: string;
  kind: CategoryKind;
  name: string;
  icon: string;
  color: string;
};

export const DEFAULT_CATEGORY_TEMPLATES: readonly CategoryTemplate[] = [
  { key: 'food', kind: 'expense', name: 'Food & Drink', icon: 'restaurant', color: '#F26B5B' },
  { key: 'groceries', kind: 'expense', name: 'Groceries', icon: 'cart', color: '#34A853' },
  { key: 'transport', kind: 'expense', name: 'Transport', icon: 'car', color: '#3B82F6' },
  { key: 'fuel', kind: 'expense', name: 'Fuel', icon: 'speedometer', color: '#F29D35' },
  { key: 'shopping', kind: 'expense', name: 'Shopping', icon: 'bag-handle', color: '#E05297' },
  { key: 'bills', kind: 'expense', name: 'Bills & Utilities', icon: 'flash', color: '#E6B422' },
  { key: 'home', kind: 'expense', name: 'Home & Rent', icon: 'home', color: '#A0714F' },
  { key: 'health', kind: 'expense', name: 'Health', icon: 'medkit', color: '#D64560' },
  { key: 'family', kind: 'expense', name: 'Family', icon: 'people', color: '#8E5CD9' },
  { key: 'education', kind: 'expense', name: 'Education', icon: 'school', color: '#19A89D' },
  { key: 'fun', kind: 'expense', name: 'Entertainment', icon: 'game-controller', color: '#22A7D6' },
  { key: 'travel', kind: 'expense', name: 'Travel', icon: 'airplane', color: '#5B5BD6' },
  { key: 'gifts', kind: 'expense', name: 'Gifts & Charity', icon: 'gift', color: '#F26B5B' },
  { key: 'care', kind: 'expense', name: 'Personal Care', icon: 'cut', color: '#E05297' },
  { key: 'phone', kind: 'expense', name: 'Phone & Internet', icon: 'wifi', color: '#3B82F6' },
  { key: 'work', kind: 'expense', name: 'Work & Business', icon: 'briefcase', color: '#6B7A90' },
  {
    key: 'other-expense',
    kind: 'expense',
    name: 'Other',
    icon: 'ellipsis-horizontal-circle',
    color: '#6B7A90',
  },
  { key: 'salary', kind: 'income', name: 'Salary', icon: 'cash', color: '#34A853' },
  { key: 'business', kind: 'income', name: 'Business', icon: 'trending-up', color: '#19A89D' },
  { key: 'gift-income', kind: 'income', name: 'Gift', icon: 'gift', color: '#8E5CD9' },
  { key: 'refund', kind: 'income', name: 'Refund', icon: 'return-down-back', color: '#22A7D6' },
  {
    key: 'other-income',
    kind: 'income',
    name: 'Other income',
    icon: 'add-circle',
    color: '#6B7A90',
  },
];

/** Icons offered when creating or editing categories and accounts. */
export const ICON_CHOICES: readonly string[] = [
  'restaurant',
  'cafe',
  'fast-food',
  'cart',
  'basket',
  'car',
  'bus',
  'bicycle',
  'speedometer',
  'bag-handle',
  'shirt',
  'flash',
  'water',
  'home',
  'bed',
  'medkit',
  'fitness',
  'people',
  'paw',
  'school',
  'book',
  'game-controller',
  'film',
  'musical-notes',
  'airplane',
  'gift',
  'heart',
  'cut',
  'wifi',
  'phone-portrait',
  'briefcase',
  'construct',
  'cash',
  'card',
  'wallet',
  'lock-closed',
  'business',
  'trending-up',
  'return-down-back',
  'add-circle',
  'ellipsis-horizontal-circle',
  'cube',
  'sparkles',
  'star',
];

export const COLOR_CHOICES: readonly string[] = [
  '#F26B5B',
  '#F29D35',
  '#E6B422',
  '#8BC34A',
  '#34A853',
  '#19A89D',
  '#22A7D6',
  '#3B82F6',
  '#1F4FD8',
  '#5B5BD6',
  '#8E5CD9',
  '#E05297',
  '#D64560',
  '#A0714F',
  '#6B7A90',
];
