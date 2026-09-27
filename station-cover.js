const SESSION_KEY = 'yuhang-station-intro-seen'

export function initStationCover({ onChange }) {
  const dialog = document.querySelector('#station-cover')
  const mount = dialog.querySelector('.station-scene')
  const status = dialog.querySelector('.station-status')
  const launchers = [...document.querySelectorAll('[data-open-station]')]
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  let iframe, closing = false, previousFocus, closeTimer, slowTimer, onFrameKey
  let lockedStyles
  function lockPage() {
    lockedStyles = [document.documentElement.style.overflow, document.documentElement.style.scrollbarGutter]
    document.documentElement.style.scrollbarGutter = 'stable'
    document.documentElement.style.overflow = 'hidden'
  }
  function unlockPage() {
    if (!lockedStyles) return
    document.documentElement.style.overflow = lockedStyles[0]
    document.documentElement.style.scrollbarGutter = lockedStyles[1]
    lockedStyles = null
  }
  function show(event) {
    if (dialog.open || closing) return
    previousFocus = event?.currentTarget || document.activeElement
    dialog.classList.remove('station-leaving', 'station-ready', 'station-failed')
    status.textContent = '正在走进驿站…'
    mount.setAttribute('aria-busy', 'true')
    iframe = document.createElement('iframe')
    iframe.title = 'yuhang 驿站：南京五桥的清晨，可拖动旋转、滚轮缩放'
    iframe.src = './scenes/yuhang-station.html?v=20260927-1'
    iframe.setAttribute('tabindex', '0')
    iframe.addEventListener('load', () => {
      if (!dialog.open || closing) return
      clearTimeout(slowTimer)
      mount.setAttribute('aria-busy', 'false')
      const frameDocument = iframe.contentDocument
      if (!frameDocument?.querySelector('canvas')) {
        dialog.classList.add('station-failed')
        status.textContent = '当前设备暂时无法呈现场景，仍可直接进入主页。'
        return
      }
      onFrameKey = event => {
        if (event.key === 'Escape') { event.preventDefault(); dismiss() }
      }
      frameDocument.addEventListener('keydown', onFrameKey)
      dialog.classList.add('station-ready')
      status.textContent = '拖动旋转 · 滚轮或双指缩放 · 双击人物跟随'
    })
    lockPage()
    dialog.showModal()
    launchers.forEach(button => button.setAttribute('aria-expanded', 'true'))
    onChange(true)
    mount.replaceChildren(iframe)
    slowTimer = setTimeout(() => {
      if (!dialog.classList.contains('station-ready')) status.textContent = '场景仍在加载，你也可以先进入主页。'
    }, 12000)
    dialog.querySelector('[data-close-station]').focus({ preventScroll: true })
  }
  function cleanup() {
    clearTimeout(closeTimer)
    clearTimeout(slowTimer)
    if (iframe && onFrameKey) iframe.contentDocument?.removeEventListener('keydown', onFrameKey)
    mount.replaceChildren() // Destroy the scene context instead of leaving a hidden render loop.
    iframe = null
    onFrameKey = null
    unlockPage()
    closing = false
    launchers.forEach(button => button.setAttribute('aria-expanded', 'false'))
    onChange(false)
    const focusTarget = previousFocus?.isConnected && previousFocus !== document.body ? previousFocus : launchers[0]
    focusTarget?.focus({ preventScroll: true })
  }
  function dismiss() {
    if (!dialog.open || closing) return
    closing = true
    clearTimeout(slowTimer)
    try { sessionStorage.setItem(SESSION_KEY, '1') } catch { /* Session storage is optional. */ }
    dialog.classList.add('station-leaving')
    closeTimer = setTimeout(() => dialog.close(), motion.matches ? 0 : 280)
  }
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss() })
  dialog.addEventListener('close', cleanup)
  dialog.querySelectorAll('[data-close-station]').forEach(button => button.addEventListener('click', dismiss))
  launchers.forEach(button => button.addEventListener('click', event => { show(event); button.setAttribute('aria-expanded', String(dialog.open)) }))
  let seen = false
  try { seen = sessionStorage.getItem(SESSION_KEY) === '1' } catch { /* Keep the cover usable in private modes. */ }
  const explicit = new URLSearchParams(location.search).get('station') === '1'
  if (explicit || (!seen && !location.hash)) show()
  return { isOpen: () => dialog.open }
}
