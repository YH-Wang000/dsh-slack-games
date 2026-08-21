// 通用：列出/下载 moyu 仓任意游戏目录到临时区
// 用法: node _fetch-moyu.mjs <游戏目录名> [目标目录]
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dirName = process.argv[2]
const OUT = process.argv[3] || 'E:/workspace/other/dsh-workspace/_tmp/' + dirName
if (!dirName) { console.log('用法: node _fetch-moyu.mjs <游戏目录名> [目标目录]'); process.exit(1) }
const DIR = encodeURIComponent(dirName)
const BASE = 'https://raw.githubusercontent.com/wanghao221/moyu/main'
const files = ['index.html']

async function listSub(sub) {
  const url = `https://api.github.com/repos/wanghao221/moyu/contents/${DIR}/${sub}`
  const res = await fetch(url)
  const j = await res.json()
  if (Array.isArray(j)) for (const f of j) files.push(`${sub}/${f.name}`)
}

// 递归列出子目录（一层）
for (const sub of ['css', 'js', 'img', 'images', 'assets', 'lib']) {
  try { await listSub(sub) } catch (e) { /* 没有该子目录 */ }
}

mkdirSync(OUT, { recursive: true })
for (const f of files) {
  const url = `${BASE}/${DIR}/${encodeURIComponent(f).replace(/%2F/g, '/')}`
  const res = await fetch(url)
  if (!res.ok) { console.log('SKIP', f, res.status); continue }
  const text = await res.text()
  const parts = f.split('/')
  if (parts.length > 1) mkdirSync(join(OUT, parts[0]), { recursive: true })
  writeFileSync(join(OUT, f), text, 'utf8')
  console.log('OK ', f, `(${text.length}B)`)
}
console.log('done ->', OUT)
