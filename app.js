const canvas = document.querySelector("#twin-canvas")
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

async function loadScene() {
  try {
    const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js")
    initScene(THREE)
  } catch (error) {
    document.body.classList.add("scene-fallback-active")
    console.warn("Digital twin scene fallback active", error)
  }
}

function initScene(THREE) {
  if (!canvas) return

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.position.set(0, 0.15, 10)

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const twin = new THREE.Group()
  twin.position.set(2.05, 0.15, 0)
  twin.rotation.x = -0.18
  scene.add(twin)

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.3, 2),
    new THREE.MeshBasicMaterial({ color: 0x60e5d2, wireframe: true, transparent: true, opacity: 0.26 }),
  )
  twin.add(core)

  const innerCore = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.58, 1),
    new THREE.MeshBasicMaterial({ color: 0xb3fff1, wireframe: true, transparent: true, opacity: 0.46 }),
  )
  twin.add(innerCore)

  const ringMaterials = [
    new THREE.MeshBasicMaterial({ color: 0x60e5d2, transparent: true, opacity: 0.42 }),
    new THREE.MeshBasicMaterial({ color: 0xf2b66d, transparent: true, opacity: 0.38 }),
    new THREE.MeshBasicMaterial({ color: 0x9d8cff, transparent: true, opacity: 0.32 }),
  ]
  const rings = [
    [2.82, 0.016, ringMaterials[0], [0.3, 0.2, 0.12]],
    [3.25, 0.012, ringMaterials[1], [1.18, -0.42, 0.72]],
    [2.56, 0.01, ringMaterials[2], [-0.72, 0.9, -0.35]],
  ].map(([radius, tube, material, rotation]) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 128), material)
    ring.rotation.set(...rotation)
    twin.add(ring)
    return ring
  })

  const nodePositions = [
    [-2.9, 1.35, 0.35], [-2.4, -1.25, 0.6], [-1.15, 2.45, -0.3], [0.3, -2.7, 0.55],
    [2.65, 1.55, -0.45], [2.9, -1.2, 0.5], [1.2, 2.5, 0.45], [-0.25, 0.4, 2.65],
  ]
  const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xf2b66d })
  const nodes = nodePositions.map(([x, y, z], index) => {
    const node = new THREE.Mesh(new THREE.SphereGeometry(index % 3 === 0 ? 0.085 : 0.055, 12, 12), nodeMaterial)
    node.position.set(x, y, z)
    twin.add(node)
    return node
  })

  const lineGeometry = new THREE.BufferGeometry()
  const linePoints = []
  nodePositions.forEach((point, index) => {
    const next = nodePositions[(index + 1) % nodePositions.length]
    linePoints.push(...point, ...next)
    if (index < 5) linePoints.push(...point, 0, 0, 0)
  })
  lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePoints, 3))
  twin.add(new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({ color: 0x9ab0ae, transparent: true, opacity: 0.3 })))

  const particlePositions = new Float32Array(620 * 3)
  for (let index = 0; index < particlePositions.length; index += 3) {
    const radius = 4.1 + Math.random() * 3.4
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos((Math.random() * 2) - 1)
    particlePositions[index] = radius * Math.sin(phi) * Math.cos(theta)
    particlePositions[index + 1] = radius * Math.cos(phi)
    particlePositions[index + 2] = radius * Math.sin(phi) * Math.sin(theta)
  }
  const particleGeometry = new THREE.BufferGeometry()
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3))
  scene.add(new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: 0x60e5d2, size: 0.022, transparent: true, opacity: 0.52 })))

  let pointerX = 0
  let pointerY = 0
  let targetX = 0
  let targetY = 0
  const onPointerMove = (event) => {
    pointerX = (event.clientX / window.innerWidth - 0.5) * 2
    pointerY = (event.clientY / window.innerHeight - 0.5) * 2
  }
  window.addEventListener("pointermove", onPointerMove, { passive: true })

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    twin.position.x = window.innerWidth < 820 ? 0 : 2.05
    twin.position.y = window.innerWidth < 560 ? 0.25 : 0.15
    twin.scale.setScalar(window.innerWidth < 560 ? 0.72 : window.innerWidth < 820 ? 0.84 : 1)
  }
  window.addEventListener("resize", resize)
  resize()

  const clock = new THREE.Clock()
  const animate = () => {
    const elapsed = clock.getElapsedTime()
    if (!prefersReducedMotion) {
      targetX += (pointerX * 0.28 - targetX) * 0.03
      targetY += (pointerY * 0.18 - targetY) * 0.03
      twin.rotation.y += (0.0018 + targetX * 0.0008)
      twin.rotation.x += (targetY * 0.0006)
      core.rotation.z -= 0.0012
      innerCore.rotation.y += 0.002
      rings[0].rotation.z += 0.0018
      rings[1].rotation.x -= 0.0012
      rings[2].rotation.y += 0.0014
      core.scale.setScalar(1 + Math.sin(elapsed * 1.2) * 0.012)
      nodes.forEach((node, index) => { node.position.y += Math.sin(elapsed * 0.8 + index) * 0.00035 })
    }
    renderer.render(scene, camera)
    window.requestAnimationFrame(animate)
  }
  animate()
}

loadScene()
