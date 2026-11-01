import { ApiError, apiFetch } from '@/lib/api/client';

// Lời khuyên do server tạo (backend/advisor): số liệu do Python tính, AI (Groq) chỉ viết lời.
// App không còn tải giao dịch về để tự tính xu hướng hay soạn lời khuyên.

export type Insights = {
  /** Nhận xét tổng quan */
  summary: string;
  /** Xu hướng; direction chỉ hướng thay đổi (up: tăng, down: giảm) */
  trends: { title: string; detail: string; direction: 'up' | 'down' | 'flat' }[];
  advice: { title: string; detail: string; priority: 'high' | 'medium' | 'low' }[];
};

export type AdvisorResult =
  | {
      status: 'ok';
      /** "2026-10" */
      month: string;
      /** llm: do AI viết; rules: gợi ý cơ bản theo luật khi AI không khả dụng */
      source: 'llm' | 'rules';
      insights: Insights;
      /** true: dùng lại kết quả đã lưu, không gọi AI lần nữa */
      cached: boolean;
      /** ISO 8601 */
      generated_at: string;
      disclaimer: string;
    }
  | { status: 'insufficient_data'; min_transactions: number; transactions: number }
  /** Chưa có kết quả đã lưu cho tháng này */
  | { status: 'none' };

/** Kết quả có thể hiển thị (không gồm "none") */
export type ShownAdvice = Exclude<AdvisorResult, { status: 'none' }>;

/** Gọi AI có thể mất vài giây: lớn hơn GROQ_TIMEOUT (30 giây) của server để nhận được phương án dự phòng */
const RUN_TIMEOUT_MS = 40_000;

/** Đọc kết quả đã lưu của tháng `month` ("YYYY-MM"), nhanh và không gọi AI */
export const getAdvice = (month: string) => apiFetch<AdvisorResult>(`/advisor/insights/?month=${month}`);

/**
 * Phân tích tháng `month`. force: bỏ qua thời gian chờ 10 phút khi số liệu đã đổi
 * (số liệu không đổi thì server vẫn dùng lại kết quả). Giới hạn 20 lần mỗi giờ, quá thì lỗi 429.
 */
export const runAdvice = (month: string, force = false) =>
  apiFetch<AdvisorResult>(
    '/advisor/insights/',
    { method: 'POST', body: JSON.stringify({ month, force }) },
    { timeoutMs: RUN_TIMEOUT_MS },
  );

export const isRateLimited = (e: unknown) => e instanceof ApiError && e.status === 429;
