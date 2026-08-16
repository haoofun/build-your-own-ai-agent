// 迷你购物车：把每件商品的单价乘数量，再合计。
export function cartTotal(items) {
  if (!items) return 0

  return items
    .map((item) => item.price * item.qty)
    .reduce((sum, value) => sum + value)
}
