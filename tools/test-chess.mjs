// 象棋 AI 流程仿真：加载真实游戏脚本，模拟玩家走子 + AI 响应，抓运行时错误
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const dir = 'E:/workspace/other/dsh-workspace/dsh-slack-games/games/chess/js/'
const load = (f) => readFileSync(dir + f, 'utf8')

const elStub = () => ({
  style: {}, classList: { add() {}, remove() {}, contains() { return false } },
  addEventListener() {}, removeEventListener() {},
  appendChild() {}, setAttribute() {}, getAttribute() { return null },
  innerHTML: '', textContent: '', src: '', value: '', disabled: false, length: 0,
  getContext() { return ctxStub() },
  querySelector() { return elStub() }, querySelectorAll() { return [] },
})
const ctxStub = () => ({
  clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
  fill() {}, arc() {}, drawImage() {}, setTransform() {}, save() {}, restore() {},
  translate() {}, scale() {}, fillText() {}, measureText() { return { width: 0 } }, fillStyle: '', strokeStyle: '',
})

const elements = {}
const document = {
  getElementById(id) { if (!elements[id]) elements[id] = elStub(); return elements[id] },
  querySelector() { return elStub() }, querySelectorAll() { return [] }, createElement() { return elStub() },
  getElementsByTagName() { return [elStub()] }, getElementsByClassName() { return [] },
  addEventListener() {}, cookie: '', body: elStub(),
}
class Image { constructor() { this.onload = null; this.onerror = null; this.src = '' } }
// 模拟真实沙箱：XHR 跨域失败（status=0，不回回调）→ com.gambit 保持 undefined
class XHR {
  constructor() { this.status = 0; this.readyState = 0; this.responseText = '' }
  open() {} setRequestHeader() {}
  send() { this.readyState = 4; this.status = 0; this.onreadystatechange && this.onreadystatechange() }
}
const sandboxWindow = {
  XMLHttpRequest: XHR, Image, document,
  addEventListener() {}, onload: null, location: { reload() {} },
  setTimeout, clearTimeout, setInterval, clearInterval,
  unescape: (s) => { try { return decodeURIComponent(s) } catch (e) { return s } },
  console, Math, Date, parseFloat, parseInt, isNaN,
}
sandboxWindow.window = sandboxWindow
sandboxWindow.parent = sandboxWindow

const context = vm.createContext(sandboxWindow)
for (const f of ['common.js', 'play.js', 'AI.js', 'bill.js', 'gambit.js']) {
  vm.runInContext(load(f), context, { filename: f })
  console.log('loaded', f)
}
// 触发 window.onload
sandboxWindow.onload && sandboxWindow.onload()
console.log('com.gambit:', typeof context.com.gambit, '(应为 undefined，模拟开局库加载失败)')

// 开局
context.play.depth = 3
context.play.init()
console.log('棋盘已初始化，红 z0 位置:', context.play.map[6][0])

// 模拟玩家走子：红兵 z0 从 (0,6) 走到 (0,5)
const key = context.play.map[6][0]
context.play.nowManKey = key
context.play.mans[key].ps = context.play.mans[key].bl()
context.play.clickPoint(0, 5)
console.log('玩家已走子，pace:', JSON.stringify(context.play.pace))

// 直接调用 AI（等价于 scheduleAI 的 setTimeout 触发）
try {
  context.play.AIPlay()
  console.log('✅ AIPlay 正常返回，AI 已走子，pace 长度:', context.play.pace.length)
  console.log('moveInfo:', elements['moveInfo'] ? elements['moveInfo'].innerHTML.slice(0, 80) : '(无 moveInfo)')
} catch (e) {
  console.log('❌ AIPlay 抛出异常:', e && e.stack ? e.stack.split('\n').slice(0, 6).join('\n') : String(e))
}
