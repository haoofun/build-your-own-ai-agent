import { runAgent } from "./agent-sdk.ts";

// import { runAgent } from "./agent-fetch.ts";
import { isAbortError, tools } from "./tools.ts";


const controller = new AbortController();

process.on("SIGINT", () => {
  controller.abort();
});

const content: string = process.argv[2]

try {
    const result = await runAgent({
        messages: [
            {
            role: "user",
            content: content,
            },
        ],
        tools,
        signal: controller.signal,
    });
    console.dir(result.messages, { depth: null })
    console.log(result.agentStopReason);
    console.log(result.usage);
} catch (error) {
    if (isAbortError(error)) {
        process.exit(130)
    }
    process.exit(1)
}

/**
 * 
 * 提示词与验证结果如下：
➜  spike git:(spike) ✗ npx tsx --env-file=.env cli.ts '查看文件夹 /Users/lixianzhe/work/build-your-own-ai-agent/spike/victim 下的所有文件，你可以跑 npm test 看看哪些部分有问题，读代码，将其修复，修好后再跑 npm test确认全绿'
[
  {
    role: 'user',
    content: '查看文件夹 /Users/lixianzhe/work/build-your-own-ai-agent/spike/victim 下的所有文件，你可以跑 npm test 看看哪些部分有问题，读代码，将其修复，修好后再跑 npm test确认全绿'
  },
  {
    role: 'assistant',
    content: [
      { type: 'text', text: '我来帮你检查这个文件夹下的文件，然后运行测试看看有什么问题。' },
      {
        type: 'tool_use',
        id: 'toolu_017QRDARYiUEqXdSZ8zfaqxB',
        name: 'bash',
        input: {
          command: 'ls -la /Users/lixianzhe/work/build-your-own-ai-agent/spike/victim'
        },
        caller: { type: 'direct' }
      }
    ]
  },
  {
    role: 'user',
    content: [
      {
        tool_use_id: 'toolu_017QRDARYiUEqXdSZ8zfaqxB',
        type: 'tool_result',
        content: 'exit code: 0\n' +
          '\n' +
          'stdout:\n' +
          'total 16\n' +
          'drwxr-xr-x@  6 lixianzhe  staff  192 Jun 12 11:44 .\n' +
          'drwxr-xr-x@ 15 lixianzhe  staff  480 Jun 13 14:50 ..\n' +
          '-rw-r--r--@  1 lixianzhe  staff  216 Jun 12 11:44 README.md\n' +
          '-rw-r--r--@  1 lixianzhe  staff  113 Jun 12 11:44 package.json\n' +
          'drwxr-xr-x@  3 lixianzhe  staff   96 Jun 13 15:16 src\n' +
          'drwxr-xr-x@  3 lixianzhe  staff   96 Jun 12 11:44 test\n' +
          '\n' +
          '\n' +
          'stderr:\n' +
          '(无输出)'
      }
    ]
  },
  {
    role: 'assistant',
    content: [
      { type: 'text', text: '现在我来查看目录结构和各个文件的内容：' },
      {
        type: 'tool_use',
        id: 'toolu_01RGKfTob4XXcQkA8tYYEyx1',
        name: 'bash',
        input: {
          command: 'find /Users/lixianzhe/work/build-your-own-ai-agent/spike/victim -type f | head -20'
        },
        caller: { type: 'direct' }
      },
      {
        type: 'tool_use',
        id: 'toolu_014ruJ2tb7rDAPK2sjyNwBnj',
        name: 'read_file',
        input: {
          path: '/Users/lixianzhe/work/build-your-own-ai-agent/spike/victim/package.json'
        },
        caller: { type: 'direct' }
      },
      {
        type: 'tool_use',
        id: 'toolu_0127tbE5NS1EA4fQrR7KXTJk',
        name: 'read_file',
        input: {
          path: '/Users/lixianzhe/work/build-your-own-ai-agent/spike/victim/README.md'
        },
        caller: { type: 'direct' }
      }
    ]
  },
  {
    role: 'user',
    content: [
      {
        tool_use_id: 'toolu_01RGKfTob4XXcQkA8tYYEyx1',
        type: 'tool_result',
        content: 'exit code: 0\n' +
          '\n' +
          'stdout:\n' +
          '/Users/lixianzhe/work/build-your-own-ai-agent/spike/victim/test/cart.test.js\n' +
          '/Users/lixianzhe/work/build-your-own-ai-agent/spike/victim/README.md\n' +
          '/Users/lixianzhe/work/build-your-own-ai-agent/spike/victim/package.json\n' +
          '/Users/lixianzhe/work/build-your-own-ai-agent/spike/victim/src/cart.js\n' +
          '\n' +
          '\n' +
          'stderr:\n' +
          '(无输出)'
      },
      {
        tool_use_id: 'toolu_014ruJ2tb7rDAPK2sjyNwBnj',
        type: 'tool_result',
        content: '{\n' +
          '  "name": "victim-cart",\n' +
          '  "private": true,\n' +
          '  "type": "module",\n' +
          '  "scripts": {\n' +
          '    "test": "node --test"\n' +
          '  }\n' +
          '}\n'
      },
      {
        tool_use_id: 'toolu_0127tbE5NS1EA4fQrR7KXTJk',
        type: 'tool_result',
        content: '# victim-cart\n' +
          '\n' +
          '一个年久失修的迷你购物车模块，测试挂了。\n' +
          '\n' +
          '- 跑测试：`npm test`（零依赖，无需 install）\n' +
          '- 规则：测试是规格说明，修 `src/` 里的实现，不要修改 `test/`\n'
      }
    ]
  },
  {
    role: 'assistant',
    content: [
      { type: 'text', text: '现在让我查看源代码和测试文件：' },
      {
        type: 'tool_use',
        id: 'toolu_013bj5WKv5thDmax19tY736w',
        name: 'read_file',
        input: {
          path: '/Users/lixianzhe/work/build-your-own-ai-agent/spike/victim/src/cart.js'
        },
        caller: { type: 'direct' }
      },
      {
        type: 'tool_use',
        id: 'toolu_01PzrkFAMk7GKGpXEL174MZs',
        name: 'read_file',
        input: {
          path: '/Users/lixianzhe/work/build-your-own-ai-agent/spike/victim/test/cart.test.js'
        },
        caller: { type: 'direct' }
      }
    ]
  },
  {
    role: 'user',
    content: [
      {
        tool_use_id: 'toolu_013bj5WKv5thDmax19tY736w',
        type: 'tool_result',
        content: '// 迷你购物车模块\n' +
          'export function cartTotal(items) {\n' +
          '  if (!items) return 0; // 空购物车直接返回 0\n' +
          '  const subtotals = items.map((it) => it.price * it.qty);\n' +
          '  return subtotals.reduce((a, b) => a + b);\n' +
          '}\n' +
          '\n' +
          '// rate 表示减免比例，如 0.25 = 减免 25%\n' +
          'export function applyDiscount(total, rate) {\n' +
          '  return total * rate;\n' +
          '}\n' +
          '\n' +
          'export function formatPrice(amount) {\n' +
          '  return `¥${amount.toFixed(2)}`;\n' +
          '}\n'
      },
      {
        tool_use_id: 'toolu_01PzrkFAMk7GKGpXEL174MZs',
        type: 'tool_result',
        content: '// 本文件是规格说明：修 src/ 里的实现，不要修改测试。\n' +
          'import { test } from "node:test";\n' +
          'import assert from "node:assert/strict";\n' +
          'import { cartTotal, applyDiscount, formatPrice } from "../src/cart.js";\n' +
          '\n' +
          'test("多件商品合计", () => {\n' +
          '  const items = [\n' +
          '    { name: "键盘", price: 299, qty: 1 },\n' +
          '    { name: "鼠标", price: 99, qty: 2 },\n' +
          '  ];\n' +
          '  assert.equal(cartTotal(items), 497);\n' +
          '});\n' +
          '\n' +
          'test("空购物车合计为 0", () => {\n' +
          '  assert.equal(cartTotal([]), 0);\n' +
          '});\n' +
          '\n' +
          'test("减免 25% 后应付 75%", () => {\n' +
          '  assert.equal(applyDiscount(200, 0.25), 150);\n' +
          '});\n' +
          '\n' +
          'test("零折扣不改变总价", () => {\n' +
          '  assert.equal(applyDiscount(88, 0), 88);\n' +
          '});\n' +
          '\n' +
          'test("价格格式化", () => {\n' +
          '  assert.equal(formatPrice(1234.5), "¥1234.50");\n' +
          '});\n'
      }
    ]
  },
  {
    role: 'assistant',
    content: [
      { type: 'text', text: '现在让我运行测试看看具体有什么问题：' },
      {
        type: 'tool_use',
        id: 'toolu_01YWG1whcof9GJBFw52z8sNA',
        name: 'bash',
        input: {
          command: 'cd /Users/lixianzhe/work/build-your-own-ai-agent/spike/victim && npm test'
        },
        caller: { type: 'direct' }
      }
    ]
  },
  {
    role: 'user',
    content: [
      {
        tool_use_id: 'toolu_01YWG1whcof9GJBFw52z8sNA',
        type: 'tool_result',
        content: 'exit code: 1\n' +
          '\n' +
          'stdout:\n' +
          '\n' +
          '> test\n' +
          '> node --test\n' +
          '\n' +
          '✔ 多件商品合计 (0.269042ms)\n' +
          '✖ 空购物车合计为 0 (0.054292ms)\n' +
          '✖ 减免 25% 后应付 75% (0.265ms)\n' +
          '✖ 零折扣不改变总价 (0.065333ms)\n' +
          '✔ 价格格式化 (0.042833ms)\n' +
          'ℹ tests 5\n' +
          'ℹ suites 0\n' +
          'ℹ pass 2\n' +
          'ℹ fail 3\n' +
          'ℹ cancelled 0\n' +
          'ℹ skipped 0\n' +
          'ℹ todo 0\n' +
          'ℹ duration_ms 41.767417\n' +
          '\n' +
          '✖ failing tests:\n' +
          '\n' +
          'test at test/cart.test.js:14:1\n' +
          '✖ 空购物车合计为 0 (0.054292ms)\n' +
          '  TypeError: Reduce of empty array with no initial value\n' +
          '      at Array.reduce (<anonymous>)\n' +
          '      at cartTotal (file:///Users/lixianzhe/work/build-your-own-ai-agent/spike/victim/src/cart.js:5:20)\n' +
          '      at TestContext.<anonymous> (file:///Users/lixianzhe/work/build-your-own-ai-agent/spike/victim/test/cart.test.js:15:16)\n' +
          '      at Test.runInAsyncScope (node:async_hooks:214:14)\n' +
          '      at Test.run (node:internal/test_runner/test:1106:25)\n' +
          '      at Test.processPendingSubtests (node:internal/test_runner/test:788:18)\n' +
          '      at Test.postRun (node:internal/test_runner/test:1235:19)\n' +
          '      at Test.run (node:internal/test_runner/test:1163:12)\n' +
          '      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)\n' +
          '\n' +
          'test at test/cart.test.js:18:1\n' +
          '✖ 减免 25% 后应付 75% (0.265ms)\n' +
          '  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n' +
          '  \n' +
          '  50 !== 150\n' +
          '  \n' +
          '      at TestContext.<anonymous> (file:///Users/lixianzhe/work/build-your-own-ai-agent/spike/victim/test/cart.test.js:19:10)\n' +
          '      at Test.runInAsyncScope (node:async_hooks:214:14)\n' +
          '      at Test.run (node:internal/test_runner/test:1106:25)\n' +
          '      at Test.processPendingSubtests (node:internal/test_runner/test:788:18)\n' +
          '      at Test.postRun (node:internal/test_runner/test:1235:19)\n' +
          '      at Test.run (node:internal/test_runner/test:1163:12)\n' +
          '      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {\n' +
          '    generatedMessage: true,\n' +
          "    code: 'ERR_ASSERTION',\n" +
          '    actual: 50,\n' +
          '    expected: 150,\n' +
          "    operator: 'strictEqual',\n" +
          "    diff: 'simple'\n" +
          '  }\n' +
          '\n' +
          'test at test/cart.test.js:22:1\n' +
          '✖ 零折扣不改变总价 (0.065333ms)\n' +
          '  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n' +
          '  \n' +
          '  0 !== 88\n' +
          '  \n' +
          '      at TestContext.<anonymous> (file:///Users/lixianzhe/work/build-your-own-ai-agent/spike/victim/test/cart.test.js:23:10)\n' +
          '      at Test.runInAsyncScope (node:async_hooks:214:14)\n' +
          '      at Test.run (node:internal/test_runner/test:1106:25)\n' +
          '      at Test.processPendingSubtests (node:internal/test_runner/test:788:18)\n' +
          '      at Test.postRun (node:internal/test_runner/test:1235:19)\n' +
          '      at Test.run (node:internal/test_runner/test:1163:12)\n' +
          '      at async Test.processPendingSubtests (node:internal/test_runner/test:788:7) {\n' +
          '    generatedMessage: true,\n' +
          "    code: 'ERR_ASSERTION',\n" +
          '    actual: 0,\n' +
          '    expected: 88,\n' +
          "    operator: 'strictEqual',\n" +
          "    diff: 'simple'\n" +
          '  }\n' +
          '\n' +
          '\n' +
          'stderr:\n' +
          '(无输出)'
      }
    ]
  },
  {
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: '很好！我发现了3个问题：\n' +
          '\n' +
          '1. **空购物车合计为 0**：当数组为空时，`reduce()` 没有初始值会报错。需要提供初始值 `0`。\n' +
          '\n' +
          '2. **减免 25% 后应付 75%**：`applyDiscount` 的逻辑错了。当 `rate=0.25` 时应该返回 `200 * (1 - 0.25) = 150`，但现在返回的是 `200 * 0.25 = 50`。应该是减去折扣后的价格，而不是折扣本身。\n' +
          '\n' +
          '3. **零折扣不改变总价**：同样的问题，`applyDiscount(88, 0)` 应该返回 `88 * (1 - 0) = 88`，但现在返回 `88 * 0 = 0`。\n' +
          '\n' +
          '现在我来修复这些问题：'
      },
      {
        type: 'tool_use',
        id: 'toolu_01GWKd27q8GLH1ADWSLNXKHy',
        name: 'edit_file',
        input: {
          path: '/Users/lixianzhe/work/build-your-own-ai-agent/spike/victim/src/cart.js',
          oldString: 'export function cartTotal(items) {\n' +
            '  if (!items) return 0; // 空购物车直接返回 0\n' +
            '  const subtotals = items.map((it) => it.price * it.qty);\n' +
            '  return subtotals.reduce((a, b) => a + b);\n' +
            '}',
          newString: 'export function cartTotal(items) {\n' +
            '  if (!items || items.length === 0) return 0; // 空购物车直接返回 0\n' +
            '  const subtotals = items.map((it) => it.price * it.qty);\n' +
            '  return subtotals.reduce((a, b) => a + b, 0);\n' +
            '}'
        },
        caller: { type: 'direct' }
      },
      {
        type: 'tool_use',
        id: 'toolu_01XjKPwTwFNSHWRocwoLxwNf',
        name: 'edit_file',
        input: {
          path: '/Users/lixianzhe/work/build-your-own-ai-agent/spike/victim/src/cart.js',
          oldString: '// rate 表示减免比例，如 0.25 = 减免 25%\n' +
            'export function applyDiscount(total, rate) {\n' +
            '  return total * rate;\n' +
            '}',
          newString: '// rate 表示减免比例，如 0.25 = 减免 25%\n' +
            'export function applyDiscount(total, rate) {\n' +
            '  return total * (1 - rate);\n' +
            '}'
        },
        caller: { type: 'direct' }
      }
    ]
  },
  {
    role: 'user',
    content: [
      {
        tool_use_id: 'toolu_01GWKd27q8GLH1ADWSLNXKHy',
        type: 'tool_result',
        content: '已修改 /Users/lixianzhe/work/build-your-own-ai-agent/spike/victim/src/cart.js'
      },
      {
        tool_use_id: 'toolu_01XjKPwTwFNSHWRocwoLxwNf',
        type: 'tool_result',
        content: '已修改 /Users/lixianzhe/work/build-your-own-ai-agent/spike/victim/src/cart.js'
      }
    ]
  },
  {
    role: 'assistant',
    content: [
      { type: 'text', text: '现在让我查看修改后的代码：' },
      {
        type: 'tool_use',
        id: 'toolu_01TUFAES9dUvGS5UZmSozSFn',
        name: 'read_file',
        input: {
          path: '/Users/lixianzhe/work/build-your-own-ai-agent/spike/victim/src/cart.js'
        },
        caller: { type: 'direct' }
      }
    ]
  },
  {
    role: 'user',
    content: [
      {
        tool_use_id: 'toolu_01TUFAES9dUvGS5UZmSozSFn',
        type: 'tool_result',
        content: '// 迷你购物车模块\n' +
          'export function cartTotal(items) {\n' +
          '  if (!items || items.length === 0) return 0; // 空购物车直接返回 0\n' +
          '  const subtotals = items.map((it) => it.price * it.qty);\n' +
          '  return subtotals.reduce((a, b) => a + b, 0);\n' +
          '}\n' +
          '\n' +
          '// rate 表示减免比例，如 0.25 = 减免 25%\n' +
          'export function applyDiscount(total, rate) {\n' +
          '  return total * (1 - rate);\n' +
          '}\n' +
          '\n' +
          'export function formatPrice(amount) {\n' +
          '  return `¥${amount.toFixed(2)}`;\n' +
          '}\n'
      }
    ]
  },
  {
    role: 'assistant',
    content: [
      { type: 'text', text: '完美！现在让我运行测试来确认所有问题都已解决：' },
      {
        type: 'tool_use',
        id: 'toolu_01X5VhUEzW6CSpXkh2mEUEEn',
        name: 'bash',
        input: {
          command: 'cd /Users/lixianzhe/work/build-your-own-ai-agent/spike/victim && npm test'
        },
        caller: { type: 'direct' }
      }
    ]
  },
  {
    role: 'user',
    content: [
      {
        tool_use_id: 'toolu_01X5VhUEzW6CSpXkh2mEUEEn',
        type: 'tool_result',
        content: 'exit code: 0\n' +
          '\n' +
          'stdout:\n' +
          '\n' +
          '> test\n' +
          '> node --test\n' +
          '\n' +
          '✔ 多件商品合计 (0.288583ms)\n' +
          '✔ 空购物车合计为 0 (0.038667ms)\n' +
          '✔ 减免 25% 后应付 75% (0.037625ms)\n' +
          '✔ 零折扣不改变总价 (0.032291ms)\n' +
          '✔ 价格格式化 (0.040791ms)\n' +
          'ℹ tests 5\n' +
          'ℹ suites 0\n' +
          'ℹ pass 5\n' +
          'ℹ fail 0\n' +
          'ℹ cancelled 0\n' +
          'ℹ skipped 0\n' +
          'ℹ todo 0\n' +
          'ℹ duration_ms 36.382084\n' +
          '\n' +
          '\n' +
          'stderr:\n' +
          '(无输出)'
      }
    ]
  },
  {
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: '🎉 **完美！所有测试都通过了！** \n' +
          '\n' +
          '## 修复总结\n' +
          '\n' +
          '我找到并修复了源代码 `src/cart.js` 中的3个问题：\n' +
          '\n' +
          '### 问题 1：空购物车处理失败\n' +
          '**原因**：当 `items` 为空数组时，`reduce()` 没有初始值导致报错\n' +
          '```javascript\n' +
          '// ❌ 错误\n' +
          'return subtotals.reduce((a, b) => a + b);\n' +
          '\n' +
          '// ✅ 修复\n' +
          'return subtotals.reduce((a, b) => a + b, 0);\n' +
          '```\n' +
          '同时也加强了空检查：从 `if (!items)` 改为 `if (!items || items.length === 0)`\n' +
          '\n' +
          '### 问题 2：打折逻辑错误\n' +
          '**原因**：`rate` 表示减免比例，应该是 `总额 × (1 - 折扣率)`，但原代码直接乘以折扣率\n' +
          '```javascript\n' +
          '// ❌ 错误：applyDiscount(200, 0.25) = 50\n' +
          'return total * rate;\n' +
          '\n' +
          '// ✅ 修复：applyDiscount(200, 0.25) = 150\n' +
          'return total * (1 - rate);\n' +
          '```\n' +
          '\n' +
          '### 问题 3：零折扣处理\n' +
          '**自动修复**：通过修复 `applyDiscount` 逻辑，零折扣（rate=0）现在也能正确处理：`total * (1 - 0) = total`\n' +
          '\n' +
          '**测试结果**：✅ 5个测试全部通过，0个失败！'
      }
    ]
  }
]
end_turn
{ inputTokens: 25152, outputTokens: 1947 }
 * 
 * 
 */