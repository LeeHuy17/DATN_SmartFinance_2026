import { apiFetch } from '@/lib/api/client';
import { parseMoney, toMoneyString } from '@/lib/money';
import type { Wallet, WalletType } from '@/features/transactions/types';

type ApiWallet = {
  id: number;
  name: string;
  kind: WalletType;
  initial_balance: string;
  balance: string;
  currency: string;
  include_in_total: boolean;
  is_archived: boolean;
};

type ApiSummary = { total_balance: string; currency: string; wallet_count: number };

export type WalletInput = {
  name: string;
  type: WalletType;
  initialBalance: number;
  includeInTotal: boolean;
  isArchived: boolean;
};

export type WalletSummary = {
  /** Tổng số dư các ví đang dùng và có tính vào tổng tài sản (số nguyên đồng) */
  totalBalance: number;
  currency: string;
  walletCount: number;
};

const toWallet = (w: ApiWallet): Wallet => ({
  id: String(w.id),
  name: w.name,
  type: w.kind,
  balance: parseMoney(w.balance),
  initialBalance: parseMoney(w.initial_balance),
  includeInTotal: w.include_in_total,
  isArchived: w.is_archived,
});

// Số tiền gửi lên dạng chuỗi số nguyên; JSON.stringify bỏ trường undefined khi sửa một phần
const toBody = (input: Partial<WalletInput>) =>
  JSON.stringify({
    name: input.name,
    kind: input.type,
    initial_balance: input.initialBalance === undefined ? undefined : toMoneyString(input.initialBalance),
    include_in_total: input.includeInTotal,
    is_archived: input.isArchived,
  });

/** Mặc định chỉ lấy ví đang dùng; includeArchived để lấy cả ví đã lưu trữ */
export async function list({ includeArchived = false } = {}): Promise<Wallet[]> {
  const data = await apiFetch<ApiWallet[]>(`/wallets/${includeArchived ? '?include_archived=1' : ''}`);
  return data.map(toWallet);
}

/** Lỗi 400 (vd. trùng tên ví) đọc bằng getFieldErrors(e).name */
export async function create(input: WalletInput): Promise<Wallet> {
  const data = await apiFetch<ApiWallet>('/wallets/', { method: 'POST', body: toBody(input) });
  return toWallet(data);
}

export async function update(id: string, input: Partial<WalletInput>): Promise<Wallet> {
  const data = await apiFetch<ApiWallet>(`/wallets/${id}/`, { method: 'PATCH', body: toBody(input) });
  return toWallet(data);
}

/** Lưu trữ: ẩn ví khỏi danh sách và tổng tài sản nhưng vẫn giữ dữ liệu; false để dùng lại */
export const setArchived = (id: string, archived: boolean) => update(id, { isArchived: archived });

export async function remove(id: string): Promise<void> {
  await apiFetch(`/wallets/${id}/`, { method: 'DELETE' });
}

export async function getSummary(): Promise<WalletSummary> {
  const data = await apiFetch<ApiSummary>('/wallets/summary/');
  return {
    totalBalance: parseMoney(data.total_balance),
    currency: data.currency,
    walletCount: data.wallet_count,
  };
}
