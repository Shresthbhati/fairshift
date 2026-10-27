import { TrackView } from './track-view';

// Public page: no sign-in. Works with a reference + tracking code only.
export default async function TrackPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  return <TrackView initialRef={/^FS-[A-Z0-9]{8}$/i.test(ref ?? '') ? (ref as string).toUpperCase() : ''} />;
}
