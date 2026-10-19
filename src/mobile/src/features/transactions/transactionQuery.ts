// Phần dùng chung để truy vấn giao dịch: tham số lọc và tổng thu / chi.
// Tách riêng để module khác (vd. thông báo, ngân sách) dùng được mà không phải import
// transactionsApi.ts, tránh vòng import.
import { apiFetch } from '@/lib/api/client';
import { parseMoney } from '@/lib/money';
import type { CategoryKind } from './types';

/** Tham số lọc giống hệt query string của /transactions/ và /transactions/summary/ */
export type TransactionFilters = {
  kind?: CategoryKind;
  /** Một hoặc nhiều id, cách nhau dấu phẩy: "3" hoặc "3,5" */
  wallet?: string;
  category?: string;
  date_from?: string;
  date_to?: string;
  min_amount?: string;
  max_amount?: string;
  /** Tìm trong ghi chú và tên danh mục */
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
};

export const qs = (f: TransactionFilters) =>
  Object.entries(f)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

export type TransactionSummary = { income: number; expense: number; net: number; count: number };

/** Tổng thu / chi của đúng tập đã lọc (cùng tham số với danh sách) */
export async function getTransactionSummary(filters: TransactionFilters = {}): Promise<TransactionSummary> {
  const { page: _page, page_size: _size, ordering: _ordering, ...rest } = filters;
  const data = await apiFetch<{ income: string; expense: string; net: string; count: number }>(
    `/transactions/summary/?${qs(rest)}`,
  );
  return {
    income: parseMoney(data.income),
    expense: parseMoney(data.expense),
    net: parseMoney(data.net),
    count: data.count,
  };
}
