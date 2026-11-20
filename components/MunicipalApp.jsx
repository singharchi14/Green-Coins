'use client';
import { useState, useEffect, useCallback } from 'react';
import { CATEGORIES } from '@/lib/config';
import { api, when, day } from './ui';

const post = (url, body) => api(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const pct = n => Math.round(n * 100) + '%';

function Overview() {
  const [days, setDays] = useState(30), [d, setD] = useState(null), [err, setErr] = useState('');
  useEffect(() => { setD(null); api(`/api/municipal/analytics?days=${days}`).then(setD).catch(e => setErr(e.message)); }, [days]);
  const range = <div className="tabs" style={{ margin: '0 0 14px' }}>{[7, 30, 90].map(n => <button key={n} className={'tab' + (days === n ? ' on' : '')} onClick={() => setDays(n)}>Last {n} days</button>)}</div>;
  if (!d) return <>{range}<p className="sub">{err || 'Loading…'}</p></>;
  const t = d.totals;
  const cells = [['Households', t.households], ['Active households', t.activeHouseholds], ['Verified waste collected', t.kgDiverted + ' kg'], ['Pickups verified', t.pickupsVerified], ['Overdue pickups', t.overdue], ['Avg days to collect', t.avgCollectDays ?? '–'], ['Low-participation areas', t.lowParticipationLocalities]];
  return (<>
    {range}
    <div className="stats">{cells.map(([l, v]) => <div key={l} className={'box' + ((l === 'Overdue pickups' && v > 0) || (l === 'Low-participation areas' && v > 0) ? ' warn' : '')}><h3>{l}</h3><div className="big">{v}</div></div>)}</div>
    <h3 className="step">By locality · lowest participation first</h3>
    {d.localities.length === 0 ? <p className="sub">No households registered yet.</p> : (
      <div className="tbl"><table>
        <thead><tr><th>Locality</th><th>Households</th><th>Participation</th><th>Photos</th><th>Collected (kg)</th><th>Overdue</th><th>Avg days</th></tr></thead>
        <tbody>{d.localities.map(r => (
          <tr key={r.city + r.locality}>
            <td><b>{r.locality}</b><small>{r.city}</small></td>
            <td>{r.households}</td>
            <td><div className="meter" style={{ minWidth: 120 }}><div className="mt"><span>{r.activeHouseholds} active</span><b>{pct(r.participation)}</b></div><i><u style={{ width: pct(r.participation), background: r.lowParticipation ? 'var(--err)' : undefined }} /></i></div>{r.lowParticipation && <span className="chip REJECTED">low</span>}</td>
            <td>{r.photos}</td>
            <td>{r.kgDiverted}</td>
            <td>{r.overdue ? <span className="chip REJECTED">{r.overdue} overdue</span> : '–'}</td>
            <td>{r.avgCollectDays ?? '–'}</td>
          </tr>))}</tbody>
      </table></div>)}
    <h3 className="step">Verified waste collected by category</h3>
    <ul className="list">{Object.entries(CATEGORIES).map(([k, c]) => <li key={k}><b>{c.label}</b><span>{t.kgByCategory[k] || 0} kg</span></li>)}</ul>
    <p className="tip"><b>How these are measured.</b> Participation = households with an approved photo or a collected pickup in the period, divided by registered households. A locality is flagged low below 25% once it has at least 3 households. Collected kg is the weight a worker measured at the doorstep and the citizen or an officer verified; estimates are never counted. A pickup is overdue when it is still waiting after the day the citizen chose.</p>
  </>);
}

function Pickups() {
  const [view, setView] = useState('open'), [items, setItems] = useState(null), [workers, setWorkers] = useState([]), [pick, setPick] = useState({}), [err, setErr] = useState(''), [ok, setOk] = useState('');
  const load = useCallback(() => { api(`/api/municipal/pickups?view=${view}`).then(d => setItems(d.items)).catch(e => setErr(e.message)); api('/api/municipal/workers').then(d => setWorkers(d.workers)).catch(() => {}); }, [view]);
  useEffect(() => { setItems(null); load(); }, [load]);
  const act = async (id, body, msg) => { setErr(''); setOk(''); try { await post(`/api/municipal/pickups/${id}`, body); if (msg) setOk(msg); load(); } catch (e) { setErr(e.message); } };
  const views = [['open', 'Waiting'], ['overdue', 'Overdue'], ['collected', 'Awaiting verification'], ['done', 'Finished']];
  return (<>
    <div className="tabs" style={{ margin: '0 0 14px' }}>{views.map(([k, l]) => <button key={k} className={'tab' + (view === k ? ' on' : '')} onClick={() => setView(k)}>{l}</button>)}</div>
    {err && <div className="err">{err}</div>}{ok && <div className="okmsg">{ok}</div>}
    {view === 'open' && workers.length === 0 && <div className="dev">No collection workers yet. Add their phone numbers to <code>WORKER_PHONES</code>; they become workers when they sign in.</div>}
    {!items ? <p className="sub">Loading…</p> : items.length === 0 ? <p className="sub">Nothing here.</p> : (
      <ul className="list">{items.map(p => (
        <li key={p.id}>
          <div><b>{CATEGORIES[p.category]?.label} · {p.collectedKg ?? p.estKg} kg {p.collectedKg == null && '(est.)'} {p.overdue && <span className="chip REJECTED">overdue</span>}</b>
            <small>{p.user.name} · {p.locality}, {p.city} · day {day(p.preferredDay)} · requested {when(p.createdAt)}{p.worker ? ` · ${p.worker.name}` : ''}{p.note ? ` · ${p.note}` : ''}</small></div>
          {['REQUESTED', 'ASSIGNED'].includes(p.status) && <span className="row2">
            <select className="sel" value={pick[p.id] ?? p.workerId ?? ''} onChange={e => setPick({ ...pick, [p.id]: e.target.value })}><option value="">Choose worker</option>{workers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.open} open)</option>)}</select>
            <button className="btn small" disabled={!(pick[p.id] ?? p.workerId)} onClick={() => act(p.id, { action: 'assign', workerId: pick[p.id] ?? p.workerId }, 'Assigned')}>{p.status === 'ASSIGNED' ? 'Reassign' : 'Assign'}</button>
            <button className="btn small line" onClick={() => act(p.id, { action: 'cancel' })}>Cancel</button></span>}
          {p.status === 'COLLECTED' && <button className="btn small" onClick={() => act(p.id, { action: 'verify' }, 'Verified and coins credited')}>Verify</button>}
          {['VERIFIED', 'CANCELLED'].includes(p.status) && <span className={'chip ' + (p.status === 'VERIFIED' ? 'APPROVED' : 'REJECTED')}>{p.status.toLowerCase()}</span>}
        </li>))}</ul>)}
    {view === 'collected' && <p className="tip">Citizens normally confirm collections themselves. Verify here only after checking with the citizen or worker.</p>}
  </>);
}

export default function MunicipalApp() {
  const [tab, setTab] = useState('overview');
  return (<><div className="tabs">{[['overview', 'Locality analytics'], ['pickups', 'Pickup management']].map(([k, l]) => <button key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>)}</div>
    {tab === 'overview' && <Overview />}{tab === 'pickups' && <Pickups />}</>);
}
