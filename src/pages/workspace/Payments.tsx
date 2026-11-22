import { useEffect, useRef } from 'react';
import { useWorkspace } from '@/components/layouts';
import { Badge, Button, Card, PageHeader, Progress } from '@/components/ui';
import { fmtDate, inr } from '@/lib/format';

const statusTone = { verified: ['Verified', 'text-ok'], awaiting: ['Awaiting webhook', 'text-orange-ink'], refunded: ['Refunded', 'text-muted'] } as const;

export default function Payments() {
  const { reunion: r, update, base, isOrganizer } = useWorkspace();
  const timer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const paidByOthers = r.payments.filter((p) => p.status === 'verified').length;
  // Demo: assume roughly two-thirds of payers settled before the listed recent transactions.
  const earlier = r.payments.length ? Math.max(0, Math.round(r.payers * 0.65) - paidByOthers) : 0;
  const paid = paidByOthers + earlier + (r.myPaymentStatus === 'paid' ? 1 : 0);
  const target = Math.max(r.payers, paid);
  const collected = paid * r.contribution;

  function pay() {
    // In production: create a Razorpay order on the server, open Checkout, and
    // mark it paid ONLY after the server verifies the signature / webhook.
    update((x) => ({ ...x, myPaymentStatus: 'verifying' }));
    timer.current = window.setTimeout(() => update((x) => ({ ...x, myPaymentStatus: 'paid' })), 1800);
  }

  const badge = { due: <Badge tone="orange">PENDING</Badge>, verifying: <Badge tone="white">VERIFYING</Badge>, paid: <Badge tone="green">PAID · VERIFIED</Badge> }[r.myPaymentStatus];

  return (
    <div className="flex flex-col gap-5 pb-4">
      <PageHeader back={base} title="Contributions" subtitle="Payments are confirmed by the server, never by the app alone" />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="flex flex-col gap-4 self-start rounded-3xl bg-navy p-5 text-white md:p-6">
          <div className="flex items-center justify-between"><span className="text-sm text-soft">Your contribution</span>{badge}</div>
          <strong className="font-display text-5xl font-extrabold">{inr(r.contribution)}</strong>
          <span className="text-sm text-soft">Requested by the organizer</span>
          {r.myPaymentStatus === 'due' && <Button variant="accent" size="lg" onClick={pay}>Pay with UPI / card (Razorpay)</Button>}
          {r.myPaymentStatus === 'verifying' && <div role="status" className="flex h-14 items-center justify-center rounded-2xl bg-navy-2 text-sm text-soft">Confirming with Razorpay…</div>}
          {r.myPaymentStatus === 'paid' && <Button variant="light" size="lg" onClick={() => window.print()}>Print receipt</Button>}
          <p className="text-xs text-soft">Demo: no money moves. Razorpay keys are configured on the server in the payments phase.</p>
        </section>

        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-baseline justify-between"><h2 className="font-sans text-base font-bold">Collection status</h2><span className="text-xs text-muted">{paid} of {target} paid</span></div>
            <Progress value={(paid / Math.max(1, target)) * 100} />
            <div className="grid grid-cols-2 gap-2">
              <div><p className="text-xs text-muted">Collected</p><strong className="text-lg">{inr(collected)}</strong></div>
              <div><p className="text-xs text-muted">Pending</p><strong className="text-lg text-orange-ink">{inr(Math.max(0, target - paid) * r.contribution)}</strong></div>
            </div>
            {isOrganizer && <Button variant="outline">Send reminder to {Math.max(0, target - paid)} pending</Button>}
          </Card>

          <Card className="flex flex-col px-5 py-2">
            <h2 className="py-3 font-sans text-base font-bold">Recent transactions</h2>
            {r.payments.length === 0 && <p className="pb-4 text-sm text-muted">No payments yet.</p>}
            {r.payments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 border-t border-line py-3">
                <div className="flex-1"><strong className="text-sm">{p.name}</strong><p className="text-xs text-muted">{p.method} · {fmtDate(p.at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p></div>
                <div className="text-right"><strong className="text-sm">{inr(p.amount)}</strong><p className={`text-[11px] font-bold ${statusTone[p.status][1]}`}>{statusTone[p.status][0]}</p></div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
