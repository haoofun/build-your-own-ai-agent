// 本文件是规格说明：修 src/ 里的实现，不要修改测试。
import { test } from "node:test";
import assert from "node:assert/strict";
import { cartTotal, applyDiscount, formatPrice } from "../src/cart.js";

test("多件商品合计", () => {
  const items = [
    { name: "键盘", price: 299, qty: 1 },
    { name: "鼠标", price: 99, qty: 2 },
  ];
  assert.equal(cartTotal(items), 497);
});

test("空购物车合计为 0", () => {
  assert.equal(cartTotal([]), 0);
});

test("减免 25% 后应付 75%", () => {
  assert.equal(applyDiscount(200, 0.25), 150);
});

test("零折扣不改变总价", () => {
  assert.equal(applyDiscount(88, 0), 88);
});

test("价格格式化", () => {
  assert.equal(formatPrice(1234.5), "¥1234.50");
});
