import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireOfficer } from '@/lib/guard';
import LogoutButton from '@/components/LogoutButton';
import MunicipalApp from '@/components/MunicipalApp';
export const dynamic = 'force-dynamic';
export default async function MunicipalPage() {
  const { res } = await requireOfficer();
  if (res) redirect('/dashboard');
  return (<div className="portal"><header className="top"><Link href="/" className="brand"><span className="mark" />Green Coins</Link><nav className="navr"><Link href="/dashboard">Dashboard</Link><LogoutButton /></nav></header>
    <main className="dash" style={{ maxWidth: 1100 }}><div className="eyebrow">Municipal desk</div><h1>Waste collection and participation</h1><p className="sub">See which localities segregate, where pickups are delayed, and how much waste was verifiably collected.</p><MunicipalApp /></main></div>);
}
