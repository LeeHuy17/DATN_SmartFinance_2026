// Nội dung Điều khoản sử dụng và Chính sách quyền riêng tư.
// Mô tả đúng cách app đang xử lý dữ liệu: sửa backend (thời gian lưu, bên thứ ba...) thì cập nhật lại ở đây.

// TODO: thay bằng email liên hệ thật trước khi phát hành
export const CONTACT_EMAIL = 'support@finbuddy.local';

/** Một đoạn văn, hoặc một danh sách gạch đầu dòng */
export type LegalBlock = string | string[];

export type LegalSection = {
  heading: string;
  body: LegalBlock[];
};

export type LegalDocument = {
  title: string;
  updatedAt: string; // YYYY-MM-DD
  intro: string;
  sections: LegalSection[];
};

export const TERMS_OF_USE: LegalDocument = {
  title: 'Điều khoản sử dụng',
  updatedAt: '2026-10-28',
  intro:
    'Chào mừng bạn đến với FinBuddy. Khi tạo tài khoản hoặc sử dụng ứng dụng, bạn đồng ý với các điều khoản dưới đây. Vui lòng đọc kỹ trước khi sử dụng.',
  sections: [
    {
      heading: '1. Giới thiệu dịch vụ',
      body: [
        'FinBuddy là ứng dụng hỗ trợ quản lý tài chính cá nhân, gồm các chức năng:',
        [
          'Ghi chép thu chi, quản lý ví và danh mục.',
          'Đặt ngân sách và nhận cảnh báo khi chi tiêu gần hoặc vượt mức.',
          'Quét hóa đơn để tự động đọc số tiền, ngày và nơi mua.',
          'Xem báo cáo và nhận gợi ý chi tiêu từ trí tuệ nhân tạo (AI).',
        ],
        'FinBuddy chỉ là công cụ ghi chép. Ứng dụng không giữ tiền, không kết nối tài khoản ngân hàng và không thực hiện bất kỳ giao dịch thanh toán nào thay bạn.',
      ],
    },
    {
      heading: '2. Tài khoản',
      body: [
        [
          'Bạn cần cung cấp email hợp lệ để đăng ký và khôi phục mật khẩu.',
          'Bạn chịu trách nhiệm giữ bí mật mật khẩu và mọi hoạt động diễn ra trên tài khoản của mình.',
          'Hãy đổi mật khẩu ngay nếu nghi ngờ tài khoản bị người khác sử dụng.',
          'Người dùng dưới 16 tuổi cần có sự đồng ý của cha mẹ hoặc người giám hộ.',
        ],
      ],
    },
    {
      heading: '3. Dữ liệu bạn nhập',
      body: [
        'Bạn là chủ sở hữu dữ liệu tài chính mà mình nhập vào ứng dụng và tự chịu trách nhiệm về tính chính xác của dữ liệu đó. Cách chúng tôi thu thập và xử lý dữ liệu được trình bày trong Chính sách quyền riêng tư.',
      ],
    },
    {
      heading: '4. Quét hóa đơn và gợi ý AI',
      body: [
        [
          'Kết quả quét hóa đơn được đọc tự động nên có thể sai, nhất là với ảnh mờ, nghiêng hoặc hóa đơn viết tay. Bạn cần kiểm tra lại trước khi lưu giao dịch.',
          'Gợi ý từ AI được tạo tự động dựa trên số liệu chi tiêu của bạn, chỉ mang tính tham khảo và không phải là tư vấn tài chính, đầu tư hay pháp lý chuyên nghiệp.',
          'Bạn tự quyết định và tự chịu trách nhiệm về các quyết định tài chính của mình.',
        ],
      ],
    },
    {
      heading: '5. Hành vi không được phép',
      body: [
        [
          'Truy cập trái phép vào tài khoản của người khác hoặc vào hệ thống của ứng dụng.',
          'Can thiệp, làm quá tải hoặc tìm cách vượt qua các cơ chế bảo mật của ứng dụng.',
          'Tải lên nội dung vi phạm pháp luật hoặc không liên quan đến mục đích quản lý tài chính.',
        ],
        'Chúng tôi có thể tạm khóa hoặc chấm dứt tài khoản vi phạm các điều trên.',
      ],
    },
    {
      heading: '6. Giới hạn trách nhiệm',
      body: [
        'Chúng tôi nỗ lực để ứng dụng hoạt động ổn định và dữ liệu được an toàn, nhưng không cam kết dịch vụ luôn liên tục và không có lỗi. Chúng tôi không chịu trách nhiệm cho các thiệt hại phát sinh từ việc sử dụng số liệu, báo cáo hoặc gợi ý của ứng dụng để ra quyết định tài chính.',
      ],
    },
    {
      heading: '7. Chấm dứt sử dụng',
      body: [
        `Bạn có thể ngừng sử dụng và yêu cầu xóa tài khoản bất cứ lúc nào bằng cách liên hệ ${CONTACT_EMAIL}. Khi tài khoản bị xóa, toàn bộ dữ liệu của bạn sẽ bị xóa vĩnh viễn và không thể khôi phục.`,
      ],
    },
    {
      heading: '8. Thay đổi điều khoản',
      body: [
        'Chúng tôi có thể cập nhật điều khoản này. Khi có thay đổi quan trọng, chúng tôi sẽ thông báo trong ứng dụng. Việc bạn tiếp tục sử dụng sau khi điều khoản được cập nhật đồng nghĩa với việc bạn chấp nhận nội dung mới.',
      ],
    },
    {
      heading: '9. Luật áp dụng và liên hệ',
      body: [
        `Điều khoản này được điều chỉnh theo pháp luật Việt Nam. Mọi thắc mắc vui lòng gửi về ${CONTACT_EMAIL}.`,
      ],
    },
  ],
};

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Chính sách quyền riêng tư',
  updatedAt: '2026-10-28',
  intro:
    'Chính sách này cho biết FinBuddy thu thập những dữ liệu nào, dùng chúng vào việc gì, chia sẻ với ai và bạn có những quyền gì đối với dữ liệu của mình, theo quy định của pháp luật Việt Nam về bảo vệ dữ liệu cá nhân.',
  sections: [
    {
      heading: '1. Dữ liệu chúng tôi thu thập',
      body: [
        'Thông tin tài khoản:',
        [
          'Email và mật khẩu (bắt buộc). Mật khẩu chỉ được lưu dưới dạng mã băm, chúng tôi không thể xem được mật khẩu gốc.',
          'Họ tên, số điện thoại, ngày sinh, giới tính, ảnh đại diện, đơn vị tiền tệ (không bắt buộc, do bạn tự cung cấp).',
        ],
        'Dữ liệu tài chính do bạn nhập: giao dịch thu chi, ví, danh mục, ngân sách và ghi chú kèm theo.',
        'Ảnh hóa đơn bạn chụp hoặc chọn để quét.',
        'Cài đặt của bạn: các loại thông báo muốn nhận, giao diện sáng/tối.',
        'Chúng tôi không thu thập vị trí, danh bạ, thông tin tài khoản ngân hàng hay số thẻ thanh toán.',
      ],
    },
    {
      heading: '2. Mục đích sử dụng',
      body: [
        [
          'Tạo và quản lý tài khoản, xác thực đăng nhập.',
          'Lưu trữ, tính toán và hiển thị số liệu thu chi, ngân sách, báo cáo.',
          'Đọc thông tin trên ảnh hóa đơn để điền sẵn giao dịch.',
          'Tạo gợi ý chi tiêu bằng AI.',
          'Gửi thông báo trong ứng dụng; gửi email mã khôi phục mật khẩu và email tổng kết tháng (nếu bạn bật).',
          'Bảo đảm an toàn tài khoản, ví dụ thông báo khi mật khẩu được thay đổi.',
        ],
        'Chúng tôi không bán dữ liệu của bạn và không dùng dữ liệu của bạn cho mục đích quảng cáo.',
      ],
    },
    {
      heading: '3. Ảnh hóa đơn',
      body: [
        'Ảnh hóa đơn được xử lý ngay trên máy chủ của FinBuddy, không gửi cho bất kỳ dịch vụ bên ngoài nào. Ảnh được lưu kèm giao dịch mà bạn tạo từ nó; ảnh không được dùng để tạo giao dịch sẽ tự động bị xóa sau 24 giờ.',
      ],
    },
    {
      heading: '4. Chia sẻ với bên thứ ba',
      body: [
        'Chúng tôi chỉ chia sẻ dữ liệu ở mức tối thiểu cần thiết với các nhà cung cấp sau:',
        [
          'Groq (dịch vụ AI): nhận số liệu chi tiêu đã tổng hợp theo tháng và theo danh mục (ví dụ tổng chi, tỷ lệ từng danh mục, mức thay đổi so với tháng trước) để tạo gợi ý. Chúng tôi không gửi họ tên, email, số điện thoại hay từng giao dịch chi tiết. Máy chủ của Groq có thể đặt ngoài Việt Nam.',
          'Google (Gmail): dùng để gửi email mã khôi phục mật khẩu và email tổng kết tháng tới địa chỉ email của bạn.',
        ],
        'Ngoài ra, chúng tôi chỉ cung cấp dữ liệu khi có yêu cầu hợp pháp của cơ quan nhà nước có thẩm quyền.',
      ],
    },
    {
      heading: '5. Lưu trữ và bảo mật',
      body: [
        [
          'Dữ liệu được lưu trên máy chủ của FinBuddy và truyền qua kết nối mã hóa (HTTPS).',
          'Phiên đăng nhập dùng mã truy cập có thời hạn ngắn. Trên điện thoại, mã này được lưu trong vùng lưu trữ bảo mật của hệ điều hành và bị xóa khi bạn đăng xuất.',
          'Mã khôi phục mật khẩu chỉ có hiệu lực trong 5 phút, giới hạn số lần nhập sai và được lưu dưới dạng mã băm.',
          'Chỉ quản trị viên được cấp quyền mới truy cập được hệ thống quản trị.',
        ],
        'Không có hệ thống nào an toàn tuyệt đối. Nếu xảy ra sự cố ảnh hưởng đến dữ liệu của bạn, chúng tôi sẽ thông báo cho bạn và xử lý theo quy định của pháp luật.',
      ],
    },
    {
      heading: '6. Thời gian lưu trữ',
      body: [
        [
          'Dữ liệu tài khoản và dữ liệu tài chính: lưu cho đến khi bạn xóa hoặc yêu cầu xóa tài khoản.',
          'Ảnh hóa đơn không dùng để tạo giao dịch: xóa sau 24 giờ.',
          'Thông báo đã đọc: xóa sau 90 ngày.',
          'Mã khôi phục mật khẩu: hết hiệu lực sau 5 phút.',
        ],
      ],
    },
    {
      heading: '7. Quyền của bạn',
      body: [
        [
          'Xem và chỉnh sửa thông tin cá nhân trong mục Hồ sơ.',
          'Sửa hoặc xóa từng giao dịch, ví, danh mục, ngân sách bất cứ lúc nào.',
          'Bật hoặc tắt từng loại thông báo và email trong phần Cài đặt thông báo.',
          'Không dùng chức năng gợi ý AI nếu bạn không muốn số liệu tổng hợp được gửi đến dịch vụ AI.',
          `Yêu cầu xóa tài khoản cùng toàn bộ dữ liệu, rút lại sự đồng ý hoặc khiếu nại về việc xử lý dữ liệu bằng cách liên hệ ${CONTACT_EMAIL}.`,
        ],
      ],
    },
    {
      heading: '8. Thay đổi chính sách',
      body: [
        'Khi chính sách này thay đổi, chúng tôi sẽ cập nhật ngày ở đầu văn bản và thông báo trong ứng dụng nếu thay đổi ảnh hưởng đến cách xử lý dữ liệu của bạn.',
      ],
    },
    {
      heading: '9. Liên hệ',
      body: [`Mọi câu hỏi về quyền riêng tư vui lòng gửi về ${CONTACT_EMAIL}.`],
    },
  ],
};

/** Khóa trên đường dẫn: /legal/terms, /legal/privacy */
export const LEGAL_DOCUMENTS = {
  terms: TERMS_OF_USE,
  privacy: PRIVACY_POLICY,
} satisfies Record<string, LegalDocument>;

export type LegalDocumentKey = keyof typeof LEGAL_DOCUMENTS;
