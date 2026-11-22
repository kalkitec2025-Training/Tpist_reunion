import { useState } from 'react';
import { Download, Search } from 'lucide-react';
import { useWorkspace } from '@/components/layouts';
import { Avatar, Badge, Button, ButtonLink, Card, Empty, PageHeader, Segmented } from '@/components/ui';
import type { Person } from '@/lib/types';

const att = { yes: 'Attending', maybe: 'Maybe', no: 'Not attending' } as const;

export default function Members() {
  const { reunion: r, update, base, isOrganizer } = useWorkspace();
  const [tab, setTab] = useState<'members' | 'requests'>('members');
  const [q, setQ] = useState('');
  const active = r.people.filter((p) => p.status === 'active' && (!q || p.name.toLowerCase().includes(q.toLowerCase())));
  const pending = r.people.filter((p) => p.status === 'pending');

  const setPerson = (id: string, patch: Partial<Person> | null) =>
    update((x) => ({ ...x, people: patch ? x.people.map((p) => (p.id === id ? { ...p, ...patch } : p)) : x.people.filter((p) => p.id !== id) }));

  function exportCsv() {
    const rows = [['Name', 'City', 'Role', 'Attendance'], ...r.people.filter((p) => p.status === 'active').map((p) => [p.name, p.city, p.role, p.attendance ?? ''])];
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${r.code}-participants.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <PageHeader back={base} title="Participants" subtitle={`${active.length + 1} members`}
        action={isOrganizer && <Button size="sm" variant="ghost" onClick={exportCsv}><Download size={16} /> CSV</Button>} />
      {isOrganizer && (
        <Segmented label="Members or requests" value={tab} onChange={setTab}
          options={[{ value: 'members', label: `Members · ${active.length + 1}` }, { value: 'requests', label: `Requests · ${pending.length}` }]} />
      )}

      {tab === 'members' ? (
        <Card className="flex flex-col px-4 py-2">
          <label className="my-2 flex h-11 items-center gap-2 rounded-xl bg-mist px-3">
            <Search size={16} className="text-muted" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members" aria-label="Search members" className="flex-1 bg-transparent text-sm outline-none" />
          </label>
          <div className="flex items-center gap-3 border-b border-line py-3">
            <Avatar name="You" size={44} />
            <div className="flex-1"><strong className="text-[15px]">You</strong><p className="text-xs text-muted">{r.myAttendance ? att[r.myAttendance] : 'No response yet'}</p></div>
            <Badge tone={r.myRole === 'organizer' ? 'navy' : 'peach'}>{r.myRole === 'organizer' ? 'Organizer' : r.myRole === 'co_organizer' ? 'Co-organizer' : 'Participant'}</Badge>
          </div>
          {active.map((p, i) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 border-b border-line py-3 last:border-0">
              <Avatar name={p.name} size={44} i={i + 1} />
              <div className="min-w-0 flex-1"><strong className="text-[15px]">{p.name}</strong><p className="text-xs text-muted">{p.city} · {p.attendance ? att[p.attendance] : 'No response yet'}</p></div>
              {p.role !== 'participant' && <Badge tone={p.role === 'organizer' ? 'navy' : 'peach'}>{p.role === 'organizer' ? 'Organizer' : 'Co-organizer'}</Badge>}
              {isOrganizer && p.role !== 'organizer' && (
                <div className="flex w-full gap-1.5 pl-14 sm:w-auto sm:pl-0">
                  <Button size="sm" variant="ghost" onClick={() => setPerson(p.id, { role: p.role === 'co_organizer' ? 'participant' : 'co_organizer' })}>
                    {p.role === 'co_organizer' ? 'Remove co-org' : 'Make co-org'}
                  </Button>
                  <Button size="sm" variant="ghost" aria-label={`Remove ${p.name}`} onClick={() => setPerson(p.id, null)}>Remove</Button>
                </div>
              )}
            </div>
          ))}
          {active.length === 0 && <p className="py-6 text-center text-sm text-muted">{q ? 'No members match.' : 'Nobody else has joined yet.'}</p>}
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.length === 0 && <Empty title="All caught up" body="No pending join requests." />}
          {pending.map((p) => (
            <Card key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex-1"><strong>{p.name}</strong><p className="text-xs text-muted">{p.note ? `“${p.note}” · ` : ''}{p.city}</p></div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => setPerson(p.id, { status: 'active' })}>Approve</Button>
                <Button className="flex-1" variant="ghost" onClick={() => setPerson(p.id, null)}>Reject</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {isOrganizer && <ButtonLink to={`${base}/invite`} variant="accent" size="lg">Invite more people</ButtonLink>}
    </div>
  );
}
