import { Redirect } from 'expo-router';

// Tab "Quét" không có màn riêng: nút giữa thanh tab mở thẳng /receipt/scan (toàn màn hình).
// Route này chỉ còn để mở bằng đường dẫn /scan thì vẫn tới màn quét.
export default function ScanTab() {
  return <Redirect href="/receipt/scan" />;
}
