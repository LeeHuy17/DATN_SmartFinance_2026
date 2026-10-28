// Câu hỏi thường gặp cho màn Trung tâm trợ giúp.
// Câu trả lời nhắc đúng tên nút / màn hình trong app: đổi giao diện thì cập nhật lại ở đây.

import type { Ionicons } from '@expo/vector-icons';

import { CONTACT_EMAIL } from '@/features/legal/legalContent';

export type HelpQuestion = { question: string; answer: string };

export type HelpTopic = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  questions: HelpQuestion[];
};

export const HELP_TOPICS: HelpTopic[] = [
  {
    title: 'Bắt đầu',
    icon: 'rocket-outline',
    questions: [
      {
        question: 'Nên bắt đầu dùng FinBuddy từ đâu?',
        answer:
          'Vào tab Ví để tạo các ví bạn đang có (tiền mặt, tài khoản ngân hàng, ví điện tử, thẻ tín dụng, tiết kiệm) kèm số dư hiện tại. Sau đó ghi giao dịch bằng nút "Nhập Thu/Chi" ở tab Tổng quan, hoặc bấm nút Quét ở giữa thanh dưới để chụp hóa đơn. Danh mục thu chi mặc định đã có sẵn khi bạn tạo tài khoản.',
      },
      {
        question: 'FinBuddy có kết nối với tài khoản ngân hàng của tôi không?',
        answer:
          'Không. Ví và số dư trong FinBuddy chỉ là số liệu do bạn tự ghi chép. Ứng dụng không liên kết ngân hàng, không giữ tiền và không thực hiện thanh toán nào thay bạn.',
      },
    ],
  },
  {
    title: 'Giao dịch, ví và danh mục',
    icon: 'swap-vertical-outline',
    questions: [
      {
        question: 'Làm sao để sửa hoặc xóa một giao dịch?',
        answer:
          'Ở tab Tổng quan, bấm "Xem tất cả" cạnh mục Giao dịch gần đây để mở danh sách. Chạm vào giao dịch cần đổi để xem nhanh, rồi chọn Sửa hoặc Xóa.',
      },
      {
        question: 'Tôi không dùng một ví nữa, có cần xóa không?',
        answer:
          'Bạn có thể chọn "Lưu trữ ví" thay vì xóa. Ví lưu trữ được ẩn khỏi danh sách và không tính vào tổng tài sản, nhưng các giao dịch cũ vẫn được giữ để xem báo cáo. Khi cần, chọn "Dùng lại ví này" để hiện lại.',
      },
      {
        question: 'Làm sao để thêm hoặc chỉnh danh mục?',
        answer:
          'Mở trang Danh mục từ tab Ví, hoặc ngay lúc chọn danh mục khi nhập giao dịch. Tại đây bạn có thể thêm danh mục mới, đổi tên, màu, biểu tượng hoặc ẩn những danh mục không dùng.',
      },
    ],
  },
  {
    title: 'Quét hóa đơn',
    icon: 'scan-outline',
    questions: [
      {
        question: 'Chụp thế nào để đọc hóa đơn chính xác?',
        answer:
          'Đặt hóa đơn trên mặt phẳng, đủ sáng, chụp thẳng từ trên xuống và lấy trọn cả tờ, nhất là phần tổng tiền. Tránh bóng đổ, nếp gấp và ảnh bị mờ. Bạn cũng có thể chọn ảnh có sẵn trong thư viện.',
      },
      {
        question: 'Số tiền hoặc ngày đọc ra bị sai thì sao?',
        answer:
          'Kết quả quét chỉ điền sẵn giúp bạn. Hãy kiểm tra và sửa lại số tiền, ngày, danh mục trước khi lưu. Nếu đã có một khoản chi giống hệt (cùng số tiền, cùng cửa hàng, cách nhau không quá 7 ngày), FinBuddy sẽ cảnh báo để bạn tránh ghi trùng.',
      },
      {
        question: 'Ảnh hóa đơn của tôi được lưu bao lâu?',
        answer:
          'Ảnh được lưu kèm giao dịch tạo từ nó. Ảnh đã quét nhưng không lưu thành giao dịch sẽ tự động bị xóa sau 24 giờ.',
      },
    ],
  },
  {
    title: 'Ngân sách',
    icon: 'pie-chart-outline',
    questions: [
      {
        question: 'Đặt ngân sách ở đâu?',
        answer:
          'Ở tab Lời khuyên, phần Ngân sách. Bạn chọn danh mục, hạn mức cho tháng và ngưỡng cảnh báo.',
      },
      {
        question: 'Khi nào tôi nhận được cảnh báo ngân sách?',
        answer:
          'Khi chi tiêu chạm ngưỡng cảnh báo (mặc định 80% hạn mức) và khi vượt hạn mức. Mỗi mốc chỉ báo một lần mỗi tháng. Bạn có thể bật hoặc tắt loại thông báo này trong Hồ sơ → Thông báo.',
      },
    ],
  },
  {
    title: 'Lời khuyên AI',
    icon: 'sparkles-outline',
    questions: [
      {
        question: 'Vì sao chưa có lời khuyên cho tháng này?',
        answer:
          'Trợ lý AI cần ít nhất 5 giao dịch trong tháng để có đủ số liệu phân tích. Hãy ghi thêm giao dịch rồi quay lại.',
      },
      {
        question: 'Bấm "Phân tích lại" nhưng kết quả không đổi?',
        answer:
          'Lời khuyên được giữ trong 10 phút để tránh phân tích lặp lại khi số liệu chưa thay đổi. Nếu bạn vừa thêm hoặc sửa giao dịch, kết quả sẽ được tạo mới. Khi dịch vụ AI tạm thời không phản hồi, FinBuddy vẫn đưa ra nhận xét cơ bản dựa trên số liệu của bạn.',
      },
      {
        question: 'Dữ liệu nào được gửi cho dịch vụ AI?',
        answer:
          'Chỉ các con số đã tổng hợp như tổng thu, tổng chi, tỷ lệ từng danh mục và mức thay đổi so với tháng trước. FinBuddy không gửi họ tên, email hay từng giao dịch chi tiết. Xem thêm trong Chính sách quyền riêng tư.',
      },
    ],
  },
  {
    title: 'Tài khoản và bảo mật',
    icon: 'shield-checkmark-outline',
    questions: [
      {
        question: 'Tôi quên mật khẩu, phải làm sao?',
        answer:
          'Ở màn Đăng nhập, chọn "Quên mật khẩu?" và nhập email đã đăng ký. Bạn sẽ nhận được mã gồm 6 chữ số, có hiệu lực trong 5 phút, để đặt mật khẩu mới.',
      },
      {
        question: 'Làm sao để đổi mật khẩu?',
        answer:
          'Vào Hồ sơ → Đổi mật khẩu. Sau khi đổi, bạn sẽ nhận được thông báo bảo mật để biết nếu không phải mình thực hiện.',
      },
      {
        question: 'Tôi muốn xóa tài khoản và toàn bộ dữ liệu?',
        answer: `Gửi yêu cầu từ email đăng ký của bạn tới ${CONTACT_EMAIL}. Tài khoản cùng toàn bộ dữ liệu sẽ bị xóa vĩnh viễn và không thể khôi phục.`,
      },
    ],
  },
];
