import { prisma } from './prisma';
import { getSession } from './auth';
import { bad } from './http';
export async function requireUser() {
  const s = await getSession();
  if (!s) return { res: bad('Not signed in', 401) };
  const user = await prisma.user.findUnique({ where: { id: s.sub } });
  return user ? { user } : { res: bad('Not signed in', 401) };
}
export async function requireAdmin() {
  const r = await requireUser();
  if (r.res) return r;
  return r.user.role === 'ADMIN' ? r : { res: bad('Forbidden', 403) };
}
// Municipal officers (admins can also use the municipal tools).
export async function requireOfficer() {
  const r = await requireUser();
  if (r.res) return r;
  return r.user.role === 'MUNICIPAL' || r.user.role === 'ADMIN' ? r : { res: bad('Forbidden', 403) };
}
export async function requireWorker() {
  const r = await requireUser();
  if (r.res) return r;
  return r.user.role === 'WORKER' ? r : { res: bad('Forbidden', 403) };
}
