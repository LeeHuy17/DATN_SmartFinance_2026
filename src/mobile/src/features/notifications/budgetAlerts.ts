import type { BudgetAlert } from '@/features/budgets/budgetsApi';
import { formatVnd } from '@/lib/format';
import { showBanner } from './notificationsStore';

/**
 * Hiện banner ngay khi server trả budget_alerts lúc tạo / sửa giao dịch chi: vàng khi chạm ngưỡng,
 * đỏ khi đã vượt. Việc lưu vào Hộp thư do server làm (mỗi mốc chỉ một lần mỗi tháng).
 * Chưa có push notification khi app đóng.
 */
export function notifyBudgetAlerts(alerts: BudgetAlert[] | undefined) {
  for (const a of alerts ?? []) {
    const exceeded = a.status === 'exceeded';
    showBanner({
      type: 'budget',
      tone: exceeded ? 'danger' : undefined,
      title: exceeded ? `Đã vượt ngân sách ${a.name}` : `${a.name} đã dùng ${Math.round(a.percent)}% ngân sách`,
      body: exceeded
        ? `Đã chi ${formatVnd(a.spent)}, vượt ${formatVnd(a.spent - a.amount)} so với hạn mức ${formatVnd(a.amount)}.`
        : `Đã chi ${formatVnd(a.spent)} / ${formatVnd(a.amount)} trong tháng.`,
      link: '/advice',
    });
  }
}
