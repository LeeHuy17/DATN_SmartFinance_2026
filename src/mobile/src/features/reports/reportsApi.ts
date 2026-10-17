import * as store from '@/features/transactions/localStore';
import { buildReport, type Period, type Report } from './aggregate';

// TODO: thay bằng apiFetch khi backend có endpoint báo cáo (nên tính tổng ở server).
// Giữ nguyên chữ ký hàm để màn hình không phải sửa.

export async function getReport(period: Period): Promise<Report> {
  return buildReport(store.getAll(), period);
}
