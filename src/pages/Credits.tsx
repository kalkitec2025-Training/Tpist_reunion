import { Link } from 'react-router-dom';
import { Img, Logo } from '@/components/ui';
import { allPhotos } from '@/lib/photos';

export default function Credits() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <Link to="/"><Logo /></Link>
      <h1 className="mt-8 text-3xl font-extrabold">Photo credits</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Photos are used under the <a className="underline" href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">Unsplash License</a> and the{' '}
        <a className="underline" href="https://www.pexels.com/license/" target="_blank" rel="noopener noreferrer">Pexels License</a>. Venue and caterer cards use them as
        illustrations only; they do not show real BACK2CAMPUS partners.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {allPhotos.map((p) => (
          <figure key={p.id} className="overflow-hidden rounded-2xl bg-white">
            <Img photo={p} w={400} h={300} className="aspect-[4/3] w-full" />
            <figcaption className="p-3 text-xs">
              <a href={p.creditUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">{p.credit}</a> on {p.source}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
