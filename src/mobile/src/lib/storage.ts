import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'access_token';

// SecureStore không hỗ trợ web, nên trên web dùng localStorage (chỉ phục vụ chạy thử)
const isWeb = Platform.OS === 'web';

export const getToken = async () =>
  isWeb ? localStorage.getItem(TOKEN_KEY) : SecureStore.getItemAsync(TOKEN_KEY);

export const setToken = async (token: string) =>
  isWeb ? localStorage.setItem(TOKEN_KEY, token) : SecureStore.setItemAsync(TOKEN_KEY, token);

export const clearToken = async () =>
  isWeb ? localStorage.removeItem(TOKEN_KEY) : SecureStore.deleteItemAsync(TOKEN_KEY);
