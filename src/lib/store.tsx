// App state with two back ends:
//  • API mode  — the Express API + PostgreSQL (used whenever /api/health reports a database)
//  • Demo mode — sample data kept in this browser (no server database available)
// Screens only call the actions below, so they work the same in both modes.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Availability, BudgetKey, Category, FoodPref, Invitation, Reunion, TaskStatus, User, Venue } from './types';
import { makeReunion, seedInvitations, seedReunions, token, uid } from './demo-data';
import { api, apiAvailable, ApiError } from './api';

export type Mode = 'loading' | 'api' | 'demo';
type AppUser = User & { isSuperAdmin?: boolean };
type Pending = { id: string; name: string; coverPhotoId: string };
type State = { user: AppUser | null; reunions: Reunion[]; invitations: Invitation[]; pending: Pending[] };

export type NewReunion = {
  name: string; category: Category; institution: string; batch: string; city: string; description: string;
  expected: number; dateFrom: string; dateTo: string; budgetPerPerson: number; coverPhotoId: string; fromReunionId?: string;
};
export type InvitePreview = {
  name: string; description: string; category: Category; city: string; coverPhotoId: string; organizer: string;
  members: number; requireApproval: boolean; myStatus: 'active' | 'pending' | null; reunionId: string | null;
};

const KEY = 'b2c-demo-v1';
function loadDemo(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...(JSON.parse(raw) as State), pending: [] };
  } catch { /* storage unavailable */ }
  return { user: null, reunions: seedReunions(), invitations: seedInvitations(), pending: [] };
}

export type ReunionActions = ReturnType<typeof buildActions>;

function buildActions(r: Reunion, run: (demo: (x: Reunion) => Reunion, method: string, path: string, body?: unknown) => Promise<void>) {
  const p = `/reunions/${r.id}`;
  return {
    setAttendance: (v: Availability | null) => run((x) => ({ ...x, myAttendance: v }), 'PUT', `${p}/attendance`, { value: v }),
    postAnnouncement: (title: string, body: string) =>
      run((x) => ({ ...x, announcements: [{ id: uid(), author: 'You', at: new Date().toISOString(), title, body }, ...x.announcements] }), 'POST', `${p}/announcements`, { title, body }),
    addDate: (iso: string, slot: string) =>
      run((x) => ({ ...x, dates: [...x.dates, { id: uid(), iso, slot, others: { yes: 0, maybe: 0, no: 0 } }] }), 'POST', `${p}/dates`, { day: iso, slot }),
    voteDate: (id: string, v: Availability | null) => run((x) => {
      const votes = { ...x.myDateVotes };
      if (v) votes[id] = v; else delete votes[id];
      return { ...x, myDateVotes: votes };
    }, 'PUT', `${p}/dates/${id}/vote`, { availability: v }),
    finalizeDate: (id: string | null) => run((x) => ({ ...x, finalDateId: id }), 'PUT', `${p}/final-date`, { dateId: id }),
    suggestVenue: (v: { name: string; kind: Venue['kind']; area: string; capacity: number }) =>
      run((x) => ({ ...x, venues: [...x.venues, { id: uid(), ...v, area: v.area || x.city, tags: ['Suggested by a member'], photoId: 'beachRoad', verification: 'Unverified', othersVotes: 0, suggestedBy: 'You' }] }),
        'POST', `${p}/venues`, v),
    voteVenue: (id: string | null) => run((x) => ({ ...x, myVenueVote: id }), 'PUT', `${p}/venue-vote`, { venueId: id }),
    finalizeVenue: (id: string | null) => run((x) => ({ ...x, finalVenueId: id }), 'PUT', `${p}/final-venue`, { venueId: id }),
    setBudget: (key: BudgetKey, amount: number) => run((x) => ({ ...x, budget: { ...x.budget, [key]: amount } }), 'PUT', `${p}/budget/${key}`, { amount }),
    setSettings: (s: { payers?: number; spent?: number; requireApproval?: boolean; contribution?: number }) => run((x) => ({ ...x, ...s }), 'PATCH', `${p}/settings`, s),
    setFood: (pref: FoodPref) => run((x) => ({ ...x, myFood: pref }), 'PUT', `${p}/food`, { pref }),
    setDiet: (diet: string) => run((x) => ({ ...x, myDiet: diet }), 'PUT', `${p}/food`, { diet }),
    addTask: (t: { title: string; desc: string; assigneeId: string | null; assigneeName: string | null; due: string }) =>
      run((x) => ({ ...x, tasks: [...x.tasks, { id: uid(), title: t.title, desc: t.desc, assignee: t.assigneeName, due: t.due, status: 'Not Started', comments: 0 }] }),
        'POST', `${p}/tasks`, { title: t.title, desc: t.desc, assigneeId: t.assigneeId, due: t.due || null }),
    volunteer: (id: string) => run((x) => ({ ...x, tasks: x.tasks.map((t) => (t.id === id ? { ...t, assignee: 'You' } : t)) }), 'PATCH', `${p}/tasks/${id}`, { volunteer: true }),
    setTaskStatus: (id: string, status: TaskStatus) => run((x) => ({ ...x, tasks: x.tasks.map((t) => (t.id === id ? { ...t, status } : t)) }), 'PATCH', `${p}/tasks/${id}`, { status }),
    approveMember: (id: string) => run((x) => ({ ...x, people: x.people.map((m) => (m.id === id ? { ...m, status: 'active' as const } : m)) }), 'PATCH', `${p}/members/${id}`, { status: 'active' }),
    setMemberRole: (id: string, role: 'co_organizer' | 'participant') =>
      run((x) => ({ ...x, people: x.people.map((m) => (m.id === id ? { ...m, role } : m)) }), 'PATCH', `${p}/members/${id}`, { role }),
    removeMember: (id: string) => run((x) => ({ ...x, people: x.people.filter((m) => m.id !== id) }), 'DELETE', `${p}/members/${id}`),
    checkIn: (userId: string) => run((x) => ({ ...x, checkedIn: x.checkedIn + 1 }), 'POST', `${p}/checkins/${userId}`),
    resetInvite: () => run((x) => ({ ...x, inviteToken: token() }), 'POST', `${p}/invite/reset`),
    refresh: () => run((x) => x, 'GET', p)
  };
}

type Store = State & {
  mode: Mode;
  error: string;
  clearError: () => void;
  googleClientId: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (u: { name: string; email: string; password: string; phone: string; city: string }) => Promise<void>;
  googleSignIn: (credential?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (u: Partial<User>) => Promise<void>;
  createReunion: (r: NewReunion) => Promise<Reunion>;
  getInvite: (token: string) => Promise<InvitePreview | null>;
  joinInvite: (token: string, note: string) => Promise<{ reunionId: string; status: 'active' | 'pending' }>;
  declineInvitation: (token: string) => void;
  actionsFor: (r: Reunion) => ReunionActions;
  reload: () => Promise<void>;
  resetDemo: () => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('loading');
  const [state, setState] = useState<State>({ user: null, reunions: [], invitations: [], pending: [] });
  const [error, setError] = useState('');
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const modeRef = useRef<Mode>('loading');
  modeRef.current = mode;

  const loadApi = useCallback(async () => {
    const { user } = await api<{ user: AppUser | null }>('GET', '/me');
    if (!user) return setState({ user: null, reunions: [], invitations: [], pending: [] });
    const { reunions, pendingRequests } = await api<{ reunions: Reunion[]; pendingRequests: Pending[] }>('GET', '/reunions');
    setState({ user, reunions, invitations: [], pending: pendingRequests });
  }, []);

  useEffect(() => {
    (async () => {
      if (await apiAvailable()) {
        const cfg = await api<{ googleClientId: string | null }>('GET', '/config').catch(() => ({ googleClientId: null }));
        setGoogleClientId(cfg.googleClientId);
        await loadApi().catch((e) => setError(e.message));
        setMode('api');
      } else {
        setState(loadDemo());
        setMode('demo');
      }
    })();
  }, [loadApi]);

  useEffect(() => {
    if (mode !== 'demo') return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [mode, state]);

  const replaceReunion = (r: Reunion) => setState((s) => ({ ...s, reunions: s.reunions.some((x) => x.id === r.id) ? s.reunions.map((x) => (x.id === r.id ? r : x)) : [r, ...s.reunions] }));

  const fail = (e: unknown): never => {
    const msg = e instanceof Error ? e.message : 'Something went wrong.';
    setError(msg);
    throw e;
  };

  const actionsFor = useCallback((r: Reunion) => buildActions(r, async (demo, method, path, body) => {
    if (modeRef.current !== 'api') {
      setState((s) => ({ ...s, reunions: s.reunions.map((x) => (x.id === r.id ? demo(x) : x)) }));
      return;
    }
    try {
      const out = await api<{ reunion: Reunion }>(method, path, body);
      if (out.reunion) replaceReunion(out.reunion);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setState((s) => ({ ...s, user: null }));
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }), []);

  const value = useMemo<Store>(() => {
    const isApi = mode === 'api';
    const demoUser = (u: Omit<User, 'id'>) => setState((s) => ({ ...s, user: { id: s.user?.id ?? uid(), ...u } }));
    return {
      ...state,
      mode,
      error,
      clearError: () => setError(''),
      googleClientId,
      reload: () => (isApi ? loadApi() : Promise.resolve()),
      signIn: async (email, password) => {
        if (!isApi) return demoUser({ name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), email, city: 'Visakhapatnam' });
        await api('POST', '/auth/login', { email, password });
        await loadApi();
      },
      register: async (u) => {
        if (!isApi) return demoUser({ name: u.name, email: u.email, phone: u.phone, city: u.city });
        await api('POST', '/auth/register', u);
        await loadApi();
      },
      googleSignIn: async (credential) => {
        if (!isApi) return demoUser({ name: 'Ravi Teja', email: 'ravi.demo@example.com', city: 'Visakhapatnam' });
        await api('POST', '/auth/google', { credential });
        await loadApi();
      },
      signOut: async () => {
        if (isApi) await api('POST', '/auth/logout').catch(() => {});
        setState((s) => ({ ...s, user: null, ...(isApi ? { reunions: [], pending: [] } : {}) }));
      },
      updateProfile: async (u) => {
        if (!isApi) return setState((s) => (s.user ? { ...s, user: { ...s.user, ...u } } : s));
        const { user } = await api<{ user: AppUser }>('PATCH', '/me', { name: u.name, phone: u.phone, city: u.city }).catch(fail);
        setState((s) => ({ ...s, user }));
      },
      createReunion: async (input) => {
        if (!isApi) {
          const r = makeReunion(input);
          const src = state.reunions.find((x) => x.id === input.fromReunionId);
          if (src) r.people = src.people.map((p) => ({ ...p, attendance: null, status: 'active' as const }));
          setState((s) => ({ ...s, reunions: [r, ...s.reunions] }));
          return r;
        }
        const { reunion } = await api<{ reunion: Reunion }>('POST', '/reunions', input);
        replaceReunion(reunion);
        return reunion;
      },
      getInvite: async (tok) => {
        if (isApi) {
          try { return (await api<{ invite: InvitePreview }>('GET', `/invites/${encodeURIComponent(tok)}`)).invite; }
          catch (e) { if (e instanceof ApiError && e.status === 404) return null; throw e; }
        }
        const inv = state.invitations.find((i) => i.token === tok);
        if (inv) return { name: inv.name, description: inv.description, category: inv.category, city: inv.city, coverPhotoId: inv.coverPhotoId, organizer: inv.invitedBy, members: inv.members, requireApproval: false, myStatus: null, reunionId: null };
        const own = state.reunions.find((r) => r.inviteToken === tok);
        if (own) return { name: own.name, description: own.description, category: own.category, city: own.city, coverPhotoId: own.coverPhotoId, organizer: 'You', members: own.people.length + 1, requireApproval: own.requireApproval, myStatus: 'active', reunionId: own.id };
        return null;
      },
      joinInvite: async (tok, note) => {
        if (isApi) {
          const out = await api<{ reunionId: string; status: 'active' | 'pending' }>('POST', `/invites/${encodeURIComponent(tok)}/join`, { note });
          await loadApi();
          return out;
        }
        const inv = state.invitations.find((i) => i.token === tok);
        if (!inv) throw new Error("This invitation link isn't valid.");
        const r = makeReunion({ name: inv.name, category: inv.category, institution: '', batch: '', city: inv.city, description: inv.description, expected: inv.members, dateFrom: '', dateTo: '', budgetPerPerson: 0, coverPhotoId: inv.coverPhotoId });
        r.myRole = 'participant';
        r.people = [{ id: 'host', name: inv.invitedBy, city: inv.city, role: 'organizer', attendance: 'yes', status: 'active' }];
        setState((s) => ({ ...s, reunions: [r, ...s.reunions], invitations: s.invitations.filter((i) => i.token !== tok) }));
        return { reunionId: r.id, status: 'active' };
      },
      declineInvitation: (tok) => setState((s) => ({ ...s, invitations: s.invitations.filter((i) => i.token !== tok) })),
      actionsFor,
      resetDemo: () => setState((s) => ({ user: s.user, reunions: seedReunions(), invitations: seedInvitations(), pending: [] }))
    };
  }, [state, mode, error, googleClientId, loadApi, actionsFor]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

export function useReunion(id: string | undefined) {
  const { reunions, actionsFor } = useStore();
  const reunion = reunions.find((r) => r.id === id) ?? null;
  const actions = useMemo(() => (reunion ? actionsFor(reunion) : null), [reunion, actionsFor]);
  return { reunion, actions };
}
