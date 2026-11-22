import { useState } from 'react';
import { CalendarPlus, Lock } from 'lucide-react';
import { useWorkspace } from '@/components/layouts';
import { Badge, Button, Card, Empty, Field, PageHeader, Progress } from '@/components/ui';
import type { Availability } from '@/lib/types';
import { cls, daysUntil, fmtDate, fmtDay } from '@/lib/format';

const choices: { v: Availability; label: string; on: string }[] = [
  { v: 'yes', label: 'Available', on: 'bg-navy text-white border-navy' },
  { v: 'maybe', label: 'Maybe', on: 'bg-orange text-navy border-orange' },
  { v: 'no', label: "Can't", on: 'bg-muted text-white border-muted' }
];

export default function Dates() {
  const { reunion: r, actions, base, isOrganizer } = useWorkspace();
  const [adding, setAdding] = useState(false);
  const [nd, setNd] = useState({ iso: '', slot: 'Evening' });

  const rows = r.dates.map((d) => {
    const mine = r.myDateVotes[d.id];
    const yes = d.others.yes + (mine === 'yes' ? 1 : 0);
    const maybe = d.others.maybe + (mine === 'maybe' ? 1 : 0);
    const no = d.others.no + (mine === 'no' ? 1 : 0);
    return { ...d, mine, yes, maybe, no, total: yes + maybe + no };
  });
  const max = Math.max(0, ...rows.map((x) => x.yes));
  const top = rows.find((x) => x.yes === max && max > 0);
  const totalVotes = Math.max(0, ...rows.map((x) => x.total));
  const final = rows.find((x) => x.id === r.finalDateId);
  const left = daysUntil(r.votingDeadline);

  function vote(id: string, v: Availability) {
    if (r.finalDateId) return;
    actions.voteDate(id, r.myDateVotes[id] === v ? null : v);
  }

  function addDate() {
    if (!nd.iso) return;
    actions.addDate(nd.iso, nd.slot.trim() || 'Evening');
    setNd({ iso: '', slot: 'Evening' });
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      <PageHeader back={base} title="Pick the date" subtitle={r.name} />

      {final ? (
        <Card className="flex items-center gap-4 border-2 border-orange p-5">
          <Lock className="text-orange" />
          <div className="flex-1"><p className="text-xs font-bold tracking-wide text-orange-ink">DATE FINALISED</p><strong className="text-lg">{fmtDay(final.iso)} · {final.slot}</strong></div>
          {isOrganizer && <Button size="sm" variant="ghost" onClick={() => actions.finalizeDate(null)}>Reopen</Button>}
        </Card>
      ) : (
        <section className="grid grid-cols-3 gap-2 rounded-3xl bg-navy p-4 text-white">
          <div><strong className="font-display text-2xl">{totalVotes}</strong><p className="text-xs text-soft">Votes</p></div>
          <div><strong className="font-display text-2xl text-orange">{top ? fmtDate(top.iso, { day: 'numeric', month: 'short' }) : '—'}</strong><p className="text-xs text-soft">Most popular</p></div>
          <div><strong className="font-display text-2xl">{left > 0 ? `${left} days` : 'Closed'}</strong><p className="text-xs text-soft">Deadline · {fmtDate(r.votingDeadline, { day: 'numeric', month: 'short' })}</p></div>
        </section>
      )}

      {rows.length === 0 && <Empty title="No date options yet" body={isOrganizer ? 'Add a few dates and let everyone vote.' : 'The organizer has not added date options yet. You can suggest one.'} />}

      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((d) => {
          const isTop = top?.id === d.id;
          return (
            <Card key={d.id} className={cls('flex flex-col gap-3 border-2 p-4', isTop ? 'border-orange' : 'border-transparent')}>
              <div className="flex items-start justify-between gap-2">
                <div><strong className="text-base">{fmtDay(d.iso)}</strong><p className="text-xs text-muted">{d.slot}</p></div>
                {isTop && <Badge tone="orange">MOST POPULAR</Badge>}
              </div>
              <div className="flex items-center gap-3">
                <Progress value={max ? (d.yes / Math.max(totalVotes, 1)) * 100 : 0} tone={isTop ? 'orange' : 'navy'} className="flex-1" />
                <span className="w-28 text-right text-xs text-muted">{d.yes} available · {d.maybe} maybe</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={`Your availability on ${fmtDay(d.iso)}`}>
                {choices.map((c) => (
                  <button key={c.v} type="button" aria-pressed={d.mine === c.v} disabled={Boolean(r.finalDateId)} onClick={() => vote(d.id, c.v)}
                    className={cls('h-11 rounded-xl border-[1.5px] text-[13px] font-semibold transition disabled:opacity-60', d.mine === c.v ? c.on : 'border-line bg-white')}>
                    {c.label}
                  </button>
                ))}
              </div>
              {isOrganizer && !r.finalDateId && (
                <button type="button" onClick={() => actions.finalizeDate(d.id)} className="self-start text-sm font-semibold text-orange-ink underline-offset-4 hover:underline">
                  Finalise this date
                </button>
              )}
            </Card>
          );
        })}
      </div>

      {!r.finalDateId && (adding ? (
        <Card className="flex flex-col gap-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" type="date" value={nd.iso} onChange={(e) => setNd({ ...nd, iso: e.target.value })} />
            <Field label="Time of day" value={nd.slot} onChange={(e) => setNd({ ...nd, slot: e.target.value })} />
          </div>
          <div className="flex gap-2"><Button onClick={addDate}>{isOrganizer ? 'Add option' : 'Suggest date'}</Button><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button></div>
        </Card>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="flex h-12 items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-muted font-semibold">
          <CalendarPlus size={18} /> {isOrganizer ? 'Add a date option' : 'Suggest another date'}
        </button>
      ))}
    </div>
  );
}
