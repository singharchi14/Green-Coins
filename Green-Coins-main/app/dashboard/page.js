import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import LogoutButton from '@/components/LogoutButton';
import CitizenApp from '@/components/CitizenApp';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const s = await getSession();
  const user = s && await prisma.user.findUnique({ where: { id: s.sub }, include: { shop: { select: { id: true } } } });
  if (!user) redirect('/login');
  return (
    <div className="portal">
      <header className="top"><Link href="/" className="brand"><span className="mark" />Green Coins</Link>
        <nav className="navr">{user.role === 'ADMIN' && <Link href="/admin">Review panel</Link>}{(user.role === 'ADMIN' || user.role === 'MUNICIPAL') && <Link href="/municipal">Municipal desk</Link>}{user.role === 'WORKER' && <Link href="/worker">Collection desk</Link>}<Link href="/shop">{user.shop ? 'My shop' : 'Partner with us'}</Link><LogoutButton /></nav></header>
      <main className="dash">
        <div className="eyebrow">Citizen dashboard</div>
        <h1>Welcome, {user.name.split(' ')[0]}</h1>
        <p className="sub">{user.locality}, {user.city} · {user.phone}</p>
        <CitizenApp initialCoins={user.coins} />
      </main>
    </div>
  );
}
