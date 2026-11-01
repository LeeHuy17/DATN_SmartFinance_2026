import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const THEME_KEY = 'theme';

// SecureStore không hỗ trợ web, nên trên web dùng localStorage (chỉ phục vụ chạy thử)
const isWeb = Platform.OS === 'web';

const getItem = async (key: string) =>
  isWeb ? localStorage.getItem(key) : SecureStore.getItemAsync(key);

const setItem = async (key: string, value: string) =>
  isWeb ? localStorage.setItem(key, value) : SecureStore.setItemAsync(key, value);

const removeItem = async (key: string) =>
  isWeb ? localStorage.removeItem(key) : SecureStore.deleteItemAsync(key);

export type ThemePreference = 'light' | 'dark';

/** Đọc đồng bộ: cần có ngay lúc dựng giao diện lần đầu */
export const getThemePreference = (): ThemePreference | null => {
  const value = isWeb ? localStorage.getItem(THEME_KEY) : SecureStore.getItem(THEME_KEY);
  return value === 'light' || value === 'dark' ? value : null;
};
export const setThemePreference = (value: ThemePreference) => setItem(THEME_KEY, value);

export const getToken = () => getItem(TOKEN_KEY);
export const setToken = (token: string) => setItem(TOKEN_KEY, token);
export const clearToken = () => removeItem(TOKEN_KEY);

export const getRefreshToken = () => getItem(REFRESH_TOKEN_KEY);
export const setRefreshToken = (token: string) => setItem(REFRESH_TOKEN_KEY, token);
export const clearRefreshToken = () => removeItem(REFRESH_TOKEN_KEY);
