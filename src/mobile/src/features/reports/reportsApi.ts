import * as store from '@/features/transactions/mockStore';
import { buildReport, type Period, type Report } from './aggregate';

// TODO: thay bằng apiFetch khi backend có endpoint báo cáo (nên tính tổng ở server).
// Giữ nguyên chữ ký hàm để màn hình không phải sửa.

const fakeDelay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getReport(period: Period): Promise<Report> {
  await fakeDelay();
  return buildReport(store.getAll(), period);
}
