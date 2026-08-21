// 递归下载 moyu 仓任意目录（保留子目录结构）
// 用法: node _fetch-recursive.mjs <游戏目录名> [目标目录]
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dirName = process.argv[2]
const OUT = process.argv[3] || 'E:/workspace/other/dsh-workspace/_tmp/' + dirName
if (!dirName) { console.log('用法: node _fetch-recursive.mjs <目录名> [目标]'); process.exit(1) }
const DIR = encodeURIComponent(dirName)
const RAW = 'https://raw.githubusercontent.com/wanghao221/moyu/main/'

async function walk(apiPath, relPath) {
  const url = `https://api.github.com/repos/wanghao221/moyu/contents/${DIR}${apiPath}`
  const res = await fetch(url)
  if (!res.ok) { console.log('API FAIL', apiPath, res.status); return }
  const j = await res.json()
  if (!Array.isArray(j)) return
  for (const e of j) {
    if (e.type === 'dir') {
      await walk(`${apiPath}/${encodeURIComponent(e.name)}`, `${relPath}/${e.name}`)
    } else {
      const rawUrl = `${RAW}${DIR}${apiPath}/${encodeURIComponent(e.name)}`
      const r = await fetch(rawUrl)
      if (!r.ok) { console.log('DL FAIL', relPath + '/' + e.name, r.status); continue }
      const buf = Buffer.from(await r.arrayBuffer())
      const dir = join(OUT, relPath)
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, e.name), buf)
      console.log('OK ', (relPath + '/' + e.name).slice(1), `(${buf.length}B)`)
    }
  }
}

await walk('', '')
console.log('done ->', OUT)
