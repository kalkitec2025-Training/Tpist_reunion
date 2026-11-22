export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', opts);
}

export const fmtDay = (iso: string) => fmtDate(iso, { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtShort = (iso: string) => fmtDate(iso, { day: 'numeric', month: 'short' });

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function daysUntil(iso: string) {
  const ms = new Date(iso + 'T23:59:59').getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

export const cls = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');
