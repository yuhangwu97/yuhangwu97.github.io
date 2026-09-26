const stage = document.querySelector('.hero-stage')
const viewport = stage.querySelector('.scene-viewport')
const canvas = document.querySelector('#twin-canvas')
const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
const modes = {
  network: ['连接，让信息产生意义。', '从输入、表征到推理与输出，沿信号流探索神经网络的空间结构。', '探索 AI 项目', '#systems', 'NEURAL NETWORK'],
  brain: ['智能的轮廓。', '双半球、皮层褶皱与局部连接，以数字雕塑呈现智能的联想与协同。', '探索知识与关联 ↗', 'https://github.com/yuhangwu97/MailGraphAgent', 'DIGITAL BRAIN'],
  agents: ['一个任务，多种能力。', '规划、检索、知识、执行与评估围绕共享任务协作，形成可追踪的反馈回路。', '探索 LoopForge ↗', 'https://github.com/yuhangwu97/loopforge', 'AGENT COLLECTIVE'],
}
let selected = 'network'
let atlas
const buttons = [...document.querySelectorAll('[data-view]')]
buttons.forEach(button => button.addEventListener('click', () => {
  selected = button.dataset.view
  stage.dataset.mode = selected
  buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)))
  const [title, description, label, href, name] = modes[selected]
  document.querySelector('#scene-title').textContent = title
  document.querySelector('#scene-description').textContent = description
  document.querySelector('#scene-view-name').textContent = name
  const link = document.querySelector('#scene-link')
  link.textContent = label
  link.href = href
  atlas?.select(selected)
}))
function onReady(ready) {
  stage.classList.toggle('scene-ready', ready)
  viewport.tabIndex = ready ? 0 : -1
  document.querySelector('.scene-interaction-hint').textContent = ready
    ? '拖动探索空间 · 方向键旋转 · Home 复位' : '静态示意 · 3D 场景暂不可用'
}
async function boot() {
  try {
    const [THREE, { createAIAtlas }] = await Promise.all([
      import('./vendor/three.module.min.js'),
      import('./ai-scene.js?v=20260926-3'),
    ])
    atlas = createAIAtlas(THREE, { canvas, viewport, motion, onReady })
    atlas.select(selected)
  } catch (error) {
    onReady(false)
    console.warn('AI atlas is using its static illustration.', error)
  }
}
window.addEventListener('pagehide', event => { if (!event.persisted) atlas?.dispose() })
boot()
