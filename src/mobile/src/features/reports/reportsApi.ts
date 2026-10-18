import { listAllTransactions } from '@/features/transactions/transactionsApi';
import { toYmd } from '@/lib/date';
import { buildReport, periodRange, type Period, type Report } from './aggregate';

// Lấy giao dịch trong kỳ từ server rồi tổng hợp ở app.
// TODO: nhánh feature/reports nên tính tổng ở server.

export async function getReport(period: Period): Promise<Report> {
  const { from, to } = periodRange(period);
  const list = await listAllTransactions({ date_from: toYmd(from), date_to: toYmd(to) });
  return buildReport(list, period);
}
