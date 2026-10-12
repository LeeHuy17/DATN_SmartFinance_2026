import * as store from '@/features/transactions/mockStore';
import { MIN_EXPENSES_FOR_ADVICE, buildSummary, type SpendingSummary } from './summary';

export type Advice = {
  month: number;
  /** Nhận xét tổng quan (1–2 câu) */
  insight: string;
  /** Gợi ý hành động cụ thể, tối đa 3 */
  actions: string[];
};

export type AdviceResult =
  | { status: 'ok'; advice: Advice }
  /** Chưa đủ giao dịch trong tháng để phân tích */
  | { status: 'insufficient' };

/** Dịch vụ AI không phản hồi / mất mạng */
export class AdviceUnavailableError extends Error {
  constructor() {
    super('ADVICE_UNAVAILABLE');
  }
}

// ---------- Chế độ giả lập (chỉ để xem các trạng thái giao diện khi chưa có backend) ----------

export type MockMode = 'auto' | 'offline' | 'insufficient';
let mockMode: MockMode = 'auto';
export const getMockMode = () => mockMode;
const MODES: MockMode[] = ['auto', 'offline', 'insufficient'];
export const cycleMockMode = () => {
  mockMode = MODES[(MODES.indexOf(mockMode) + 1) % MODES.length];
  return mockMode;
};

const fakeDelay = (ms = 1500) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Lấy lời khuyên cho tháng hiện tại.
 * TODO: thay phần giả lập bằng apiFetch('/advice', { method: 'POST', body: JSON.stringify(summary) }).
 * Chỉ gửi `SpendingSummary` (số liệu tổng hợp), không gửi giao dịch chi tiết.
 */
export async function getAdvice(): Promise<AdviceResult> {
  const summary = buildSummary(store.getAll(), store.getBudgets());
  // Tên danh mục cho ngân sách lấy từ danh mục hiện tại
  summary.budgets = summary.budgets.map((b) => ({ ...b, name: store.getCategory(b.categoryId)?.name ?? b.name }));

  await fakeDelay();
  if (mockMode === 'offline') throw new AdviceUnavailableError();
  if (mockMode === 'insufficient' || summary.expenseCount < MIN_EXPENSES_FOR_ADVICE) return { status: 'insufficient' };
  return { status: 'ok', advice: mockAdvice(summary) };
}

const pct = (part: number, total: number) => Math.round((part / Math.max(total, 1)) * 100);

/** "AI" giả lập theo quy tắc, chỉ đọc số liệu tổng hợp */
function mockAdvice(s: SpendingSummary): Advice {
  const top = s.categories[0];
  const sentences: string[] = [];

  if (top) {
    const trend =
      top.last7Days > top.previous7Days * 1.1
        ? 'đang tăng so với tuần trước'
        : top.last7Days < top.previous7Days * 0.9
          ? 'đã giảm so với tuần trước'
          : 'tương đương tuần trước';
    sentences.push(`Chi tiêu ${top.name.toLowerCase()} chiếm ${pct(top.amount, s.totalExpense)}% tổng chi và ${trend}.`);
  }

  // Ngân sách có nguy cơ vượt: ước tính ngày hết theo tốc độ chi hiện tại
  const atRisk = s.budgets
    .map((b) => {
      const perDay = b.spent / Math.max(s.dayOfMonth, 1);
      const runOutDay = perDay > 0 ? Math.ceil(b.limit / perDay) : Infinity;
      return { ...b, runOutDay };
    })
    .filter((b) => b.spent < b.limit && b.runOutDay < s.daysInMonth)
    .sort((a, b) => a.runOutDay - b.runOutDay)[0];
  const over = s.budgets.find((b) => b.spent >= b.limit);

  if (over) {
    sentences.push(`Ngân sách ${over.name} đã vượt hạn mức tháng này.`);
  } else if (atRisk) {
    sentences.push(`Với tốc độ hiện tại, ngân sách ${atRisk.name} có thể hết trước ngày ${atRisk.runOutDay}.`);
  } else if (s.budgets.length > 0) {
    sentences.push('Các ngân sách đang trong tầm kiểm soát, cứ giữ nhịp chi tiêu này nhé.');
  }

  const actions: string[] = [];
  const names = s.categories.map((c) => c.name.toLowerCase());
  if (names.includes('ăn uống')) actions.push('Giới hạn cà phê, ăn ngoài ở mức 3 lần mỗi tuần.');
  if (names.includes('mua sắm')) actions.push('Gom các lần đi siêu thị về một buổi cuối tuần.');
  if (names.includes('di chuyển')) actions.push('Đi chung xe hoặc gom lịch hẹn để giảm số chuyến gọi xe.');
  if (s.budgets.length === 0 && top) actions.push(`Đặt ngân sách cho ${top.name} để được cảnh báo sớm.`);
  if (actions.length === 0) actions.push('Ghi lại đều đặn mỗi khoản chi để lời khuyên chính xác hơn.');

  return { month: s.month, insight: sentences.join(' '), actions: actions.slice(0, 3) };
}
