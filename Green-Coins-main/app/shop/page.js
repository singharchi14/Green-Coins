import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import LogoutButton from '@/components/LogoutButton';
import ShopApp from '@/components/ShopApp';
export const dynamic = 'force-dynamic';
export default async function ShopPage() {
  if (!(await getSession())) redirect('/login');
  return (<div className="portal"><header className="top"><Link href="/" className="brand"><span className="mark" />Green Coins</Link><nav className="navr"><Link href="/dashboard">Dashboard</Link><LogoutButton /></nav></header>
    <main className="dash"><div className="eyebrow">Partner shop</div><h1>Your shop</h1><p className="sub">Accept Green Coins from households in your mohalla.</p><ShopApp /></main></div>);
}
