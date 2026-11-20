export const api = async (url, opts) => {
  const r = await fetch(url, opts), d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
};
export const when = d => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
// Shrinks the photo in the browser (faster upload) and drops EXIF/GPS data.
export async function shrink(file, max = 1024) {
  const bmp = await createImageBitmap(file), k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
}

// Next n calendar days in India as { value: 'YYYY-MM-DD', label }, starting today.
export function istDays(n = 8) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
  const l = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' });
  return Array.from({ length: n }, (_, i) => { const d = new Date(Date.now() + i * 864e5); return { value: f.format(d), label: (i === 0 ? 'Today · ' : i === 1 ? 'Tomorrow · ' : '') + l.format(d) }; });
}
export const day = d => new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' });
