import * as store from '@/features/transactions/localStore';
import { getTransactionSummary } from '@/features/transactions/transactionQuery';
import { toYmd } from '@/lib/date';
import { formatVnd } from '@/lib/format';
import { pushNotification } from './notificationsStore';

/** Các mốc cảnh báo (% hạn mức) */
const THRESHOLDS = [100, 80];

/** Số đã chi của danh mục từ đầu tháng, server tính trên giao dịch đã lưu */
const spentThisMonth = async (categoryId: string) => {
  const now = new Date();
  const { expense } = await getTransactionSummary({
    category: categoryId,
    kind: 'expense',
    date_from: toYmd(new Date(now.getFullYear(), now.getMonth(), 1)),
  });
  return expense;
};

/**
 * Gọi quanh một thao tác làm thay đổi chi tiêu của danh mục: đo số đã chi trước và sau,
 * nếu vừa vượt mốc 80% hoặc 100% ngân sách tháng thì tạo thông báo (kèm banner trong app).
 * TODO: khi có backend, việc này nên do server làm và gửi push notification.
 */
export async function withBudgetAlert<T>(categoryId: string, action: () => T | Promise<T>): Promise<T> {
  const limit = store.getBudgets()[categoryId];
  if (!limit) return action();

  // Không đo được số đã chi (mất mạng) thì vẫn lưu giao dịch, chỉ bỏ qua cảnh báo
  const before = await spentThisMonth(categoryId).catch(() => null);
  const result = await action();
  if (before === null) return result;
  const after = await spentThisMonth(categoryId).catch(() => null);
  if (after === null) return result;

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
