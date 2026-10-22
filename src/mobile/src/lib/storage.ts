import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// SecureStore không hỗ trợ web, nên trên web dùng localStorage (chỉ phục vụ chạy thử)
const isWeb = Platform.OS === 'web';

const getItem = async (key: string) =>
  isWeb ? localStorage.getItem(key) : SecureStore.getItemAsync(key);

const setItem = async (key: string, value: string) =>
  isWeb ? localStorage.setItem(key, value) : SecureStore.setItemAsync(key, value);

const removeItem = async (key: string) =>
  isWeb ? localStorage.removeItem(key) : SecureStore.deleteItemAsync(key);

export const getToken = () => getItem(TOKEN_KEY);
export const setToken = (token: string) => setItem(TOKEN_KEY, token);
export const clearToken = () => removeItem(TOKEN_KEY);

export const getRefreshToken = () => getItem(REFRESH_TOKEN_KEY);
export const setRefreshToken = (token: string) => setItem(REFRESH_TOKEN_KEY, token);
export const clearRefreshToken = () => removeItem(REFRESH_TOKEN_KEY);
