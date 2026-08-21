// 构建 盖塔楼（moyu 游戏-8）：three.js + GSAP 的实时 3D 叠塔
// 暂停策略：冻结 rAF 渲染循环 + TweenMax.pauseAll()
// 用法: node tools/build-tower.mjs [源目录]
// 源目录需含: index.html, css/style.css, js/script.js, js/three.min.js, js/tweenmax.min.js
// 输出: games/tower/
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = process.argv[2] || 'E:/workspace/other/dsh-workspace/_tmp/moyu-tower2'
const OUT = join(ROOT, 'games', 'tower')

function fail(msg) { console.error('✗', msg); process.exit(1) }
function load(rel) {
  const p = join(SRC, rel)
  if (!existsSync(p)) fail('缺少源文件 ' + rel)
  return readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
}

// ---------- 协议接线（冻结 rAF + TweenMax.pauseAll）----------
const SCRIPTS = `\t<script src="js/three.min.js"></script>
\t<script src="js/tweenmax.min.js"></script>
\t<script src="js/script.js"></script>
`
const PROTOCOL = `\t<script>
// ---- 摸鱼协议接线（实时 3D 叠塔：冻结 rAF + TweenMax.pauseAll）----
var protocolPaused = false
function post(msg) { if (window.parent) { try { window.parent.postMessage(msg, '*') } catch (e) {} } }
function postReady() { post({ type: 'slack:ready', payload: { title: '盖塔楼', version: 1 } }) }
function serializeState() {
  return { score: game.blocks.length - 1, ended: game.state === 'ended', state: game.state }
}
function postState() {
  var state = null
  try { state = serializeState() } catch (e) {}
  post({ type: 'slack:state', payload: { status: protocolPaused ? 'paused' : 'playing', state: state } })
}
function onInit(restore) {
  // 塔楼无法还原中间状态：有进度时直接重新开局
  if (restore && restore.score > 0 && game.state !== 'ended') game.restartGame()
  protocolPaused = false
  game.paused = false
  if (window.TweenMax) TweenMax.resumeAll()
  postReady()
  postState()
}
function onPause() { protocolPaused = true; game.paused = true; if (window.TweenMax) TweenMax.pauseAll(); postState() }
function onResume() { protocolPaused = false; game.paused = false; if (window.TweenMax) TweenMax.resumeAll(); postState() }
function onDestroy() { game.paused = true; if (window.TweenMax) TweenMax.pauseAll() }
window.addEventListener('message', function (e) {
  var d = e.data
  if (!d || typeof d !== 'object') return
  if (d.type === 'slack:init') onInit(d.payload && d.payload.restore)
  else if (d.type === 'slack:pause') onPause()
  else if (d.type === 'slack:resume') onResume()
  else if (d.type === 'slack:destroy') onDestroy()
})
// Alt+M 转发：父面板快捷键在 iframe 获得焦点时收不到，需游戏转发
window.addEventListener('keydown', function (e) {
  if ((e.altKey || e.metaKey) && (e.key === 'm' || e.key === 'M')) {
    e.preventDefault()
    post({ type: 'slack:key', payload: { key: 'alt-m' } })
  }
})
</script>`

// ---------- index.html ----------
let html = load('index.html')
html = html.replace(/[\t ]*<link rel="icon"[^\n]*\n/, '')
html = html.replace(/[\t ]*<meta name="(author|copyright)"[^\n]*\n/g, '')
html = html.replace(/[\t ]*<!-- <script src="https:\/\/codepen[^\n]*\n/, '')
html = html.replace(/[\t ]*<script>\s*\n\s*var _hmt[\s\S]*?<\/script>\n/, '')
html = html.replace(
  /[\t ]*<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r83\/three\.min\.js"><\/script>\n/,
  ''
)
html = html.replace(
  /[\t ]*<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/gsap\/latest\/TweenMax\.min\.js"><\/script>\n/,
  ''
)
html = html.replace(/[\t ]*<script src="js\/script\.js"><\/script>\n/, '')
// 统一在 </body> 前按序加载：three → tweenmax → 游戏 → 协议接线
html = html.replace('</body>', SCRIPTS + PROTOCOL + '\n</body>')
for (const bad of ['haiyong', 'hm.baidu', '_hmt', 'cdnjs', 'codepen', 'googleapis', 'http://', 'https://']) {
  if (html.includes(bad)) fail('index.html 仍含外部引用: ' + bad)
}
if (!html.includes('slack:init')) fail('index.html 协议接线未注入')

// ---------- css ----------
let css = load('css/style.css')
css = css.replace(/@import url\("https:\/\/fonts\.googleapis\.com\/css\?family=Comfortaa"\);\n?/, '')
if (/https?:\/\//.test(css)) fail('style.css 仍含外部引用')
if (!css.includes('font-family')) fail('style.css 变换异常')

// ---------- js/script.js ----------
let js = load('js/script.js')

// 1. 移除右下角 twitter 角标 IIFE
const iifeIdx = js.indexOf(';(function(){')
if (iifeIdx < 0) fail('未找到 twitter 角标 IIFE')
js = js.slice(0, js.lastIndexOf('\n', iifeIdx)).trimEnd() + '\n'
if (js.includes('twitter') || js.includes('steeevg')) fail('script.js 仍含 twitter 角标')

// 2. Game 构造器加 paused 标志
js = js.replace(
  /(\n)(\s*)this\.state = this\.STATES\.LOADING;/,
  '$1$2this.state = this.STATES.LOADING;$1$2this.paused = false;'
)
if (!js.includes('this.paused = false')) fail('paused 标志未注入')

// 3. tick() 冻结 rAF 循环
js = js.replace(
  /(\n)(\s*)tick\(\) \{\n(\s*)this\.blocks\[this\.blocks\.length - 1\]\.tick\(\);\n(\s*)this\.stage\.render\(\);\n(\s*)requestAnimationFrame\(\(\) => \{ this\.tick\(\); \}\);\n(\s*)\}/,
  (m, nl, ind) => {
    return nl + ind + 'tick() {\n' +
      ind + '    if (this.paused) {\n' +
      ind + '        requestAnimationFrame(() => { this.tick(); });\n' +
      ind + '        return;\n' +
      ind + '    }\n' +
      ind + '    this.blocks[this.blocks.length - 1].tick();\n' +
      ind + '    this.stage.render();\n' +
      ind + '    requestAnimationFrame(() => { this.tick(); });\n' +
      ind + '}'
  }
)
if (!js.includes('if (this.paused)')) fail('tick() 冻结逻辑未注入')

// 4. 每次落子（得分变化）推一次 state
js = js.replace(
  /(this\.scoreContainer\.innerHTML = String\(this\.blocks\.length - 1\);)/,
  '$1\n\t\t        if (typeof postState === "function") postState();'
)
if (js.indexOf('typeof postState') < 0) fail('落子推 state 钩子未注入')

// 5. 游戏结束时推一次 state
js = js.replace(
  /(this\.updateState\(this\.STATES\.ENDED\);\n)/,
  '$1\t\t        if (typeof postState === "function") postState();\n'
)

// 语法检查
try { new Function(js) } catch (e) { fail('script.js 语法错误: ' + e.message) }
if (/https?:\/\//.test(js)) fail('script.js 仍含外部 URL')

// ---------- 写输出 ----------
mkdirSync(join(OUT, 'css'), { recursive: true })
mkdirSync(join(OUT, 'js'), { recursive: true })
writeFileSync(join(OUT, 'index.html'), html)
writeFileSync(join(OUT, 'css', 'style.css'), css)
writeFileSync(join(OUT, 'js', 'script.js'), js)
copyFileSync(join(SRC, 'js', 'three.min.js'), join(OUT, 'js', 'three.min.js'))
copyFileSync(join(SRC, 'js', 'tweenmax.min.js'), join(OUT, 'js', 'tweenmax.min.js'))
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({
  id: 'tower',
  name: '盖塔楼',
  version: '1.0.0',
  protocol: 1,
  entry: 'index.html',
  author: '海拥（wanghao221/moyu，摸鱼面板适配）',
  description: '3D 叠塔：在来回移动的砖块上精准落子，叠得越高越好（实时，three.js）。'
}, null, 2) + '\n')

console.log('✓ games/tower/ 构建完成')
for (const f of ['index.html', 'css/style.css', 'js/script.js', 'js/three.min.js', 'js/tweenmax.min.js', 'manifest.json']) {
  const p = join(OUT, f)
  if (existsSync(p)) console.log('  ', f, readFileSync(p).length + 'B')
  else fail('输出缺失 ' + f)
}
