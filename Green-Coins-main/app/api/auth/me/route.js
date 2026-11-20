import { requireUser } from '@/lib/guard';
import { json } from '@/lib/http';
export async function GET() {
  const { user: u, res } = await requireUser();
  if (res) return res;
  return json({ user: { name: u.name, email: u.email, phone: u.phone, city: u.city, locality: u.locality, coins: u.coins, role: u.role } });
}
