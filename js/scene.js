/* ==========================================================
   A to Z Signs — three.js night-street scene
   Stations (scroll-driven camera):
     hero/services → storefront with 3D A-to-Z emblem + neon "Signs"
     pylon         → pylon sign with scrolling LED message board
     monument      → stone monument sign with halo-lit letters
     vehicle       → box truck wrapped in A to Z graphics (drives in)
     process/work  → aerial pan over the street
     contact       → back to the storefront emblem
   ========================================================== */
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const FONT_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json';
const PHONE = '(713) 645-4527';

const canvas = document.getElementById('scene');
let isMobile = innerWidth < 860;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const progress = (p) => window.setLoadProgress && window.setLoadProgress(p);
const finish = () => window.finishLoading && window.finishLoading();

// ---------- Renderer ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  document.body.classList.add('no-webgl');
  finish();
  throw err;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
const BG = new THREE.Color('#04060d');
scene.background = BG;
scene.fog = new THREE.FogExp2(BG, 0.0125);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(isMobile ? 55 : 42, innerWidth / innerHeight, 0.1, 400);
camera.position.set(-4, 5, 16);

// ---------- Post-processing ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.62, 0.45, 0.88);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- Helpers ----------
const maxAniso = renderer.capabilities.getMaxAnisotropy();
function canvasTex(w, h, draw, { srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}
const glowMat = (tex, color = 0xffffff, opacity = 1) =>
  new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false });
function radialGlow(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  return canvasTex(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, inner); gr.addColorStop(1, outer);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function rand(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// Shared materials
const M = {
  chrome: new THREE.MeshStandardMaterial({ color: 0xd9dee6, metalness: 1, roughness: 0.18, envMapIntensity: 1.3 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x1a1e27, metalness: 0.8, roughness: 0.45, envMapIntensity: 0.5 }),
  black: new THREE.MeshStandardMaterial({ color: 0x0b0d12, metalness: 0.6, roughness: 0.3, envMapIntensity: 0.6 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x2a2e37, roughness: 0.85, metalness: 0.05, envMapIntensity: 0.25 }),
  building: new THREE.MeshStandardMaterial({ color: 0x0d1018, roughness: 0.9, metalness: 0.1, envMapIntensity: 0.2 }),
};

// ---------- Lights ----------
scene.add(new THREE.HemisphereLight(0x4a5d9a, 0x07080c, 0.55));
const moonLight = new THREE.DirectionalLight(0x8fa6ff, 0.55);
moonLight.position.set(-30, 40, 30);
scene.add(moonLight);

// ---------- Ground: wet asphalt, sidewalk, road markings ----------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 260),
  new THREE.MeshStandardMaterial({ color: 0x080a10, roughness: 0.28, metalness: 0.75, envMapIntensity: 0.35 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(45, 0, 0);
scene.add(ground);

const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(240, 0.18, 5.4), M.concrete);
sidewalk.position.set(45, 0.09, 2.7);
scene.add(sidewalk);
const curb = new THREE.Mesh(new THREE.BoxGeometry(240, 0.22, 0.25), new THREE.MeshStandardMaterial({ color: 0x4a4f5a, roughness: 0.7 }));
curb.position.set(45, 0.11, 5.45);
scene.add(curb);

{
  const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.2, 0.16), new THREE.MeshBasicMaterial({ color: 0xc9b46a, toneMapped: true }), 60);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  for (let i = 0; i < 60; i++) { m.compose(new THREE.Vector3(-40 + i * 4.2, 0.012, 11), q, new THREE.Vector3(1, 1, 1)); dash.setMatrixAt(i, m); }
  scene.add(dash);
}

// ---------- Window texture for buildings ----------
const windowTex = canvasTex(256, 512, (g, w, h) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  const r = rand(7);
  for (let y = 10; y < h; y += 22) for (let x = 8; x < w; x += 18) {
    const p = r();
    if (p < 0.24) { g.fillStyle = p < 0.06 ? '#9fb8ff' : p < 0.16 ? '#ffcf8a' : '#ffe9c4'; g.globalAlpha = 0.35 + r() * 0.65; g.fillRect(x, y, 10, 12); }
  }
  g.globalAlpha = 1;
});

// Skyline (instanced)
{
  const r = rand(42);
  const count = 120;
  const mat = new THREE.MeshStandardMaterial({ color: 0x0a0d15, roughness: 0.9, emissive: 0xffffff, emissiveMap: windowTex, emissiveIntensity: 0.55, envMapIntensity: 0.15 });
  const sky = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < count; i++) {
    const w = 5 + r() * 9, h = 10 + Math.pow(r(), 1.6) * 48, d = 5 + r() * 8;
    const x = -70 + r() * 230, z = -26 - r() * 60;
    m.compose(new THREE.Vector3(x, h / 2, z), q, new THREE.Vector3(w, h, d));
    sky.setMatrixAt(i, m);
  }
  scene.add(sky);

  // Low street-side buildings behind the stations
  const low = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, 14);
  const lots = [[-20, 9, 12], [19, 7.5, 10], [42, 6, 9], [68, 8, 11], [96, 9, 12], [110, 12, 10], [-34, 13, 11]];
  lots.forEach(([x, h, w], i) => { m.compose(new THREE.Vector3(x, h / 2, -9), q, new THREE.Vector3(w, h, 8)); low.setMatrixAt(i, m); });
  low.count = lots.length;
  scene.add(low);
}

// Moon + stars
{
  const moon = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), glowMat(radialGlow('rgba(200,215,255,0.9)', 'rgba(120,140,255,0)'), 0xffffff, 0.55));
  moon.position.set(70, 70, -150);
  scene.add(moon);
  const core = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48), new THREE.MeshBasicMaterial({ color: 0xe9eeff, fog: false }));
  core.position.set(70, 70, -149.9);
  scene.add(core);

  const r = rand(3), n = 900, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = -150 + r() * 400; pos[i * 3 + 1] = 40 + r() * 120; pos[i * 3 + 2] = -170 + r() * 30; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xbfd0ff, size: 0.45, sizeAttenuation: true, fog: false, transparent: true, opacity: 0.7 })));
}

// Street lights with fake light pools
const warmPool = radialGlow('rgba(255,190,120,0.55)', 'rgba(255,160,80,0)');
function streetLight(x) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 7.5, 12), M.darkMetal);
  pole.position.y = 3.75; g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.6), M.darkMetal);
  arm.position.set(0, 7.4, 0.75); g.add(arm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.9), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd2a0).multiplyScalar(3), toneMapped: false }));
  head.position.set(0, 7.3, 1.45); g.add(head);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), glowMat(warmPool, 0xffffff, 0.75));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.2, 1.4); g.add(pool);
  g.position.set(x, 0, 5.2);
  scene.add(g);
}
[-16, 12, 40, 70, 98].forEach(streetLight);

// Floating dust / sparks
const dust = (() => {
  const n = isMobile ? 350 : 800, pos = new Float32Array(n * 3), r = rand(11);
  for (let i = 0; i < n; i++) { pos[i * 3] = -25 + r() * 140; pos[i * 3 + 1] = r() * 18; pos[i * 3 + 2] = -8 + r() * 26; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb4ff, size: 0.06, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(p);
  return p;
})();

// ==========================================================
//  Build the sign stations once fonts are ready
// ==========================================================
const anim = { signsMat: null, edgeMat: null, haloMat: null, toMat: null, led: null, truck: null, wheels: [], blueLight: null, redLight: null };

async function build() {
  progress(0.15);
  const fontsReady = Promise.race([
    Promise.all([
      document.fonts.load('400 200px "Yellowtail"'),
      document.fonts.load('900 120px "Big Shoulders Display"'),
      document.fonts.load('700 60px "Big Shoulders Display"'),
    ]),
    new Promise((r) => setTimeout(r, 5000)),
  ]);
  const font = await new Promise((res, rej) =>
    new FontLoader().load(FONT_URL, res, (e) => e.total && progress(0.15 + 0.55 * (e.loaded / e.total)), rej)
  );
  await fontsReady;
  progress(0.8);

  const textGeo = (str, size, depth, bevel = true) => {
    const g = new TextGeometry(str, {
      font, size, height: depth, depth, curveSegments: 10,
      bevelEnabled: bevel, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 3,
    });
    g.computeBoundingBox();
    const b = g.boundingBox;
    g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, 0);
    return g;
  };

  buildStorefront(textGeo);
  buildPylon();
  buildMonument(textGeo);
  buildTruck();
  progress(1);
}

// ---------- Station 1: Storefront + 3D logo emblem ----------
function buildStorefront(textGeo) {
  const F = new THREE.Group();
  scene.add(F);

  // Brick wall
  const brick = canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#17110f'; g.fillRect(0, 0, w, h);
    const r = rand(5), bh = 32, bw = 96;
    for (let row = 0; row * bh < h; row++) {
      const off = (row % 2) * bw / 2;
      for (let x = -bw; x < w + bw; x += bw) {
        const v = 30 + r() * 26;
        g.fillStyle = `rgb(${v + 22},${v * 0.62},${v * 0.5})`;
        g.fillRect(x + off + 3, row * bh + 3, bw - 6, bh - 6);
      }
    }
  });
  brick.wrapS = brick.wrapT = THREE.RepeatWrapping;
  brick.repeat.set(3, 2.4);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(24, 10.8, 1), new THREE.MeshStandardMaterial({ map: brick, roughness: 0.92, metalness: 0, envMapIntensity: 0.25 }));
  wall.position.set(0, 5.4, -0.5);
  F.add(wall);
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(24.4, 0.4, 1.3), M.darkMetal);
  parapet.position.set(0, 10.9, -0.4);
  F.add(parapet);

  // Wall wash glow behind emblem
  const blueGlow = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), glowMat(radialGlow('rgba(60,100,255,0.75)', 'rgba(30,50,200,0)')));
  blueGlow.position.set(0, 6.6, 0.02);
  F.add(blueGlow);
  anim.haloMat = blueGlow.material;

  // ---- Emblem (the A to Z logo in 3D) ----
  const E = new THREE.Group();
  E.position.set(0, 6.6, 0);
  F.add(E);

  const edgeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x4f7bff).multiplyScalar(0), toneMapped: false });
  const edge = new THREE.Mesh(new RoundedBoxGeometry(5.62, 5.62, 0.3, 5, 0.42), edgeMat);
  edge.position.z = 0.15;
  E.add(edge);
  anim.edgeMat = edgeMat;

  const cabinet = new THREE.Mesh(
    new RoundedBoxGeometry(5.4, 5.4, 0.55, 5, 0.38),
    new THREE.MeshStandardMaterial({ color: 0x1f37d6, emissive: 0x1a2fc0, emissiveIntensity: 0.22, metalness: 0.35, roughness: 0.28, envMapIntensity: 0.9 })
  );
  cabinet.position.z = 0.3;
  E.add(cabinet);
  // inner bevel highlight
  const inner = new THREE.Mesh(new RoundedBoxGeometry(4.95, 4.95, 0.1, 4, 0.3), new THREE.MeshStandardMaterial({ color: 0x2b47ff, emissive: 0x2440ff, emissiveIntensity: 0.28, metalness: 0.2, roughness: 0.4 }));
  inner.position.z = 0.56;
  E.add(inner);

  // Brushed silver disc
  const brushed = canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#f4f6f9'); gr.addColorStop(0.45, '#9aa1ab'); gr.addColorStop(0.55, '#c6ccd4'); gr.addColorStop(1, '#6e747d');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rand(9);
    for (let i = 0; i < 2200; i++) {
      g.strokeStyle = `rgba(${r() > 0.5 ? 255 : 40},${r() > 0.5 ? 255 : 40},${r() > 0.5 ? 255 : 40},${0.04 + r() * 0.05})`;
      const y = r() * h; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (r() - 0.5) * 8); g.stroke();
    }
  });
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(2.28, 2.28, 0.16, 96),
    [new THREE.MeshStandardMaterial({ color: 0xcfd5de, metalness: 1, roughness: 0.25 }), new THREE.MeshStandardMaterial({ map: brushed, metalness: 0.85, roughness: 0.38, envMapIntensity: 1.1 }), M.chrome]
  );
  disc.rotation.x = Math.PI / 2;
  disc.position.z = 0.66;
  E.add(disc);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.32, 0.11, 24, 120), M.chrome);
  ring.position.z = 0.72;
  E.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.04, 12, 120), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xaec2ff).multiplyScalar(1.4), toneMapped: false }));
  ring2.position.z = 0.6;
  E.add(ring2);

  // Letters A — to — Z
  const letterFace = new THREE.MeshStandardMaterial({ color: 0x0c0e13, metalness: 0.7, roughness: 0.22, envMapIntensity: 1 });
  const A = new THREE.Mesh(textGeo('A', 2.15, 0.38), [letterFace, M.chrome]);
  A.position.set(-0.86, 0.02, 0.74);
  const Z = new THREE.Mesh(textGeo('Z', 2.15, 0.38), [letterFace, M.chrome]);
  Z.position.set(0.98, -0.18, 0.74);
  const toMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(0.2), toneMapped: false });
  const to = new THREE.Mesh(textGeo('to', 0.62, 0.14), [toMat, M.chrome]);
  to.position.set(0.12, 0.66, 0.98);
  anim.toMat = toMat;
  E.add(A, Z, to);

  // Red neon "Signs" script (canvas → glowing plane)
  const signsTex = canvasTex(1024, 360, (g, w, h) => {
    g.font = '400 250px "Yellowtail", cursive';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = 30; g.strokeStyle = 'rgba(20,0,0,0.9)'; g.strokeText('Signs', w / 2, h / 2 + 10);
    g.lineWidth = 16; g.strokeStyle = '#ffffff'; g.strokeText('Signs', w / 2, h / 2 + 10);
    g.fillStyle = '#ff2a1c'; g.fillText('Signs', w / 2, h / 2 + 10);
  });
  const signsMat = new THREE.MeshBasicMaterial({ map: signsTex, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(0.1, 0.1, 0.1) });
  const signs = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 5.8 * 360 / 1024), signsMat);
  signs.position.set(0.55, -2.55, 1.25);
  signs.rotation.z = 0.13;
  E.add(signs);
  anim.signsMat = signsMat;

  const redGlow = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5), glowMat(radialGlow('rgba(255,40,30,0.6)', 'rgba(255,20,10,0)'), 0xffffff, 0));
  redGlow.position.set(0.5, -2.6, 0.9);
  E.add(redGlow);
  anim.redGlow = redGlow.material;

  const since = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.42),
    new THREE.MeshBasicMaterial({
      transparent: true, toneMapped: false, color: new THREE.Color(1.15, 1.15, 1.15),
      map: canvasTex(512, 84, (g, w, h) => {
        g.font = '800 64px "Big Shoulders Display", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = '#ffffff'; g.fillText('SINCE 1972', w / 2, h / 2 + 4);
      }),
    })
  );
  since.position.set(0, -3.55, 0.3);
  E.add(since);

  // Lights cast by the sign onto the wall/sidewalk
  const bl = new THREE.PointLight(0x4466ff, 0, 18, 1.6);
  bl.position.set(0, 6.6, 2.5);
  F.add(bl);
  const rl = new THREE.PointLight(0xff2a1c, 0, 12, 1.8);
  rl.position.set(0.5, 3.9, 2.4);
  F.add(rl);
  anim.blueLight = bl; anim.redLight = rl;

  // ---- Storefront ----
  const band = new THREE.Mesh(new THREE.BoxGeometry(23, 0.38, 1.0), M.darkMetal);
  band.position.set(0, 2.95, 0.35);
  F.add(band);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(22.6, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x7fa0ff).multiplyScalar(2.4), toneMapped: false }));
  strip.position.set(0, 2.74, 0.82);
  F.add(strip);

  const winTex = (side) => canvasTex(1024, 460, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#3a2a1a'); gr.addColorStop(0.6, '#a2703c'); gr.addColorStop(1, '#2a1c12');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // interior silhouettes
    g.fillStyle = 'rgba(15,10,8,0.65)';
    for (let i = 0; i < 6; i++) g.fillRect(60 + i * 160, h * 0.55, 100, h * 0.45);
    g.fillStyle = 'rgba(255,230,190,0.25)'; g.fillRect(0, 0, w, 30);
    // mullions
    g.fillStyle = '#0d0f14'; g.fillRect(w / 2 - 6, 0, 12, h);
    // vinyl graphics
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (side === 'L') {
      g.font = '400 150px "Yellowtail", cursive';
      g.shadowColor = '#ff2a1c'; g.shadowBlur = 30; g.fillStyle = '#ff5a4e';
      g.fillText('Now Open', w / 2, h * 0.36);
      g.shadowBlur = 0;
      g.font = '800 46px "Big Shoulders Display", sans-serif'; g.fillStyle = '#ffffff';
      g.fillText('CUSTOM SIGNS  ·  WINDOW GRAPHICS', w / 2, h * 0.72);
    } else {
      g.fillStyle = 'rgba(255,255,255,0.92)';
      g.font = '900 120px "Big Shoulders Display", sans-serif';
      g.fillText('GRAND OPENING', w / 2, h * 0.34);
      g.fillStyle = '#ff2a1c'; g.fillRect(w * 0.18, h * 0.55, w * 0.64, 70);
      g.fillStyle = '#fff'; g.font = '800 50px "Big Shoulders Display", sans-serif';
      g.fillText(PHONE, w / 2, h * 0.55 + 37);
    }
  });
  [['L', -6.1], ['R', 6.1]].forEach(([s, x]) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(7.4, 2.65, 0.2), M.black);
    frame.position.set(x, 1.45, 0.05);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(7.1, 2.4), new THREE.MeshBasicMaterial({ map: winTex(s), color: new THREE.Color(0.7, 0.7, 0.7) }));
    glass.position.set(x, 1.45, 0.16);
    F.add(frame, glass);
  });
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.7, 0.2), M.black);
  door.position.set(0, 1.35, 0.05);
  const doorGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.3), new THREE.MeshBasicMaterial({ color: 0x7a5530 }));
  doorGlass.position.set(-0.55, 1.35, 0.16);
  const doorGlass2 = doorGlass.clone(); doorGlass2.position.x = 0.55;
  F.add(door, doorGlass, doorGlass2);
  // Warm light spill on sidewalk
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(22, 6), glowMat(canvasTex(256, 64, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,170,90,0.45)'); gr.addColorStop(1, 'rgba(255,150,80,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }), 0xffffff, 0.8));
  spill.rotation.x = -Math.PI / 2;
  spill.position.set(0, 0.2, 3);
  F.add(spill);
}

// ---------- Station 2: Pylon sign + LED board ----------
function buildPylon() {
  const P = new THREE.Group();
  P.position.set(30, 0, -3);
  scene.add(P);

  [-1.7, 1.7].forEach((x) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 12, 20), M.darkMetal);
    pole.position.set(x, 6, 0); P.add(pole);
  });
  const shroud = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.3, 1.3), new THREE.MeshStandardMaterial({ color: 0x1b2333, roughness: 0.6, metalness: 0.3 }));
  shroud.position.set(0, 1.15, 0); P.add(shroud);
  const shroudStripe = new THREE.Mesh(new THREE.BoxGeometry(4.82, 0.18, 1.32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3a5cff).multiplyScalar(2), toneMapped: false }));
  shroudStripe.position.set(0, 1.9, 0); P.add(shroudStripe);

  const face = (tex, k = 1.25) => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(k, k, k) });
  const side = M.darkMetal;

  // Top cabinet
  const topTex = canvasTex(1024, 500, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#d8241b'); gr.addColorStop(1, '#8f120c');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffd34a'; g.lineWidth = 14; roundRect(g, 26, 26, w - 52, h - 52, 30); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffffff'; g.font = '900 190px "Big Shoulders Display", sans-serif'; g.fillText('BAYOU GRILL', w / 2, h * 0.42);
    g.fillStyle = '#ffd34a'; g.font = '800 70px "Big Shoulders Display", sans-serif'; g.fillText('BURGERS · BBQ · OPEN LATE', w / 2, h * 0.75);
  });
  const top = new THREE.Mesh(new THREE.BoxGeometry(6.8, 3.3, 1), [side, side, side, side, face(topTex, 0.95), face(topTex, 0.95)]);
  top.position.set(0, 11.2, 0); P.add(top);
  const topFrame = new THREE.Mesh(new THREE.BoxGeometry(7.1, 3.6, 0.8), M.chrome);
  topFrame.position.set(0, 11.2, 0); P.add(topFrame);

  // LED message center (dot matrix, scrolling)
  const msg = '  ★  YOUR MESSAGE HERE  ★  FREE QUOTES ' + PHONE + '  ★  A TO Z SIGNS · HOUSTON  ';
  const small = document.createElement('canvas').getContext('2d');
  small.font = 'bold 22px Arial';
  const tw = Math.ceil(small.measureText(msg).width);
  const sh = 28;
  small.canvas.width = tw; small.canvas.height = sh;
  small.font = 'bold 22px Arial'; small.textBaseline = 'middle';
  small.fillStyle = '#000'; small.fillRect(0, 0, tw, sh);
  small.fillStyle = '#fff'; small.fillText(msg, 0, sh / 2 + 1);
  const px = small.getImageData(0, 0, tw, sh).data;
  const D = 4;
  const ledTex = canvasTex(Math.min(tw * D, 8192), sh * D, (g, w, h) => {
    g.fillStyle = '#050302'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < sh; y++) for (let x = 0; x < tw && x * D < w; x++) {
      const on = px[(y * tw + x) * 4] > 110;
      g.fillStyle = on ? '#ffb21e' : '#2a1606';
      g.beginPath(); g.arc(x * D + D / 2, y * D + D / 2, D * 0.38, 0, Math.PI * 2); g.fill();
    }
  });
  ledTex.wrapS = THREE.RepeatWrapping;
  const boardAspect = 6.4 / 1.45;
  ledTex.repeat.x = boardAspect / ((tw * D) / (sh * D));
  const ledFace = new THREE.MeshBasicMaterial({ map: ledTex, toneMapped: false, color: new THREE.Color(1.25, 1.25, 1.25) });
  const led = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.45, 0.8), [side, side, side, side, ledFace, ledFace]);
  led.position.set(0, 8.75, 0); P.add(led);
  const ledFrame = new THREE.Mesh(new THREE.BoxGeometry(6.7, 1.75, 0.7), M.black);
  ledFrame.position.set(0, 8.75, 0); P.add(ledFrame);
  anim.led = ledTex;

  // Tenant panel
  const tenTex = canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#f3f5fa'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1f37d6'; g.fillRect(0, 0, 18, h); g.fillRect(w - 18, 0, 18, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#0f1530'; g.font = '900 120px "Big Shoulders Display", sans-serif'; g.fillText('DRIVE THRU  →', w / 2, h / 2 + 6);
  });
  const ten = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.3, 0.7), [side, side, side, side, face(tenTex, 1.05), face(tenTex, 1.05)]);
  ten.position.set(0, 7.15, 0); P.add(ten);

  const gl = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), glowMat(radialGlow('rgba(255,90,40,0.35)', 'rgba(255,60,20,0)')));
  gl.position.set(0, 10, -0.6); P.add(gl);
  const pl = new THREE.PointLight(0xff6a3a, 12, 16, 1.6);
  pl.position.set(0, 10, 3); P.add(pl);
}

// ---------- Station 3: Monument sign ----------
function buildMonument(textGeo) {
  const G = new THREE.Group();
  G.position.set(56, 0, 1);
  scene.add(G);

  const stone = canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#3d3a36'; g.fillRect(0, 0, w, h);
    const r = rand(21);
    let y = 0;
    while (y < h) {
      const bh = 50 + r() * 50; let x = -r() * 80;
      while (x < w) {
        const bw = 90 + r() * 140, v = 70 + r() * 50;
        g.fillStyle = `rgb(${v + 8},${v + 2},${v - 6})`;
        g.fillRect(x + 4, y + 4, bw - 8, bh - 8);
        x += bw;
      }
      y += bh;
    }
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.15})`; g.fillRect(r() * w, r() * h, 2, 2); }
  });
  const stoneMat = new THREE.MeshStandardMaterial({ map: stone, roughness: 0.9, envMapIntensity: 0.3 });

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.55, 2.1), stoneMat);
  plinth.position.y = 0.28; G.add(plinth);
  const body = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.9, 1.4), stoneMat);
  body.position.y = 2.0; G.add(body);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.32, 1.75), new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 0.6 }));
  cap.position.y = 3.6; G.add(cap);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.9, 0.08), new THREE.MeshStandardMaterial({ color: 0x14161b, metalness: 0.7, roughness: 0.35 }));
  panel.position.set(0, 2.05, 0.72); G.add(panel);

  // Halo glow behind letters
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 2.2), glowMat(canvasTex(512, 160, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,236,200,0.95)'); gr.addColorStop(0.55, 'rgba(255,220,170,0.4)'); gr.addColorStop(1, 'rgba(255,200,150,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }), 0xffffff, 0.9));
  halo.position.set(0, 2.42, 0.77); G.add(halo);

  const bronze = new THREE.MeshStandardMaterial({ color: 0xd8b273, metalness: 1, roughness: 0.28, envMapIntensity: 1.2 });
  const word = new THREE.Mesh(textGeo('LAKESIDE', 0.56, 0.12), bronze);
  word.position.set(0, 2.42, 0.84); G.add(word);
  const sub = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.46), new THREE.MeshBasicMaterial({
    transparent: true, toneMapped: false, color: new THREE.Color(1.1, 1.1, 1.1),
    map: canvasTex(1024, 104, (g, w, h) => {
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f2f4f8';
      g.font = '700 70px "Big Shoulders Display", sans-serif'; g.fillText('M E D I C A L   P L A Z A   ·   2 4 0 0', w / 2, h / 2 + 4);
    }),
  }));
  sub.position.set(0, 1.55, 0.78); G.add(sub);

  // Uplights
  [-2.2, 2.2].forEach((x) => {
    const fx = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.16, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0d0).multiplyScalar(3), toneMapped: false }));
    fx.position.set(x, 0.62, 1.35); G.add(fx);
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.4), glowMat(canvasTex(64, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(255,230,190,0.55)'); gr.addColorStop(1, 'rgba(255,230,190,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(w * 0.42, h); g.lineTo(w * 0.58, h); g.lineTo(w, 0); g.lineTo(0, 0); g.closePath(); g.fill();
    }), 0xffffff, 0.55));
    beam.position.set(x, 2.3, 0.74); G.add(beam);
  });
  const spot = new THREE.SpotLight(0xffe2b8, 22, 10, 0.75, 0.6, 1.4);
  spot.position.set(0, 0.4, 4.5); spot.target.position.set(0, 2.2, 0.7);
  G.add(spot, spot.target);

  // Shrubs
  const shrubMat = new THREE.MeshStandardMaterial({ color: 0x15301c, roughness: 0.9, flatShading: true });
  [[-4.4, 0.6], [-3.6, 0.45], [4.3, 0.62], [3.5, 0.42], [-4.9, 0.4], [4.9, 0.45]].forEach(([x, s]) => {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), shrubMat);
    b.position.set(x, s * 0.75, 0.9); b.scale.y = 0.85; G.add(b);
  });
}

// ---------- Station 4: Wrapped box truck ----------
function buildTruck() {
  const T = new THREE.Group();
  T.position.set(82, 0, 7.4);
  scene.add(T);
  anim.truck = T;

  const wrap = canvasTex(1440, 640, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#2340d6'); gr.addColorStop(0.6, '#13248f'); gr.addColorStop(1, '#070d3d');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // swooshes
    g.fillStyle = '#e3241b';
    g.beginPath(); g.moveTo(0, h * 0.78); g.bezierCurveTo(w * 0.35, h * 0.55, w * 0.7, h * 1.05, w, h * 0.62); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 12;
    g.beginPath(); g.moveTo(0, h * 0.72); g.bezierCurveTo(w * 0.35, h * 0.49, w * 0.7, h * 0.99, w, h * 0.56); g.stroke();
    // chrome A-to-Z badge
    const cx = 250, cy = 250, R = 175;
    g.fillStyle = '#2340d6'; roundRect(g, cx - R - 30, cy - R - 30, (R + 30) * 2, (R + 30) * 2, 40); g.fill();
    const cg = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.5, '#9aa1ab'); cg.addColorStop(1, '#5f656e');
    g.fillStyle = cg; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    g.lineWidth = 10; g.strokeStyle = '#e8ecf2'; g.stroke();
    g.fillStyle = '#0b0d12'; g.font = '900 230px "Big Shoulders Display", sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center';
    g.fillText('A', cx - 65, cy + 10); g.fillText('Z', cx + 75, cy + 20);
    g.fillStyle = '#ffffff'; g.font = '800 60px "Big Shoulders Display", sans-serif'; g.fillText('to', cx + 8, cy - 55);
    // script Signs
    g.font = '400 230px "Yellowtail", cursive'; g.textAlign = 'left';
    g.lineJoin = 'round'; g.lineWidth = 18; g.strokeStyle = '#ffffff'; g.strokeText('Signs', 470, 230);
    g.fillStyle = '#e3241b'; g.fillText('Signs', 470, 230);
    // copy
    g.fillStyle = '#ffffff'; g.font = '800 58px "Big Shoulders Display", sans-serif';
    g.fillText('CUSTOM SIGNS · VEHICLE WRAPS · LED', 480, 380);
    g.font = '900 96px "Big Shoulders Display", sans-serif';
    g.fillText(PHONE, 760, 560);
    g.font = '700 40px "Big Shoulders Display", sans-serif'; g.fillStyle = '#dfe6ff';
    g.fillText('HOUSTON, TX · SINCE 1972', 60, 560);
  });
  const wrapMat = new THREE.MeshStandardMaterial({ map: wrap, roughness: 0.32, metalness: 0.15, envMapIntensity: 0.7, emissive: 0xffffff, emissiveMap: wrap, emissiveIntensity: 0.12 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe9edf5, roughness: 0.4, metalness: 0.1 });
  const paint = new THREE.MeshStandardMaterial({ color: 0x1f37d6, roughness: 0.22, metalness: 0.55, envMapIntensity: 1.1 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0a0f1c, roughness: 0.05, metalness: 0.9, envMapIntensity: 1.4 });

  const box = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.2, 2.5), [white, paint, white, M.darkMetal, wrapMat, wrapMat]);
  box.position.set(-1, 2.35, 0); T.add(box);
  const cab = new THREE.Mesh(new RoundedBoxGeometry(2.5, 2.4, 2.4, 4, 0.22), paint);
  cab.position.set(3.95, 1.95, 0); T.add(cab);
  const hood = new THREE.Mesh(new RoundedBoxGeometry(1.0, 1.25, 2.3, 4, 0.18), paint);
  hood.position.set(5.4, 1.35, 0); T.add(hood);
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.95), glass);
  ws.rotation.y = Math.PI / 2; ws.rotation.x = 0; ws.position.set(5.21, 2.55, 0); T.add(ws);
  [1.21, -1.21].forEach((z) => {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.85), glass);
    sw.position.set(4.3, 2.55, z); if (z < 0) sw.rotation.y = Math.PI; T.add(sw);
  });
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.45, 2.1), M.black);
  chassis.position.set(0.6, 0.78, 0); T.add(chassis);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 2.4), M.chrome);
  bumper.position.set(5.95, 0.8, 0); T.add(bumper);

  const hl = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf4f7ff).multiplyScalar(4), toneMapped: false });
  const tl = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff1a10).multiplyScalar(3), toneMapped: false });
  [0.82, -0.82].forEach((z) => {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.42), hl); h.position.set(5.92, 1.4, z); T.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.2), tl); t.position.set(-4.63, 1.3, z * 1.3); T.add(t);
  });
  // Headlight beams
  const beamTex = canvasTex(256, 64, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(230,240,255,0.55)'); gr.addColorStop(1, 'rgba(230,240,255,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, h * 0.42); g.lineTo(w, 0); g.lineTo(w, h); g.lineTo(0, h * 0.58); g.closePath(); g.fill();
  });
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.4), glowMat(beamTex, 0xffffff, 0.6));
  beam.rotation.x = -Math.PI / 2; beam.position.set(10.4, 0.05, 0); T.add(beam);

  const tire = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.85 });
  const wheelGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.42, 28);
  const hubGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.44, 8);
  [-3.4, -2.2, 4.0].forEach((x) => [1.08, -1.08].forEach((z) => {
    const wg = new THREE.Group();
    const w = new THREE.Mesh(wheelGeo, tire); const hub = new THREE.Mesh(hubGeo, M.chrome);
    wg.add(w, hub); wg.rotation.x = Math.PI / 2; wg.position.set(x, 0.58, z);
    T.add(wg); anim.wheels.push(wg);
  }));

  const under = new THREE.Mesh(new THREE.PlaneGeometry(11, 4), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
  under.rotation.x = -Math.PI / 2; under.position.set(0.5, 0.02, 0); T.add(under);
}

// ==========================================================
//  Camera choreography
// ==========================================================
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const KEYS = {
  desktop: {
    hero:     { p: V(-6.2, 4.6, 20.5), t: V(-4.6, 5.2, 0) },
    services: { p: V(-6.5, 3.2, 9.5),  t: V(3.4, 5.6, 0) },
    pylon:    { p: V(21.5, 4.5, 16),   t: V(25.6, 8.6, -3) },
    monument: { p: V(52.2, 2.4, 10.5), t: V(59.2, 2.3, 1) },
    vehicle:  { p: V(76.5, 3.4, 18.5), t: V(78.3, 2.2, 7.4) },
    process:  { p: V(42, 27, 44),      t: V(44, 3, -4) },
    work:     { p: V(70, 15, 30),      t: V(48, 5, -6) },
    contact:  { p: V(1.2, 3.6, 17), t: V(0.6, 6.8, 0) },
  },
  mobile: {
    hero:     { p: V(0, 7.5, 22),      t: V(0, 3.2, 0) },
    services: { p: V(-5, 6.5, 16),     t: V(0.5, 3.4, 0) },
    pylon:    { p: V(30, 9, 25),       t: V(30, 4.2, -3) },
    monument: { p: V(56, 3.6, 15),     t: V(56, -1.2, 1) },
    vehicle:  { p: V(81, 5, 24),       t: V(81, -1.6, 7.4) },
    process:  { p: V(44, 32, 52),      t: V(44, 5, -4) },
    work:     { p: V(64, 18, 36),      t: V(48, 7, -6) },
    contact:  { p: V(0, 8.5, 18),      t: V(0, 8.5, 0) },
  },
};
const sections = [...document.querySelectorAll('[data-cam]')];
const names = sections.map((s) => s.dataset.cam);
const vehicleIdx = names.indexOf('vehicle');

function scrollParam() {
  const vc = innerHeight / 2;
  const cs = sections.map((el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; });
  if (vc <= cs[0]) return 0;
  for (let i = 0; i < cs.length - 1; i++) if (vc >= cs[i] && vc < cs[i + 1]) return i + (vc - cs[i]) / (cs[i + 1] - cs[i]);
  return cs.length - 1;
}

const camPos = new THREE.Vector3().copy(camera.position);
const camTgt = new THREE.Vector3(0, 5.5, 0);
const wantPos = new THREE.Vector3(), wantTgt = new THREE.Vector3();
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });

function computeTarget(s) {
  const set = isMobile ? KEYS.mobile : KEYS.desktop;
  const i = Math.min(Math.floor(s), names.length - 1);
  const j = Math.min(i + 1, names.length - 1);
  const e = smooth(0.12, 0.88, s - i);
  const a = set[names[i]], b = set[names[j]];
  wantPos.lerpVectors(a.p, b.p, e);
  wantTgt.lerpVectors(a.t, b.t, e);
  // lift the camera mid-flight for a crane-shot feel
  const dist = a.p.distanceTo(b.p);
  wantPos.y += Math.sin(Math.PI * e) * Math.min(6, dist * 0.12);
}

// ==========================================================
//  Loop
// ==========================================================
const clock = new THREE.Clock();
let started = false, ignite = 0, nextBuzz = 6, buzzUntil = 0;

function neonLevel(t) {
  // ignition flicker for the first ~2.4s, then steady with rare buzz
  if (t < 0.8) return 0.05;
  if (t < 2.4) {
    const seq = [1, 0.1, 1, 1, 0.15, 0.6, 1, 0.1, 1, 1, 1, 0.3, 1, 1, 1, 1];
    return seq[Math.floor((t - 0.8) / 0.1) % seq.length];
  }
  return 1;
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  if (started) ignite += dt;
  const s = scrollParam();
  computeTarget(s);

  mouse.sx = lerp(mouse.sx, mouse.x, 1 - Math.exp(-dt * 3));
  mouse.sy = lerp(mouse.sy, mouse.y, 1 - Math.exp(-dt * 3));
  const k = 1 - Math.exp(-dt * (reduceMotion ? 20 : 3.2));
  camPos.lerp(wantPos, k);
  camTgt.lerp(wantTgt, k);
  const par = isMobile ? 0 : 1;
  camera.position.set(camPos.x + mouse.sx * 0.9 * par, camPos.y - mouse.sy * 0.45 * par + Math.sin(time * 0.6) * 0.06, camPos.z);
  camera.lookAt(camTgt);

  // Neon + emblem lighting
  if (anim.signsMat) {
    let lvl = neonLevel(ignite);
    if (ignite > 3) {
      if (time > nextBuzz) { buzzUntil = time + 0.12 + Math.random() * 0.1; nextBuzz = time + 5 + Math.random() * 6; }
      if (time < buzzUntil) lvl = 0.35;
    }
    anim.signsMat.color.setScalar(0.12 + lvl * 1.25);
    anim.redGlow.opacity = lvl * 0.45;
    anim.redLight.intensity = lvl * 8;
    const ramp = smooth(0.2, 1.4, ignite);
    anim.edgeMat.color.setRGB(0.31, 0.48, 1).multiplyScalar(ramp * 1.5);
    anim.haloMat.opacity = ramp * (0.32 + Math.sin(time * 2.2) * 0.03);
    anim.blueLight.intensity = ramp * 9;
    anim.toMat.color.setScalar(0.2 + ramp * 1.05);
  }
  if (anim.led) anim.led.offset.x = (time * 0.035) % 1;

  // Truck drives in as you approach the vehicle section
  if (anim.truck) {
    const dp = smooth(vehicleIdx - 1.1, vehicleIdx - 0.05, s);
    const x = 64 + dp * 18;
    const dx = x - anim.truck.position.x;
    anim.truck.position.x = x;
    anim.truck.position.y = Math.abs(dx) > 0.001 ? Math.sin(time * 18) * 0.015 : 0;
    anim.wheels.forEach((w) => { w.rotation.y -= dx / 0.58; });
  }

  // Dust drift
  dust.rotation.y = Math.sin(time * 0.05) * 0.02;
  dust.position.y = Math.sin(time * 0.3) * 0.3;

  composer.render();
  requestAnimationFrame(tick);
}

addEventListener('resize', () => {
  isMobile = innerWidth < 860;
  camera.aspect = innerWidth / innerHeight;
  camera.fov = isMobile ? 55 : 42;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  bloom.setSize(innerWidth, innerHeight);
});

build()
  .catch((err) => console.error('[scene] build failed', err))
  .finally(() => {
    // jump camera straight to its first key so there's no swoop on load
    computeTarget(scrollParam());
    camPos.copy(wantPos); camTgt.copy(wantTgt);
    requestAnimationFrame(tick);
    setTimeout(() => { started = true; finish(); }, 250);
  });
