import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin } from '@/lib/guard';
import LogoutButton from '@/components/LogoutButton';
import AdminApp from '@/components/AdminApp';
export const dynamic = 'force-dynamic';
export default async function AdminPage() {
  const { res } = await requireAdmin();
  if (res) redirect('/dashboard');
  return (<div className="portal"><header className="top"><Link href="/" className="brand"><span className="mark" />Green Coins</Link><nav className="navr"><Link href="/dashboard">Dashboard</Link><LogoutButton /></nav></header>
    <main className="dash" style={{ maxWidth: 1100 }}><div className="eyebrow">Reviewer panel</div><h1>Review and manage</h1><p className="sub">Photos the AI was unsure about, and shop applications.</p><AdminApp /></main></div>);
}
