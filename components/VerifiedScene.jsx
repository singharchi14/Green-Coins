'use client';
import { useEffect, useRef } from 'react';

// Full-screen 3D "verified" moment shown right after a successful OTP.
// Uses the same three.js r128 build that the landing pages use (served from /vendor/three.min.js).
function loadThree() {
  if (typeof window === 'undefined') return Promise.reject();
  if (window.THREE) return Promise.resolve(window.THREE);
  return new Promise((res, rej) => {
    let s = document.querySelector('script[data-three]');
    if (!s) { s = document.createElement('script'); s.src = '/vendor/three.min.js'; s.async = true; s.dataset.three = '1'; document.head.appendChild(s); }
    s.addEventListener('load', () => res(window.THREE));
    s.addEventListener('error', rej);
  });
}

export default function VerifiedScene({ name, onDone, duration = 3200 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let raf = 0, dead = false, timer = 0, cleanup = () => {};
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    timer = setTimeout(() => onDone && onDone(), reduce ? 900 : duration);

    loadThree().then(T => {
      if (dead) return;
      const canvas = canvasRef.current;
      let R;
      try { R = new T.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return; } // no WebGL → just wait for timer
      R.setPixelRatio(Math.min(devicePixelRatio, 2)); R.outputEncoding = T.sRGBEncoding;
      R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;

      const S = new T.Scene(), cam = new T.PerspectiveCamera(36, 1, .1, 100); cam.position.set(0, 0, 9);

      // tiny studio environment so the gold actually looks metallic
      const envS = new T.Scene();
      const gc = document.createElement('canvas'); gc.width = 2; gc.height = 128; const gx = gc.getContext('2d');
      const g = gx.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#9fc3dc'); g.addColorStop(1, '#f1e6cc'); gx.fillStyle = g; gx.fillRect(0, 0, 2, 128);
      envS.add(new T.Mesh(new T.SphereGeometry(50, 24, 16), new T.MeshBasicMaterial({ map: new T.CanvasTexture(gc), side: T.BackSide })));
      const sb = new T.Mesh(new T.SphereGeometry(6, 12, 8), new T.MeshBasicMaterial({ color: new T.Color(6, 5.3, 4) })); sb.position.set(-18, 24, 20); envS.add(sb);
      S.environment = new T.PMREMGenerator(R).fromScene(envS, .02).texture;

      S.add(new T.HemisphereLight(0xdfe8f2, 0x8a7a55, .6));
      const sun = new T.DirectionalLight(0xffe7bd, 2); sun.position.set(-4, 6, 8); S.add(sun);

      // coin face with a check mark
      const mk = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t; };
      const faceTex = mk(512, 512, (x, w, h) => {
        const gr = x.createRadialGradient(190, 170, 20, 256, 256, 256); gr.addColorStop(0, '#fff0b3'); gr.addColorStop(.6, '#e8a920'); gr.addColorStop(1, '#a8730c');
        x.fillStyle = gr; x.fillRect(0, 0, w, h);
        x.strokeStyle = '#8a5d08'; x.lineWidth = 18; x.beginPath(); x.arc(256, 256, 210, 0, 7); x.stroke();
        x.strokeStyle = '#0f5c3c'; x.lineWidth = 40; x.lineCap = 'round'; x.lineJoin = 'round';
        x.beginPath(); x.moveTo(160, 270); x.lineTo(230, 340); x.lineTo(360, 185); x.stroke();
      });
      const plainTex = mk(256, 256, (x, w, h) => {
        const gr = x.createRadialGradient(100, 90, 10, 128, 128, 128); gr.addColorStop(0, '#ffe9a3'); gr.addColorStop(.6, '#e8a920'); gr.addColorStop(1, '#a8730c'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
        x.strokeStyle = '#8a5d08'; x.lineWidth = 10; x.beginPath(); x.arc(128, 128, 104, 0, 7); x.stroke();
        x.fillStyle = '#7a5200'; x.font = '800 90px Inter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('G', 128, 136);
      });
      const edge = new T.MeshStandardMaterial({ color: 0xe8a920, metalness: .9, roughness: .3, envMapIntensity: 1.3 });
      const heroFace = new T.MeshStandardMaterial({ map: faceTex, metalness: .75, roughness: .35, envMapIntensity: 1.2 });
      const rainFace = new T.MeshStandardMaterial({ map: plainTex, metalness: .75, roughness: .35, envMapIntensity: 1.2 });

      const hero = new T.Mesh(new T.CylinderGeometry(1.5, 1.5, .26, 64), [edge, heroFace, heroFace]);
      hero.rotation.x = Math.PI / 2; const heroG = new T.Group(); heroG.add(hero); heroG.scale.setScalar(.01); S.add(heroG);

      // expanding green rings
      const rings = [0, 1, 2].map(i => {
        const m = new T.Mesh(new T.RingGeometry(1.9, 2, 64), new T.MeshBasicMaterial({ color: 0x3ddc84, transparent: true, opacity: 0, side: T.DoubleSide }));
        S.add(m); return m;
      });

      // coin rain
      const cg = new T.CylinderGeometry(.28, .28, .06, 28), rain = [];
      for (let i = 0; i < 70; i++) {
        const c = new T.Mesh(cg, [edge, rainFace, rainFace]);
        c.userData = { x: (Math.random() - .5) * 14, y: 7 + Math.random() * 9, z: (Math.random() - .5) * 5 - 1, v: 3 + Math.random() * 3, sx: Math.random() * 6, sy: Math.random() * 6, d: Math.random() * 1.2 };
        c.position.set(c.userData.x, c.userData.y, c.userData.z); S.add(c); rain.push(c);
      }

      function resize() { const w = innerWidth, h = innerHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.position.z = w / h < .8 ? 12 : 9; cam.updateProjectionMatrix(); }
      addEventListener('resize', resize); resize();

      const t0 = performance.now();
      const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
      (function loop() {
        const t = (performance.now() - t0) / 1000;
        const k = Math.min(1, t / .7); heroG.scale.setScalar(Math.max(.01, easeOutBack(k)));
        heroG.rotation.y = t < .9 ? (1 - t / .9) * Math.PI * 4 + Math.sin(t * 1.4) * .25 : Math.sin(t * 1.4) * .25;
        heroG.position.y = Math.sin(t * 2) * .08;
        rings.forEach((r, i) => { const p = ((t - .5 - i * .35) % 1.4) / 1.4; if (t > .5 + i * .35 && p >= 0) { r.scale.setScalar(1 + p * 2.2); r.material.opacity = (1 - p) * .55; } });
        rain.forEach(c => {
          const u = c.userData, tt = Math.max(0, t - u.d);
          c.position.y = u.y - tt * u.v; c.rotation.x = u.sx + tt * 3; c.rotation.z = u.sy + tt * 2;
          if (c.position.y < -7) c.position.y += 16;
        });
        R.render(S, cam); raf = requestAnimationFrame(loop);
      })();

      cleanup = () => {
        cancelAnimationFrame(raf); removeEventListener('resize', resize);
        [cg, hero.geometry, ...rings.map(r => r.geometry)].forEach(x => x.dispose());
        [edge, heroFace, rainFace, ...rings.map(r => r.material)].forEach(x => x.dispose());
        [faceTex, plainTex].forEach(x => x.dispose()); R.dispose();
      };
    }).catch(() => {});

    return () => { dead = true; clearTimeout(timer); cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div role="status" aria-live="polite" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center',
      background: 'radial-gradient(ellipse at 50% 40%, #146b47 0%, #0a3d28 60%, #052418 100%)', animation: 'gcFade .35s ease-out' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: '12%', textAlign: 'center', color: '#fff', padding: '0 20px', animation: 'gcUp .6s .5s both ease-out' }}>
        <div style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif", fontWeight: 800, fontSize: 'clamp(1.6rem, 4vw, 2.4rem)' }}>You’re verified{name ? `, ${name}` : ''}!</div>
        <div style={{ opacity: .8, marginTop: 6 }}>Taking you to your dashboard…</div>
      </div>
      <style>{`@keyframes gcFade{from{opacity:0}to{opacity:1}}@keyframes gcUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
