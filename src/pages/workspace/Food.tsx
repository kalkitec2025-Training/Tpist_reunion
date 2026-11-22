import { useWorkspace } from '@/components/layouts';
import { Card, DemoBadge, Field, Img, PageHeader } from '@/components/ui';
import type { FoodPref } from '@/lib/types';
import { cls } from '@/lib/format';

const prefs: { v: FoodPref; color: string }[] = [
  { v: 'Non-vegetarian', color: '#14213D' },
  { v: 'Vegetarian', color: '#F2711C' },
  { v: 'Jain', color: '#9AA5BD' },
  { v: 'Vegan', color: '#F6B48A' }
];

export default function Food() {
  const { reunion: r, update, base } = useWorkspace();
  const counts = Object.fromEntries(prefs.map((p) => [p.v, r.foodCounts[p.v] + (r.myFood === p.v ? 1 : 0)])) as Record<FoodPref, number>;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-5 pb-4">
      <PageHeader back={base} title="Food & catering" subtitle={`${total} responses so far`} />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-4 p-5">
            <h2 className="font-sans text-base font-bold">Your preference</h2>
            <div className="grid grid-cols-2 gap-2">
              {prefs.map((p) => (
                <button key={p.v} type="button" aria-pressed={r.myFood === p.v} onClick={() => update((x) => ({ ...x, myFood: p.v }))}
                  className={cls('h-12 rounded-xl text-sm', r.myFood === p.v ? 'bg-navy font-bold text-white' : 'border-[1.5px] border-line')}>{p.v}</button>
              ))}
            </div>
            <Field label="Special dietary needs" value={r.myDiet} onChange={(e) => update((x) => ({ ...x, myDiet: e.target.value }))} placeholder="e.g. no peanuts, diabetic-friendly" />
          </Card>
          <Card className="flex flex-col gap-4 p-5">
            <h2 className="font-sans text-base font-bold">Group summary</h2>
            <div className="flex h-3.5 overflow-hidden rounded-full bg-mist">
              {prefs.map((p) => total > 0 && <div key={p.v} style={{ width: `${(counts[p.v] / total) * 100}%`, background: p.color }} />)}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {prefs.map((p) => <span key={p.v} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />{p.v} · <strong>{counts[p.v]}</strong></span>)}
            </div>
            <p className="text-xs text-muted">Estimated food budget: set it on the Budget page once the caterer quotes a per-plate price.</p>
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-sans text-base font-bold">Catering packages</h2>
          {[
            { name: 'Demo Caterer A · Andhra buffet', d: 'Veg + non-veg · Jain on request · 2 starters, 6 mains, 2 desserts', photo: 'dinnerTable' },
            { name: 'Demo Caterer B · Coastal seafood', d: 'Non-veg heavy · vegetarian counter · live grill', photo: 'lunch' }
          ].map((c) => (
            <Card key={c.name} className="flex gap-4 overflow-hidden p-3">
              <div className="relative w-28 shrink-0"><Img id={c.photo} w={240} h={240} className="aspect-square w-full rounded-2xl" alt="Illustrative food photo" /><DemoBadge className="absolute left-1.5 top-1.5" /></div>
              <div className="flex flex-col gap-1 py-1">
                <strong className="text-[15px]">{c.name}</strong>
                <span className="text-[13px] text-muted">{c.d}</span>
                <span className="mt-auto text-[13px]">Per plate: <strong>vendor quote</strong></span>
              </div>
            </Card>
          ))}
          <p className="text-xs text-muted">Catering partners will appear here once vendors are verified for {r.city}.</p>
        </div>
      </div>
    </div>
  );
}
