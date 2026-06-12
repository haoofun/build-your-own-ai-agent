// 迷你购物车模块
export function cartTotal(items) {
  if (!items) return 0; // 空购物车直接返回 0
  const subtotals = items.map((it) => it.price * it.qty);
  return subtotals.reduce((a, b) => a + b);
}

// rate 表示减免比例，如 0.25 = 减免 25%
export function applyDiscount(total, rate) {
  return total * rate;
}

export function formatPrice(amount) {
  return `¥${amount.toFixed(2)}`;
}
