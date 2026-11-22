import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { Navigation, Phone, ScanLine } from 'lucide-react';
import { useWorkspace } from '@/components/layouts';
import { Button, Card, Img, PageHeader } from '@/components/ui';
import { cls, fmtDay } from '@/lib/format';

const schedule = [
  { t: '5:00 pm', title: 'Welcome & check-in', sub: 'Name tags at the entrance' },
  { t: '6:00 pm', title: "Teachers' felicitation", sub: 'Happening now', now: true },
  { t: '7:00 pm', title: 'Then & now slideshow', sub: 'Group photo after' },
  { t: '8:00 pm', title: 'Dinner & music', sub: 'Veg and non-veg counters' }
];

export default function EventDay() {
  const { reunion: r, update, base, isOrganizer } = useWorkspace();
  const date = r.dates.find((d) => d.id === r.finalDateId);
  const venue = r.venues.find((v) => v.id === r.finalVenueId);
  const confirmed = r.people.filter((p) => p.attendance === 'yes').length + (r.myAttendance === 'yes' ? 1 : 0);
  const [pass, setPass] = useState('');
  const contacts = r.people.filter((p) => p.role !== 'participant');

  useEffect(() => {
    QRCode.toDataURL(`B2C-CHECKIN:${r.code}:${r.inviteToken}`, { width: 360, margin: 1, color: { dark: '#14213D', light: '#FFFFFF' } }).then(setPass).catch(() => setPass(''));
  }, [r.code, r.inviteToken]);

  const mapsUrl = venue ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.area}, ${r.city}`)}` : '';

  return (
    <div className="flex flex-col gap-5 pb-4">
      <PageHeader back={base} title="Event day" subtitle={date ? fmtDay(date.iso) : 'Date not finalised yet'} />

      <section className="relative overflow-hidden rounded-3xl bg-orange">
        {venue && <Img id={venue.photoId} w={1200} h={500} className="absolute inset-0 h-full w-full opacity-30 mix-blend-multiply" alt="" />}
        <div className="relative flex flex-col gap-4 p-5 md:p-7">
          <span className="text-xs font-bold tracking-[0.15em]">IT'S REUNION DAY</span>
          <h2 className="text-3xl font-extrabold leading-tight md:text-4xl">{date ? `${fmtDay(date.iso)} · ${date.slot}` : 'Finalise the date to unlock the event-day view'}</h2>
          <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 sm:flex-row sm:items-center">
            <div className="flex-1"><strong>{venue?.name ?? 'Venue not finalised'}</strong><p className="text-xs text-muted">{venue ? `${venue.area}, ${r.city}` : 'Pick and finalise a venue first'}</p></div>
            {venue && <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-navy px-4 text-sm font-semibold text-white"><Navigation size={16} /> Directions</a>}
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {isOrganizer ? (
          <section className="flex items-center gap-4 rounded-3xl bg-navy p-5 text-white">
            <div className="flex-1"><p className="text-xs text-soft">Checked in</p><strong className="font-display text-4xl font-extrabold">{r.checkedIn} <span className="text-lg text-soft">/ {Math.max(confirmed, r.checkedIn)}</span></strong></div>
            <Button variant="accent" onClick={() => update((x) => ({ ...x, checkedIn: x.checkedIn + 1 }))}><ScanLine size={18} /> Scan QR</Button>
          </section>
        ) : (
          <Card className="flex items-center gap-4 p-5">
            {pass && <img src={pass} alt="Your entry pass QR code" width={120} height={120} className="rounded-xl" />}
            <div><strong>Your entry pass</strong><p className="text-sm text-muted">Show this at the entrance to check in.</p></div>
          </Card>
        )}

        <Card className="flex flex-col gap-3 p-5">
          <h2 className="font-sans text-base font-bold">Who to call</h2>
          {[{ name: r.myRole === 'organizer' ? 'You (organizer)' : 'Organizer', role: 'Venue & overall' }, ...contacts.map((c) => ({ name: c.name, role: 'Co-organizer' }))].slice(0, 3).map((c) => (
            <div key={c.name} className="flex items-center gap-3">
              <div className="flex-1"><strong className="text-sm">{c.name}</strong><p className="text-xs text-muted">{c.role}</p></div>
              <button type="button" aria-label={`Call ${c.name}`} className="flex h-11 w-11 items-center justify-center rounded-xl bg-mist"><Phone size={18} /></button>
            </div>
          ))}
        </Card>
      </div>

      <Card className="flex flex-col p-5">
        <h2 className="mb-3 font-sans text-base font-bold">Schedule</h2>
        {schedule.map((s, i) => (
          <div key={s.t} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={cls('h-3 w-3 rounded-full', s.now ? 'bg-orange ring-4 ring-peach' : i === 0 ? 'bg-navy' : 'border-2 border-[#9AA5BD]')} />
              {i < schedule.length - 1 && <span className="w-0.5 flex-1 bg-line" />}
            </div>
            <div className="pb-4"><strong className="text-sm">{s.t} · {s.title}</strong><p className={cls('text-xs', s.now ? 'font-semibold text-orange-ink' : 'text-muted')}>{s.sub}</p></div>
          </div>
        ))}
      </Card>

      <Link to={`${base}/memories`} className="flex h-14 items-center justify-center rounded-2xl bg-navy font-bold text-white">Upload photos to Memories</Link>
    </div>
  );
}
