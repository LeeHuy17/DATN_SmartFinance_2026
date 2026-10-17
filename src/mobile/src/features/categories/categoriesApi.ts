import { apiFetch } from '@/lib/api/client';
import { resolveIcon } from '@/features/transactions/categories';
import * as store from '@/features/transactions/localStore';
import type { Category, CategoryKind } from '@/features/transactions/types';

type ApiCategory = {
  id: number;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  is_hidden: boolean;
};

export type CategoryInput = Omit<Category, 'id'>;

const toCategory = (c: ApiCategory): Category => ({
  id: String(c.id),
  name: c.name,
  kind: c.kind,
  icon: resolveIcon(c.icon),
  color: c.color,
  hidden: c.is_hidden,
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

/** Lưu bản sao để gắn tên / màu danh mục vào giao dịch */
const remember = (c: Category) => {
  store.cacheCategories([c]);
  return c;
};

/** Danh mục của người dùng; truyền kind để lấy riêng Chi hoặc Thu (?kind=) */
export async function list(kind?: CategoryKind): Promise<Category[]> {
  const data = await apiFetch<ApiCategory[]>(`/categories/${kind ? `?kind=${kind}` : ''}`);
  const categories = data.map(toCategory);
  store.cacheCategories(categories);
  return categories;
}

export async function get(id: string): Promise<Category> {
  return remember(toCategory(await apiFetch<ApiCategory>(`/categories/${id}/`)));
}

/** Lỗi 400 (vd. trùng tên trong cùng loại) đọc bằng getFieldErrors(e).name */
export async function create(input: CategoryInput): Promise<Category> {
  const data = await apiFetch<ApiCategory>('/categories/', { method: 'POST', body: toBody(input) });
  return remember(toCategory(data));
}

export async function update(id: string, input: Partial<CategoryInput>): Promise<Category> {
  const data = await apiFetch<ApiCategory>(`/categories/${id}/`, {
    method: 'PATCH',
    body: toBody(input),
  });
  return remember(toCategory(data));
}

export async function remove(id: string): Promise<void> {
  await apiFetch(`/categories/${id}/`, { method: 'DELETE' });
  store.forgetCategory(id);
}
