'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { CATEGORIES } from '@/lib/config';
import { api, when, shrink, istDays, day } from './ui';

const Meter = ({ label, v, max }) => (
  <div className="meter"><div className="mt"><span>{label}</span><b>{v}/{max}</b></div><i><u style={{ width: Math.min(100, (v / max) * 100) + '%' }} /></i></div>
);
const Chip = ({ s }) => <span className={'chip ' + s}>{{ APPROVED: 'Approved', REJECTED: 'Rejected', REVIEW: 'In review', PENDING: 'Active', REDEEMED: 'Used', EXPIRED: 'Expired' }[s] || s}</span>;

function Earn({ onBalance }) {
  const [cat, setCat] = useState(null), [file, setFile] = useState(null), [url, setUrl] = useState(null);
  const [busy, setBusy] = useState(false), [res, setRes] = useState(null), [err, setErr] = useState(''), [usage, setUsage] = useState(null);
  const input = useRef();
  const load = useCallback(() => api('/api/submissions').then(d => setUsage(d.usage)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  const pick = f => { if (!f) return; setFile(f); setRes(null); setErr(''); setUrl(URL.createObjectURL(f)); };
  const reset = () => { setFile(null); setUrl(null); setCat(null); setRes(null); setErr(''); if (input.current) input.current.value = ''; };
  async function submit() {
    setBusy(true); setErr(''); setRes(null);
    try {
      const blob = await shrink(file), fd = new FormData();
      fd.append('category', cat); fd.append('image', blob, 'waste.jpg');
      const d = await api('/api/submissions', { method: 'POST', body: fd });
      setRes(d); onBalance(d.balance); load();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <>
      {usage && <div className="meters"><Meter label="Photos today" v={usage.photosToday} max={usage.perDay} /><Meter label="Coins today" v={usage.coinsToday} max={usage.coinsPerDay} /><Meter label="Coins this month" v={usage.coinsMonth} max={usage.coinsPerMonth} /></div>}
      {res ? (
        <div className={'result ' + res.status}>
          <h3>{res.status === 'APPROVED' ? `Approved · +${res.coins} Green Coins` : res.status === 'REVIEW' ? 'Sent for review' : 'Not approved'}</h3>
          <p>{res.reason}</p>
          {res.status === 'REVIEW' && <p>A person will check it, usually within a day. Coins are added when it is approved.</p>}
          <button className="btn" onClick={reset}>Submit another</button>
        </div>
      ) : (
        <>
          <h3 className="step">1. What does your photo show?</h3>
          <div className="cats">
            {Object.entries(CATEGORIES).map(([k, c]) => (
              <button key={k} className={'cat' + (cat === k ? ' on' : '')} onClick={() => setCat(k)}>
                <b>{c.label}</b><span>{c.hint}</span><em>+{c.coins}</em>
              </button>
            ))}
          </div>
          <h3 className="step">2. Take one clear photo</h3>
          <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={e => pick(e.target.files[0])} />
          <button className={'drop' + (url ? ' has' : '')} onClick={() => input.current.click()}>
            {url ? <img src={url} alt="Your waste photo" /> : <span>Tap to open the camera or choose a photo</span>}
          </button>
          <p className="tip">Fresh, in good light, waste clearly in frame. No screenshots, internet images or faces.</p>
          {err && <div className="err">{err}</div>}
          <button className="btn" disabled={!cat || !file || busy} onClick={submit}>{busy ? <><span className="spin" />Checking your photo…</> : 'Submit for verification'}</button>
        </>
      )}
    </>
  );
}

function Wallet() {
  const [w, setW] = useState(null), [subs, setSubs] = useState([]);
  useEffect(() => { api('/api/wallet').then(setW).catch(() => {}); api('/api/submissions').then(d => setSubs(d.items)).catch(() => {}); }, []);
  if (!w) return <p className="sub">Loading…</p>;
  return (
    <div className="two-col">
      <div><h3 className="step">Coin history</h3>
        {w.txns.length === 0 ? <p className="sub">No coins yet. Submit your first photo.</p> : <ul className="list">{w.txns.map(t => <li key={t.id}><div><b>{t.note || t.kind}</b><small>{when(t.createdAt)}</small></div><span className={t.delta > 0 ? 'pos' : 'neg'}>{t.delta > 0 ? '+' : ''}{t.delta}</span></li>)}</ul>}
      </div>
      <div><h3 className="step">Your photos</h3>
        {subs.length === 0 ? <p className="sub">Nothing submitted yet.</p> : <ul className="list">{subs.map(s => <li key={s.id}><div><b>{CATEGORIES[s.category]?.label}</b><small>{s.status === 'REJECTED' || s.status === 'REVIEW' ? s.reason : when(s.createdAt)}</small></div><Chip s={s.status} /></li>)}</ul>}
      </div>
    </div>
  );
}

function Redeem({ balance, onBalance }) {
  const [shops, setShops] = useState([]), [mine, setMine] = useState([]), [err, setErr] = useState(''), [busy, setBusy] = useState('');
  const load = useCallback(() => { api('/api/shops').then(d => setShops(d.shops)).catch(() => {}); api('/api/redemptions').then(d => setMine(d.items)).catch(() => {}); api('/api/auth/me').then(d => onBalance(d.user.coins)).catch(() => {}); }, [onBalance]);
  useEffect(() => { load(); }, [load]);
  const active = mine.find(r => r.status === 'PENDING' && new Date(r.expiresAt) > new Date());
  const [, tick] = useState(0); useEffect(() => { const t = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(t); }, []);
  async function get(id) { setBusy(id); setErr(''); try { await api('/api/redemptions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ shopId: id }) }); load(); } catch (e) { setErr(e.message); } setBusy(''); }
  const left = active ? Math.max(0, Math.floor((new Date(active.expiresAt) - Date.now()) / 1000)) : 0;
  return (
    <>
      {active && <div className="codebox"><small>Show this code at {active.shop}</small><div className="code">{active.code}</div><p>{active.offer || 'Ask the shop for the offer'} · {active.coins} coins · expires in {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</p></div>}
      {err && <div className="err">{err}</div>}
      <h3 className="step">Partner shops near you</h3>
      {shops.length === 0 ? <p className="sub">No partner shops have joined yet.</p> : <ul className="list">{shops.map(s => (
        <li key={s.id}><div><b>{s.name}</b><small>{s.offerText || 'Offer coming soon'} · {s.address}</small></div>
          <button className="btn small" disabled={!!active || balance < s.coinCost || busy === s.id} onClick={() => get(s.id)}>{s.coinCost} coins</button></li>))}</ul>}
      <p className="tip">Coins are loyalty points. They have no cash value and can’t be transferred or withdrawn. Each code works once.</p>
      {mine.filter(r => r !== active).length > 0 && <><h3 className="step">Past codes</h3><ul className="list">{mine.filter(r => r !== active).map(r => <li key={r.id}><div><b>{r.shop}</b><small>{when(r.createdAt)} · {r.coins} coins</small></div><Chip s={r.status} /></li>)}</ul></>}
    </>
  );
}

const STEPS = [['REQUESTED', 'Requested'], ['ASSIGNED', 'Assigned'], ['COLLECTED', 'Collected'], ['VERIFIED', 'Verified']];
const Track = ({ s }) => {
  const at = STEPS.findIndex(x => x[0] === s);
  return <ol className="track">{STEPS.map(([k, l], i) => <li key={k} className={i < at ? 'done' : i === at ? 'now' : ''}><i />{l}</li>)}</ol>;
};

function Pickup({ onBalance }) {
  const [items, setItems] = useState(null), [rules, setRules] = useState(null), [err, setErr] = useState(''), [ok, setOk] = useState(''), [busy, setBusy] = useState('');
  const days = istDays(8);
  const [f, setF] = useState({ category: '', estKg: '', day: days[1].value, note: '' });
  const load = useCallback(() => api('/api/pickups').then(d => { setItems(d.items); setRules(d.rules); }).catch(e => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  async function post(url, body, done) {
    setBusy(url); setErr(''); setOk('');
    try { const d = await api(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); done?.(d); await load(); } catch (e) { setErr(e.message); }
    setBusy('');
  }
  const submit = () => post('/api/pickups', { ...f, estKg: Number(f.estKg) }, () => { setF({ category: '', estKg: '', day: days[1].value, note: '' }); setOk('Pickup requested. Show the handover code to the worker when they arrive.'); });
  const act = (p, action) => post(`/api/pickups/${p.id}`, { action }, d => { if (action === 'confirm') { setOk(`Verified · +${d.coins} Green Coins`); api('/api/auth/me').then(m => onBalance(m.user.coins)).catch(() => {}); } });
  if (!items) return <p className="sub">{err || 'Loading…'}</p>;
  const valid = f.category && Number(f.estKg) >= (rules?.minKg || 0.2) && Number(f.estKg) <= (rules?.maxKg || 25);
  return (
    <>
      {err && <div className="err">{err}</div>}{ok && <div className="okmsg">{ok}</div>}
      <h3 className="step">Request a doorstep pickup</h3>
      <div className="cats">{Object.entries(CATEGORIES).map(([k, c]) => <button key={k} className={'cat' + (f.category === k ? ' on' : '')} onClick={() => setF({ ...f, category: k })}><b>{c.label}</b><span>{c.hint}</span><em>{rules?.coinsPerKg?.[k]}/kg</em></button>)}</div>
      <div className="two" style={{ margin: '14px 0' }}>
        <div className="field" style={{ margin: 0 }}><label htmlFor="kg">Approximate weight (kg)</label><input id="kg" type="number" inputMode="decimal" min="0.2" max="25" step="0.1" value={f.estKg} onChange={set('estKg')} /></div>
        <div className="field" style={{ margin: 0 }}><label htmlFor="day">Pickup day</label><select id="day" className="sel" value={f.day} onChange={set('day')}>{days.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
      </div>
      <div className="field"><label htmlFor="note">Where to find it (optional)</label><input id="note" type="text" maxLength={200} placeholder="e.g. Bag outside the gate, House 14" value={f.note} onChange={set('note')} /></div>
      <p className="tip">Coins are paid on the weight the worker measures, not your estimate (max {rules?.maxCoins} per pickup). One request per category every {rules?.repeatDays} days, up to {rules?.maxActive} open at a time.</p>
      <button className="btn" disabled={!valid || !!busy} onClick={submit}>Request pickup</button>

      <h3 className="step">Your pickups</h3>
      {items.length === 0 ? <p className="sub">No pickups yet.</p> : <div className="pk">{items.map(p => (
        <div key={p.id} className="box">
          <div className="pkh"><b>{CATEGORIES[p.category]?.label} · ~{p.estKg} kg</b><span className={'chip ' + (p.status === 'CANCELLED' ? 'REJECTED' : 'APPROVED')}>{p.status.toLowerCase()}</span></div>
          <small className="tip" style={{ display: 'block', margin: '4px 0 12px' }}>Pickup day {day(p.preferredDay)}{p.worker ? ` · Worker ${p.worker}` : ''}{p.note ? ` · ${p.note}` : ''}</small>
          {p.status !== 'CANCELLED' && <Track s={p.status} />}
          {p.handoverCode && <div className="handover"><small>Handover code. Give it to the worker only when they take the waste</small><div className="code sm">{p.handoverCode}</div></div>}
          {p.status === 'COLLECTED' && <div><p className="tip">The worker weighed <b>{p.collectedKg} kg</b>. Confirm to receive your coins.</p><button className="btn small" disabled={!!busy} onClick={() => act(p, 'confirm')}>Confirm collection</button></div>}
          {p.status === 'VERIFIED' && <p className="tip"><span className="pos">+{p.coins} coins</span> for {p.collectedKg} kg · {when(p.verifiedAt)}</p>}
          {['REQUESTED', 'ASSIGNED'].includes(p.status) && <button className="btn small line" disabled={!!busy} onClick={() => act(p, 'cancel')}>Cancel request</button>}
        </div>))}</div>}
    </>
  );
}

function Impact() {
  const [d, setD] = useState(null);
  useEffect(() => { fetch('/api/impact').then(r => r.json()).then(setD).catch(() => {}); }, []);
  if (!d) return <p className="sub">Loading…</p>;
  const cells = [['Households', d.households], ['Photos approved', d.approvedPhotos], ['Verified waste collected', (d.kgDiverted || 0) + ' kg'], ['Coins issued', d.coinsIssued], ['Redeemed locally', d.redemptions], ['Partner shops', d.partnerShops]];
  return (<><div className="stats">{cells.map(([l, v]) => <div key={l} className="box"><h3>{l}</h3><div className="big">{v}</div></div>)}</div>
    <h3 className="step">Approved photos by category</h3>
    <ul className="list">{Object.entries(CATEGORIES).map(([k, c]) => <li key={k}><b>{c.label}</b><span>{d.byCategory[k] || 0}</span></li>)}</ul></>);
}

export default function CitizenApp({ initialCoins }) {
  const [tab, setTab] = useState('earn'), [coins, setCoins] = useState(initialCoins);
  const tabs = [['earn', 'Earn'], ['pickup', 'Pickup'], ['wallet', 'Wallet'], ['redeem', 'Spend'], ['impact', 'Community']];
  return (
    <>
      <div className="box balance"><h3>Green Coins balance</h3><div className="big">{coins}<small>coins</small></div></div>
      <div className="tabs">{tabs.map(([k, l]) => <button key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'earn' && <Earn onBalance={setCoins} />}
      {tab === 'pickup' && <Pickup onBalance={setCoins} />}
      {tab === 'wallet' && <Wallet />}
      {tab === 'redeem' && <Redeem balance={coins} onBalance={setCoins} />}
      {tab === 'impact' && <Impact />}
    </>
  );
}
