// A conceptual AI atlas. These views illustrate structures, not live model telemetry.
export function createAIAtlas(T, { canvas, viewport, motion, onReady }) {
  const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
  renderer.outputColorSpace = T.SRGBColorSpace
  renderer.toneMapping = T.ACESFilmicToneMapping
  const scene = new T.Scene()
  const camera = new T.PerspectiveCamera(38, 1, 0.1, 40)
  camera.position.set(0, 0.7, 9)
  camera.lookAt(0, 0, 0)
  scene.add(new T.HemisphereLight(0xffffff, 0x677c72, 2.5))
  const light = new T.DirectionalLight(0xffffff, 3)
  light.position.set(-3, 5, 4)
  scene.add(light)
  const rim = new T.DirectionalLight(0x71bca8, 2)
  rim.position.set(3, 1, -3)
  scene.add(rim)
  const world = new T.Group()
  world.rotation.y = -0.25
  scene.add(world)
  const count = 240
  const colors = [0x395f57, 0x557a69, 0x67829b, 0x898466, 0x487a78]
  const centers = Array.from({ length: 5 }, (_, i) => {
    const angle = Math.PI / 2 + i * Math.PI * 2 / 5
    return new T.Vector3(Math.cos(angle) * 2, Math.sin(angle) * 1.7, i % 2 ? 0.5 : -0.35)
  })
  function cortex(theta, phi, side, fold = true) {
    const wrinkles = fold ? 1 + 0.075 * Math.sin(theta * 15 + Math.sin(phi * 7) * 1.6) * Math.cos(phi * 13 + theta * 3) : 1
    const waist = 1 - 0.12 * Math.max(0, -Math.cos(theta))
    return new T.Vector3(
      side * (0.065 + Math.sin(theta) * Math.cos(phi) * 1.32 * wrinkles * waist),
      Math.cos(theta) * 1.15 * wrinkles + Math.sin(phi) * 0.12,
      Math.sin(theta) * Math.sin(phi) * 1.5 * wrinkles,
    )
  }
  const positions = { network: [], brain: [], agents: [] }
  for (let i = 0; i < count; i++) {
    const layer = Math.floor(i / 48), local = i % 48
    positions.network.push(new T.Vector3((layer - 2) * 1.25, ((local % 8) - 3.5) * 0.29, (Math.floor(local / 8) - 2.5) * 0.33))
    const hemisphere = i < count / 2 ? -1 : 1, n = i % (count / 2)
    positions.brain.push(cortex(Math.acos(1 - 2 * (n + 0.5) / 120), ((n * 0.618034) % 1) * Math.PI - Math.PI / 2, hemisphere).multiplyScalar(0.985))
    const polar = Math.acos(1 - 2 * (local + 0.5) / 48), azimuth = local * 2.399963
    positions.agents.push(new T.Vector3(Math.sin(polar) * Math.cos(azimuth), Math.cos(polar), Math.sin(polar) * Math.sin(azimuth)).multiplyScalar(0.34 + (local % 3) * 0.03).add(centers[layer]))
  }
  const edges = { network: [], brain: [], agents: [] }
  for (let layer = 0; layer < 4; layer++) {
    for (let i = 0; i < 48; i++) {
      edges.network.push([layer * 48 + i, (layer + 1) * 48 + (i * 7 + layer * 3) % 48])
      if (i % 3 === 0) edges.network.push([layer * 48 + i, (layer + 1) * 48 + (i + 13) % 48])
    }
  }
  // Local cortical connections retain a legible silhouette rather than a hairball.
  for (let i = 0; i < count; i++) {
    const half = Math.floor(i / 120), n = i % 120
    const nearest = positions.brain.map((p, index) => ({ index, distance: p.distanceToSquared(positions.brain[i]) }))
      .filter(p => p.index !== i && Math.floor(p.index / 120) === half)
      .sort((a, b) => a.distance - b.distance).slice(0, 3)
    nearest.forEach(p => { if (p.index > i) edges.brain.push([i, p.index]) })
    if (half === 0 && n % 24 === 0) edges.brain.push([i, i + 120])
    const group = Math.floor(i / 48), local = i % 48
    edges.agents.push([i, group * 48 + (local + 7) % 48])
    if (local === 0) edges.agents.push([i, ((group + 1) % 5) * 48])
  }
  const current = positions.network.map(p => p.clone())
  const nodeMaterial = new T.MeshStandardMaterial({ roughness: 0.28, metalness: 0.3 })
  const nodeGeometry = new T.SphereGeometry(1, 12, 10)
  const nodes = new T.InstancedMesh(nodeGeometry, nodeMaterial, count)
  nodes.instanceMatrix.setUsage(T.DynamicDrawUsage)
  nodes.frustumCulled = false
  for (let i = 0; i < count; i++) nodes.setColorAt(i, new T.Color(colors[Math.floor(i / 48)]))
  world.add(nodes)
  const dummy = new T.Object3D()
  const lineArray = new Float32Array(600 * 6)
  const lineGeometry = new T.BufferGeometry()
  lineGeometry.setAttribute('position', new T.BufferAttribute(lineArray, 3).setUsage(T.DynamicDrawUsage))
  const lineMaterial = new T.LineBasicMaterial({ color: 0x527c73, transparent: true, opacity: 0.2, depthWrite: false })
  const lines = new T.LineSegments(lineGeometry, lineMaterial)
  lines.frustumCulled = false
  world.add(lines)

  // Folded, translucent hemispheres add a recognizable brain volume around the graph.
  const brain = new T.Group()
  const cortexMaterial = new T.MeshPhysicalMaterial({ color: 0x82aaa0, metalness: 0.12, roughness: 0.32, clearcoat: 0.6, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide })
  for (const side of [-1, 1]) {
    const vertices = [], indices = [], rows = 64, columns = 72
    for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
      vertices.push(...cortex(row / rows * Math.PI, col / columns * Math.PI - Math.PI / 2, side).toArray())
    }
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const a = row * (columns + 1) + col, b = a + columns + 1
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
    const geometry = new T.BufferGeometry()
    geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    brain.add(new T.Mesh(geometry, cortexMaterial))
  }
  const stem = new T.Mesh(new T.CylinderGeometry(0.12, 0.18, 0.55, 20), cortexMaterial)
  stem.position.set(0, -1.3, -0.5)
  stem.rotation.x = -0.3
  brain.add(stem)
  const foldMaterial = new T.MeshStandardMaterial({ color: 0x456d61, roughness: 0.65, transparent: true, opacity: 0, depthWrite: false })
  for (const side of [-1, 1]) for (let fold = 0; fold < 11; fold++) {
    const points = []
    for (let step = 0; step <= 70; step++) {
      const theta = 0.14 + step / 70 * (Math.PI - 0.28)
      const phi = -1.4 + fold * 0.28 + Math.sin(theta * 9 + fold * 1.4) * 0.085 + Math.sin(theta * 4 + fold) * 0.07
      points.push(cortex(theta, phi, side).multiplyScalar(1.008))
    }
    const curve = new T.CatmullRomCurve3(points)
    brain.add(new T.Mesh(new T.TubeGeometry(curve, 100, 0.018, 5, false), foldMaterial))
  }
  world.add(brain)

  // Agent roles are actual readable objects in the space, connected to one shared task.
  const agents = new T.Group()
  const agentMaterials = []
  for (let i = 0; i < 5; i++) {
    const material = new T.MeshPhysicalMaterial({ color: colors[i], metalness: 0.25, roughness: 0.3, clearcoat: 1, transparent: true, opacity: 0, depthWrite: false })
    agentMaterials.push(material)
    const orb = new T.Mesh(new T.SphereGeometry(0.45, 32, 24), material)
    orb.position.copy(centers[i])
    agents.add(orb)
  }
  const taskMaterial = new T.MeshStandardMaterial({ color: 0x365c50, roughness: 0.25, metalness: 0.35, transparent: true, opacity: 0 })
  const task = new T.Mesh(new T.IcosahedronGeometry(0.26, 2), taskMaterial)
  agents.add(task)
  const agentCurves = centers.map(center => new T.QuadraticBezierCurve3(new T.Vector3(), center.clone().multiplyScalar(0.5).add(new T.Vector3(0, 0, 0.65)), center))
  const connectionMaterial = new T.LineBasicMaterial({ color: 0x52796b, transparent: true, opacity: 0, depthWrite: false })
  agentCurves.forEach(curve => agents.add(new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(36)), connectionMaterial)))
  world.add(agents)

  const pulseMaterial = new T.MeshBasicMaterial({ color: 0x2f977c })
  const pulseGeometry = new T.SphereGeometry(0.042, 10, 8)
  const pulses = Array.from({ length: 16 }, () => {
    const mesh = new T.Mesh(pulseGeometry, pulseMaterial)
    world.add(mesh)
    return mesh
  })
  const labelLayer = viewport.querySelector('.atlas-labels')
  const labels = []
  function setLabels(mode) {
    labelLayer.replaceChildren()
    labels.length = 0
    const definitions = mode === 'network'
      ? ['输入', '表征', '关联', '推理', '输出'].map((text, i) => ({ text, position: new T.Vector3((i - 2) * 1.25, -1.4, 0) }))
      : mode === 'agents'
        ? centers.map((center, i) => ({ text: ['规划', '检索', '知识', '执行', '评估'][i], position: center.clone().add(new T.Vector3(0, -0.64, 0)) })).concat([{ text: '共享任务', position: new T.Vector3(0, -0.5, 0) }])
        : []
    definitions.forEach(({ text, position }) => {
      const element = document.createElement('span')
      element.textContent = text
      labelLayer.append(element)
      labels.push({ element, position })
    })
  }
  let mode = 'network', frame = 0, last = 0, time = 0, visible = true, disposed = false, lost = false
  let transition = 1, dragging = false, pointer = null, previousX = 0, previousY = 0, yaw = -0.25, pitch = 0
  const projection = new T.Vector3()
  const targetScale = new T.Vector3()
  const startPositions = current.map(p => p.clone())
  let brainOpacity = 0, agentOpacity = 0
  function schedule() {
    if (!frame && !disposed && !lost && visible && !document.hidden) frame = requestAnimationFrame(render)
  }
  function render(now) {
    frame = 0
    if (disposed || lost || !visible || document.hidden) return
    const dt = Math.min((now - last) / 1000 || 0.016, 0.04)
    last = now
    if (!motion.matches) time += dt
    transition = motion.matches ? 1 : Math.min(1, transition + dt / 1.1)
    const mix = transition * transition * (3 - 2 * transition)
    const blend = motion.matches ? 1 : 1 - Math.exp(-dt * 7)
    brainOpacity += ((mode === 'brain' ? 0.38 : 0) - brainOpacity) * blend
    agentOpacity += ((mode === 'agents' ? 0.24 : 0) - agentOpacity) * blend
    cortexMaterial.opacity = brainOpacity
    foldMaterial.opacity = brainOpacity * 1.5
    brain.visible = brainOpacity > 0.002
    agents.visible = agentOpacity > 0.002
    agentMaterials.forEach(material => { material.opacity = agentOpacity })
    taskMaterial.opacity = Math.min(1, agentOpacity * 4)
    connectionMaterial.opacity = agentOpacity * 2.2
    const selectedEdges = edges[mode]
    for (let i = 0; i < count; i++) {
      current[i].lerpVectors(startPositions[i], positions[mode][i], mix)
      dummy.position.copy(current[i])
      const size = mode === 'brain' ? 0.021 : mode === 'agents' ? 0.018 : 0.033
      dummy.scale.setScalar(size * (i % 9 === 0 ? 1.6 : 1))
      dummy.updateMatrix()
      nodes.setMatrixAt(i, dummy.matrix)
    }
    nodes.instanceMatrix.needsUpdate = true
    selectedEdges.forEach(([a, b], index) => {
      current[a].toArray(lineArray, index * 6)
      current[b].toArray(lineArray, index * 6 + 3)
    })
    lineGeometry.setDrawRange(0, selectedEdges.length * 2)
    lineGeometry.attributes.position.needsUpdate = true
    lineMaterial.opacity = mode === 'brain' ? 0.2 : 0.17
    pulses.forEach((pulse, i) => {
      const progress = (time * 0.26 + i / pulses.length) % 1
      if (mode === 'agents') {
        pulse.position.copy(agentCurves[i % 5].getPoint(i % 2 ? progress : 1 - progress))
      } else {
        const edge = selectedEdges[(i * 23 + Math.floor(time * 0.26 + i / pulses.length) * 7) % selectedEdges.length]
        pulse.position.lerpVectors(current[edge[0]], current[edge[1]], progress)
      }
      pulse.scale.setScalar(mode === 'brain' ? 0.65 : 1)
      pulse.visible = transition > 0.85
    })
    const targetYaw = yaw + (mode === 'brain' ? 0.55 : 0) + (motion.matches || dragging ? 0 : Math.sin(time * 0.22) * 0.18)
    world.rotation.y += (targetYaw - world.rotation.y) * blend
    world.rotation.x += (pitch - world.rotation.x) * blend
    const scale = mode === 'brain' ? 1.28 : 1
    world.scale.lerp(targetScale.setScalar(scale), blend)
    world.updateMatrixWorld(true)
    labels.forEach(({ element, position }) => {
      projection.copy(position).applyMatrix4(world.matrixWorld).project(camera)
      element.style.left = `${(projection.x * 0.5 + 0.5) * 100}%`
      element.style.top = `${(-projection.y * 0.5 + 0.5) * 100}%`
      element.style.opacity = String(0.55 + (1 - (projection.z + 1) / 2) * 0.45)
    })
    renderer.render(scene, camera)
    const unsettled = transition < 1 || Math.abs(brainOpacity - (mode === 'brain' ? 0.38 : 0)) > 0.002 || Math.abs(agentOpacity - (mode === 'agents' ? 0.24 : 0)) > 0.002 || Math.abs(targetYaw - world.rotation.y) > 0.001 || Math.abs(pitch - world.rotation.x) > 0.001 || Math.abs(world.scale.x - scale) > 0.001
    if (!motion.matches || unsettled) schedule()
  }
  function resize() {
    const width = Math.max(1, viewport.clientWidth), height = Math.max(1, viewport.clientHeight)
    camera.aspect = width / height
    camera.fov = camera.aspect < 1.1 ? 50 : 38
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    schedule()
  }
  const down = event => {
    if (!event.isPrimary || event.button !== 0) return
    dragging = true; pointer = event.pointerId
    previousX = event.clientX; previousY = event.clientY
    viewport.setPointerCapture(pointer)
    viewport.classList.add('is-dragging')
  }
  const move = event => {
    if (!dragging || pointer !== event.pointerId) return
    yaw += (event.clientX - previousX) * 0.008
    pitch = T.MathUtils.clamp(pitch + (event.clientY - previousY) * 0.005, -0.65, 0.65)
    previousX = event.clientX; previousY = event.clientY
    schedule()
  }
  const up = event => {
    if (event.pointerId !== pointer) return
    dragging = false; pointer = null
    viewport.classList.remove('is-dragging')
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId)
    schedule()
  }
  const keyboard = event => {
    if (event.key === 'Home') { yaw = -0.25; pitch = 0 }
    else if (event.key === 'ArrowLeft') yaw -= 0.2
    else if (event.key === 'ArrowRight') yaw += 0.2
    else if (event.key === 'ArrowUp') pitch = Math.max(-0.65, pitch - 0.15)
    else if (event.key === 'ArrowDown') pitch = Math.min(0.65, pitch + 0.15)
    else return
    event.preventDefault(); schedule()
  }
  const visibility = () => {
    cancelAnimationFrame(frame); frame = 0; last = performance.now(); schedule()
  }
  const contextLost = event => {
    event.preventDefault(); lost = true
    cancelAnimationFrame(frame); frame = 0; onReady(false)
  }
  const contextRestored = () => { lost = false; onReady(true); schedule() }
  const listeners = [[viewport, 'pointerdown', down], [viewport, 'pointermove', move], [viewport, 'pointerup', up], [viewport, 'pointercancel', up], [viewport, 'lostpointercapture', up], [viewport, 'keydown', keyboard], [document, 'visibilitychange', visibility], [motion, 'change', schedule], [canvas, 'webglcontextlost', contextLost], [canvas, 'webglcontextrestored', contextRestored]]
  listeners.forEach(([target, event, handler]) => target.addEventListener(event, handler))
  const observer = new ResizeObserver(resize)
  observer.observe(viewport)
  const intersection = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting
    visibility()
  })
  intersection.observe(viewport)
  setLabels(mode)
  resize()
  // Render successfully before hiding the static illustration.
  render(performance.now())
  onReady(true)
  return {
    select(next) {
      if (!positions[next]) return
      current.forEach((position, i) => startPositions[i].copy(position))
      mode = next; transition = 0
      setLabels(mode)
      schedule()
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect(); intersection.disconnect()
      listeners.forEach(([target, event, handler]) => target.removeEventListener(event, handler))
      const geometries = new Set(), materials = new Set()
      scene.traverse(object => {
        if (object.geometry) geometries.add(object.geometry)
        if (object.material) materials.add(object.material)
      })
      geometries.forEach(geometry => geometry.dispose())
      materials.forEach(material => material.dispose())
      nodes.dispose()
      renderer.dispose()
    },
  }
}
