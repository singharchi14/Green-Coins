// Page scenes. Each reads <body data-page="..."> and builds its own 3D set on the shared kit.
(() => {
const K = GC.stage(document.getElementById('c')), { S, M, TM, add, bx, coin, bin, mk, label, speck, T, R2 } = K;
const page = document.body.dataset.page, BINS = [['#4c8a4a', 'Wet'], ['#3d6fa5', 'Dry'], ['#d49a2a', 'Recycle'], ['#b5453a', 'Hazard'], ['#555b66', 'E-waste']];
const pose = (x, y, z, tx, ty, tz) => ({ p: [x, y, z], t: [tx, ty, tz] });
const stripes = (a, b) => { const t = mk(128, 32, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? a : b; x.fillRect(i * 16, 0, 16, h); } }); return t; };
const stall = (x, z, body, aw1, aw2, sign, w = 4) => {
  const g = new T.Group(); g.position.set(x, 0, z); S.add(g);
  bx(w, 2.6, 2.4, M(body), 0, 1.3, 0, g); bx(w - 1.4, .9, .1, M('#3a2c22'), 0, 1.25, 1.21, g); bx(w - 1, .12, .5, M('#8a4b3a'), 0, .78, 1.45, g);
  const aw = bx(w + .3, .1, 1.5, TM(stripes(aw1, aw2)), 0, 2.45, 1.55, g); aw.rotation.x = .42;
  bx(2.6, .7, .14, M('#f3eddd'), 0, 2.95, .5, g); add(new T.PlaneGeometry(2.4, .6), TM(label(sign, '#f3eddd', '#10231a', 512, 128, 62)), 0, 2.95, .58, g); return g;
};

if (page === 'how') {
  // five stations, 10 units apart: phone, bins, photo check, coin wallet, shop
  const phone = new T.Group(); phone.position.set(0, 1.6, 0); S.add(phone);
  bx(1.3, 2.5, .14, M('#1b2a22', { roughness: .4 }), 0, 0, 0, phone);
  add(new T.PlaneGeometry(1.14, 2.3), TM(mk(228, 460, (x, w, h) => { x.fillStyle = '#f3eddd'; x.fillRect(0, 0, w, h); x.fillStyle = '#10231a'; x.font = '600 24px Inter'; x.textAlign = 'center'; x.fillText('Enter your code', w / 2, 110); x.font = '500 17px Inter'; x.fillStyle = '#56675d'; x.fillText('sent to +91 •••••• 210', w / 2, 144); '482917'.split('').forEach((d, i) => { const X = 16 + i * 33; x.strokeStyle = '#0f5c3c'; x.lineWidth = 2; x.strokeRect(X, 190, 28, 40); x.fillStyle = '#10231a'; x.font = '700 24px Inter'; x.fillText(d, X + 14, 219); }); x.fillStyle = '#0f5c3c'; x.fillRect(16, 290, 196, 44); x.fillStyle = '#fff'; x.font = '600 18px Inter'; x.fillText('Verify', w / 2, 319); })), 0, 0, .075, phone);
  add(new T.CylinderGeometry(1.1, 1.3, .3, 32), M('#d9cdb3'), 0, .15, 0, undefined, true);
  BINS.forEach((b, i) => bin(b[0], b[1], 10 + (i - 2) * 1.55, 0));
  const frame = new T.Group(); frame.position.set(20, 1.7, 0); S.add(frame);
  bx(2.9, 2.3, .12, M('#f3eddd'), 0, 0, 0, frame);
  add(new T.PlaneGeometry(2.6, 2), TM(mk(260, 200, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#c9d6d8'); g.addColorStop(1, '#b4a384'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = '#4c8a4a'; x.fillRect(80, 60, 100, 120); x.fillStyle = '#3a6e3a'; x.fillRect(72, 50, 116, 16); speck(x, w, h, 900); })), 0, 0, .07, frame);
  const scan = add(new T.PlaneGeometry(2.7, .05), new T.MeshBasicMaterial({ color: 0x3ddc84 }), 0, 0, .1, frame), ok = add(new T.CircleGeometry(.38, 32), new T.MeshBasicMaterial({ map: mk(64, 64, (x, w, h) => { x.fillStyle = '#0f5c3c'; x.beginPath(); x.arc(32, 32, 31, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 7; x.lineCap = 'round'; x.beginPath(); x.moveTo(18, 33); x.lineTo(28, 43); x.lineTo(47, 22); x.stroke(); }), transparent: true }), .9, -.7, .12, frame);
  add(new T.CylinderGeometry(1.6, 1.8, .3, 32), M('#d9cdb3'), 20, .15, 0);
  const pile = []; for (let i = 0; i < 9; i++) pile.push(coin(null, 30, .1 + i * .11, 0, .75)); const drop = coin(null, 30, 5, 0, .75);
  const shop = stall(40, 0, '#c98a5b', '#b5453a', '#f3eddd', 'Coming soon', 4.4);
  K.run([pose(1.5, 3, 12, 0, 1.5, 0), pose(11.5, 3.4, 13, 10, 1.1, 0), pose(21.5, 3, 12, 20, 1.6, 0), pose(31.5, 3, 12, 30, 1.2, 0), pose(41.5, 3.4, 13, 40, 1.4, 0), pose(27, 9, 26, 20, 1.2, 0)], (t, cf) => {
    phone.rotation.y = Math.sin(t * .7) * .3; phone.position.y = 1.6 + Math.sin(t) * .06;
    const q = t % 2.2; scan.position.y = (q / 2.2 * 2 - 1) * .98; ok.visible = q > 1.1;
    const c = (t % 1.6) / 1.6; drop.position.y = 5 - (5 - 1.1) * c * c; drop.rotation.x = c * 6; drop.visible = c < .98;
  });
} else if (page === 'rules') {
  const counts = [5, 5, 10, 15, 20], stacks = [];
  BINS.forEach((b, i) => { const x = (i - 2) * 2.5; bin(b[0], b[1], x, 0); const st = []; for (let n = 0; n < counts[i]; n++) st.push(coin(null, x, .1 + n * .11, 1.6, .55)); stacks.push(st); });
  const tk = new T.Group(); tk.position.set(14, 1.3, 0); S.add(tk); bx(2.6, 1.6, .08, TM(mk(520, 320, (x, w, h) => { x.fillStyle = '#f3eddd'; x.fillRect(0, 0, w, h); x.fillStyle = '#0f5c3c'; x.fillRect(0, 0, w, 56); x.fillStyle = '#fff'; x.font = '700 28px Inter'; x.textAlign = 'left'; x.fillText('GREEN COINS', 24, 38); x.fillStyle = '#56675d'; x.font = '600 20px Inter'; x.fillText('REDEMPTION CODE', 24, 110); x.fillStyle = '#10231a'; x.font = '700 62px Inter'; x.fillText('GC-4F7K', 24, 190); x.fillStyle = '#56675d'; x.font = '500 20px Inter'; x.fillText('Works once · expires soon', 24, 262); speck(x, w, h, 700); })), 0, 0, 0, tk);
  const house = new T.Group(); house.position.set(25, 0, 0); S.add(house); bx(2.8, 1.8, 2.4, M('#c98a5b'), 0, .9, 0, house); const roof = add(new T.ConeGeometry(2.4, 1.3, 4), M('#8a4b3a'), 0, 2.45, 0, house, true); roof.rotation.y = Math.PI / 4; bx(.6, 1.1, .1, M('#4a3426'), 0, .55, 1.22, house);
  window.__hl = -1; document.querySelectorAll('tr[data-i]').forEach(r => { r.onmouseenter = () => window.__hl = +r.dataset.i; r.onmouseleave = () => window.__hl = -1; });
  K.run([pose(-1, 4.2, 22, -2.5, 1.4, 0), pose(14, 3.2, 10, 14, 1.3, 0), pose(25, 3.8, 13, 25, 1.3, 0)], (t, cf) => {
    stacks.forEach((s, i) => s.forEach((c, n) => { const on = window.__hl === i; c.position.y = .1 + n * .11 + (on ? Math.max(0, Math.sin(t * 6 - n * .5)) * .06 : 0); }));
    tk.rotation.y = Math.sin(t * .6) * .25; house.rotation.y = Math.sin(t * .4) * .15;
  });
} else {
  const shops = [stall(-4.7, 0, '#c98a5b', '#b5453a', '#f3eddd', 'Kirana'), stall(0, 0, '#6f8f6a', '#e8a920', '#f3eddd', 'Tea'), stall(4.7, 0, '#7f8794', '#0f5c3c', '#f3eddd', 'Repair')];
  const pole = add(new T.CylinderGeometry(.06, .06, 3.2, 10), M('#2a2e2b'), 0, 1.6, 3.4, undefined, true), sign = coin(null, 0, 3.6, 3.4, .8); sign.rotation.x = Math.PI / 2;
  const ppl = []; ['#10231a', '#b5453a', '#3d6fa5', '#4c8a4a', '#d49a2a', '#555b66', '#8a4b3a'].forEach((c, i) => { const g = new T.Group(); add(new T.CylinderGeometry(.22, .26, .9, 12), M(c), 0, .55, 0, g, true); add(new T.SphereGeometry(.2, 14, 10), M('#c6956b'), 0, 1.2, 0, g, true); g.position.set(-9 + i * 3, 0, 5.2 + (i % 2) * .6); g.userData = { v: .3 + (i % 3) * .1 }; S.add(g); ppl.push(g); });
  K.run([pose(0, 4.5, 20, 0, 1.6, 0), pose(-5, 3.4, 15, -3, 1.5, 0), pose(0, 3.6, 15, 0, 1.5, 0), pose(5, 3.4, 15, 3, 1.5, 0), pose(0, 6, 19, 0, 1.2, 0), pose(0, 4, 17, 0, 1.6, 0)], t => {
    sign.rotation.z = t * .8; ppl.forEach(g => { g.position.x += g.userData.v * .016; if (g.position.x > 9) g.position.x = -9; g.position.y = Math.abs(Math.sin(t * 5 + g.position.z)) * .05; });
  });
}
})();
