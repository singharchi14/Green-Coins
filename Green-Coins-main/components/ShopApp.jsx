'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, when } from './ui';

export default function ShopApp() {
  const [d, setD] = useState(null), [err, setErr] = useState(''), [ok, setOk] = useState(''), [f, setF] = useState({}), [code, setCode] = useState('');
  const load = useCallback(() => api('/api/shop/me').then(x => { setD(x); if (x.shop) setF({ offerText: x.shop.offerText, coinCost: x.shop.coinCost, dailyLimit: x.shop.dailyLimit }); }).catch(e => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const post = async (url, body, method = 'POST') => { setErr(''); setOk(''); try { const r = await api(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return r; } catch (e) { setErr(e.message); return null; } };
  if (!d) return <p className="sub">{err || 'Loading…'}</p>;
  const field = (k, label, ph) => <div className="field"><label>{label}</label><input type="text" placeholder={ph} value={f[k] || ''} onChange={e => setF({ ...f, [k]: e.target.value })} /></div>;

  if (!d.shop) return (
    <div className="card-wide"><h3 className="step">Apply as a partner shop</h3>
      <p className="sub">Kirana stores, tea stalls, repair shops and pharmacies in the pilot mohallas can join. Your application is reviewed before you appear to citizens.</p>
      {err && <div className="err">{err}</div>}
      {field('name', 'Shop name')}{field('ownerName', 'Owner’s name')}{field('phone', 'Mobile number')}{field('address', 'Address')}{field('licence', 'Licence or registration number')}
      <button className="btn" onClick={async () => { if (await post('/api/shop/apply', f)) { setF({}); load(); } }}>Submit application</button></div>);

  const s = d.shop;
  if (s.status !== 'APPROVED') return <div className="box"><h3>{s.name}</h3><p className="sub" style={{ margin: 0 }}>{s.status === 'PENDING' ? 'Your application is under review. You will see your shop panel here once it is approved.' : 'Your application was not approved.'}</p></div>;

  return (
    <>
      <div className="stats"><div className="box"><h3>Redeemed today</h3><div className="big">{d.stats.today}<small>/ {s.dailyLimit}</small></div></div><div className="box"><h3>Total redeemed</h3><div className="big">{d.stats.total}</div></div>
        <div className="box"><h3>Status</h3><div className="big" style={{ fontSize: '1.3rem' }}>{s.paused ? 'Paused' : 'Accepting coins'}</div><button className="link" onClick={async () => { await post('/api/shop/me', { paused: !s.paused }, 'PATCH'); load(); }}>{s.paused ? 'Resume' : 'Pause'}</button></div></div>
      <h3 className="step">Verify a citizen’s code</h3>
      <div className="verify"><input type="text" maxLength={6} placeholder="ABC123" value={code} onChange={e => setCode(e.target.value.toUpperCase())} />
        <button className="btn" disabled={code.length < 6} onClick={async () => { const r = await post('/api/shop/verify', { code }); if (r) { setOk(`Verified. Give ${r.citizen} the offer: ${r.offer || 'as agreed'}`); setCode(''); load(); } }}>Verify</button></div>
      {err && <div className="err">{err}</div>}{ok && <div className="okmsg">{ok}</div>}
      <h3 className="step">Your offer</h3>
      {field('offerText', 'What citizens get (e.g. Free tea, ₹20 off)', 'Free tea')}
      <div className="two">{field('coinCost', 'Coins needed (20 to 200)')}{field('dailyLimit', 'Daily redemption limit')}</div>
      <button className="btn" onClick={async () => { if (await post('/api/shop/me', { offerText: f.offerText, coinCost: Number(f.coinCost), dailyLimit: Number(f.dailyLimit) }, 'PATCH')) { setOk('Saved'); load(); } }}>Save offer</button>
      <p className="tip">Rules: no raising prices for coin users, and no redeeming at your own shop.</p>
      {d.recent.length > 0 && <><h3 className="step">Recent redemptions</h3><ul className="list">{d.recent.map(r => <li key={r.id}><div><b>{r.code}</b><small>{when(r.redeemedAt)}</small></div><span>{r.coins} coins</span></li>)}</ul></>}
    </>
  );
}
