// 这个文件是规格说明：请修改 src/ 下的实现，不要改这里的断言。
import test from 'node:test'
import assert from 'node:assert/strict'

import { cartTotal } from '../src/cart.js'
import { formatPrice } from '../src/format.js'

test('多件商品合计', () => {
  const items = [
    { name: '键盘', price: 299, qty: 1 },
    { name: '鼠标', price: 99, qty: 2 },
  ]

  assert.equal(cartTotal(items), 497)
})

test('空购物车合计为 0', () => {
  assert.equal(cartTotal([]), 0)
})

test('价格格式化保留两位小数', () => {
  assert.equal(formatPrice(1234.5), '¥1234.50')
})
