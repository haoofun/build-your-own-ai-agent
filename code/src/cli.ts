import readline from 'node:readline/promises'

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5'
const API_KEY = process.env.ANTHROPIC_API_KEY

async function callModel(userInput: string) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: userInput }],
    }),
  })
  if (!res.ok) {
    throw new Error(`API return ${res.status}：${await res.text()}`)
  }
  return res.json()
}

if (!API_KEY) {
  console.error('Please set your ANTHROPIC_API_KEY')
  process.exit(1)
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})
console.log(`model:${MODEL}(input /exit to exit)`)

while (true) {
  const line = (await rl.question('you> ')).trim()
  if (line === '/exit') break
  if (line === '') continue

  const data = await callModel(line)
  const text = data.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('')
  console.log(`claude> ${text}`)
  console.log(`  · ${data.usage.input_tokens} in / ${data.usage.output_tokens} out · ${data.stop_reason}`)
}

rl.close()