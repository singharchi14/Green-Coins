import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireWorker } from '@/lib/guard';
import LogoutButton from '@/components/LogoutButton';
import WorkerApp from '@/components/WorkerApp';
export const dynamic = 'force-dynamic';
export default async function WorkerPage() {
  const { res } = await requireWorker();
  if (res) redirect('/dashboard');
  return (<div className="portal"><header className="top"><Link href="/" className="brand"><span className="mark" />Green Coins</Link><nav className="navr"><Link href="/dashboard">Dashboard</Link><LogoutButton /></nav></header>
    <main className="dash"><div className="eyebrow">Collection worker</div><h1>Your pickups</h1><p className="sub">Ask the citizen for their handover code, weigh the waste, then mark it collected.</p><WorkerApp /></main></div>);
}
