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

// Ảnh đại diện chỉ lưu trên máy (server chưa có chỗ chứa ảnh), tách theo từng tài khoản
const avatarKey = (userId: number) => `avatar_uri_${userId}`;
export const getAvatarUri = (userId: number) => getItem(avatarKey(userId));
export const setAvatarUri = (userId: number, uri: string | null) =>
  uri ? setItem(avatarKey(userId), uri) : removeItem(avatarKey(userId));

export const getRefreshToken = () => getItem(REFRESH_TOKEN_KEY);
export const setRefreshToken = (token: string) => setItem(REFRESH_TOKEN_KEY, token);
export const clearRefreshToken = () => removeItem(REFRESH_TOKEN_KEY);
