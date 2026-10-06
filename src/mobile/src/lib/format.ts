export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

export const formatDate = (date: Date | string) =>
  new Intl.DateTimeFormat('vi-VN').format(new Date(date));
