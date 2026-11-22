import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button, Field, Img, Logo, Segmented } from '@/components/ui';
import { useStore } from '@/lib/store';

export default function Auth() {
  const [params] = useSearchParams();
  const next = params.get('next') || '/app';
  const nav = useNavigate();
  const { signIn, register, googleSignIn, mode, googleClientId, user } = useStore();
  const [busy, setBusy] = useState(false);
  const gBox = useRef<HTMLDivElement>(null);
  const isDemo = mode === 'demo';

  useEffect(() => { if (user) nav(next, { replace: true }); }, [user, next, nav]);

  // Real Google sign-in (Google Identity Services) when the server has a client ID.
  useEffect(() => {
    if (mode !== 'api' || !googleClientId || !gBox.current) return;
    const render = () => {
      const g = (window as unknown as { google?: GoogleId }).google;
      if (!g || !gBox.current) return;
      g.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }: { credential: string }) => {
          setBusy(true);
          try { await googleSignIn(credential); } catch (e) { setError(e instanceof Error ? e.message : 'Google sign-in failed.'); } finally { setBusy(false); }
        }
      });
      g.accounts.id.renderButton(gBox.current, { theme: 'outline', size: 'large', shape: 'pill', width: Math.min(400, gBox.current.offsetWidth || 360), text: 'continue_with' });
    };
    if ((window as unknown as { google?: GoogleId }).google) return render();
    const sc = document.createElement('script');
    sc.src = 'https://accounts.google.com/gsi/client';
    sc.async = true;
    sc.onload = render;
    document.head.appendChild(sc);
  }, [mode, googleClientId, googleSignIn]);
  const [tab, setTab] = useState<'signin' | 'register'>(params.get('mode') === 'register' ? 'register' : 'signin');
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', city: 'Visakhapatnam' });
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter a valid email address.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (tab === 'register' && form.name.trim().length < 2) return setError('Enter your full name.');
    setBusy(true);
    setError('');
    try {
      if (tab === 'register') await register({ name: form.name.trim(), email: form.email.trim(), password: form.password, phone: form.phone.trim(), city: form.city.trim() });
      else await signIn(form.email.trim(), form.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh bg-white md:grid-cols-2">
      <div className="relative hidden md:block">
        <Img id="beachGroup" w={1200} h={1400} eager className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/30 to-transparent" />
        <div className="absolute inset-x-10 bottom-10 text-white">
          <p className="font-display text-4xl font-extrabold leading-tight">One account for every reunion you organise or join.</p>
          <p className="mt-3 text-soft">RK Beach, Visakhapatnam</p>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-6 md:justify-center">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="Back to home" className="flex h-11 w-11 items-center justify-center rounded-xl bg-mist md:hidden"><ChevronLeft size={20} /></Link>
          <Link to="/" className="hidden md:block"><Logo /></Link>
        </div>
        <div>
          <h1 className="text-3xl font-extrabold">{tab === 'register' ? 'Create your account' : 'Welcome back'}</h1>
          <p className="mt-2 text-[15px] text-muted">Plan reunions with your batch, colleagues, friends and family.</p>
        </div>

        <Segmented label="Sign in or register" value={tab} onChange={(v) => { setTab(v); setError(''); }}
          options={[{ value: 'signin', label: 'Sign in' }, { value: 'register', label: 'Create account' }]} />

        {isDemo ? (
        <Button variant="ghost" size="lg" onClick={() => googleSignIn()}>
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
          Continue with Google
        </Button>
        ) : googleClientId ? (
          <div ref={gBox} className="flex min-h-11 justify-center" />
        ) : null}

        {(isDemo || googleClientId) && <div className="flex items-center gap-3 text-[13px] text-muted"><span className="h-px flex-1 bg-line" />or with email<span className="h-px flex-1 bg-line" /></div>}

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {tab === 'register' && (
            <>
              <Field label="Full name" value={form.name} onChange={set('name')} placeholder="e.g. Ravi Teja" autoComplete="name" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mobile number" type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98xxx xxxxx" autoComplete="tel" />
                <Field label="City" value={form.city} onChange={set('city')} autoComplete="address-level2" />
              </div>
            </>
          )}
          <Field label="Email" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
          <Field label="Password" type="password" value={form.password} onChange={set('password')} placeholder="At least 8 characters" autoComplete={tab === 'register' ? 'new-password' : 'current-password'} />
          {error && <p role="alert" className="rounded-xl bg-peach px-3 py-2 text-sm text-peach-ink">{error}</p>}
          <Button type="submit" size="lg" className="mt-2" disabled={busy}>{busy ? 'Please wait…' : tab === 'register' ? 'Create account' : 'Sign in'}</Button>
        </form>
        {isDemo && <p className="text-center text-xs text-muted">Demo mode: any email and an 8+ character password will sign you in. Nothing is sent to a server.</p>}
      </div>
    </div>
  );
}

type GoogleId = {
  accounts: { id: {
    initialize: (o: { client_id: string; callback: (r: { credential: string }) => void }) => void;
    renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
  } };
};
