import { Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { CategorySlice } from '@/features/reports/aggregate';
import { useColors } from '@/theme';

type Props = {
  slices: CategorySlice[];
  /** key phần đang chọn; các phần khác mờ đi */
  selected: string | null;
  onSelect: (key: string) => void;
  size?: number;
  thickness?: number;
};

/** Khe hở giữa các phần, đúng màu nền thẻ (không vẽ viền) */
const GAP_PX = 2;

/** Biểu đồ vòng: mỗi phần là một cung của đường tròn có nét dày, vẽ theo chiều kim đồng hồ từ 12 giờ */
export function DonutChart({ slices, selected, onSelect, size = 132, thickness = 22 }: Props) {
  const colors = useColors();
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.amount, 0);

  if (total === 0) {
    return (
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.disabled} strokeWidth={thickness} fill="none" />
      </Svg>
    );
  }

  const gap = slices.length > 1 ? GAP_PX : 0;
  let offset = 0;

  return (
    <Svg width={size} height={size} accessibilityRole="image">
      {slices.map((s) => {
        const length = (s.amount / total) * circumference;
        const visible = Math.max(length - gap, 0.5);
        const dashOffset = -offset;
        offset += length;
        const dimmed = selected !== null && selected !== s.key;
        return (
          <Circle
            key={s.key}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeDasharray={`${visible} ${circumference}`}
            strokeDashoffset={dashOffset}
            opacity={dimmed ? 0.3 : 1}
            // Bắt đầu từ 12 giờ
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            // Trên web, onPress của react-native-svg làm lộ prop lạ xuống DOM (báo lỗi),
            // nên web chỉ chọn qua danh sách chú thích bên dưới
            {...(Platform.OS !== 'web' && { onPress: () => onSelect(s.key) })}
          />
        );
      })}
    </Svg>
  );
}
