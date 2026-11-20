// Shared 3D kit for the inner pages (How it works / Program rules / Partner shops). Uses the same three.js r128 as the landing.
(() => {
const T = THREE; let seed = 7; const rng = () => (seed = seed * 16807 % 2147483647, (seed - 1) / 2147483646);
const R2 = (a, b) => a + rng() * (b - a), C = c => new T.Color(c).convertSRGBToLinear();
const mk = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t; };
const speck = (x, w, h, n) => { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${rng() < .5 ? 0 : 255},0,0,0)`; const v = rng() < .5 ? 0 : 255; x.fillStyle = `rgba(${v},${v},${v},${R2(.02, .12)})`; x.fillRect(R2(0, w), R2(0, h), R2(1, 4), R2(1, 4)); } };
const label = (t, bg, fg, w = 256, h = 96, f = 44) => mk(w, h, (x, W, H) => { x.fillStyle = bg; x.fillRect(0, 0, W, H); speck(x, W, H, 500); x.fillStyle = fg; x.font = `700 ${f}px Inter,sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, W / 2, H / 2 + 2); });

function stage(canvas) {
  const R = new T.WebGLRenderer({ canvas, antialias: true });
  R.setPixelRatio(Math.min(devicePixelRatio, 1.75)); R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = .95;
  R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
  const S = new T.Scene(), envS = new T.Scene();
  const grad = (a, b) => mk(2, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  envS.add(new T.Mesh(new T.SphereGeometry(50, 24, 16), new T.MeshBasicMaterial({ map: grad('#7fa6c4', '#f1e6cc'), side: T.BackSide })));
  const sb = new T.Mesh(new T.SphereGeometry(6, 12, 8), new T.MeshBasicMaterial({ color: new T.Color(6, 5.3, 4) })); sb.position.set(-20, 28, 25); envS.add(sb);
  S.environment = new T.PMREMGenerator(R).fromScene(envS, .02).texture;
  S.background = grad('#9db8c8', '#e6d9bd'); S.fog = new T.Fog(C('#d9cdb3'), 18, 70);
  const cam = new T.PerspectiveCamera(30, 1, .1, 220);
  S.add(new T.HemisphereLight(C('#dfe8f2'), C('#b39f7e'), .3));
  const sun = new T.DirectionalLight(C('#ffe7bd'), 1.9); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0006;
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 16, bottom: -16, near: 1, far: 80 }); S.add(sun, sun.target);
  const M = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: C(c), roughness: .85, envMapIntensity: .55 }, o));
  const TM = (map, o) => new T.MeshStandardMaterial(Object.assign({ map, roughness: .9, envMapIntensity: .55 }, o));
  const add = (g, m, x, y, z, p, cast) => { const o = new T.Mesh(g, m); o.position.set(x, y, z); o.castShadow = !!cast; o.receiveShadow = true; (p || S).add(o); return o; };
  const bx = (w, h, d, m, x, y, z, p) => add(new T.BoxGeometry(w, h, d), m, x, y, z, p, true);
  const dirt = mk(256, 256, (x, w, h) => { x.fillStyle = '#b4a384'; x.fillRect(0, 0, w, h); speck(x, w, h, 4000); }); dirt.wrapS = dirt.wrapT = T.RepeatWrapping; dirt.repeat.set(40, 12);
  add(new T.PlaneGeometry(400, 120).rotateX(-Math.PI / 2), TM(dirt), 0, -.02, 0);

  const faceTex = mk(128, 128, (x, w, h) => { const g = x.createRadialGradient(50, 44, 6, 64, 64, 64); g.addColorStop(0, '#ffe9a3'); g.addColorStop(.6, '#e8a920'); g.addColorStop(1, '#a8730c'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.strokeStyle = '#8a5d08'; x.lineWidth = 5; x.beginPath(); x.arc(64, 64, 52, 0, 7); x.stroke(); x.fillStyle = '#7a5200'; x.font = '800 44px Inter'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('GC', 64, 66); });
  const gold = new T.MeshStandardMaterial({ color: C('#e8a920'), metalness: .9, roughness: .32, envMapIntensity: 1.3 }), face = new T.MeshStandardMaterial({ map: faceTex, metalness: .8, roughness: .35, envMapIntensity: 1.2 });
  const coin = (p, x, y, z, r = .5) => { const o = new T.Mesh(new T.CylinderGeometry(r, r, .1, 40), [gold, face, face]); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; (p || S).add(o); return o; };
  const bin = (color, name, x, z) => {
    const g = new T.Group(); g.position.set(x, 0, z); S.add(g);
    add(new T.CylinderGeometry(.62, .5, 1.2, 28), M(color), 0, .6, 0, g, true); add(new T.CylinderGeometry(.67, .67, .12, 28), M(color, { roughness: .6 }), 0, 1.26, 0, g, true);
    const l = add(new T.PlaneGeometry(.62, .24), TM(label(name, '#f3eddd', '#10231a', 256, 100, 38)), 0, .62, .575, g); l.rotation.x = -.05; return g;
  };
  const ro = [0, 0];
  function resize() { const w = innerWidth, h = innerHeight; R.setSize(w, h, false); cam.aspect = w / h; const m = innerWidth > 860; cam.setViewOffset(w, h, m ? -w * .2 : 0, m ? 0 : h * .12, w, h); cam.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  // poses: [{p:[x,y,z], t:[x,y,z]}] one per <section>; camera glides between them as you scroll.
  function run(poses, anim) {
    const secs = [...document.querySelectorAll('main section')]; let cf = 0; const v = new T.Vector3(), tg = new T.Vector3();
    const ease = x => x * x * (3 - 2 * x);
    (function loop(ms) {
      const mid = scrollY + innerHeight * .45; let i = 0; secs.forEach((s, k) => { if (s.offsetTop <= mid) i = k; });
      const f = Math.min(secs.length - 1, i + Math.min(1, (mid - secs[i].offsetTop) / secs[i].offsetHeight));
      cf += (f - cf) * .07; const a = Math.min(poses.length - 1, Math.floor(cf)), b = Math.min(poses.length - 1, a + 1), k = ease(cf - a);
      ['p', 't'].forEach(n => { const A = poses[a][n], B = poses[b][n], o = n === 'p' ? v : tg; o.set(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k); });
      cam.position.copy(v); cam.lookAt(tg); sun.position.set(tg.x - 14, 22, tg.z + 12); sun.target.position.copy(tg);
      anim && anim(ms / 1000, cf); R.render(S, cam); requestAnimationFrame(loop);
    })(0);
  }
  return { S, M, TM, add, bx, coin, bin, mk, label, speck, C, run, rng, R2, T };
}
window.GC = { stage };
})();
