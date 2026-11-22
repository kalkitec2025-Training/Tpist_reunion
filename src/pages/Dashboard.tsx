import { Link } from 'react-router-dom';
import { Plus, CalendarDays, MapPin, Users } from 'lucide-react';
import { Badge, ButtonLink, Card, Empty, Img, Progress, Button } from '@/components/ui';
import { useStore } from '@/lib/store';
import type { Reunion } from '@/lib/types';
import { fmtDate, inr } from '@/lib/format';

function statusOf(r: Reunion) {
  if (r.status === 'completed') return { label: 'COMPLETED', tone: 'grey' as const };
  if (r.finalDateId && r.finalVenueId) return { label: 'CONFIRMED', tone: 'green' as const };
  return { label: 'PLANNING', tone: 'orange' as const };
}

function finalDate(r: Reunion) {
  const d = r.dates.find((x) => x.id === r.finalDateId);
  return d ? fmtDate(d.iso) : r.dateFrom ? `${fmtDate(r.dateFrom, { month: 'short', year: 'numeric' })} (voting)` : 'Date not set';
}

function ReunionCard({ r }: { r: Reunion }) {
  const st = statusOf(r);
  const joined = r.people.filter((p) => p.status === 'active').length + 1;
  const pending = r.dates.length > 0 && !r.finalDateId && Object.keys(r.myDateVotes).length < r.dates.length;
  return (
    <Link to={`/r/${r.id}`} className="group flex flex-col overflow-hidden rounded-3xl bg-white transition hover:shadow-lg">
      <div className="relative">
        <Img id={r.coverPhotoId} w={700} h={320} className="aspect-[21/9] w-full transition group-hover:scale-[1.02]" />
        <Badge tone={st.tone} className="absolute left-3 top-3">{st.label}</Badge>
      </div>
      <div className="flex flex-col gap-2.5 p-4">
        <strong className="text-base leading-snug">{r.name}</strong>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
          <span className="flex items-center gap-1"><MapPin size={14} />{r.city}</span>
          <span className="flex items-center gap-1"><CalendarDays size={14} />{finalDate(r)}</span>
          <span className="flex items-center gap-1"><Users size={14} />{joined} of {r.expected} joined</span>
        </div>
        <Progress value={(joined / Math.max(1, r.expected)) * 100} />
        <div className="flex flex-wrap gap-2">
          {pending && <span className="rounded-full bg-peach px-3 py-1 text-xs font-semibold text-peach-ink">Your vote is pending</span>}
          {r.myPaymentStatus !== 'paid' && r.contribution > 0 && r.payments.length > 0 && <span className="rounded-full bg-mist px-3 py-1 text-xs">{inr(r.contribution)} contribution due</span>}
          {r.venues.length > 0 && !r.finalVenueId && <span className="rounded-full bg-mist px-3 py-1 text-xs">{r.venues.length} venues suggested</span>}
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user, reunions, invitations, declineInvitation, pending } = useStore();
  const organised = reunions.filter((r) => r.myRole !== 'participant');
  const joined = reunions.filter((r) => r.myRole === 'participant');
  const pendingPolls = reunions.filter((r) => r.dates.length > 0 && !r.finalDateId && Object.keys(r.myDateVotes).length < r.dates.length).length;
  const due = reunions.filter((r) => r.myPaymentStatus !== 'paid' && r.payments.length > 0).reduce((n, r) => n + r.contribution, 0);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex flex-col gap-8 py-6">
      <section className="flex flex-col gap-5 rounded-[28px] bg-navy p-5 text-white md:flex-row md:items-end md:justify-between md:p-8">
        <div>
          <p className="text-sm text-soft">{greet},</p>
          <h1 className="text-3xl font-extrabold">{user?.name?.split(' ')[0]}</h1>
        </div>
        <div className="grid grid-cols-3 gap-2 md:w-[460px]">
          <div className="rounded-2xl bg-navy-2 p-3"><strong className="font-display text-2xl text-orange">{pendingPolls}</strong><p className="text-xs text-soft">Pending polls</p></div>
          <div className="rounded-2xl bg-navy-2 p-3"><strong className="font-display text-2xl">{inr(due)}</strong><p className="text-xs text-soft">Payments due</p></div>
          <div className="rounded-2xl bg-navy-2 p-3"><strong className="font-display text-2xl">{invitations.length}</strong><p className="text-xs text-soft">Invitations</p></div>
        </div>
      </section>

      {pending.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Waiting for approval</h2>
          {pending.map((p) => (
            <Card key={p.id} className="flex items-center gap-4 p-4">
              <Img id={p.coverPhotoId} w={200} h={140} className="aspect-[10/7] w-24 rounded-xl" />
              <div className="flex-1"><strong>{p.name}</strong><p className="text-sm text-muted">The organizer will review your request.</p></div>
            </Card>
          ))}
        </section>
      )}

      {invitations.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Invitations</h2>
          {invitations.map((inv) => (
            <Card key={inv.token} className="flex flex-col gap-4 border-[1.5px] border-dashed border-orange p-4 sm:flex-row sm:items-center">
              <Img id={inv.coverPhotoId} w={240} h={160} className="aspect-[3/2] w-full rounded-2xl sm:w-36" />
              <div className="flex-1">
                <strong>{inv.name}</strong>
                <p className="text-sm text-muted">Invited by {inv.invitedBy} · {inv.members} members</p>
              </div>
              <div className="flex gap-2">
                <ButtonLink to={`/join/${inv.token}`} className="flex-1">View &amp; join</ButtonLink>
                <Button variant="ghost" onClick={() => declineInvitation(inv.token)}>Decline</Button>
              </div>
            </Card>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Reunions I organise</h2>
          <ButtonLink to="/app/new" size="sm" variant="accent" className="hidden md:inline-flex"><Plus size={16} /> New reunion</ButtonLink>
        </div>
        {organised.length === 0
          ? <Empty title="No reunions yet" body="Create a workspace for your batch and share the invite link." action={<ButtonLink to="/app/new" variant="accent">Create a reunion</ButtonLink>} />
          : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{organised.map((r) => <ReunionCard key={r.id} r={r} />)}</div>}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Reunions I joined</h2>
        {joined.length === 0
          ? <Empty title="Not a member of any other reunion" body="When someone invites you, open their link to join." />
          : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{joined.map((r) => <ReunionCard key={r.id} r={r} />)}</div>}
      </section>

      <Link to="/app/new" className="fixed bottom-24 right-4 z-20 flex h-14 items-center gap-2 rounded-2xl bg-orange px-5 font-bold text-navy shadow-[0_10px_24px_rgba(242,113,28,0.4)] md:hidden">
        <Plus size={20} /> New reunion
      </Link>
    </div>
  );
}
