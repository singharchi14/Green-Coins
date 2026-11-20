'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VerifiedScene from './VerifiedScene';

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.error || 'Something went wrong. Please try again.'), { data: d });
  return d;
}
const EMPTY = Array(6).fill('');

export default function AuthFlow({ mode }) {
  const isReg = mode === 'register';
  const router = useRouter();
  const [step, setStep] = useState('details');
  const [f, setF] = useState({ name: '', phone: '', city: '', locality: '', consent: false });
  const [digits, setDigits] = useState(EMPTY);
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false), [cool, setCool] = useState(0), [dev, setDev] = useState('');
  const refs = useRef([]);

  const set = k => e => setF(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  useEffect(() => { if (cool <= 0) return; const t = setTimeout(() => setCool(c => c - 1), 1000); return () => clearTimeout(t); }, [cool]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const e = p.get('error');
      if (e) {
        if (e === 'token_exchange_failed') setErr('Failed to authenticate with Google. Please try again.');
        else if (e === 'invalid_state') setErr('Authentication session expired. Please try again.');
        else setErr('Google sign-in was cancelled or failed.');
      }
    }
  }, []);

  const phoneOk = /^[6-9]\d{9}$/.test(f.phone);
  const ready = phoneOk && (!isReg || (f.name.trim().length >= 2 && f.city.trim() && f.locality.trim() && f.consent));

  async function send(e) {
    e && e.preventDefault();
    if (!ready || busy) return;
    setBusy(true); setErr('');
    try {
      const d = await post('/api/auth/send-otp', { ...f, purpose: mode });
      setStep('otp'); setCool(d.cooldown || 30); setDev(d.devOtp || ''); setDigits(EMPTY);
      setTimeout(() => refs.current[0]?.focus(), 60);
    } catch (x) { if (x.data?.retryAfter) setCool(x.data.retryAfter); setErr(x.message); }
    finally { setBusy(false); }
  }
  async function verify(code) {
    if (busy) return;
    setBusy(true); setErr('');
    try { await post('/api/auth/verify-otp', { phone: f.phone, otp: code, purpose: mode }); setStep('success'); }
    catch (x) { setErr(x.message); setDigits(EMPTY); refs.current[0]?.focus(); setBusy(false); }
  }
  function onDigit(i, v) {
    const c = v.replace(/\D/g, '');
    const n = [...digits];
    if (!c) { n[i] = ''; setDigits(n); return; }
    c.split('').slice(0, 6 - i).forEach((ch, k) => { n[i + k] = ch; });
    setDigits(n); refs.current[Math.min(i + c.length, 5)]?.focus();
    if (n.every(Boolean)) verify(n.join(''));
  }
  function onKey(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  }
  function onPaste(e) {
    const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!t) return; e.preventDefault();
    setDigits(EMPTY.map((_, k) => t[k] || '')); refs.current[Math.min(t.length, 5)]?.focus();
    if (t.length === 6) verify(t);
  }

  const masked = `+91 ${f.phone.slice(0, 2)}••••••${f.phone.slice(-2)}`;
  const stepper = <div className="steps" aria-hidden><i className="on" /><i className={step === 'otp' ? 'on' : ''} /></div>;

  const goDash = () => { router.replace('/dashboard'); router.refresh(); };
  if (step === 'success') return <VerifiedScene name={f.name.trim().split(' ')[0]} onDone={goDash} />;

  if (step === 'otp') return (
    <div className="card">
      {stepper}
      <div className="eyebrow">Step 2 of 2</div>
      <h1>Verify your number</h1>
      <p className="sub">Enter the 6-digit code sent by SMS to <b>{masked}</b>. <button className="link" onClick={() => { setStep('details'); setErr(''); }}>Change number</button></p>
      {dev && <div className="dev">Development mode: your code is <b>{dev}</b>. Configure an SMS provider to send real messages.</div>}
      {err && <div className="err" role="alert">{err}</div>}
      <div className="otp" onPaste={onPaste}>
        {digits.map((d, i) => (
          <input key={i} ref={el => (refs.current[i] = el)} value={d} className={d ? 'f' : ''} inputMode="numeric" pattern="[0-9]*" maxLength={6}
            autoComplete={i === 0 ? 'one-time-code' : 'off'} aria-label={`Digit ${i + 1}`} disabled={busy}
            onChange={e => onDigit(i, e.target.value)} onKeyDown={e => onKey(i, e)} />
        ))}
      </div>
      <button className="btn full" disabled={busy || digits.some(d => !d)} onClick={() => verify(digits.join(''))}>
        {busy ? <span className="spin" /> : null}{isReg ? 'Verify and create account' : 'Verify and log in'}
      </button>
      <div className="row">
        <span>Didn’t get the code?</span>
        <button className="link" disabled={cool > 0 || busy} onClick={() => send()}>{cool > 0 ? `Resend in ${cool}s` : 'Resend code'}</button>
      </div>
    </div>
  );

  return (
    <form className="card" onSubmit={send} noValidate>
      {stepper}
      <div className="eyebrow">{isReg ? 'Step 1 of 2' : 'Welcome back'}</div>
      <h1>{isReg ? 'Create your account' : 'Log in with OTP'}</h1>
      <p className="sub">{isReg ? 'Register your household to start earning Green Coins. We’ll verify your mobile number with a one-time code.' : 'Enter your registered mobile number and we’ll send you a one-time code.'}</p>
      {err && <div className="err" role="alert">{err}{cool > 0 ? ` (${cool}s)` : ''}</div>}
      <a
        href="/api/auth/google"
        className="btn full"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          backgroundColor: '#ffffff',
          color: '#374151',
          border: '1.5px solid #e5e7eb',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          fontWeight: 600,
          textDecoration: 'none',
          cursor: 'pointer',
          marginBottom: '16px',
          marginTop: '6px'
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        <span>Continue with Google</span>
      </a>

      <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0 16px', gap: '10px' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>or mobile OTP</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
      </div>

      {isReg && <div className="field"><label htmlFor="name">Full name</label><input id="name" type="text" autoComplete="name" value={f.name} onChange={set('name')} placeholder="As on your ID" maxLength={60} /></div>}
      <div className="field"><label htmlFor="phone">Mobile number</label>
        <div className="phone"><span>+91</span>
          <input id="phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={f.phone} placeholder="98765 43210"
            onChange={e => setF(p => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} /></div></div>
      {isReg && <>
        <div className="two">
          <div className="field"><label htmlFor="city">City</label><input id="city" type="text" autoComplete="address-level2" value={f.city} onChange={set('city')} maxLength={60} /></div>
          <div className="field"><label htmlFor="loc">Mohalla / locality</label><input id="loc" type="text" value={f.locality} onChange={set('locality')} maxLength={80} /></div>
        </div>
        <label className="check"><input type="checkbox" checked={f.consent} onChange={set('consent')} />
          <span>I agree to the Green Coins program rules, including verified-photo contributions and daily limits.</span></label>
      </>}
      <button className="btn full" type="submit" disabled={!ready || busy} style={{ marginTop: isReg ? 0 : 10 }}>{busy ? <span className="spin" /> : null}Send OTP</button>
      <div className="foot">{isReg ? <>Already registered? <Link href="/login">Log in</Link></> : <>New to Green Coins? <Link href="/register">Create an account</Link></>}</div>
    </form>
  );
}
