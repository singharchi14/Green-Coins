'use client';
import { useState, useEffect, useCallback } from 'react';
import { CATEGORIES } from '@/lib/config';
import { api, when, day } from './ui';

function Job({ p, onDone }) {
  const [code, setCode] = useState(''), [kg, setKg] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  async function collect() {
    setBusy(true); setErr('');
    try { await api(`/api/worker/pickups/${p.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, kg: Number(kg) }) }); onDone(); } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <div className="box">
      <div className="pkh"><b>{CATEGORIES[p.category]?.label} · ~{p.estKg} kg</b>{p.overdue && <span className="chip REJECTED">overdue</span>}</div>
      <small className="tip" style={{ display: 'block', margin: '4px 0 10px' }}>{p.user.name} · <a href={`tel:${p.user.phone}`}>{p.user.phone}</a><br />{p.locality}, {p.city} · {day(p.preferredDay)}{p.note ? ` · ${p.note}` : ''}</small>
      {err && <div className="err">{err}</div>}
      <div className="two">
        <div className="field" style={{ margin: 0 }}><label>Citizen's handover code</label><input type="text" value={code} maxLength={6} autoCapitalize="characters" onChange={e => setCode(e.target.value.toUpperCase())} /></div>
        <div className="field" style={{ margin: 0 }}><label>Weighed (kg)</label><input type="number" inputMode="decimal" step="0.1" min="0.2" max="25" value={kg} onChange={e => setKg(e.target.value)} /></div>
      </div>
      <div style={{ marginTop: 12 }}><button className="btn" disabled={busy || code.length < 6 || !(Number(kg) > 0)} onClick={collect}>Mark collected</button></div>
    </div>
  );
}

export default function WorkerApp() {
  const [items, setItems] = useState(null), [err, setErr] = useState('');
  const load = useCallback(() => api('/api/worker/pickups').then(d => setItems(d.items)).catch(e => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  if (!items) return <p className="sub">{err || 'Loading…'}</p>;
  const todo = items.filter(p => p.status === 'ASSIGNED'), done = items.filter(p => p.status === 'COLLECTED');
  return (<>
    <h3 className="step">To collect ({todo.length})</h3>
    {todo.length === 0 ? <p className="sub">Nothing assigned to you right now.</p> : <div className="pk">{todo.map(p => <Job key={p.id} p={p} onDone={load} />)}</div>}
    {done.length > 0 && <><h3 className="step">Collected recently · waiting for citizen confirmation</h3>
      <ul className="list">{done.map(p => <li key={p.id}><div><b>{CATEGORIES[p.category]?.label} · {p.collectedKg} kg</b><small>{p.user.name} · {p.locality} · {when(p.collectedAt)}</small></div></li>)}</ul></>}
  </>);
}
