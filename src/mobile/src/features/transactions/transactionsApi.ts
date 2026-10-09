import * as store from './mockStore';
import type { Transaction, Wallet } from './types';

// TODO: thay các hàm giả lập bằng apiFetch khi backend có endpoint giao dịch.
// Giữ nguyên chữ ký hàm để các màn hình không phải sửa.

export type TransactionInput = store.TransactionInput;

const fakeDelay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

/** Toàn bộ giao dịch, mới nhất trước (lọc và tìm kiếm làm ở phía app) */
export async function listTransactions(): Promise<Transaction[]> {
  await fakeDelay();
  return store.getAll();
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  await fakeDelay(200);
  return store.getById(id) ?? null;
}

export async function listWallets(): Promise<Wallet[]> {
  return store.getWallets();
}

export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  await fakeDelay();
  return store.add(input);
}

export async function updateTransaction(id: string, input: TransactionInput): Promise<Transaction> {
  await fakeDelay();
  const t = store.update(id, input);
  if (!t) throw new Error('NOT_FOUND');
  return t;
}

export async function deleteTransaction(id: string): Promise<void> {
  await fakeDelay();
  store.remove(id);
}
