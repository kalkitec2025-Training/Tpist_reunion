import { useState } from 'react';
import { Plus, MessageSquare } from 'lucide-react';
import { useWorkspace } from '@/components/layouts';
import { Avatar, Button, Card, Chip, Empty, Field, PageHeader, TextArea } from '@/components/ui';
import type { Task, TaskStatus } from '@/lib/types';
import { cls, fmtShort } from '@/lib/format';

const statuses: TaskStatus[] = ['Not Started', 'In Progress', 'Completed'];
const pill: Record<TaskStatus, string> = { 'Not Started': 'bg-[#E9ECF2] text-navy', 'In Progress': 'bg-peach text-peach-ink', Completed: 'bg-ok-bg text-ok' };

export default function Tasks() {
  const { reunion: r, update, base, isOrganizer } = useWorkspace();
  const [filter, setFilter] = useState<'All' | TaskStatus>('All');
  const [adding, setAdding] = useState(false);
  const [nt, setNt] = useState({ title: '', desc: '', assignee: '', due: '' });
  const names = ['You', ...r.people.filter((p) => p.status === 'active').map((p) => p.name)];

  const setTask = (id: string, patch: Partial<Task>) => update((x) => ({ ...x, tasks: x.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const open = r.tasks.filter((t) => !t.assignee);
  const list = r.tasks.filter((t) => t.assignee && (filter === 'All' || t.status === filter));

  function add() {
    if (nt.title.trim().length < 3) return;
    update((x) => ({ ...x, tasks: [...x.tasks, { id: 't' + Date.now(), title: nt.title.trim(), desc: nt.desc.trim(), assignee: nt.assignee || null, due: nt.due, status: 'Not Started', comments: 0 }] }));
    setNt({ title: '', desc: '', assignee: '', due: '' });
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <PageHeader back={base} title="Responsibilities" subtitle={`${r.tasks.filter((t) => t.status === 'Completed').length} of ${r.tasks.length} completed`}
        action={isOrganizer && <Button size="sm" onClick={() => setAdding(true)}><Plus size={16} /> Task</Button>} />

      {adding && (
        <Card className="flex flex-col gap-3 p-4">
          <Field label="Task title" value={nt.title} onChange={(e) => setNt({ ...nt, title: e.target.value })} placeholder="e.g. Decoration" />
          <TextArea label="Description" rows={2} value={nt.desc} onChange={(e) => setNt({ ...nt, desc: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Assign to
              <select value={nt.assignee} onChange={(e) => setNt({ ...nt, assignee: e.target.value })} className="h-12 rounded-xl border-[1.5px] border-line bg-white px-3 text-[15px] font-normal">
                <option value="">Open for volunteers</option>{names.map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
            <Field label="Due date" type="date" value={nt.due} onChange={(e) => setNt({ ...nt, due: e.target.value })} />
          </div>
          <div className="flex gap-2"><Button onClick={add}>Add task</Button><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button></div>
        </Card>
      )}

      {open.map((t) => (
        <section key={t.id} className="flex flex-col gap-2 rounded-3xl bg-peach p-5">
          <span className="text-xs font-bold tracking-wide text-peach-ink">NEEDS A VOLUNTEER</span>
          <strong className="text-base">{t.title}</strong>
          <p className="text-sm text-[#4A2A12]">{t.desc}</p>
          <Button variant="accent" className="mt-1 self-start" onClick={() => setTask(t.id, { assignee: 'You' })}>I'll take this</Button>
        </section>
      ))}

      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {(['All', ...statuses] as const).map((s) => <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>{s}</Chip>)}
      </div>

      {list.length === 0 && <Empty title="Nothing here" body="No tasks match this filter." />}
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((t) => {
          const canEdit = isOrganizer || t.assignee === 'You';
          return (
            <Card key={t.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <strong className="text-[15px]">{t.title}</strong>
                {canEdit ? (
                  <select aria-label={`Status of ${t.title}`} value={t.status} onChange={(e) => setTask(t.id, { status: e.target.value as TaskStatus })}
                    className={cls('h-8 rounded-lg border-0 px-2 text-[11px] font-bold', pill[t.status])}>
                    {statuses.map((s) => <option key={s}>{s}</option>)}
                  </select>
                ) : <span className={cls('rounded-md px-2 py-1 text-[11px] font-bold', pill[t.status])}>{t.status}</span>}
              </div>
              {t.desc && <p className="text-[13px] leading-relaxed text-muted">{t.desc}</p>}
              <div className="flex items-center gap-2 text-xs text-muted">
                <Avatar name={t.assignee ?? '?'} size={28} />
                <span className="flex-1">{t.assignee}</span>
                {t.due && <span>Due {fmtShort(t.due)}</span>}
                <span className="flex items-center gap-1"><MessageSquare size={13} />{t.comments}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
