// Phones listed in env become officers/workers when they sign in (same pattern as ADMIN_PHONES).
const list = name => (process.env[name] || '').split(',').map(x => x.trim()).filter(Boolean);
export function roleForPhone(phone) {
  if (list('ADMIN_PHONES').includes(phone)) return 'ADMIN';
  if (list('MUNICIPAL_PHONES').includes(phone)) return 'MUNICIPAL';
  if (list('WORKER_PHONES').includes(phone)) return 'WORKER';
  return null;
}
export const isOfficer = u => u.role === 'MUNICIPAL' || u.role === 'ADMIN';
