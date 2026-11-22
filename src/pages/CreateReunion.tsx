import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button, Card, Field, Img, TextArea } from '@/components/ui';
import { useStore } from '@/lib/store';
import type { Category } from '@/lib/types';
import { cls, fmtDate, inr } from '@/lib/format';

const categories: Category[] = ['School', 'College', 'Corporate', 'Friends', 'Family', 'Alumni'];
const covers = ['kidsHug', 'graduates', 'classroom', 'friendsSelfie', 'beachGroup', 'familySelfie', 'lectureHall', 'vizagBeachDay'];
const titles = ['The basics', 'Who is it for?', 'When & how much', 'Cover & review'];
const subs = ['Give your reunion a name everyone recognises.', 'Helps old friends find the right group.', 'A rough range is enough — members vote on exact dates.', 'Pick a photo that brings back memories.'];

export default function CreateReunion() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { createReunion, reunions } = useStore();
  const [busy, setBusy] = useState(false);
  const source = reunions.find((r) => r.id === params.get('from'));
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [reuse, setReuse] = useState(Boolean(source));
  const [f, setF] = useState({
    name: source ? source.name.replace(/\d{4}/, String(new Date().getFullYear() + 1)) : '',
    category: (source?.category ?? 'School') as Category,
    description: '',
    institution: source?.institution ?? '',
    batch: source?.batch ?? '',
    city: source?.city ?? 'Visakhapatnam',
    dateFrom: '',
    dateTo: '',
    expected: String(source?.expected ?? 50),
    budget: String(source?.budgetPerPerson ?? 2500),
    cover: source?.coverPhotoId ?? 'kidsHug'
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  function validate(): string {
    if (step === 0 && f.name.trim().length < 4) return 'Give the reunion a name (at least 4 characters).';
    if (step === 1 && !f.city.trim()) return 'Enter the city where the reunion will happen.';
    if (step === 2) {
      if (!f.dateFrom || !f.dateTo) return 'Choose a proposed date range.';
      if (f.dateTo < f.dateFrom) return 'The end date must be after the start date.';
      if (!(Number(f.expected) > 1)) return 'Expected participants must be at least 2.';
      if (!(Number(f.budget) >= 0)) return 'Enter a budget per person (0 if not decided).';
    }
    return '';
  }

  async function next() {
    const e = validate();
    setError(e);
    if (e) return;
    if (step < 3) return setStep(step + 1);
    setBusy(true);
    try {
      const r = await createReunion({
        name: f.name.trim(), category: f.category, institution: f.institution.trim(), batch: f.batch.trim(), city: f.city.trim(),
        description: f.description.trim(), expected: Number(f.expected), dateFrom: f.dateFrom, dateTo: f.dateTo,
        budgetPerPerson: Number(f.budget), coverPhotoId: f.cover, fromReunionId: reuse && source ? source.id : undefined
      });
      nav(`/r/${r.id}/invite?new=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the reunion.');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-sm text-muted">
          <span className="font-semibold text-navy">New reunion</span>
          <span>Step {step + 1} of 4</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 1, 2, 3].map((i) => <div key={i} className={cls('h-1.5 rounded-full', i <= step ? 'bg-orange' : 'bg-line')} />)}
        </div>
        <div>
          <h1 className="text-3xl font-extrabold">{titles[step]}</h1>
          <p className="mt-1 text-[15px] text-muted">{subs[step]}</p>
        </div>
      </div>

      <Card className="flex flex-col gap-5 p-5 md:p-7">
        {step === 0 && (
          <>
            {source && (
              <label className="flex items-start gap-3 rounded-2xl bg-peach p-4 text-sm">
                <input type="checkbox" checked={reuse} onChange={(e) => setReuse(e.target.checked)} className="mt-0.5 h-5 w-5 accent-orange" />
                <span><strong>Reuse members from “{source.name}”.</strong> {source.people.length} people will be added to the new workspace.</span>
              </label>
            )}
            <Field label="Reunion name" value={f.name} onChange={set('name')} placeholder="e.g. Vizag St. Mary's School Batch 2005 Reunion" />
            <div className="flex flex-col gap-2.5">
              <span className="text-[13px] font-semibold">Category</span>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((c) => (
                  <button key={c} type="button" aria-pressed={f.category === c} onClick={() => setF({ ...f, category: c })}
                    className={cls('h-12 rounded-xl text-sm', f.category === c ? 'bg-navy font-semibold text-white' : 'border-[1.5px] border-line hover:bg-mist')}>{c}</button>
                ))}
              </div>
            </div>
            <TextArea label="Description" rows={4} value={f.description} onChange={set('description')} placeholder="20 years since we left school. Let's meet again!" />
          </>
        )}
        {step === 1 && (
          <>
            <Field label={f.category === 'Corporate' ? 'Company name' : f.category === 'Family' || f.category === 'Friends' ? 'Group name (optional)' : 'School / college name'} value={f.institution} onChange={set('institution')} />
            <Field label={f.category === 'Corporate' ? 'Team or year (optional)' : 'Batch / graduation year'} value={f.batch} onChange={set('batch')} inputMode="numeric" placeholder="2005" />
            <Field label="City" value={f.city} onChange={set('city')} hint="We show venues, caterers and travel providers for this city." />
          </>
        )}
        {step === 2 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From" type="date" value={f.dateFrom} onChange={set('dateFrom')} />
              <Field label="To" type="date" value={f.dateTo} onChange={set('dateTo')} />
            </div>
            <Field label="Expected participants" type="number" min={2} value={f.expected} onChange={set('expected')} />
            <Field label="Estimated budget per person (₹)" type="number" min={0} value={f.budget} onChange={set('budget')} />
          </>
        )}
        {step === 3 && (
          <>
            <div className="grid grid-cols-4 gap-2">
              {covers.map((c) => (
                <button key={c} type="button" aria-pressed={f.cover === c} aria-label={`Use cover photo ${c}`} onClick={() => setF({ ...f, cover: c })}
                  className={cls('relative overflow-hidden rounded-xl ring-offset-2', f.cover === c && 'ring-[3px] ring-orange')}>
                  <Img id={c} w={240} h={240} className="aspect-square w-full" />
                  {f.cover === c && <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-orange text-navy"><Check size={14} strokeWidth={3} /></span>}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">Uploading your own batch photo will be available once file storage is connected.</p>
            <div className="flex flex-col gap-2.5 rounded-2xl border border-line p-4 text-sm">
              <strong>Review</strong>
              {[
                ['Name', f.name], ['Category', f.category], ['Institution', f.institution || '—'], ['Batch', f.batch || '—'], ['City', f.city],
                ['Dates', `${fmtDate(f.dateFrom)} – ${fmtDate(f.dateTo)}`], ['Expected', `${f.expected} people`], ['Budget / person', inr(Number(f.budget))]
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4"><span className="text-muted">{k}</span><span className="text-right">{v}</span></div>
              ))}
            </div>
          </>
        )}
        {error && <p role="alert" className="rounded-xl bg-peach px-3 py-2 text-sm text-peach-ink">{error}</p>}
      </Card>

      <div className="flex gap-3">
        {step > 0 && <Button variant="ghost" size="lg" onClick={() => { setError(''); setStep(step - 1); }}>Back</Button>}
        <Button size="lg" variant={step === 3 ? 'accent' : 'primary'} className="flex-1" disabled={busy} onClick={next}>{step === 3 ? 'Create reunion' : 'Continue'}</Button>
      </div>
    </div>
  );
}
