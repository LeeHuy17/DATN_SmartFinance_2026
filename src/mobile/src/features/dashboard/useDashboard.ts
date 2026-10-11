import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getDashboard } from './dashboardApi';
import type { DashboardData } from './types';

/**
 * Tải dữ liệu tổng quan; refresh() dùng cho kéo để làm mới, retry() cho nút thử lại,
 * reload() tải lại không hiện khung chờ (sau khi xóa giao dịch, khi quay lại màn hình)
 */
export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const loaded = useRef(false);

  const load = useCallback(async (mode: 'initial' | 'refresh' | 'silent') => {
    if (mode === 'refresh') setRefreshing(true);
    if (mode === 'initial') setLoading(true);
    setError(false);
    try {
      setData(await getDashboard());
      loaded.current = true;
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Lần đầu hiện khung chờ; các lần quay lại màn hình sau đó tải lại âm thầm
  useFocusEffect(
    useCallback(() => {
      load(loaded.current ? 'silent' : 'initial');
    }, [load]),
  );

  return {
    data,
    loading,
    refreshing,
    error,
    refresh: () => load('refresh'),
    retry: () => load('initial'),
    reload: () => load('silent'),
  };
}
