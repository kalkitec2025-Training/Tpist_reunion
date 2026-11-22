import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Wallet, CreditCard, QrCode, Images, ShieldCheck, Users } from 'lucide-react';
import { ButtonLink, Img, Logo } from '@/components/ui';
import { useStore } from '@/lib/store';

const steps = [
  { n: '01', t: 'Create', d: 'Set up a private workspace for your batch in two minutes.' },
  { n: '02', t: 'Invite', d: 'Share one link or QR code on WhatsApp. Approve who joins.' },
  { n: '03', t: 'Decide together', d: 'Everyone votes on dates, venues and food. The organizer finalises.' },
  { n: '04', t: 'Relive', d: 'Keep every photo and video from the day in one shared album.' }
];

const features = [
  { icon: CalendarDays, t: 'Date voting', d: 'See who is free, the most popular date and the deadline at a glance.' },
  { icon: MapPin, t: 'Venue marketplace', d: 'Compare resorts, halls and beachside venues in your city, then vote.' },
  { icon: Wallet, t: 'Budget calculator', d: 'Estimate costs by category and see the fair share per person.' },
  { icon: CreditCard, t: 'Contributions', d: 'Collect money by UPI or card, with receipts and reminders.' },
  { icon: QrCode, t: 'Event-day check-in', d: 'Schedule, directions, contacts and QR check-in at the gate.' },
  { icon: Images, t: 'Memories', d: 'Albums, videos and a timeline that stay with the group.' }
];

const kinds = ['School', 'College', 'Corporate', 'Friends', 'Family', 'Alumni'];

export default function Landing() {
  const { user, mode } = useStore();
  const start = user ? '/app/new' : '/auth?next=/app/new';
  return (
    <div className="bg-white">
      <header className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:h-20 md:px-6">
        <Logo />
        <nav className="ml-auto hidden items-center gap-6 text-sm font-medium md:flex">
          <a href="#how" className="text-muted hover:text-navy">How it works</a>
          <a href="#features" className="text-muted hover:text-navy">Features</a>
          <Link to="/vendor" className="text-muted hover:text-navy">For venues &amp; vendors</Link>
        </nav>
        {user
          ? <ButtonLink to="/app" size="sm" className="ml-auto md:ml-0">My reunions</ButtonLink>
          : <Link to="/auth" className="ml-auto flex h-11 items-center px-1 text-sm font-semibold md:ml-0">Sign in</Link>}
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-12 pt-6 md:grid-cols-2 md:px-6 md:pb-20 md:pt-12">
        <div className="flex flex-col gap-5">
          <span className="self-start rounded-full bg-peach px-3 py-1.5 text-xs font-semibold text-peach-ink">Now launching in Visakhapatnam</span>
          <h1 className="text-[40px] font-extrabold leading-[1.02] tracking-tight md:text-6xl">
            Bring the memories back. <span className="text-orange">Reconnect</span> the people.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-muted md:text-lg">
            Plan your school, college or office reunion in one place — invites, date and venue voting, budgets, payments and memories.
            No more 400-message WhatsApp threads.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink to={start} variant="accent" size="lg">Create a reunion</ButtonLink>
            {mode === 'demo'
              ? <ButtonLink to="/join/OfficeGang15" variant="outline" size="lg">See an invitation (demo)</ButtonLink>
              : <ButtonLink to={user ? '/app' : '/auth?mode=register'} variant="outline" size="lg">{user ? 'My reunions' : 'Create an account'}</ButtonLink>}
          </div>
          <p className="flex items-center gap-2 text-sm text-muted"><ShieldCheck size={16} className="text-ok" /> Private to members. Nobody outside your reunion sees your data.</p>
        </div>

        <div className="relative mx-auto h-[340px] w-full max-w-[480px] md:h-[460px]">
          <figure className="absolute left-0 top-6 w-[52%] -rotate-6 bg-white p-2.5 pb-9 shadow-[0_14px_40px_rgba(20,33,61,0.22)]">
            <Img id="kidsHug" w={500} h={560} eager className="aspect-[9/10] w-full" />
            <figcaption className="absolute bottom-2.5 left-3 text-xs text-muted">Best friends, then</figcaption>
          </figure>
          <figure className="absolute right-0 top-0 w-[50%] rotate-6 bg-white p-2.5 pb-9 shadow-[0_14px_40px_rgba(20,33,61,0.22)]">
            <Img id="graduates" w={500} h={560} eager className="aspect-[9/10] w-full" />
            <figcaption className="absolute bottom-2.5 left-3 text-xs text-muted">Graduation day</figcaption>
          </figure>
          <figure className="absolute bottom-0 left-[22%] w-[56%] -rotate-1 bg-white p-2.5 pb-9 shadow-[0_18px_44px_rgba(20,33,61,0.28)]">
            <Img id="friendsSelfie" w={600} h={420} eager className="aspect-[10/7] w-full" />
            <figcaption className="absolute bottom-2.5 left-3 text-xs text-muted">Together again</figcaption>
          </figure>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-mist">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
          <h2 className="text-3xl font-bold md:text-4xl">How it works</h2>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            {steps.map((s) => (
              <div key={s.n} className="flex flex-col gap-2 rounded-3xl bg-white p-5">
                <span className="font-display text-2xl font-extrabold text-orange">{s.n}</span>
                <strong>{s.t}</strong>
                <span className="text-sm leading-relaxed text-muted">{s.d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
        <div className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:items-center">
          <div className="relative overflow-hidden rounded-3xl">
            <Img id="dinnerTable" w={900} h={1000} className="aspect-[4/5] w-full md:aspect-[9/10]" />
            <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/95 p-4 backdrop-blur">
              <p className="text-xs font-bold tracking-wide text-orange-ink">EVERYONE HAS A SAY</p>
              <p className="mt-1 text-sm">Participants suggest and vote. The organizer makes the final call.</p>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold md:text-4xl">Everything a reunion needs, in one place</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {features.map((f) => (
                <div key={f.t} className="flex gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-peach text-orange-ink"><f.icon size={20} /></span>
                  <div>
                    <strong className="text-[15px]">{f.t}</strong>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted">{f.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Vizag */}
      <section className="relative isolate overflow-hidden bg-navy text-white">
        <Img id="vizagWaves" w={1800} h={900} className="absolute inset-0 -z-10 h-full w-full opacity-40" alt="" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy via-navy/85 to-navy/30" />
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2 md:px-6 md:py-24">
          <div className="flex flex-col gap-4">
            <span className="text-xs font-bold tracking-[0.15em] text-orange">STARTING IN THE CITY OF DESTINY</span>
            <h2 className="text-3xl font-bold md:text-5xl">Reunions by the sea, in Visakhapatnam</h2>
            <p className="max-w-md text-soft">Beachside lawns, banquet halls, resorts and old campus halls — discover venues and service providers near your reunion, then decide together.</p>
            <div className="flex flex-wrap gap-2">
              {kinds.map((k) => <span key={k} className="rounded-full bg-white/10 px-4 py-2 text-sm ring-1 ring-white/20">{k}</span>)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-end">
            <Img id="rkStatue" w={500} h={640} className="aspect-[4/5] w-full rounded-2xl" />
            <Img id="beachGroup" w={500} h={640} className="mt-8 aspect-[4/5] w-full rounded-2xl" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
        <div className="grid items-center gap-8 rounded-[32px] bg-peach p-6 md:grid-cols-[1.3fr_1fr] md:p-12">
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-bold md:text-4xl">Your batch is waiting. Start the reunion.</h2>
            <p className="text-[#4A2A12]">It takes two minutes to create a workspace and share the invite link.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink to={start} size="lg">Create a reunion</ButtonLink>
              <ButtonLink to="/vendor" variant="outline" size="lg"><Users size={18} /> List your venue or service</ButtonLink>
            </div>
          </div>
          <Img id="villageKids" w={700} h={500} className="aspect-[7/5] w-full rounded-3xl" />
        </div>
      </section>

      <footer className="bg-navy text-soft">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-end md:justify-between md:px-6">
          <div className="flex flex-col gap-3">
            <Logo light />
            <p className="text-sm">Bring the memories back. Reconnect the people.</p>
            <p className="text-xs">A KALKITEC product · Visakhapatnam, Andhra Pradesh, India</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link to="/vendor" className="hover:text-white">Vendor portal</Link>
            <Link to="/admin" className="hover:text-white">Admin</Link>
            <Link to="/credits" className="hover:text-white">Photo credits</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
