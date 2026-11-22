import { Link } from 'react-router-dom';
import { useWorkspace } from '@/components/layouts';
import { Card, PageHeader } from '@/components/ui';
import type { BudgetKey } from '@/lib/types';
import { inr } from '@/lib/format';

const rows: { key: BudgetKey; label: string; color: string }[] = [
  { key: 'venue', label: 'Venue', color: '#14213D' },
  { key: 'food', label: 'Food', color: '#F2711C' },
  { key: 'transport', label: 'Transportation', color: '#3A4C78' },
  { key: 'stay', label: 'Accommodation', color: '#9AA5BD' },
  { key: 'deco', label: 'Decoration', color: '#B4500E' },
  { key: 'photo', label: 'Photography', color: '#6B7A99' },
  { key: 'fun', label: 'Entertainment', color: '#F6B48A' },
  { key: 'misc', label: 'Miscellaneous', color: '#C9D2E6' }
];

export default function Budget() {
  const { reunion: r, update, base, isOrganizer } = useWorkspace();
  const total = rows.reduce((n, x) => n + (r.budget[x.key] || 0), 0);
  const perPerson = r.payers > 0 ? total / r.payers : 0;
  const collected = r.payments.filter((p) => p.status === 'verified').reduce((n, p) => n + p.amount, 0) + (r.myPaymentStatus === 'paid' ? r.contribution : 0);
  const variance = total - r.spent;

  const setItem = (k: BudgetKey, v: string) => update((x) => ({ ...x, budget: { ...x.budget, [k]: Math.max(0, Number(v) || 0) } }));

  return (
    <div className="flex flex-col gap-5 pb-4">
      <PageHeader back={base} title="Budget" subtitle={isOrganizer ? 'Visible to all members · you can edit' : 'Visible to all members · organizers edit'} />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <section className="flex flex-col gap-4 self-start rounded-3xl bg-navy p-5 text-white md:p-6">
          <span className="text-sm text-soft">Estimated contribution per person</span>
          <strong className="font-display text-5xl font-extrabold text-orange">{r.payers > 0 ? inr(perPerson) : '—'}</strong>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-navy-2 p-3"><p className="text-xs text-soft">Total estimated</p><strong className="text-lg">{inr(total)}</strong></div>
            <label className="rounded-2xl bg-navy-2 p-3 text-xs text-soft">Confirmed paying
              <input type="number" min={1} value={r.payers} disabled={!isOrganizer} onChange={(e) => update((x) => ({ ...x, payers: Math.max(0, Number(e.target.value) || 0) }))}
                className="block w-full bg-transparent text-lg font-bold text-white outline-none disabled:opacity-100" />
            </label>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-navy-2" aria-hidden="true">
            {rows.map((x) => total > 0 && r.budget[x.key] > 0 && <div key={x.key} style={{ width: `${(r.budget[x.key] / total) * 100}%`, background: x.color }} />)}
          </div>
          <p className="text-xs text-soft">Total ÷ confirmed paying participants. Updates as people confirm.</p>
        </section>

        <Card className="flex flex-col px-4 py-2">
          <div className="flex justify-between py-3 text-xs font-bold tracking-wide text-muted"><span>CATEGORY</span><span>ESTIMATE (₹)</span></div>
          {rows.map((x) => (
            <label key={x.key} className="flex items-center justify-between gap-3 border-t border-line py-2.5 text-sm">
              <span className="flex items-center gap-2.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: x.color }} />{x.label}</span>
              {isOrganizer
                ? <input type="number" min={0} inputMode="numeric" value={r.budget[x.key] || ''} placeholder="0" onChange={(e) => setItem(x.key, e.target.value)}
                    className="h-11 w-32 rounded-xl border-[1.5px] border-line px-3 text-right outline-none focus:border-navy" />
                : <span className="font-semibold">{inr(r.budget[x.key])}</span>}
            </label>
          ))}
          <div className="flex justify-between border-t-2 border-navy py-3 font-bold"><span>Total</span><span>{inr(total)}</span></div>
        </Card>
      </div>

      <Card className="grid gap-4 p-5 md:grid-cols-4">
        <div><p className="text-xs text-muted">Actual spent</p><strong className="text-lg">{inr(r.spent)}</strong></div>
        <div><p className="text-xs text-muted">Collected</p><strong className="text-lg">{inr(collected)}</strong></div>
        <div><p className="text-xs text-muted">Pending</p><strong className="text-lg text-orange-ink">{inr(Math.max(0, total - collected))}</strong></div>
        <div><p className="text-xs text-muted">Budget variance</p><strong className={variance >= 0 ? 'text-lg text-ok' : 'text-lg text-orange-ink'}>{variance >= 0 ? `${inr(variance)} left` : `${inr(-variance)} over`}</strong></div>
        {isOrganizer && (
          <label className="flex flex-col gap-1 text-xs text-muted md:col-span-2">Record actual spend so far (₹)
            <input type="number" min={0} value={r.spent || ''} onChange={(e) => update((x) => ({ ...x, spent: Math.max(0, Number(e.target.value) || 0) }))}
              className="h-11 rounded-xl border-[1.5px] border-line px-3 text-sm text-navy outline-none focus:border-navy" />
          </label>
        )}
        <Link to={`${base}/payments`} className="flex h-11 items-center justify-center rounded-xl border-[1.5px] border-navy text-sm font-semibold md:col-span-2 md:self-end">Contributions &amp; payment history</Link>
      </Card>
    </div>
  );
}
