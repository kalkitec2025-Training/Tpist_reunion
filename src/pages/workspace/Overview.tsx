import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, Megaphone, Share2 } from 'lucide-react';
import { useWorkspace, modules } from '@/components/layouts';
import { Badge, Button, ButtonLink, Card, Img, Segmented, TextArea } from '@/components/ui';
import type { Availability } from '@/lib/types';
import { cls, daysUntil, fmtDate, inr } from '@/lib/format';

export default function Overview() {
  const { reunion: r, actions, base, isOrganizer } = useWorkspace();
  const [draft, setDraft] = useState({ title: '', body: '' });
  const [posting, setPosting] = useState(false);

  const active = r.people.filter((p) => p.status === 'active');
  const requests = r.people.filter((p) => p.status === 'pending').length;
  const attending = active.filter((p) => p.attendance === 'yes').length + (r.myAttendance === 'yes' ? 1 : 0);
  const total = Object.values(r.budget).reduce((a, b) => a + b, 0);
  const finalDate = r.dates.find((d) => d.id === r.finalDateId);
  const finalVenue = r.venues.find((v) => v.id === r.finalVenueId);
  const foodDone = r.myFood !== null;

  const steps = [
    { to: 'dates', title: 'Pick the date', done: Boolean(finalDate), sub: finalDate ? fmtDate(finalDate.iso) : r.dates.length ? `Voting · closes in ${Math.max(0, daysUntil(r.votingDeadline))} days` : 'Add date options' },
    { to: 'venues', title: 'Choose the venue', done: Boolean(finalVenue), sub: finalVenue ? finalVenue.name : `${r.venues.length} ${r.venues.length === 1 ? "suggestion" : "suggestions"}` },
    { to: 'budget', title: 'Set the budget', done: total > 0, sub: total > 0 ? `${inr(total / Math.max(1, r.payers))} per person` : 'Not started' },
    { to: 'food', title: 'Food preferences', done: foodDone, sub: foodDone ? `You chose ${r.myFood}` : 'Tell us what you eat' },
    { to: 'tasks', title: 'Assign responsibilities', done: r.tasks.length > 0 && r.tasks.every((t) => t.assignee), sub: `${r.tasks.filter((t) => t.status === 'Completed').length} of ${r.tasks.length} done` },
    { to: 'payments', title: 'Collect contributions', done: r.myPaymentStatus === 'paid', sub: r.myPaymentStatus === 'paid' ? 'You have paid' : `${inr(r.contribution)} per person` }
  ];
  const decided = steps.filter((s) => s.done).length;

  async function post() {
    if (!draft.title.trim()) return;
    await actions.postAnnouncement(draft.title.trim(), draft.body.trim());
    setDraft({ title: '', body: '' });
    setPosting(false);
  }

  return (
    <div className="flex flex-col gap-5 py-5">
      <section className="relative overflow-hidden rounded-[28px] bg-navy text-white">
        <Img id={r.coverPhotoId} w={1200} h={500} eager className="absolute inset-0 h-full w-full opacity-45" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/70 to-navy/10" />
        <div className="relative flex flex-col gap-4 p-5 pt-24 md:p-8 md:pt-36">
          <div className="flex flex-wrap items-center gap-2 text-xs text-soft">
            <span>ID {r.code}</span><span>·</span><span>{r.city}</span><span>·</span><span>{r.category}</span>
          </div>
          <h1 className="text-2xl font-extrabold leading-tight md:text-4xl">{r.name}</h1>
          <div className="grid grid-cols-3 gap-2 md:max-w-md">
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur"><strong className="font-display text-2xl">{active.length + 1}</strong><p className="text-xs text-soft">Joined</p></div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur"><strong className="font-display text-2xl">{attending}</strong><p className="text-xs text-soft">Attending</p></div>
            <Link to={`${base}/members`} className="rounded-2xl bg-white/10 p-3 backdrop-blur"><strong className="font-display text-2xl text-orange">{requests}</strong><p className="text-xs text-soft">Requests</p></Link>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-1 p-4">
            <div className="flex items-center justify-between pb-2"><h2 className="font-sans text-base font-bold">Planning progress</h2><span className="text-[13px] text-muted">{decided} of {steps.length} done</span></div>
            {steps.map((s, i) => (
              <Link key={s.to} to={`${base}/${s.to}`} className="flex min-h-14 items-center gap-3 rounded-xl px-1 hover:bg-mist">
                <span className={cls('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', s.done ? 'bg-navy text-white' : 'border-2 border-orange text-orange-ink')}>
                  {s.done ? <Check size={14} strokeWidth={3} /> : i + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col"><strong className="text-sm">{s.title}</strong><span className="truncate text-xs text-muted">{s.sub}</span></span>
                <ChevronRight size={18} className="text-muted" />
              </Link>
            ))}
          </Card>

          <nav aria-label="All sections" className="grid grid-cols-3 gap-2.5 md:hidden">
            {modules.filter((m) => m.path).map((m) => (
              <Link key={m.path} to={`${base}/${m.path}`} className="flex flex-col items-center gap-2 rounded-2xl bg-white px-2 py-4 text-[13px] font-semibold">
                <m.icon size={24} className="text-orange" />{m.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-3 p-4">
            <h2 className="font-sans text-base font-bold">Will you attend?</h2>
            <Segmented<Availability> label="Your attendance" value={r.myAttendance ?? ('' as Availability)}
              onChange={(v) => actions.setAttendance(v)}
              options={[{ value: 'yes', label: 'Yes' }, { value: 'maybe', label: 'Maybe' }, { value: 'no', label: "Can't" }]} />
          </Card>

          <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-sans text-base font-bold"><Megaphone size={18} className="text-orange" /> Announcements</h2>
              {isOrganizer && !posting && <Button size="sm" variant="ghost" onClick={() => setPosting(true)}>Post</Button>}
            </div>
            {posting && (
              <div className="flex flex-col gap-3 rounded-2xl bg-mist p-3">
                <input aria-label="Announcement title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title"
                  className="h-11 rounded-xl border-[1.5px] border-line px-3 text-sm outline-none focus:border-navy" />
                <TextArea label="Message" rows={3} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
                <div className="flex gap-2"><Button size="sm" onClick={post}>Publish</Button><Button size="sm" variant="ghost" onClick={() => setPosting(false)}>Cancel</Button></div>
              </div>
            )}
            {r.announcements.length === 0 && !posting && <p className="text-sm text-muted">No announcements yet.</p>}
            {r.announcements.slice(0, 3).map((a) => (
              <div key={a.id} className="rounded-2xl bg-peach p-4">
                <Badge tone="white">{a.author.toUpperCase()} · {fmtDate(a.at, { day: 'numeric', month: 'short' })}</Badge>
                <p className="mt-2 font-semibold">{a.title}</p>
                {a.body && <p className="mt-1 text-sm text-[#4A2A12]">{a.body}</p>}
              </div>
            ))}
          </Card>

          {isOrganizer && (
            <Card className="flex items-center gap-3 p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-orange"><Share2 size={20} /></span>
              <div className="flex-1"><strong className="text-sm">Invite more people</strong><p className="text-xs text-muted">Link, QR code and WhatsApp message</p></div>
              <ButtonLink to={`${base}/invite`} size="sm">Share</ButtonLink>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
