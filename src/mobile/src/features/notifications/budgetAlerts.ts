import type { BudgetAlert } from '@/features/budgets/budgetsApi';
import { formatVnd } from '@/lib/format';
import { pushNotification } from './notificationsStore';

/**
 * Hiện cảnh báo ngân sách mà server trả kèm khi tạo / sửa giao dịch chi (budget_alerts):
 * banner trong app, vàng khi chạm ngưỡng, đỏ khi đã vượt. Mỗi ngân sách chỉ giữ một thông báo
 * mới nhất trong Hộp thư. Chưa có push notification khi app đóng.
 */
export function notifyBudgetAlerts(alerts: BudgetAlert[] | undefined) {
  for (const a of alerts ?? []) {
    const exceeded = a.status === 'exceeded';
    const percent = Math.round(a.percent);
    pushNotification({
      type: 'budget',
      tone: exceeded ? 'danger' : undefined,
      key: `budget-${a.budgetId}`,
      title: exceeded ? `Đã vượt ngân sách ${a.name}` : `${a.name} đã dùng ${percent}% ngân sách`,
      body: exceeded
        ? `Đã chi ${formatVnd(a.spent)}, vượt ${formatVnd(a.spent - a.amount)} so với hạn mức ${formatVnd(a.amount)}.`
        : `Đã chi ${formatVnd(a.spent)} / ${formatVnd(a.amount)} trong tháng.`,
      link: '/advice',
    });
  }
}
