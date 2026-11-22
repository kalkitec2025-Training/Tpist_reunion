import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Card, Field } from '@/components/ui';
import { useStore } from '@/lib/store';

export default function Profile() {
  const { user, updateProfile, signOut, resetDemo, mode } = useStore();
  const isDemo = mode === 'demo';
  const nav = useNavigate();
  const [f, setF] = useState({ name: user?.name ?? '', phone: user?.phone ?? '', city: user?.city ?? '' });
  const [saved, setSaved] = useState(false);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 py-6">
      <div className="flex items-center gap-4">
        <Avatar name={user?.name ?? 'You'} size={72} />
        <div>
          <h1 className="text-2xl font-extrabold">{user?.name}</h1>
          <p className="text-sm text-muted">{user?.email}</p>
        </div>
      </div>
      <Card className="flex flex-col gap-4 p-5">
        <Field label="Full name" value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setSaved(false); }} />
        <Field label="Mobile number" type="tel" value={f.phone} onChange={(e) => { setF({ ...f, phone: e.target.value }); setSaved(false); }} />
        <Field label="City" value={f.city} onChange={(e) => { setF({ ...f, city: e.target.value }); setSaved(false); }} />
        <p className="text-xs text-muted">Profile photo upload will be available once file storage is connected.</p>
        <Button onClick={async () => { try { await updateProfile(f); setSaved(true); } catch { /* shown as a toast */ } }}>{saved ? 'Saved' : 'Save changes'}</Button>
      </Card>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="ghost" className="flex-1" onClick={async () => { await signOut(); nav('/'); }}>Sign out</Button>
        {isDemo && <Button variant="ghost" className="flex-1" onClick={resetDemo}>Reset demo data</Button>}
      </div>
    </div>
  );
}
