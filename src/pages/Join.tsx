import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Avatar, Button, ButtonLink, Empty, Field, Img } from '@/components/ui';
import { Loading } from '@/components/layouts';
import { useStore, type InvitePreview } from '@/lib/store';

export default function Join() {
  const { token = '' } = useParams();
  const nav = useNavigate();
  const { user, mode, getInvite, joinInvite } = useStore();
  const [view, setView] = useState<InvitePreview | null | undefined>(undefined);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'busy' | 'pending'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode === 'loading') return;
    getInvite(token).then(setView).catch((e) => { setError(e.message); setView(null); });
    // re-check after sign-in so a member is sent straight to the workspace
  }, [mode, token, user, getInvite]);

  useEffect(() => { if (view?.myStatus === 'pending') setStatus('pending'); }, [view]);

  if (view === undefined) return <Loading />;
  if (!view) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Empty title="This invitation link isn't valid" body={error || 'It may have expired or been reset by the organizer. Ask them to send a new link.'} action={<ButtonLink to="/">Go to BACK2CAMPUS</ButtonLink>} />
      </div>
    );
  }

  async function join() {
    if (!user) return nav(`/auth?mode=register&next=${encodeURIComponent(`/join/${token}`)}`);
    if (view?.reunionId) return nav(`/r/${view.reunionId}`);
    setStatus('busy');
    setError('');
    try {
      const out = await joinInvite(token, note);
      if (out.status === 'active') nav(`/r/${out.reunionId}`);
      else setStatus('pending');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join.');
      setStatus('idle');
    }
  }

  const label = !user ? 'Sign up to join' : view.reunionId ? 'Open the reunion' : view.requireApproval ? 'Request to join' : 'Join reunion';

  return (
    <div className="min-h-dvh bg-white md:grid md:grid-cols-2">
      <div className="relative h-72 md:h-auto">
        <Img id={view.coverPhotoId} w={1200} h={1200} eager className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/40 to-transparent" />
        <Link to="/" aria-label="Home" className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/90"><ChevronLeft size={20} /></Link>
        <span className="absolute right-4 top-5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold">You're invited</span>
      </div>
      <div className="relative -mt-8 flex flex-col gap-5 rounded-t-[28px] bg-white px-6 pb-10 pt-7 md:mt-0 md:justify-center md:rounded-none md:px-12">
        <span className="text-xs font-bold tracking-[0.12em] text-orange-ink">{view.category.toUpperCase()} REUNION · {view.city.toUpperCase()}</span>
        <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">{view.name}</h1>
        {view.description && <p className="text-[15px] leading-relaxed text-muted">{view.description}</p>}
        <div className="flex items-center gap-3">
          <div className="flex">{['A K', 'P S', 'M R'].map((n, i) => <span key={n} className="-ml-2 rounded-full ring-2 ring-white first:ml-0"><Avatar name={n} size={36} i={i} /></span>)}</div>
          <span className="text-sm text-muted">{view.members} {view.members === 1 ? 'member' : 'members'} · organised by {view.organizer}</span>
        </div>
        {status === 'pending' ? (
          <div role="status" className="rounded-2xl bg-ok-bg p-4 text-sm text-ok">
            <strong>Request sent.</strong> The organizer approves new members — this reunion appears on your dashboard once you're in.
          </div>
        ) : (
          <>
            {user && !view.reunionId && <Field label="How should classmates know you?" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Anil K. (10th B, cricket captain)" maxLength={200} />}
            {error && <p role="alert" className="rounded-xl bg-peach px-3 py-2 text-sm text-peach-ink">{error}</p>}
            <Button variant="accent" size="lg" onClick={join} disabled={status === 'busy'}>{status === 'busy' ? 'Joining…' : label}</Button>
            {view.requireApproval && !view.reunionId && <p className="text-center text-xs text-muted">The organizer approves new members.</p>}
          </>
        )}
      </div>
    </div>
  );
}
