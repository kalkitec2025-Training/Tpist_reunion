import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, Upload, X } from 'lucide-react';
import { useWorkspace } from '@/components/layouts';
import { ButtonLink, Card, Img, PageHeader, Segmented } from '@/components/ui';
import { allPhotos, photoUrl } from '@/lib/photos';

const albums = [
  { name: 'Then · school days', ids: ['kidsHug', 'villageKids', 'classroom', 'lectureHall'] },
  { name: 'Reunion night', ids: ['friendsSelfie', 'dinnerTable', 'familySelfie', 'lunch'] },
  { name: 'By the sea', ids: ['beachGroup', 'rkStatue', 'vizagWaves', 'vizagBeachDay', 'beachRoad'] }
];

export default function Memories() {
  const { reunion: r, base, isOrganizer } = useWorkspace();
  const [tab, setTab] = useState<'photos' | 'albums' | 'timeline'>('photos');
  const [open, setOpen] = useState<number | null>(null);
  const [uploads, setUploads] = useState<{ url: string; name: string }[]>([]);
  const [privacy, setPrivacy] = useState<'members' | 'organizers'>('members');
  const input = useRef<HTMLInputElement>(null);
  const gallery = allPhotos.filter((p) => !['resortPool', 'hotelPool'].includes(p.id));

  const uploadsRef = useRef(uploads);
  uploadsRef.current = uploads;
  useEffect(() => () => uploadsRef.current.forEach((u) => URL.revokeObjectURL(u.url)), []);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') setOpen((i) => (i === null ? i : (i + 1) % gallery.length));
      if (e.key === 'ArrowLeft') setOpen((i) => (i === null ? i : (i - 1 + gallery.length) % gallery.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, gallery.length]);

  function onFiles(files: FileList | null) {
    if (!files) return;
    const ok = Array.from(files).filter((f) => /^image\/(jpeg|png|webp|heic)$/.test(f.type) && f.size <= 15 * 1024 * 1024).slice(0, 20);
    setUploads((u) => [...ok.map((f) => ({ url: URL.createObjectURL(f), name: f.name })), ...u]);
  }

  const current = open !== null ? gallery[open] : null;

  return (
    <div className="flex flex-col gap-4 pb-4">
      <PageHeader back={base} title="Memories" subtitle={`${gallery.length + uploads.length} photos · ${privacy === 'members' ? 'members only' : 'organizers only'}`}
        action={
          <>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => onFiles(e.target.files)} />
            <button type="button" onClick={() => input.current?.click()} className="flex h-11 items-center gap-2 rounded-xl bg-orange px-4 text-sm font-bold text-navy"><Upload size={18} /> Upload</button>
          </>
        } />

      <Segmented label="Gallery view" value={tab} onChange={setTab} options={[{ value: 'photos', label: 'Photos' }, { value: 'albums', label: 'Albums' }, { value: 'timeline', label: 'Timeline' }]} />

      {uploads.length > 0 && (
        <Card className="flex flex-col gap-2 p-4">
          <strong className="text-sm">Ready to upload ({uploads.length})</strong>
          <div className="grid grid-cols-4 gap-1.5 md:grid-cols-8">{uploads.map((u) => <img key={u.url} src={u.url} alt={u.name} className="aspect-square w-full rounded-lg object-cover" />)}</div>
          <p className="text-xs text-muted">Demo: previews stay on this device. Uploads go to storage once it is connected in the backend phase.</p>
        </Card>
      )}

      {tab === 'photos' && (
        <div className="grid grid-cols-3 gap-1.5 md:grid-cols-4">
          {gallery.map((p, i) => (
            <button key={p.id} type="button" onClick={() => setOpen(i)} aria-label={`Open photo: ${p.alt}`} className="overflow-hidden rounded-xl">
              <Img photo={p} w={400} h={400} className="aspect-square w-full transition hover:scale-105" />
            </button>
          ))}
        </div>
      )}

      {tab === 'albums' && (
        <div className="grid gap-4 md:grid-cols-3">
          {albums.map((a) => (
            <Card key={a.name} className="overflow-hidden">
              <div className="grid grid-cols-2 gap-0.5">{a.ids.slice(0, 4).map((id) => <Img key={id} id={id} w={300} h={300} className="aspect-square w-full" />)}</div>
              <div className="p-4"><strong>{a.name}</strong><p className="text-xs text-muted">{a.ids.length} photos</p></div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'timeline' && (
        <div className="flex flex-col gap-6">
          {[['2005 · Where it began', albums[0].ids], ['Reunion night', albums[1].ids], ['The day after, by the sea', albums[2].ids]].map(([title, ids]) => (
            <section key={title as string} className="flex flex-col gap-2">
              <h2 className="font-sans text-sm font-bold">{title as string}</h2>
              <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
                {(ids as string[]).map((id) => <Img key={id} id={id} w={480} h={360} className="aspect-[4/3] w-60 shrink-0 rounded-2xl" />)}
              </div>
            </section>
          ))}
        </div>
      )}

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex justify-between text-xs"><span className="text-muted">Storage used</span><strong>3.2 GB of 10 GB</strong></div>
        <div className="h-2 overflow-hidden rounded-full bg-mist"><div className="h-full w-[32%] bg-navy" /></div>
        {isOrganizer && (
          <label className="flex items-center justify-between gap-3 border-t border-line pt-3 text-sm">
            <span className="flex items-center gap-2"><Lock size={16} /> Who can see this gallery</span>
            <select value={privacy} onChange={(e) => setPrivacy(e.target.value as typeof privacy)} className="h-10 rounded-lg border-[1.5px] border-line bg-white px-2 text-sm">
              <option value="members">All members</option><option value="organizers">Organizers only</option>
            </select>
          </label>
        )}
      </Card>

      {isOrganizer && <ButtonLink to={`/app/new?from=${r.id}`} size="lg">Plan the next reunion with this group</ButtonLink>}

      {current && (
        <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setOpen(null)}>
          <div className="flex items-center justify-between p-3 text-white">
            <span className="text-xs text-white/70">Photo: <a href={current.creditUrl} target="_blank" rel="noopener noreferrer" className="underline" onClick={(e) => e.stopPropagation()}>{current.credit}</a> on {current.source}</span>
            <button type="button" aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10"><X /></button>
          </div>
          <div className="relative flex flex-1 items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
            <img src={photoUrl(current, 1600)} alt={current.alt} className="max-h-full max-w-full object-contain" />
            <button type="button" aria-label="Previous photo" onClick={() => setOpen((i) => ((i ?? 0) - 1 + gallery.length) % gallery.length)} className="absolute left-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white"><ChevronLeft /></button>
            <button type="button" aria-label="Next photo" onClick={() => setOpen((i) => ((i ?? 0) + 1) % gallery.length)} className="absolute right-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white"><ChevronRight /></button>
          </div>
        </div>
      )}
    </div>
  );
}
