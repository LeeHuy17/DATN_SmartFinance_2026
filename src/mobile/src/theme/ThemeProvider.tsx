import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Appearance, StyleSheet } from 'react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import { getThemePreference, setThemePreference } from '@/lib/storage';
import { darkColors, lightColors, type Colors } from './colors';

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

type ThemeValue = {
  colors: Colors;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeValue>({ colors: lightColors, isDark: false, toggleTheme: () => {} });

/** Giao diện sáng / tối do người dùng chọn (mặc định sáng), lưu lại cho lần mở sau */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Đọc đồng bộ để lần vẽ đầu tiên đã đúng màu, không chớp sáng rồi mới chuyển tối
  const [isDark, setIsDark] = useState(() => getThemePreference() === 'dark');

  // Đồng bộ phần do hệ điều hành vẽ (bàn phím, hộp thoại, bộ chọn ngày) với lựa chọn trong app
  useEffect(() => {
    // react-native-web không có setColorScheme
    Appearance.setColorScheme?.(isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      setThemePreference(prev ? 'light' : 'dark').catch(() => {});
      return !prev;
    });
  }, []);

  const value = useMemo(
    () => ({ colors: isDark ? darkColors : lightColors, isDark, toggleTheme }),
    [isDark, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

export const useColors = () => useContext(ThemeContext).colors;

/**
 * Tạo hook styles theo bảng màu hiện tại. Mỗi bảng màu chỉ dựng StyleSheet một lần.
 *   const useStyles = makeStyles((colors) => ({ title: { color: colors.text } }));
 *   const styles = useStyles(); // trong component
 */
export function makeStyles<T extends NamedStyles>(factory: (colors: Colors) => T & NamedStyles) {
  const cache = new Map<Colors, Readonly<T>>();
  return () => {
    const colors = useColors();
    let styles = cache.get(colors);
    if (!styles) {
      styles = StyleSheet.create(factory(colors));
      cache.set(colors, styles);
    }
    return styles;
  };
}
