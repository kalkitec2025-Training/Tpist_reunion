import { ButtonLink, Img } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <Img id="classroom" w={600} h={400} className="aspect-[3/2] w-full rounded-3xl" />
      <h1 className="text-3xl font-extrabold">This classroom is empty</h1>
      <p className="text-muted">The page you were looking for doesn't exist.</p>
      <ButtonLink to="/">Back to BACK2CAMPUS</ButtonLink>
    </div>
  );
}
