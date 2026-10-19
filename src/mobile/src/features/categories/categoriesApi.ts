import { apiFetch } from '@/lib/api/client';
import { resolveIcon } from '@/features/transactions/categories';
import type { Category, CategoryKind } from '@/features/transactions/types';

type ApiCategory = {
  id: number;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  is_hidden: boolean;
  transaction_count: number;
};

export type CategoryInput = Omit<Category, 'id'>;

/** Kèm số giao dịch đang dùng danh mục: có giao dịch thì chỉ được ẩn, không được xóa */
export type CategoryWithCount = Category & { transactionCount: number };

const toCategory = (c: ApiCategory): CategoryWithCount => ({
  id: String(c.id),
  name: c.name,
  kind: c.kind,
  icon: resolveIcon(c.icon),
  color: c.color,
  hidden: c.is_hidden,
  transactionCount: c.transaction_count,
});

// JSON.stringify tự bỏ các trường undefined nên dùng chung cho tạo mới và sửa một phần
const toBody = (input: Partial<CategoryInput>) =>
  JSON.stringify({
    name: input.name,
    kind: input.kind,
    icon: input.icon,
    color: input.color,
    is_hidden: input.hidden,
  });

/** Danh mục của người dùng; truyền kind để lấy riêng Chi hoặc Thu (?kind=) */
export async function list(kind?: CategoryKind): Promise<CategoryWithCount[]> {
  const data = await apiFetch<ApiCategory[]>(`/categories/${kind ? `?kind=${kind}` : ''}`);
  return data.map(toCategory);
}

export async function get(id: string): Promise<CategoryWithCount> {
  return toCategory(await apiFetch<ApiCategory>(`/categories/${id}/`));
}

/** Lỗi 400 (vd. trùng tên trong cùng loại) đọc bằng getFieldErrors(e).name */
export async function create(input: CategoryInput): Promise<CategoryWithCount> {
  const data = await apiFetch<ApiCategory>('/categories/', { method: 'POST', body: toBody(input) });
  return toCategory(data);
}

export async function update(id: string, input: Partial<CategoryInput>): Promise<CategoryWithCount> {
  const data = await apiFetch<ApiCategory>(`/categories/${id}/`, {
    method: 'PATCH',
    body: toBody(input),
  });
  return toCategory(data);
}

export async function remove(id: string): Promise<void> {
  await apiFetch(`/categories/${id}/`, { method: 'DELETE' });
}
