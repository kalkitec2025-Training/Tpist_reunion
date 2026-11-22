import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Avatar, Button, ButtonLink, Empty, Field, Img } from '@/components/ui';
import { useStore } from '@/lib/store';

export default function Join() {
  const { token = '' } = useParams();
  const nav = useNavigate();
  const { user, invitations, reunions, joinByToken } = useStore();
  const [note, setNote] = useState('');
  const [requested, setRequested] = useState(false);

  const inv = invitations.find((i) => i.token === token);
  const own = reunions.find((r) => r.inviteToken === token);
  const view = inv
    ? { name: inv.name, description: inv.description, cover: inv.coverPhotoId, category: inv.category, city: inv.city, by: inv.invitedBy, members: inv.members, approval: false }
    : own
      ? { name: own.name, description: own.description, cover: own.coverPhotoId, category: own.category, city: own.city, by: 'You', members: own.people.length + 1, approval: own.requireApproval }
      : null;

  if (!view) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Empty title="This invitation link isn't valid" body="It may have expired or been reset by the organizer. Ask them to send a new link." action={<ButtonLink to="/">Go to BACK2CAMPUS</ButtonLink>} />
      </div>
    );
  }

  function join() {
    if (!user) return nav(`/auth?mode=register&next=${encodeURIComponent(`/join/${token}`)}`);
    if (own) return nav(`/r/${own.id}`);
    if (view?.approval) { setRequested(true); return; }
    const id = joinByToken(token, note);
    if (id) nav(`/r/${id}`);
  }

  return (
    <div className="min-h-dvh bg-white md:grid md:grid-cols-2">
      <div className="relative h-72 md:h-auto">
        <Img id={view.cover} w={1200} h={1200} eager className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/40 to-transparent" />
        <Link to="/" aria-label="Home" className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/90"><ChevronLeft size={20} /></Link>
        <span className="absolute right-4 top-5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold">You're invited</span>
      </div>
      <div className="relative -mt-8 flex flex-col gap-5 rounded-t-[28px] bg-white px-6 pb-10 pt-7 md:mt-0 md:justify-center md:rounded-none md:px-12">
        <span className="text-xs font-bold tracking-[0.12em] text-orange-ink">{view.category.toUpperCase()} REUNION · {view.city.toUpperCase()}</span>
        <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">{view.name}</h1>
        {view.description && <p className="text-[15px] leading-relaxed text-muted">{view.description}</p>}
        <div className="flex items-center gap-3">
          <div className="flex">{['A K', 'P S', 'M R'].map((n, i) => <span key={n} className="-ml-2 first:ml-0 rounded-full ring-2 ring-white"><Avatar name={n} size={36} i={i} /></span>)}</div>
          <span className="text-sm text-muted">{view.members} members · organised by {view.by}</span>
        </div>
        {requested ? (
          <div role="status" className="rounded-2xl bg-ok-bg p-4 text-sm text-ok">
            <strong>Request sent.</strong> The organizer approves new members — you'll be notified when you're in.
          </div>
        ) : (
          <>
            <Field label="How should classmates know you?" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Anil K. (10th B, cricket captain)" />
            <Button variant="accent" size="lg" onClick={join}>{user ? (view.approval ? 'Request to join' : 'Join reunion') : 'Sign up to join'}</Button>
            {view.approval && <p className="text-center text-xs text-muted">The organizer approves new members.</p>}
          </>
        )}
      </div>
    </div>
  );
}
