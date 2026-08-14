import readline from 'node:readline/promises'
import type { MessageParam } from './types.js'
import { runAgent } from './agent.js'

const MODEL = 'claude-haiku-4-5'

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Please set your ANTHROPIC_API_KEY')
  process.exit(1)
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})
console.log(`model: ${MODEL} (input /exit to exit)`)

const messages: MessageParam[] = []

while (true) {
  const line = (await rl.question('you> ')).trim()
  if (line === '/exit') break
  if (line === '') continue

  messages.push({
    role: 'user',
    content: line,
  })

  await runAgent(messages)
}

rl.close()
