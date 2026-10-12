import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BottomSheet } from '@/components/BottomSheet';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radius, spacing } from '@/theme';

type Props = {
  visible: boolean;
  /** YYYY-MM-DD */
  value: string | null;
  onClose: () => void;
  onSelect: (value: string) => void;
};

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MIN_YEAR = 1940;
/** Năm mặc định khi chưa có ngày sinh */
const DEFAULT_YEAR = 2000;

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** Bảng chọn ngày sinh: lịch theo tháng; chạm tiêu đề tháng để chọn nhanh năm */
export function BirthDateSheet({ visible, value, onClose, onSelect }: Props) {
  const today = new Date();
  const initial = value ? new Date(`${value}T00:00:00`) : new Date(DEFAULT_YEAR, 0, 1);
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());
  const [picked, setPicked] = useState<string | null>(value);
  const [pickingYear, setPickingYear] = useState(false);

  // Mở lại bảng thì quay về ngày đang lưu
  useEffect(() => {
    if (!visible) return;
    setYear(initial.getFullYear());
    setMonth(initial.getMonth());
    setPicked(value);
    setPickingYear(false);
    // Chỉ chạy khi mở bảng
  }, [visible]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7; // Thứ Hai đứng đầu tuần
    const days = new Date(year, month + 1, 0).getDate();
    return [...Array<null>(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [year, month]);

  const isFuture = (d: number) => new Date(year, month, d) > today;
  const atLatestMonth = year === today.getFullYear() && month === today.getMonth();

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const years = useMemo(
    () => Array.from({ length: today.getFullYear() - MIN_YEAR + 1 }, (_, i) => today.getFullYear() - i),
    [],
  );

  return (
    <BottomSheet
      visible={visible}
      title="Chọn ngày sinh"
      onClose={onClose}
      footer={
        <>
          <Pressable style={styles.cancel} onPress={onClose} accessibilityRole="button">
            <Text style={styles.cancelText}>Hủy</Text>
          </Pressable>
          <PrimaryButton
            title="Chọn"
            onPress={() => picked && onSelect(picked)}
            disabled={!picked}
            style={styles.flex}
          />
        </>
      }
    >
      <View style={styles.nav}>
        <Pressable
          onPress={() => shiftMonth(-1)}
          disabled={pickingYear || (year === MIN_YEAR && month === 0)}
          hitSlop={10}
          style={pickingYear && styles.hidden}
          accessibilityRole="button"
          accessibilityLabel="Tháng trước"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Pressable
          style={styles.navTitle}
          onPress={() => setPickingYear((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={`Tháng ${month + 1}, ${year}. Chạm để chọn năm`}
        >
          <Text style={styles.navText}>
            Tháng {month + 1}, {year}
          </Text>
          <Ionicons name={pickingYear ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
        </Pressable>
        <Pressable
          onPress={() => shiftMonth(1)}
          disabled={pickingYear || atLatestMonth}
          hitSlop={10}
          style={(pickingYear || atLatestMonth) && styles.hidden}
          accessibilityRole="button"
          accessibilityLabel="Tháng sau"
        >
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      </View>

      {pickingYear ? (
        <View style={styles.years}>
          {years.map((y) => (
            <Pressable
              key={y}
              style={[styles.year, y === year && styles.selected]}
              onPress={() => {
                setYear(y);
                // Năm hiện tại: không cho dừng ở tháng tương lai
                if (y === today.getFullYear() && month > today.getMonth()) setMonth(today.getMonth());
                setPickingYear(false);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: y === year }}
            >
              <Text style={[styles.dayText, y === year && styles.selectedText]}>{y}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <>
          <View style={styles.grid}>
            {WEEKDAYS.map((w) => (
              <View key={w} style={styles.cell}>
                <Text style={styles.weekday}>{w}</Text>
              </View>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((d, i) => {
              if (d === null) return <View key={`e${i}`} style={styles.cell} />;
              const iso = toIso(year, month, d);
              const selected = iso === picked;
              const disabled = isFuture(d);
              return (
                <View key={iso} style={styles.cell}>
                  <Pressable
                    style={[styles.day, selected && styles.selected]}
                    onPress={() => setPicked(iso)}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled }}
                    accessibilityLabel={`${d} tháng ${month + 1} năm ${year}`}
                  >
                    <Text style={[styles.dayText, disabled && styles.disabledText, selected && styles.selectedText]}>
                      {d}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </>
      )}
    </BottomSheet>
  );
}

const DAY = 38;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  navTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.xs },
  navText: { fontSize: 16, fontWeight: '700', color: colors.text },
  hidden: { opacity: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 2 },
  weekday: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  day: { width: DAY, height: DAY, borderRadius: DAY / 2, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 15, color: colors.text },
  disabledText: { color: colors.border },
  selected: { backgroundColor: colors.primary },
  selectedText: { fontWeight: '700', color: colors.onPrimary },
  years: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  year: {
    width: '23%',
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 16, fontWeight: '700', color: colors.text },
});
