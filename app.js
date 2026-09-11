const canvas = document.querySelector("#twin-canvas")
const stage = document.querySelector(".hero-stage")
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

async function loadScene() {
  try {
    const THREE = await import("./vendor/three.module.min.js")
    initScene(THREE)
  } catch (error) {
    document.body.classList.add("scene-fallback-active")
    console.warn("Digital twin scene fallback active", error)
  }
}

function initScene(THREE) {
  if (!canvas || !stage) return

  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x071014, 0.075)

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
  camera.position.set(0, 0.35, 8.6)

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  })
  renderer.setClearColor(0x071014, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15

  scene.add(new THREE.AmbientLight(0x74a7a0, 0.78))
  const keyLight = new THREE.PointLight(0x60e5d2, 38, 15)
  keyLight.position.set(2.8, 3.2, 4.8)
  scene.add(keyLight)
  const warmLight = new THREE.PointLight(0xf2b66d, 25, 13)
  warmLight.position.set(-3.5, -0.5, 3)
  scene.add(warmLight)
  const rimLight = new THREE.DirectionalLight(0x9d8cff, 2.2)
  rimLight.position.set(-2, 3, -4)
  scene.add(rimLight)

  const system = new THREE.Group()
  system.position.y = 0.25
  scene.add(system)

  const grid = new THREE.GridHelper(7, 22, 0x31736c, 0x17302f)
  grid.position.y = -2.05
  grid.material.transparent = true
  grid.material.opacity = 0.42
  system.add(grid)

  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x0b171b,
    metalness: 0.88,
    roughness: 0.28,
  })
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.3, 0.18, 64), baseMaterial)
  base.position.y = -1.95
  system.add(base)

  const baseRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.12, 0.025, 10, 128),
    new THREE.MeshBasicMaterial({ color: 0x60e5d2, transparent: true, opacity: 0.75 }),
  )
  baseRing.rotation.x = Math.PI / 2
  baseRing.position.y = -1.84
  system.add(baseRing)

  const coreGroup = new THREE.Group()
  coreGroup.position.y = -0.12
  system.add(coreGroup)

  const shellGeometry = new THREE.DodecahedronGeometry(1.42, 1)
  const shell = new THREE.Mesh(
    shellGeometry,
    new THREE.MeshPhysicalMaterial({
      color: 0x1a8b7f,
      emissive: 0x0c332f,
      emissiveIntensity: 1.2,
      metalness: 0.36,
      roughness: 0.22,
      clearcoat: 0.9,
      clearcoatRoughness: 0.18,
      transparent: true,
      opacity: 0.76,
    }),
  )
  coreGroup.add(shell)

  const shellEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(shellGeometry, 18),
    new THREE.LineBasicMaterial({ color: 0xb3fff1, transparent: true, opacity: 0.58 }),
  )
  shellEdges.scale.setScalar(1.012)
  coreGroup.add(shellEdges)

  const innerCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.73, 1),
    new THREE.MeshStandardMaterial({
      color: 0xb3fff1,
      emissive: 0x37e4cf,
      emissiveIntensity: 2.25,
      metalness: 0.18,
      roughness: 0.15,
    }),
  )
  coreGroup.add(innerCore)

  const innerEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.8, 1)),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.72 }),
  )
  coreGroup.add(innerEdges)

  const haloSpecs = [
    { radius: 1.82, color: 0x60e5d2, rotation: [1.38, 0.2, 0.1], opacity: 0.62 },
    { radius: 2.13, color: 0xf2b66d, rotation: [0.35, 0.72, 0.48], opacity: 0.52 },
    { radius: 2.4, color: 0x9d8cff, rotation: [0.94, -0.48, -0.72], opacity: 0.4 },
  ]
  const halos = haloSpecs.map(({ radius, color, rotation, opacity }) => {
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.018, 10, 160),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity }),
    )
    halo.rotation.set(...rotation)
    coreGroup.add(halo)
    return halo
  })

  const nodeSpecs = [
    [-1.72, 1.16, 0.28], [1.92, 0.88, -0.16], [1.58, -1.28, 0.38],
    [-1.64, -1.18, -0.2], [0.22, 1.96, 0.48], [-0.2, -1.9, 0.22],
  ]
  const nodeLines = []
  const nodes = nodeSpecs.map((position, index) => {
    const color = index % 2 === 0 ? 0xf2b66d : 0x60e5d2
    const node = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.12),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6 }),
    )
    node.position.set(...position)
    node.rotation.set(index * 0.2, index * 0.35, 0)
    coreGroup.add(node)
    nodeLines.push(0, 0, 0, ...position)
    return node
  })

  const nodeLineGeometry = new THREE.BufferGeometry()
  nodeLineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(nodeLines, 3))
  coreGroup.add(new THREE.LineSegments(
    nodeLineGeometry,
    new THREE.LineBasicMaterial({ color: 0x60e5d2, transparent: true, opacity: 0.16 }),
  ))

  const packets = Array.from({ length: 7 }, (_, index) => {
    const packet = new THREE.Mesh(
      new THREE.SphereGeometry(index % 3 === 0 ? 0.07 : 0.045, 12, 12),
      new THREE.MeshBasicMaterial({ color: index % 2 === 0 ? 0x60e5d2 : 0xf2b66d }),
    )
    packet.userData = {
      angle: index * 0.86,
      radius: 2.55 + (index % 3) * 0.14,
      speed: 0.16 + index * 0.012,
      lift: 0.48 + (index % 2) * 0.22,
    }
    coreGroup.add(packet)
    return packet
  })

  const starPositions = new Float32Array(180 * 3)
  for (let index = 0; index < starPositions.length; index += 3) {
    starPositions[index] = (Math.random() - 0.5) * 7
    starPositions[index + 1] = (Math.random() - 0.5) * 6
    starPositions[index + 2] = (Math.random() - 0.5) * 4 - 1
  }
  const starGeometry = new THREE.BufferGeometry()
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3))
  system.add(new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: 0x72b9b0, size: 0.018, transparent: true, opacity: 0.34 }),
  ))

  let pointerX = 0
  let pointerY = 0
  let smoothedX = 0
  let smoothedY = 0
  const onPointerMove = (event) => {
    const bounds = stage.getBoundingClientRect()
    pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
    pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2
  }
  stage.addEventListener("pointermove", onPointerMove, { passive: true })
  stage.addEventListener("pointerleave", () => { pointerX = 0; pointerY = 0 })

  const resize = () => {
    const width = Math.max(1, stage.clientWidth)
    const height = Math.max(1, stage.clientHeight)
    camera.aspect = width / height
    camera.position.z = width < 440 ? 9.8 : width < 580 ? 9.15 : 8.6
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(stage)
  resize()

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault()
    document.body.classList.add("scene-fallback-active")
  })

  const clock = new THREE.Clock()
  const animate = () => {
    const elapsed = clock.getElapsedTime()
    if (!prefersReducedMotion) {
      smoothedX += (pointerX - smoothedX) * 0.025
      smoothedY += (pointerY - smoothedY) * 0.025
      coreGroup.rotation.y = elapsed * 0.09 + smoothedX * 0.15
      coreGroup.rotation.x = -0.08 + smoothedY * 0.09
      shell.rotation.z = elapsed * -0.045
      innerCore.rotation.set(elapsed * 0.23, elapsed * 0.32, elapsed * 0.12)
      innerEdges.rotation.copy(innerCore.rotation)
      const pulse = 1 + Math.sin(elapsed * 2.15) * 0.045
      innerCore.scale.setScalar(pulse)
      innerEdges.scale.setScalar(pulse * 1.03)
      halos[0].rotation.z += 0.0012
      halos[1].rotation.y -= 0.001
      halos[2].rotation.x += 0.0008
      baseRing.material.opacity = 0.58 + Math.sin(elapsed * 1.4) * 0.17
      nodes.forEach((node, index) => {
        const nodePulse = 0.86 + Math.sin(elapsed * 1.8 + index) * 0.22
        node.scale.setScalar(nodePulse)
        node.rotation.x += 0.004
        node.rotation.y += 0.006
      })
      packets.forEach((packet, index) => {
        const { radius, speed, lift } = packet.userData
        const angle = packet.userData.angle + elapsed * speed
        packet.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle * 1.7 + index) * lift,
          Math.sin(angle) * radius * 0.48,
        )
      })
    }
    renderer.render(scene, camera)
    window.requestAnimationFrame(animate)
  }
  animate()
}

loadScene()
