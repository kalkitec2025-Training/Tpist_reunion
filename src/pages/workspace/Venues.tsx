import { useState } from 'react';
import { Search, Users, MapPin, Lock, X } from 'lucide-react';
import { useWorkspace } from '@/components/layouts';
import { Badge, Button, Card, Chip, DemoBadge, Empty, Field, Img, PageHeader, Progress } from '@/components/ui';
import type { Venue } from '@/lib/types';
import { cls } from '@/lib/format';

const kinds = ['All', 'Resort', 'Hotel', 'Restaurant', 'Banquet hall', 'Beachside', 'Farmhouse'] as const;
const verifyTone = { 'Verified vendor': 'green', 'Google Places': 'white', Unverified: 'grey' } as const;

export default function Venues() {
  const { reunion: r, update, base, isOrganizer } = useWorkspace();
  const [kind, setKind] = useState<(typeof kinds)[number]>('All');
  const [q, setQ] = useState('');
  const [compare, setCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [sv, setSv] = useState({ name: '', area: '', capacity: '', kind: 'Banquet hall' as Venue['kind'] });

  const votes = (v: Venue) => v.othersVotes + (r.myVenueVote === v.id ? 1 : 0);
  const totalVotes = r.venues.reduce((n, v) => n + votes(v), 0);
  const list = r.venues
    .filter((v) => kind === 'All' || v.kind === kind)
    .filter((v) => !q || `${v.name} ${v.area}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => votes(b) - votes(a));
  const final = r.venues.find((v) => v.id === r.finalVenueId);
  const toCompare = r.venues.filter((v) => compare.includes(v.id));

  function toggleCompare(id: string) {
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 3 ? c : [...c, id]));
  }

  function suggest() {
    if (sv.name.trim().length < 3) return;
    update((x) => ({ ...x, venues: [...x.venues, { id: 'v' + Date.now(), name: sv.name.trim(), kind: sv.kind, area: sv.area.trim() || x.city, capacity: Number(sv.capacity) || 0, tags: ['Suggested by a member'], photoId: 'beachRoad', verification: 'Unverified', othersVotes: 0, suggestedBy: 'You' }] }));
    setSv({ name: '', area: '', capacity: '', kind: 'Banquet hall' });
    setSuggesting(false);
  }

  return (
    <div className="flex flex-col gap-4 pb-24 md:pb-4">
      <PageHeader back={base} title={`Venues in ${r.city}`} subtitle="Suggest, compare and vote" />

      {final && (
        <Card className="flex items-center gap-4 border-2 border-orange p-4">
          <Lock className="text-orange" />
          <div className="flex-1"><p className="text-xs font-bold tracking-wide text-orange-ink">VENUE FINALISED</p><strong>{final.name}</strong></div>
          {isOrganizer && <Button size="sm" variant="ghost" onClick={() => update((x) => ({ ...x, finalVenueId: null }))}>Reopen</Button>}
        </Card>
      )}

      <label className="flex h-12 items-center gap-2 rounded-2xl bg-white px-4">
        <Search size={18} className="text-muted" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or area" aria-label="Search venues" className="flex-1 bg-transparent text-sm outline-none" />
      </label>
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {kinds.map((k) => <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{k === 'All' ? 'All' : k + 's'}</Chip>)}
      </div>

      <p className="rounded-2xl border border-[#F6C9A4] bg-[#FFF6EE] px-4 py-3 text-xs leading-relaxed text-[#6B3208]">
        These listings are <strong>DEMO placeholders</strong> with illustrative photos — not real businesses, prices or availability.
        Live listings will come from Google Places and verified vendor submissions.
      </p>

      {list.length === 0 && <Empty title="No venues match" body="Try another category, or suggest a venue you know." />}

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((v) => {
          const mine = r.myVenueVote === v.id;
          return (
            <Card key={v.id} className={cls('flex flex-col overflow-hidden', final?.id === v.id && 'ring-2 ring-orange')}>
              <div className="relative">
                <Img id={v.photoId} w={700} h={360} className="aspect-[2/1] w-full" alt={`Illustrative photo for ${v.name}`} />
                <DemoBadge className="absolute left-3 top-3" />
                <Badge tone={verifyTone[v.verification]} className="absolute right-3 top-3">{v.verification}</Badge>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <strong className="text-base">{v.name}</strong>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-[13px] text-muted">
                    <span className="flex items-center gap-1"><MapPin size={13} />{v.area}</span>
                    {v.capacity > 0 && <span className="flex items-center gap-1"><Users size={13} />up to {v.capacity}</span>}
                    {v.suggestedBy && <span>Suggested by {v.suggestedBy}</span>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">{v.tags.map((t) => <span key={t} className="rounded-full bg-mist px-2.5 py-1 text-xs">{t}</span>)}</div>
                <div className="flex justify-between text-[13px]"><span className="text-muted">Approx. price</span><strong>Vendor to confirm</strong></div>
                <div className="flex items-center gap-3">
                  <Progress value={totalVotes ? (votes(v) / totalVotes) * 100 : 0} tone={mine ? 'orange' : 'navy'} className="flex-1" />
                  <span className="text-xs text-muted">{votes(v)} votes</span>
                </div>
                <div className="mt-auto flex gap-2">
                  <Button className="flex-1" variant={mine ? 'accent' : 'outline'} disabled={Boolean(r.finalVenueId)}
                    onClick={() => update((x) => ({ ...x, myVenueVote: mine ? null : v.id }))}>{mine ? 'Your vote' : 'Vote for this'}</Button>
                  <Button variant={compare.includes(v.id) ? 'primary' : 'ghost'} aria-pressed={compare.includes(v.id)} onClick={() => toggleCompare(v.id)}>Compare</Button>
                </div>
                {isOrganizer && !r.finalVenueId && (
                  <button type="button" onClick={() => update((x) => ({ ...x, finalVenueId: v.id }))} className="self-start text-sm font-semibold text-orange-ink hover:underline">Finalise this venue</button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {suggesting ? (
        <Card className="flex flex-col gap-3 p-4">
          <strong>Suggest a venue</strong>
          <Field label="Venue name" value={sv.name} onChange={(e) => setSv({ ...sv, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Area" value={sv.area} onChange={(e) => setSv({ ...sv, area: e.target.value })} />
            <Field label="Capacity" type="number" value={sv.capacity} onChange={(e) => setSv({ ...sv, capacity: e.target.value })} />
          </div>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Type
            <select value={sv.kind} onChange={(e) => setSv({ ...sv, kind: e.target.value as Venue['kind'] })} className="h-12 rounded-xl border-[1.5px] border-line bg-white px-3 text-[15px] font-normal">
              {kinds.slice(1).map((k) => <option key={k}>{k}</option>)}
            </select>
          </label>
          <div className="flex gap-2"><Button onClick={suggest}>Add suggestion</Button><Button variant="ghost" onClick={() => setSuggesting(false)}>Cancel</Button></div>
        </Card>
      ) : null}

      <div className="fixed inset-x-0 bottom-[68px] z-20 flex gap-2 border-t border-line bg-white p-3 md:static md:border-0 md:bg-transparent md:p-0">
        <Button variant="outline" className="flex-1" onClick={() => setSuggesting(true)}>+ Suggest a venue</Button>
        <Button className="flex-1" disabled={toCompare.length < 2} onClick={() => setShowCompare(true)}>Compare ({toCompare.length})</Button>
      </div>

      {showCompare && (
        <div role="dialog" aria-modal="true" aria-label="Compare venues" className="fixed inset-0 z-40 flex items-end justify-center bg-navy/60 p-0 md:items-center md:p-6" onClick={() => setShowCompare(false)}>
          <div className="max-h-[85dvh] w-full max-w-3xl overflow-auto rounded-t-3xl bg-white p-5 md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Compare venues</h2>
              <button type="button" aria-label="Close" onClick={() => setShowCompare(false)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-mist"><X size={18} /></button></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead><tr><th className="w-28" />{toCompare.map((v) => <th key={v.id} className="p-2 text-left align-top"><Img id={v.photoId} w={300} h={180} className="mb-2 aspect-[5/3] w-full rounded-xl" /><span className="font-semibold">{v.name}</span></th>)}</tr></thead>
                <tbody>
                  {[
                    ['Type', (v: Venue) => v.kind], ['Area', (v: Venue) => v.area], ['Capacity', (v: Venue) => (v.capacity ? `up to ${v.capacity}` : '—')],
                    ['Facilities', (v: Venue) => v.tags.join(', ')], ['Status', (v: Venue) => v.verification], ['Votes', (v: Venue) => String(votes(v))], ['Price', () => 'Vendor to confirm']
                  ].map(([label, fn]) => (
                    <tr key={label as string} className="border-t border-line"><td className="p-2 text-muted">{label as string}</td>{toCompare.map((v) => <td key={v.id} className="p-2">{(fn as (v: Venue) => string)(v)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
