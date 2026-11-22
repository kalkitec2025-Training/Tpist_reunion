import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { useState } from 'react';
import { cls, initials } from '@/lib/format';
import { photos, photoUrl, type Photo } from '@/lib/photos';

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'light';
const variants: Record<Variant, string> = {
  primary: 'bg-navy text-white hover:bg-navy-2',
  accent: 'bg-orange text-navy hover:brightness-95',
  outline: 'border-[1.5px] border-navy text-navy bg-white hover:bg-mist',
  ghost: 'border-[1.5px] border-line text-navy bg-white hover:bg-mist',
  light: 'bg-white text-navy hover:bg-mist'
};
const base = 'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition disabled:opacity-50 disabled:pointer-events-none';
const sizes = { md: 'h-12 px-5 text-[15px]', lg: 'h-14 px-6 text-base', sm: 'h-10 px-4 text-sm' };

export function Button({ variant = 'primary', size = 'md', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <button type="button" {...p} className={cls(base, variants[variant], sizes[size], className)} />;
}

export function ButtonLink({ to, variant = 'primary', size = 'md', className, children }: { to: string; variant?: Variant; size?: keyof typeof sizes; className?: string; children: ReactNode }) {
  return <Link to={to} className={cls(base, variants[variant], sizes[size], className)}>{children}</Link>;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cls('rounded-3xl bg-white', className)}>{children}</div>;
}

const badgeTones = {
  orange: 'bg-orange text-navy',
  peach: 'bg-peach text-peach-ink',
  navy: 'bg-navy text-white',
  grey: 'bg-mist text-navy',
  green: 'bg-ok-bg text-ok',
  white: 'bg-white text-navy'
};
export function Badge({ tone = 'grey', className, children }: { tone?: keyof typeof badgeTones; className?: string; children: ReactNode }) {
  return <span className={cls('inline-flex items-center rounded-md px-2 py-1 text-[11px] font-bold tracking-wide', badgeTones[tone], className)}>{children}</span>;
}

export const DemoBadge = ({ className }: { className?: string }) => (
  <Badge tone="white" className={cls('shadow-sm', className)}>DEMO</Badge>
);

const avatarTones = ['bg-orange text-navy', 'bg-navy text-white', 'bg-peach text-navy', 'bg-[#E9ECF2] text-navy'];
export function Avatar({ name, size = 44, i = 0 }: { name: string; size?: number; i?: number }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size, fontSize: size * 0.32 }}
      className={cls('inline-flex shrink-0 items-center justify-center rounded-full font-bold', avatarTones[i % 4])}>
      {initials(name)}
    </span>
  );
}

export function Progress({ value, tone = 'orange', className }: { value: number; tone?: 'orange' | 'navy'; className?: string }) {
  return (
    <div className={cls('h-2 overflow-hidden rounded-full bg-[#E9ECF2]', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cls('h-full rounded-full transition-all', tone === 'orange' ? 'bg-orange' : 'bg-navy')} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="grid gap-1 rounded-2xl bg-mist p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} type="button" onClick={() => onChange(o.value)}
          className={cls('h-11 rounded-xl text-sm transition', o.value === value ? 'bg-white font-bold shadow-sm' : 'font-semibold text-muted')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={cls('h-10 shrink-0 rounded-full px-4 text-sm transition', active ? 'bg-navy font-semibold text-white' : 'border-[1.5px] border-line bg-white text-navy hover:bg-mist')}>
      {children}
    </button>
  );
}

/** A real photo with a navy fallback while loading or if the CDN is unreachable. */
export function Img({ photo, id, w = 800, h, className, alt, eager }: { photo?: Photo; id?: string; w?: number; h?: number; className?: string; alt?: string; eager?: boolean }) {
  const p = photo ?? (id ? photos[id] : undefined);
  const [failed, setFailed] = useState(false);
  if (!p || failed) return <div className={cls('bg-navy-2', className)} role="img" aria-label={alt ?? p?.alt ?? 'Photo'} />;
  return (
    <img src={photoUrl(p, w, h)} alt={alt ?? p.alt} loading={eager ? 'eager' : 'lazy'} decoding="async"
      onError={() => setFailed(true)} className={cls('bg-navy-2 object-cover', className)} />
  );
}

export function Field({ label, hint, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
      {label}
      <input {...p} className={cls('h-12 rounded-xl border-[1.5px] border-line bg-white px-3.5 text-[15px] font-normal outline-none transition focus:border-navy', p.className)} />
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function TextArea({ label, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
      {label}
      <textarea {...p} className="resize-none rounded-xl border-[1.5px] border-line bg-white px-3.5 py-3 text-[15px] font-normal outline-none focus:border-navy" />
    </label>
  );
}

export function PageHeader({ title, subtitle, back, action }: { title: string; subtitle?: string; back?: string; action?: ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="flex items-center gap-3 py-4">
      {back !== undefined && (
        <button type="button" aria-label="Back" onClick={() => (back ? nav(back) : nav(-1))}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white hover:bg-line md:hidden">
          <ChevronLeft size={20} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold md:text-2xl">{title}</h1>
        {subtitle && <p className="truncate text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Stat({ label, value, tone = 'light' }: { label: string; value: ReactNode; tone?: 'light' | 'dark' }) {
  return (
    <div className={cls('flex flex-col gap-0.5 rounded-2xl px-3.5 py-3', tone === 'dark' ? 'bg-navy-2 text-white' : 'bg-white')}>
      <strong className="font-display text-2xl font-extrabold">{value}</strong>
      <span className={cls('text-xs', tone === 'dark' ? 'text-soft' : 'text-muted')}>{label}</span>
    </div>
  );
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-navy font-display text-sm font-extrabold text-orange ring-1 ring-white/10">B2C</span>
      <span className={cls('font-display text-lg font-extrabold tracking-wide', light ? 'text-white' : 'text-navy')}>BACK2CAMPUS</span>
    </span>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <strong className="text-base">{title}</strong>
      <p className="max-w-sm text-sm text-muted">{body}</p>
      {action}
    </Card>
  );
}
