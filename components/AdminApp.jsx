'use client';
import { useState, useEffect, useCallback } from 'react';
import { CATEGORIES } from '@/lib/config';
import { api, when } from './ui';

function Queue() {
  const [items, setItems] = useState(null), [err, setErr] = useState(''), [reason, setReason] = useState({});
  const load = useCallback(() => api('/api/admin/review').then(d => setItems(d.items)).catch(e => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const act = async (id, action) => { setErr(''); try { await api(`/api/admin/review/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, reason: reason[id] }) }); load(); } catch (e) { setErr(e.message); } };
  if (!items) return <p className="sub">{err || 'Loading…'}</p>;
  return (<>{err && <div className="err">{err}</div>}{items.length === 0 && <p className="sub">The queue is empty.</p>}
    <div className="rq">{items.map(i => (
      <div key={i.id} className="box rv">
        <img src={`/api/admin/review/${i.id}/image`} alt="Photo to review" />
        <div><h3>{CATEGORIES[i.category]?.label} · {i.user.locality}, {i.user.city}</h3>
          <p className="sub" style={{ margin: '0 0 10px' }}>AI note: {i.reason} {i.confidence != null && `(confidence ${Math.round(i.confidence * 100)}%)`}<br />{when(i.createdAt)}</p>
          <input type="text" placeholder="Reason (required to reject)" value={reason[i.id] || ''} onChange={e => setReason({ ...reason, [i.id]: e.target.value })} />
          <div className="row2"><button className="btn" onClick={() => act(i.id, 'approve')}>Approve</button><button className="btn line" onClick={() => act(i.id, 'reject')}>Reject</button></div>
          <small className="tip">The photo is deleted as soon as you decide.</small></div>
      </div>))}</div></>);
}

function Shops() {
  const [shops, setShops] = useState(null), [err, setErr] = useState('');
  const load = useCallback(() => api('/api/admin/shops').then(d => setShops(d.shops)).catch(e => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const act = async (id, action) => { try { await api(`/api/admin/shops/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) }); load(); } catch (e) { setErr(e.message); } };
  if (!shops) return <p className="sub">{err || 'Loading…'}</p>;
  return (<>{err && <div className="err">{err}</div>}<ul className="list">{shops.map(s => (
    <li key={s.id}><div><b>{s.name}</b><small>{s.ownerName} · {s.phone} · {s.address} · Licence {s.licence}</small></div>
      {s.status === 'PENDING' ? <span className="row2"><button className="btn small" onClick={() => act(s.id, 'approve')}>Approve</button><button className="btn small line" onClick={() => act(s.id, 'reject')}>Reject</button></span> : <span className={'chip ' + (s.status === 'APPROVED' ? 'APPROVED' : 'REJECTED')}>{s.status.toLowerCase()}</span>}</li>))}</ul></>);
}

function Stats() {
  const [d, setD] = useState(null);
  useEffect(() => { api('/api/admin/stats').then(setD).catch(() => {}); }, []);
  if (!d) return <p className="sub">Loading…</p>;
  const cells = [['Citizens', d.users], ['Approved', d.photos.APPROVED || 0], ['Rejected', d.photos.REJECTED || 0], ['In review', d.queue], ['Coins issued', d.coinsIssued], ['Redemptions', d.redemptions], ['Shops waiting', d.pendingShops], ['Approval rate', d.autoApprovalNote == null ? '–' : d.autoApprovalNote + '%']];
  return <div className="stats">{cells.map(([l, v]) => <div key={l} className="box"><h3>{l}</h3><div className="big">{v}</div></div>)}</div>;
}

export default function AdminApp() {
  const [tab, setTab] = useState('queue');
  return (<><div className="tabs">{[['queue', 'Review queue'], ['shops', 'Shop applications'], ['stats', 'Platform stats']].map(([k, l]) => <button key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>)}</div>
    {tab === 'queue' && <Queue />}{tab === 'shops' && <Shops />}{tab === 'stats' && <Stats />}</>);
}
