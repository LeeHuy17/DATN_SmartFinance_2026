import { useState } from 'react';
import { useRouter } from 'expo-router';

import { confirm } from '@/lib/confirm';
import { TransactionQuickView } from './components/TransactionQuickView';
import { deleteTransaction } from './transactionsApi';
import type { Transaction } from './types';

/**
 * Dùng chung cho Tổng quan và Lịch sử giao dịch: open(t) để mở khung xem nhanh,
 * đặt `element` vào cây giao diện. onChanged được gọi sau khi xóa để tải lại danh sách.
 */
export function useTransactionQuickView(onChanged: () => void) {
  const router = useRouter();
  const [selected, setSelected] = useState<Transaction | null>(null);

  const close = () => setSelected(null);

  const element = (
    <TransactionQuickView
      transaction={selected}
      onClose={close}
      onEdit={(t) => {
        close();
        // TODO: màn hình Thêm giao dịch đọc id để chuyển sang chế độ sửa
        router.push({ pathname: '/transaction/add', params: { id: t.id } });
      }}
      onDelete={async (t) => {
        const ok = await confirm({
          title: 'Xóa giao dịch',
          message: `Xóa "${t.title}"? Thao tác này không hoàn tác được.`,
          confirmText: 'Xóa',
          destructive: true,
        });
        if (!ok) return;
        await deleteTransaction(t.id);
        close();
        onChanged();
      }}
    />
  );

  return { open: setSelected, element };
}
