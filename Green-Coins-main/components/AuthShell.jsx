import Link from 'next/link';

export default function AuthShell({ children }) {
  return (
    <div className="shell">
      <aside className="aside">
        <Link href="/" className="brand"><span className="mark" />Green Coins</Link>
        <div>
          <h2>Reward every household that sorts its waste.</h2>
          <p>Photograph your segregated waste, get it verified by AI, and spend Green Coins at participating shops in your mohalla.</p>
        </div>
        <ul className="perks">
          <li><i>01</i><span><b>Upload a photo</b>Wet, dry, recyclable, e-waste or hazardous.</span></li>
          <li><i>02</i><span><b>Verified automatically</b>Approved contributions are recorded against your account.</span></li>
          <li><i>03</i><span><b>Spend locally</b>Kirana stores, tea stalls and repair shops accept coins under clear rules.</span></li>
        </ul>
        <small>Your number is used only for sign-in and program updates.</small>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
