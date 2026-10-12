import * as store from '@/features/transactions/mockStore';
import { formatVnd } from '@/lib/format';
import { pushNotification } from './notificationsStore';

/** Các mốc cảnh báo (% hạn mức) */
const THRESHOLDS = [100, 80];

const spentThisMonth = (categoryId: string) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return store
    .getAll()
    .filter((t) => t.category.id === categoryId && t.amount < 0 && new Date(t.date) >= monthStart)
    .reduce((s, t) => s - t.amount, 0);
};

/**
 * Gọi quanh một thao tác làm thay đổi chi tiêu của danh mục: đo số đã chi trước và sau,
 * nếu vừa vượt mốc 80% hoặc 100% ngân sách tháng thì tạo thông báo (kèm banner trong app).
 * TODO: khi có backend, việc này nên do server làm và gửi push notification.
 */
export async function withBudgetAlert<T>(categoryId: string, action: () => T | Promise<T>): Promise<T> {
  const limit = store.getBudgets()[categoryId];
  if (!limit) return action();

  const before = spentThisMonth(categoryId);
  const result = await action();
  const after = spentThisMonth(categoryId);

  const crossed = THRESHOLDS.find((p) => before < (limit * p) / 100 && after >= (limit * p) / 100);
  if (crossed) {
    const name = store.getCategory(categoryId)?.name ?? '';
    const percent = Math.round((after / limit) * 100);
    pushNotification({
      type: 'budget',
      title: crossed >= 100 ? `Đã vượt ngân sách ${name}` : `Sắp vượt ngân sách ${name}`,
      body: `Bạn đã dùng ${percent}% ngân sách tháng (${formatVnd(after)} / ${formatVnd(limit)}).`,
      link: '/advice',
    });
  }
  return result;
}
