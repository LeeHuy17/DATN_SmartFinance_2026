import Constants from 'expo-constants';

/** Lấy từ "version" trong app.json để chỉ phải sửa một chỗ */
export const APP_VERSION = `v${Constants.expoConfig?.version ?? '1.0.0'}`;
