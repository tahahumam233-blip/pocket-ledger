import type { Account, Category, LedgerLine, Transaction } from '@/domain';

import { fromSqlBoolean } from './sql';

export type AccountRow = {
  id: string;
  name: string;
  kind: Account['kind'];
  account_class: Account['accountClass'];
  note: string;
  due_date: string | null;
  icon: string;
  color: string;
  sort_order: number;
  created_at: string;
  archived_at: string | null;
};

export type CategoryRow = {
  id: string;
  name: string;
  kind: Category['kind'];
  icon: string;
  color: string;
  sort_order: number;
  is_system: number;
  archived_at: string | null;
};

export type TransactionRow = {
  id: string;
  kind: Transaction['kind'];
  debt_action: Transaction['debtAction'];
  posted_date: string;
  category_id: string | null;
  note: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type LedgerLineRow = {
  id: string;
  transaction_id: string;
  account_id: string;
  currency: string;
  amount_minor: number;
  role: LedgerLine['role'];
};

export type ReceiptRow = {
  id: string;
  file_name: string;
  width: number | null;
  height: number | null;
  note: string;
  captured_at: string;
  transaction_id: string | null;
  deleted_at: string | null;
};

export function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    accountClass: row.account_class,
    note: row.note,
    dueDate: row.due_date,
    icon: row.icon,
    color: row.color,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    archivedAt: row.archived_at,
  };
}

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    icon: row.icon,
    color: row.color,
    sortOrder: row.sort_order,
    isSystem: fromSqlBoolean(row.is_system),
    archivedAt: row.archived_at,
  };
}

export function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    kind: row.kind,
    debtAction: row.debt_action ?? null,
    postedDate: row.posted_date,
    categoryId: row.category_id,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function mapLedgerLine(row: LedgerLineRow): LedgerLine {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    accountId: row.account_id,
    currency: row.currency,
    amountMinor: row.amount_minor,
    role: row.role,
  };
}

export type Receipt = {
  id: string;
  fileName: string;
  width: number | null;
  height: number | null;
  note: string;
  capturedAt: string;
  transactionId: string | null;
  deletedAt: string | null;
};

export function mapReceipt(row: ReceiptRow): Receipt {
  return {
    id: row.id,
    fileName: row.file_name,
    width: row.width,
    height: row.height,
    note: row.note,
    capturedAt: row.captured_at,
    transactionId: row.transaction_id,
    deletedAt: row.deleted_at,
  };
}
