import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, Inbox, Image as ImageIcon, LayoutDashboard, Tags } from 'lucide-react';
import { Badge, Button, Card, Field, Img, Logo, TextArea } from '@/components/ui';
import { DemoStrip } from '@/components/layouts';
import { cls } from '@/lib/format';

const categories = ['Resorts & hotels', 'Restaurants', 'Catering services', 'Travel operators', 'Photographers', 'Event decorators', 'DJs & entertainment'];
const enquiries = [
  { reunion: "St. Mary's Batch 2005", date: '20 Dec 2026', guests: '~80', needs: 'Hall, dinner buffet', status: 'NEW' },
  { reunion: 'AU ECE 2010', date: '18 Jan 2027', guests: '~60', needs: 'Lawn, 12 rooms', status: 'NEW' },
  { reunion: 'Office Gang 2015', date: 'Feb 2027', guests: '~15', needs: 'Private dining', status: 'QUOTED' }
];

export default function Vendor() {
  const [tab, setTab] = useState<'overview' | 'profile'>('overview');
  const [f, setF] = useState({ business: '', category: categories[0], phone: '', email: '', website: '', address: '', area: '', capacity: '', price: '', about: '' });
  const [submitted, setSubmitted] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (f.business.trim().length < 3 || !f.phone.trim()) return;
    setSubmitted(true);
    setTab('overview');
  }

  const nav = [
    { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
    { id: 'profile' as const, label: 'Business profile', icon: Building2 }
  ];

  return (
    <div className="min-h-dvh">
      <DemoStrip />
      <div className="flex flex-wrap">
        <aside className="w-full border-b border-line bg-white p-4 md:min-h-dvh md:w-64 md:border-b-0 md:border-r md:p-6">
          <Link to="/" className="flex items-center"><Logo /></Link>
          <p className="mt-1 pl-12 text-xs text-muted">Vendor portal</p>
          <nav className="mt-6 flex gap-1 overflow-x-auto md:flex-col">
            {nav.map((n) => (
              <button key={n.id} type="button" onClick={() => setTab(n.id)}
                className={cls('flex h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm', tab === n.id ? 'bg-navy font-semibold text-white' : 'hover:bg-mist')}>
                <n.icon size={18} /> {n.label}
              </button>
            ))}
            <span className="flex h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm text-muted"><ImageIcon size={18} /> Photos</span>
            <span className="flex h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm text-muted"><Tags size={18} /> Services &amp; pricing</span>
            <span className="flex h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm text-muted"><Inbox size={18} /> Enquiries <Badge tone="orange">3</Badge></span>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-4 md:p-8">
          {tab === 'overview' ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div><p className="text-sm text-muted">{f.category} · Visakhapatnam</p><h1 className="text-3xl font-extrabold">{f.business || 'Your business'}</h1></div>
                <Button variant="accent" onClick={() => setTab('profile')}>{submitted ? 'Update listing' : 'Create your listing'}</Button>
              </div>
              <div className={cls('flex flex-wrap items-center gap-3 rounded-2xl border p-4', submitted ? 'border-[#F6C9A4] bg-[#FFF6EE]' : 'border-line bg-white')}>
                <Badge tone={submitted ? 'orange' : 'grey'}>{submitted ? 'PENDING VERIFICATION' : 'NOT SUBMITTED'}</Badge>
                <span className="flex-1 text-sm">{submitted ? 'KALKITEC is reviewing your details and photos. Your listing shows as "Unverified" until approved.' : 'Submit your business details to appear in reunion venue and service searches.'}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[['New enquiries', '3'], ['Listing views (30 days)', '—'], ['Shortlisted by reunions', '—'], ['Profile completeness', submitted ? '80%' : '10%']].map(([l, v]) => (
                  <Card key={l} className="p-5"><p className="text-sm text-muted">{l}</p><strong className="font-display text-3xl">{v}</strong></Card>
                ))}
              </div>
              <Card className="p-5">
                <h2 className="mb-3 text-lg font-bold">Booking enquiries <span className="text-sm font-normal text-muted">(sample)</span></h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead><tr className="text-left text-xs text-muted"><th className="p-2 font-semibold">Reunion</th><th className="p-2 font-semibold">Date</th><th className="p-2 font-semibold">Guests</th><th className="p-2 font-semibold">Needs</th><th className="p-2 font-semibold">Status</th></tr></thead>
                    <tbody>{enquiries.map((e) => (
                      <tr key={e.reunion} className="border-t border-line"><td className="p-2 font-semibold">{e.reunion}</td><td className="p-2">{e.date}</td><td className="p-2">{e.guests}</td><td className="p-2">{e.needs}</td><td className="p-2"><Badge tone={e.status === 'NEW' ? 'peach' : 'grey'}>{e.status}</Badge></td></tr>
                    ))}</tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : (
            <form onSubmit={submit} className="mx-auto flex max-w-3xl flex-col gap-5">
              <h1 className="text-3xl font-extrabold">Business profile</h1>
              <div className="relative overflow-hidden rounded-3xl"><Img id="resortPool" w={1200} h={400} className="aspect-[3/1] w-full" /><span className="absolute bottom-3 left-3 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold">Your cover photo goes here</span></div>
              <Card className="grid gap-4 p-5 md:grid-cols-2">
                <Field label="Business name *" value={f.business} onChange={set('business')} required />
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Category
                  <select value={f.category} onChange={set('category')} className="h-12 rounded-xl border-[1.5px] border-line bg-white px-3 text-[15px] font-normal">{categories.map((c) => <option key={c}>{c}</option>)}</select>
                </label>
                <Field label="Phone *" type="tel" value={f.phone} onChange={set('phone')} required />
                <Field label="Email" type="email" value={f.email} onChange={set('email')} />
                <Field label="Website or booking link" type="url" value={f.website} onChange={set('website')} placeholder="https://" />
                <Field label="Area" value={f.area} onChange={set('area')} placeholder="e.g. Rushikonda" />
                <div className="md:col-span-2"><Field label="Full address" value={f.address} onChange={set('address')} /></div>
                <Field label="Capacity (guests)" type="number" value={f.capacity} onChange={set('capacity')} />
                <Field label="Indicative price" value={f.price} onChange={set('price')} placeholder="e.g. ₹650–900 per plate" />
                <div className="md:col-span-2"><TextArea label="About your service" rows={4} value={f.about} onChange={set('about')} /></div>
              </Card>
              <p className="flex items-center gap-2 text-sm text-muted"><CheckCircle2 size={16} className="text-ok" /> Listings are marked “Verified” only after KALKITEC checks your documents.</p>
              <Button type="submit" variant="accent" size="lg">Submit for verification</Button>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
