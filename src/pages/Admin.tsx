import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card } from '@/components/ui';
import { DemoStrip } from '@/components/layouts';
import { useStore } from '@/lib/store';
import { cls } from '@/lib/format';

const queue = [
  { id: 1, name: 'Demo Vendor — Resort', cat: 'Resorts & hotels', docs: 'GST, address proof, 12 photos' },
  { id: 2, name: 'Demo Vendor — Caterer', cat: 'Catering services', docs: 'FSSAI licence, menu PDF' },
  { id: 3, name: 'Demo Vendor — Travels', cat: 'Travel operators', docs: 'Permit, fleet list' }
];
const sections = ['Dashboard', 'Users', 'Reunions', 'Vendors', 'Payments', 'Reports', 'Configuration'];

export default function Admin() {
  const { reunions } = useStore();
  const [done, setDone] = useState<Record<number, 'ok' | 'no'>>({});
  const active = reunions.filter((r) => r.status !== 'completed').length;

  return (
    <div className="min-h-dvh">
      <DemoStrip />
      <div className="flex flex-wrap">
        <aside className="w-full bg-navy p-4 text-white md:min-h-dvh md:w-60 md:p-6">
          <Link to="/" className="font-display text-lg font-extrabold">BACK2CAMPUS</Link>
          <p className="text-xs text-soft">KALKITEC platform admin</p>
          <nav className="mt-6 flex gap-1 overflow-x-auto md:flex-col">
            {sections.map((s, i) => (
              <span key={s} className={cls('flex h-11 shrink-0 items-center rounded-xl px-3 text-sm', i === 0 ? 'bg-orange font-bold text-navy' : 'text-soft')}>{s}</span>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-extrabold">Platform overview</h1>
            <Badge tone="white" className="border border-line">SAMPLE · counts from this browser's demo data</Badge>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
            {[
              ['Registered users', '—'], ['Total reunions', String(reunions.length)], ['Active / completed', `${active} / ${reunions.length - active}`],
              ['Vendors (verified)', `${queue.length} (${Object.values(done).filter((d) => d === 'ok').length})`], ['Payment transactions', String(reunions.reduce((n, r) => n + r.payments.length, 0))]
            ].map(([l, v]) => <Card key={l} className="p-5"><p className="text-sm text-muted">{l}</p><strong className="font-display text-3xl">{v}</strong></Card>)}
            <div className="rounded-3xl bg-navy p-5 text-white"><p className="text-sm text-soft">Revenue</p><strong className="font-display text-3xl text-orange">—</strong><p className="text-xs text-soft">Available after Razorpay goes live</p></div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_2fr]">
            <Card className="flex flex-col gap-4 p-5">
              <h2 className="text-lg font-bold">City-wise activity</h2>
              {[['Visakhapatnam', 'Live', 100], ['Vijayawada', 'Planned', 0], ['Hyderabad', 'Planned', 0]].map(([c, s, w]) => (
                <div key={c as string} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm"><span>{c}</span><span className={s === 'Live' ? 'font-bold' : 'text-muted'}>{s}</span></div>
                  <div className="h-2.5 rounded-full bg-mist"><div className="h-full rounded-full bg-orange" style={{ width: `${w}%` }} /></div>
                </div>
              ))}
            </Card>
            <Card className="p-5">
              <h2 className="mb-3 text-lg font-bold">Vendor verification queue</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead><tr className="text-left text-xs text-muted"><th className="p-2 font-semibold">Business</th><th className="p-2 font-semibold">Category</th><th className="p-2 font-semibold">Documents</th><th className="p-2"><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>{queue.map((q) => (
                    <tr key={q.id} className="border-t border-line">
                      <td className="p-2 font-semibold">{q.name}</td><td className="p-2">{q.cat}</td><td className="p-2 text-muted">{q.docs}</td>
                      <td className="p-2 text-right">
                        {done[q.id]
                          ? <Badge tone={done[q.id] === 'ok' ? 'green' : 'grey'}>{done[q.id] === 'ok' ? 'VERIFIED' : 'REJECTED'}</Badge>
                          : <span className="inline-flex gap-1.5"><Button size="sm" onClick={() => setDone({ ...done, [q.id]: 'ok' })}>Verify</Button><Button size="sm" variant="ghost" onClick={() => setDone({ ...done, [q.id]: 'no' })}>Reject</Button></span>}
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </Card>
          </div>
          <p className="mt-6 text-xs text-muted">In production this page is only reachable by Platform Super Admin accounts, enforced by the API.</p>
        </main>
      </div>
    </div>
  );
}
