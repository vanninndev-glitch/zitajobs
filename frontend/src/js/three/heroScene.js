// src/js/three/heroScene.js - Animación Three.js para el hero

export function initHeroScene(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof THREE === 'undefined') return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.set(0, 0, 12);

  // Resize handler
  const resize = () => {
    const w = canvas.parentElement.clientWidth;
    const h = canvas.parentElement.clientHeight || 500;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  // ─── PALETA ZITÁCUARO ────────────────────────────────────────────────
  const colors = [0xE91E8C, 0xFFB800, 0x00BCD4, 0x8B1FA9, 0x4CAF50, 0xFF5722];

  // ─── PARTÍCULAS FLOTANTES ────────────────────────────────────────────
  const particleCount = 120;
  const positions = new Float32Array(particleCount * 3);
  const pColors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
    const c = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
    pColors[i * 3] = c.r; pColors[i * 3 + 1] = c.g; pColors[i * 3 + 2] = c.b;
    sizes[i] = Math.random() * 3 + 1;
  }

  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pgeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
  pgeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const pmat = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const particles = new THREE.Points(pgeo, pmat);
  scene.add(particles);

  // ─── FIGURAS GEOMÉTRICAS FLOTANTES ───────────────────────────────────
  const meshes = [];
  const geometries = [
    new THREE.OctahedronGeometry(0.5),
    new THREE.TetrahedronGeometry(0.6),
    new THREE.IcosahedronGeometry(0.4),
    new THREE.OctahedronGeometry(0.35),
    new THREE.TetrahedronGeometry(0.45),
    new THREE.IcosahedronGeometry(0.55),
    new THREE.OctahedronGeometry(0.3),
    new THREE.TetrahedronGeometry(0.5),
  ];

  geometries.forEach((geo, i) => {
    const mat = new THREE.MeshPhongMaterial({
      color: colors[i % colors.length],
      transparent: true,
      opacity: 0.6,
      wireframe: i % 3 === 0,
      shininess: 100
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 5
    );
    mesh.userData = {
      speed: { x: (Math.random() - 0.5) * 0.008, y: (Math.random() - 0.5) * 0.006 },
      rotSpeed: { x: Math.random() * 0.015, y: Math.random() * 0.012 }
    };
    scene.add(mesh);
    meshes.push(mesh);
  });

  // ─── CONEXIONES (LÍNEAS DINÁMICAS) ───────────────────────────────────
  const lineMat = new THREE.LineBasicMaterial({ color: 0xE91E8C, transparent: true, opacity: 0.15 });
  const lineGroup = new THREE.Group();
  scene.add(lineGroup);

  // ─── LUCES ───────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const pointLight1 = new THREE.PointLight(0xE91E8C, 1.5, 20);
  pointLight1.position.set(5, 5, 5);
  scene.add(pointLight1);
  const pointLight2 = new THREE.PointLight(0x00BCD4, 1.2, 20);
  pointLight2.position.set(-5, -5, 3);
  scene.add(pointLight2);

  // ─── MOUSE INTERACTION ───────────────────────────────────────────────
  let mouse = { x: 0, y: 0 };
  document.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
  });

  // ─── ANIMATION LOOP ──────────────────────────────────────────────────
  let frame = 0;
  let animId;

  const animate = () => {
    animId = requestAnimationFrame(animate);
    frame += 0.01;

    // Rotate particles slowly
    particles.rotation.y = frame * 0.05;
    particles.rotation.x = frame * 0.02;

    // Animate meshes
    meshes.forEach((mesh) => {
      mesh.rotation.x += mesh.userData.rotSpeed.x;
      mesh.rotation.y += mesh.userData.rotSpeed.y;
      mesh.position.y += Math.sin(frame + mesh.position.x) * 0.003;
      // Bounds
      if (Math.abs(mesh.position.y) > 8) mesh.userData.speed.y *= -1;
    });

    // Mouse parallax
    camera.position.x += (mouse.x * 1.5 - camera.position.x) * 0.03;
    camera.position.y += (mouse.y * 0.8 - camera.position.y) * 0.03;

    // Light pulse
    pointLight1.intensity = 1.5 + Math.sin(frame * 2) * 0.3;
    pointLight2.intensity = 1.2 + Math.cos(frame * 1.5) * 0.3;

    renderer.render(scene, camera);
  };

  animate();

  return () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', resize);
    renderer.dispose();
  };
}

// Compact background for other pages (subtle)
export function initBgScene(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof THREE === 'undefined') return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 8;

  const resize = () => {
    const w = canvas.parentElement?.clientWidth || window.innerWidth;
    const h = canvas.parentElement?.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  const colors = [0xE91E8C, 0xFFB800, 0x00BCD4, 0x8B1FA9];
  for (let i = 0; i < 40; i++) {
    const geo = new THREE.OctahedronGeometry(Math.random() * 0.3 + 0.1);
    const mat = new THREE.MeshBasicMaterial({ color: colors[i % 4], wireframe: true, transparent: true, opacity: 0.3 });
    const m = new THREE.Mesh(geo, mat);
    m.position.set((Math.random()-0.5)*20, (Math.random()-0.5)*10, (Math.random()-0.5)*5);
    m.userData.rs = { x: Math.random()*0.01, y: Math.random()*0.01 };
    scene.add(m);
  }

  let f = 0, aid;
  const loop = () => {
    aid = requestAnimationFrame(loop);
    f += 0.005;
    scene.children.forEach(m => { m.rotation.x += m.userData.rs?.x || 0; m.rotation.y += m.userData.rs?.y || 0; });
    renderer.render(scene, camera);
  };
  loop();
  return () => { cancelAnimationFrame(aid); window.removeEventListener('resize', resize); renderer.dispose(); };
}
