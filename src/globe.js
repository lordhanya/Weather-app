import * as THREE from 'three';

const GLOBE_RADIUS = 1;
const ATMOSPHERE_RADIUS = 1.15;

function latLonToVector3(lat, lon, radius = GLOBE_RADIUS) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, resolve, undefined, reject);
  });
}

function createStarLayers() {
  const group = new THREE.Group();
  const layers = [
    { count: 1800, minR: 60, maxR: 140, size: 0.06, opacity: 0.45 },
    { count: 900, minR: 50, maxR: 120, size: 0.1, opacity: 0.7 },
    { count: 350, minR: 45, maxR: 100, size: 0.16, opacity: 1 },
  ];

  layers.forEach((cfg) => {
    const positions = new Float32Array(cfg.count * 3);
    const colors = new Float32Array(cfg.count * 3);
    for (let i = 0; i < cfg.count; i++) {
      const r = cfg.minR + Math.random() * (cfg.maxR - cfg.minR);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const t = Math.random();
      let cr, cg, cb;
      if (t < 0.7) {
        cr = 1; cg = 1; cb = 1;
      } else if (t < 0.85) {
        cr = 0.75; cg = 0.82; cb = 1;
      } else if (t < 0.95) {
        cr = 1; cg = 0.9; cb = 0.75;
      } else {
        cr = 1; cg = 0.7; cb = 0.55;
      }
      const b = 0.7 + Math.random() * 0.3;
      colors[i * 3] = cr * b;
      colors[i * 3 + 1] = cg * b;
      colors[i * 3 + 2] = cb * b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: cfg.size,
      vertexColors: true,
      transparent: true,
      opacity: cfg.opacity,
      sizeAttenuation: true,
      depthWrite: false,
    });
    group.add(new THREE.Points(geo, mat));
  });

  return group;
}

function createNebula() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#020409';
  ctx.fillRect(0, 0, 512, 512);

  const patches = [
    { x: 140, y: 180, r: 160, color: 'rgba(40, 60, 140, 0.12)' },
    { x: 340, y: 300, r: 140, color: 'rgba(80, 30, 100, 0.10)' },
    { x: 200, y: 380, r: 120, color: 'rgba(30, 90, 110, 0.08)' },
    { x: 400, y: 120, r: 100, color: 'rgba(100, 50, 60, 0.07)' },
    { x: 80, y: 420, r: 90, color: 'rgba(50, 70, 160, 0.09)' },
  ];

  patches.forEach((p) => {
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    grad.addColorStop(0, p.color);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}

function createAtmosphere() {
  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const fragmentShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
      vec3 glow = vec3(0.25, 0.5, 1.0) * intensity;
      float rim = 1.0 - abs(dot(normalize(vPosition), vec3(0.0, 0.0, 1.0)));
      glow += vec3(0.15, 0.35, 0.9) * pow(rim, 4.0) * 0.6;
      gl_FragColor = vec4(glow, intensity * 1.2);
    }
  `;
  const geo = new THREE.SphereGeometry(ATMOSPHERE_RADIUS, 64, 64);
  const mat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

function createInnerGlow() {
  const vertexShader = `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const fragmentShader = `
    varying vec3 vNormal;
    void main() {
      float intensity = pow(0.55 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
      gl_FragColor = vec4(0.4, 0.6, 1.0, 1.0) * intensity * 0.7;
    }
  `;
  const geo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.002, 64, 64);
  const mat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    transparent: true,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

function createGraticule() {
  const group = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({
    color: 0x4a9eff,
    transparent: true,
    opacity: 0.06,
  });

  for (let lat = -75; lat <= 75; lat += 15) {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 4) {
      pts.push(latLonToVector3(lat, lon, GLOBE_RADIUS * 1.002));
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
  }
  for (let lon = -180; lon < 180; lon += 15) {
    const pts = [];
    for (let lat = -90; lat <= 90; lat += 4) {
      pts.push(latLonToVector3(lat, lon, GLOBE_RADIUS * 1.002));
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
  }

  const eqMat = new THREE.LineBasicMaterial({
    color: 0x4a9eff,
    transparent: true,
    opacity: 0.14,
  });
  const eqPts = [];
  for (let lon = -180; lon <= 180; lon += 4) {
    eqPts.push(latLonToVector3(0, lon, GLOBE_RADIUS * 1.003));
  }
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(eqPts), eqMat));

  return group;
}

function createMarker(lat, lon) {
  const pos = latLonToVector3(lat, lon, GLOBE_RADIUS * 1.005);
  const group = new THREE.Group();

  const pinGeo = new THREE.SphereGeometry(0.018, 20, 20);
  const pinMat = new THREE.MeshBasicMaterial({ color: 0xff6b35 });
  const pin = new THREE.Mesh(pinGeo, pinMat);
  pin.position.copy(pos);
  group.add(pin);

  const ringGeo = new THREE.RingGeometry(0.032, 0.046, 48);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff6b35,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.copy(pos);
  ring.lookAt(0, 0, 0);
  group.add(ring);

  const ring2Geo = new THREE.RingGeometry(0.05, 0.056, 48);
  const ring2Mat = new THREE.MeshBasicMaterial({
    color: 0xff6b35,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
  ring2.position.copy(pos);
  ring2.lookAt(0, 0, 0);
  group.add(ring2);

  return group;
}

export class Globe {
  constructor(canvas, { onSelect, onHover } = {}) {
    this.canvas = canvas;
    this.onSelect = onSelect;
    this.onHover = onHover;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.z = 3.2;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.isPointerDown = false;
    this.didDrag = false;
    this.prevMouse = { x: 0, y: 0 };
    this.targetRotation = { x: 0.35, y: 1.2 };
    this.currentRotation = { x: 0.35, y: 1.2 };
    this.autoRotate = true;
    this.selectedMarker = null;
    this.flying = false;
    this.flyProgress = 0;
    this.flyStart = { x: 0, y: 0 };
    this.flyEnd = { x: 0, y: 0 };
    this.clouds = null;
    this._disposed = false;
    this._animationId = 0;
    this._resizeHandler = null;

    this.setupScene();
    this.setupEvents();
    this.resize();
    this.loadTextures();
  }

  async loadTextures() {
    try {
      const [dayMap, normalMap, specMap, lightsMap, cloudsMap] = await Promise.all([
        loadTexture('/textures/earth_day.jpg'),
        loadTexture('/textures/earth_normal.jpg'),
        loadTexture('/textures/earth_spec.jpg'),
        loadTexture('/textures/earth_lights.png'),
        loadTexture('/textures/earth_clouds.png'),
      ]);

      if (this._disposed) return;

      dayMap.colorSpace = THREE.SRGBColorSpace;
      lightsMap.colorSpace = THREE.SRGBColorSpace;

      const earthMat = this.earth.material;
      earthMat.map = dayMap;
      earthMat.normalMap = normalMap;
      earthMat.normalScale.set(0.6, 0.6);
      earthMat.roughnessMap = specMap;
      earthMat.roughness = 0.75;
      earthMat.metalness = 0.05;
      earthMat.emissiveMap = lightsMap;
      earthMat.emissive.set(0xffffff);
      earthMat.emissiveIntensity = 0.85;
      earthMat.needsUpdate = true;

      cloudsMap.colorSpace = THREE.SRGBColorSpace;
      const cloudGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.01, 64, 64);
      const cloudMat = new THREE.MeshStandardMaterial({
        map: cloudsMap,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        roughness: 1,
        metalness: 0,
      });
      this.clouds = new THREE.Mesh(cloudGeo, cloudMat);
      this.scene.add(this.clouds);
    } catch (err) {
      if (this._disposed) return;
      console.warn('Texture load failed, using fallback material:', err);
      this.earth.material.map = this.fallbackMap;
      this.earth.material.needsUpdate = true;
    }
  }

  createFallbackTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    const oceanGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    oceanGrad.addColorStop(0, '#071525');
    oceanGrad.addColorStop(0.5, '#0a1e36');
    oceanGrad.addColorStop(1, '#071525');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, 2048, 1024);

    ctx.fillStyle = '#1e4a38';
    const blobs = [
      [310, 280, 170, 150], [390, 430, 95, 135], [520, 560, 65, 95],
      [980, 250, 195, 125], [1060, 400, 85, 115], [1160, 320, 155, 135],
      [1360, 380, 135, 155], [1560, 480, 115, 85], [1660, 620, 135, 75],
      [1760, 700, 95, 85], [450, 180, 145, 75], [750, 200, 115, 65],
      [1460, 250, 125, 85], [200, 700, 75, 55],
    ];
    blobs.forEach(([x, y, rx, ry]) => {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    return new THREE.CanvasTexture(canvas);
  }

  setupScene() {
    const ambient = new THREE.AmbientLight(0x334466, 0.5);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff4e0, 1.8);
    sun.position.set(5, 2, 4);
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x4477bb, 0.35);
    fill.position.set(-5, -2, -3);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0x6699dd, 0.25);
    rim.position.set(0, -5, -5);
    this.scene.add(rim);

    this.fallbackMap = this.createFallbackTexture();

    const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 96, 96);
    const earthMat = new THREE.MeshStandardMaterial({
      map: this.fallbackMap,
      roughness: 0.75,
      metalness: 0.05,
      normalScale: new THREE.Vector2(0.6, 0.6),
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 1,
    });
    this.earth = new THREE.Mesh(earthGeo, earthMat);
    this.scene.add(this.earth);

    this.atmosphere = createAtmosphere();
    this.scene.add(this.atmosphere);

    this.innerGlow = createInnerGlow();
    this.scene.add(this.innerGlow);

    this.graticule = createGraticule();
    this.scene.add(this.graticule);

    this.starfield = createStarLayers();
    this.scene.add(this.starfield);

    const nebulaTex = createNebula();
    this.scene.background = nebulaTex;
  }

  setupEvents() {
    const el = this.canvas;

    el.addEventListener('pointerdown', (e) => {
      this.isPointerDown = true;
      this.didDrag = false;
      this.prevMouse = { x: e.clientX, y: e.clientY };
      this.autoRotate = false;
      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener('pointermove', (e) => {
      if (this.isPointerDown) {
        const dx = e.clientX - this.prevMouse.x;
        const dy = e.clientY - this.prevMouse.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this.didDrag = true;
        this.targetRotation.y += dx * 0.005;
        this.targetRotation.x += dy * 0.005;
        this.targetRotation.x = Math.max(-1.3, Math.min(1.3, this.targetRotation.x));
        this.prevMouse = { x: e.clientX, y: e.clientY };
      } else {
        this.updateMouse(e);
        if (this.onHover && !this.selectedMarker) {
          const hit = this.raycastEarth();
          if (hit) {
            const { lat, lon } = this.hitToLatLon(hit);
            this.onHover(lat, lon);
          }
        }
      }
    });

    el.addEventListener('pointerup', (e) => {
      this.isPointerDown = false;
      if (!this.didDrag) {
        this.updateMouse(e);
        const hit = this.raycastEarth();
        if (hit) {
          const { lat, lon } = this.hitToLatLon(hit);
          this.selectLocation(lat, lon);
        }
      }
      setTimeout(() => {
        if (!this.isPointerDown && !this.selectedMarker) this.autoRotate = true;
      }, 4000);
    });

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const z = this.camera.position.z + e.deltaY * 0.002;
      this.camera.position.z = Math.max(1.5, Math.min(6, z));
    }, { passive: false });

    el.addEventListener('dblclick', () => {
      this.clearSelection();
    });

    this._resizeHandler = () => this.resize();
    window.addEventListener('resize', this._resizeHandler);
  }

  updateMouse(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  raycastEarth() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObject(this.earth);
    return hits.length ? hits[0] : null;
  }

  hitToLatLon(hit) {
    const local = this.earth.worldToLocal(hit.point.clone());
    const r = local.length();
    const lat = 90 - Math.acos(local.y / r) * (180 / Math.PI);
    const theta = Math.atan2(local.z, -local.x);
    let lon = theta * (180 / Math.PI) - 180;
    if (lon < -180) lon += 360;
    return { lat, lon };
  }

  selectLocation(lat, lon) {
    this.clearSelection();
    this.selectedMarker = createMarker(lat, lon);
    this.scene.add(this.selectedMarker);
    this.autoRotate = false;
    if (this.onSelect) this.onSelect(lat, lon);
  }

  clearSelection() {
    if (this.selectedMarker) {
      this.scene.remove(this.selectedMarker);
      this.selectedMarker.traverse((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
      this.selectedMarker = null;
    }
  }

  hasSelection() {
    return !!this.selectedMarker;
  }

  flyTo(lat, lon) {
    if (this.flying) return;
    const targetY = -((lon + 180) * (Math.PI / 180)) + Math.PI / 2;
    const targetX = (lat * Math.PI) / 180 * 0.8;
    this.flyStart = { x: this.targetRotation.x, y: this.targetRotation.y };
    this.flyEnd = {
      x: Math.max(-1.3, Math.min(1.3, targetX)),
      y: targetY,
    };
    this.flyProgress = 0;
    this.flying = true;
    this.autoRotate = false;
  }

  start() {
    if (this._disposed) return;
    const animate = () => {
      if (this._disposed) return;
      this._animationId = requestAnimationFrame(animate);
      this.update();
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  stop() {
    cancelAnimationFrame(this._animationId);
    this._disposed = true;
  }

  dispose() {
    this.stop();

    this.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (m.map) m.map.dispose();
          if (m.normalMap) m.normalMap.dispose();
          if (m.roughnessMap) m.roughnessMap.dispose();
          if (m.emissiveMap) m.emissiveMap.dispose();
          m.dispose();
        });
      }
    });

    if (this.fallbackMap) this.fallbackMap.dispose();
    if (this.renderer) this.renderer.dispose();
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }
  }

  update() {
    if (this.flying) {
      this.flyProgress = Math.min(1, this.flyProgress + 0.025);
      const t = 1 - Math.pow(1 - this.flyProgress, 3);
      this.targetRotation.x = this.flyStart.x + (this.flyEnd.x - this.flyStart.x) * t;
      let dy = this.flyEnd.y - this.flyStart.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      this.targetRotation.y = this.flyStart.y + dy * t;
      if (this.flyProgress >= 1) this.flying = false;
    } else if (this.autoRotate) {
      this.targetRotation.y += 0.0012;
    }

    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.07;
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.07;

    this.earth.rotation.x = this.currentRotation.x;
    this.earth.rotation.y = this.currentRotation.y;

    if (this.clouds) {
      this.clouds.rotation.x = this.currentRotation.x;
      this.clouds.rotation.y = this.currentRotation.y + (this._cloudDrift = (this._cloudDrift || 0) + 0.00015);
    }

    this.atmosphere.rotation.x = this.currentRotation.x;
    this.atmosphere.rotation.y = this.currentRotation.y;
    this.innerGlow.rotation.x = this.currentRotation.x;
    this.innerGlow.rotation.y = this.currentRotation.y;
    this.graticule.rotation.x = this.currentRotation.x;
    this.graticule.rotation.y = this.currentRotation.y;

    if (this.starfield) {
      this.starfield.rotation.y += 0.00004;
    }

    if (this.selectedMarker) {
      this.selectedMarker.rotation.x = this.currentRotation.x;
      this.selectedMarker.rotation.y = this.currentRotation.y;

      const t = performance.now() * 0.003;
      const ring = this.selectedMarker.children[1];
      const ring2 = this.selectedMarker.children[2];
      if (ring) {
        ring.scale.setScalar(1 + Math.sin(t) * 0.25);
        ring.material.opacity = 0.35 + Math.sin(t) * 0.2;
      }
      if (ring2) {
        ring2.scale.setScalar(1 + Math.sin(t + 1) * 0.35);
        ring2.material.opacity = 0.12 + Math.sin(t + 1) * 0.1;
      }
    }
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }
}
