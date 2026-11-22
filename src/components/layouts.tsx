import { Link, NavLink, Navigate, Outlet, useLocation, useOutletContext, useParams } from 'react-router-dom';
import {
  Home, Plus, User as UserIcon, CalendarDays, MapPin, Utensils, Wallet, CreditCard, ListChecks, Users, QrCode, Images, LayoutGrid, Share2, ChevronLeft
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useReunion, useStore, type Mode, type ReunionActions } from '@/lib/store';
import type { Reunion } from '@/lib/types';
import { cls } from '@/lib/format';
import { Avatar, Badge, Empty, ButtonLink, Logo } from './ui';

export function DemoStrip() {
  const { mode } = useStore();
  if (mode !== 'demo') return null;
  return (
    <div className="bg-peach px-4 py-1.5 text-center text-xs text-peach-ink">
      Demo mode — sample data is saved only in this browser. <Link to="/credits" className="font-semibold underline">Photo credits</Link>
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-orange" />
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, mode } = useStore();
  const loc = useLocation();
  if (mode === 'loading') return <Loading />;
  if (!user) return <Navigate to={`/auth?next=${encodeURIComponent(loc.pathname)}`} replace />;
  return <>{children}</>;
}

function BottomNav({ items }: { items: { to: string; label: string; icon: ReactNode; end?: boolean }[] }) {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end}
          className={({ isActive }) => cls('flex h-[68px] flex-col items-center justify-center gap-1 text-[11px]', isActive ? 'font-bold text-navy [&_svg]:text-orange' : 'text-muted')}>
          {it.icon}{it.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function Toast() {
  const { error, clearError } = useStore();
  if (!error) return null;
  return (
    <div role="alert" className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-navy px-4 py-3 text-sm text-white shadow-xl md:bottom-6">
      <span className="flex-1">{error}</span>
      <button type="button" onClick={clearError} className="h-9 rounded-lg px-3 font-semibold text-orange">Dismiss</button>
    </div>
  );
}

export function AppShell() {
  const { user } = useStore();
  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <DemoStrip />
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-6">
          <Link to="/app" aria-label="My reunions"><Logo /></Link>
          <nav className="ml-4 hidden gap-1 md:flex">
            <NavLink to="/app" end className={({ isActive }) => cls('rounded-xl px-3 py-2 text-sm', isActive ? 'bg-mist font-semibold' : 'text-muted hover:text-navy')}>My reunions</NavLink>
            <NavLink to="/app/new" className={({ isActive }) => cls('rounded-xl px-3 py-2 text-sm', isActive ? 'bg-mist font-semibold' : 'text-muted hover:text-navy')}>New reunion</NavLink>
          </nav>
          <Link to="/app/profile" className="ml-auto flex items-center gap-2 rounded-full" aria-label="Profile">
            <span className="hidden text-sm font-semibold md:inline">{user?.name}</span>
            <Avatar name={user?.name ?? 'You'} size={40} />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 md:px-6"><Outlet /></main>
      <BottomNav items={[
        { to: '/app', label: 'Home', icon: <Home size={22} />, end: true },
        { to: '/app/new', label: 'New reunion', icon: <Plus size={22} /> },
        { to: '/app/profile', label: 'Profile', icon: <UserIcon size={22} /> }
      ]} />
    </div>
  );
}

export const modules = [
  { path: '', label: 'Overview', icon: LayoutGrid },
  { path: 'invite', label: 'Invite', icon: Share2 },
  { path: 'dates', label: 'Dates', icon: CalendarDays },
  { path: 'venues', label: 'Venues', icon: MapPin },
  { path: 'food', label: 'Food', icon: Utensils },
  { path: 'budget', label: 'Budget', icon: Wallet },
  { path: 'payments', label: 'Payments', icon: CreditCard },
  { path: 'tasks', label: 'Tasks', icon: ListChecks },
  { path: 'members', label: 'Members', icon: Users },
  { path: 'event', label: 'Event day', icon: QrCode },
  { path: 'memories', label: 'Memories', icon: Images }
] as const;

export type WorkspaceCtx = { reunion: Reunion; actions: ReunionActions; base: string; isOrganizer: boolean; mode: Mode };
export const useWorkspace = () => useOutletContext<WorkspaceCtx>();

const roleLabel = { organizer: 'ORGANIZER', co_organizer: 'CO-ORGANIZER', participant: 'PARTICIPANT' } as const;

export function WorkspaceLayout() {
  const { id } = useParams();
  const { mode } = useStore();
  const { reunion, actions } = useReunion(id);
  if (!reunion || !actions) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Empty title="Reunion not found" body="This reunion doesn't exist, or you are not a member of it." action={<ButtonLink to="/app">Back to my reunions</ButtonLink>} />
      </div>
    );
  }
  const base = `/r/${reunion.id}`;
  const isOrganizer = reunion.myRole !== 'participant';
  const ctx: WorkspaceCtx = { reunion, actions, base, isOrganizer, mode };

  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <DemoStrip />
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:px-6">
          <Link to="/app" className="flex h-11 items-center gap-1 rounded-xl pr-2 text-sm text-soft hover:text-white">
            <ChevronLeft size={18} /> <span className="hidden sm:inline">My reunions</span>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-bold md:text-lg">{reunion.name}</p>
          </div>
          <Badge tone="orange">{roleLabel[reunion.myRole]}</Badge>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-6 px-4 md:px-6">
        <aside className="sticky top-4 hidden h-fit w-56 shrink-0 pt-6 md:block">
          <nav aria-label="Reunion sections" className="flex flex-col gap-1">
            {modules.map((m) => (
              <NavLink key={m.path} to={m.path ? `${base}/${m.path}` : base} end={!m.path}
                className={({ isActive }) => cls('flex h-11 items-center gap-3 rounded-xl px-3 text-sm', isActive ? 'bg-white font-semibold shadow-sm [&_svg]:text-orange' : 'text-muted hover:bg-white/70 hover:text-navy')}>
                <m.icon size={18} /> {m.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 pb-6"><Outlet context={ctx} /></main>
      </div>
      <BottomNav items={[
        { to: base, label: 'Overview', icon: <LayoutGrid size={22} />, end: true },
        { to: `${base}/dates`, label: 'Polls', icon: <CalendarDays size={22} /> },
        { to: `${base}/members`, label: 'People', icon: <Users size={22} /> },
        { to: `${base}/budget`, label: 'Money', icon: <Wallet size={22} /> },
        { to: `${base}/memories`, label: 'Memories', icon: <Images size={22} /> }
      ]} />
    </div>
  );
}
