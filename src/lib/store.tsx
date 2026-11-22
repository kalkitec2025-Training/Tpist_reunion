// Demo-mode data store. Everything lives in the browser (localStorage) so the
// screens are fully clickable before the backend exists. When VITE_API_URL is
// set in the next phase, these actions become calls to the Express API.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Invitation, Reunion, User, Category } from './types';
import { makeReunion, seedInvitations, seedReunions, uid } from './demo-data';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || '';
export const isDemo = !API_URL;

type State = { user: User | null; reunions: Reunion[]; invitations: Invitation[] };
const KEY = 'b2c-demo-v1';

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch { /* storage unavailable: start fresh */ }
  return { user: null, reunions: seedReunions(), invitations: seedInvitations() };
}

type NewReunion = {
  name: string; category: Category; institution: string; batch: string; city: string; description: string;
  expected: number; dateFrom: string; dateTo: string; budgetPerPerson: number; coverPhotoId: string;
};

type Store = State & {
  signIn: (u: Omit<User, 'id'>) => void;
  signOut: () => void;
  updateProfile: (u: Partial<User>) => void;
  createReunion: (r: NewReunion) => Reunion;
  updateReunion: (id: string, fn: (r: Reunion) => Reunion) => void;
  joinByToken: (token: string, note: string) => string | null;
  declineInvitation: (token: string) => void;
  resetDemo: () => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const updateReunion = useCallback((id: string, fn: (r: Reunion) => Reunion) => {
    setState((s) => ({ ...s, reunions: s.reunions.map((r) => (r.id === id ? fn(r) : r)) }));
  }, []);

  const value = useMemo<Store>(() => ({
    ...state,
    signIn: (u) => setState((s) => ({ ...s, user: { id: s.user?.id ?? uid(), ...u } })),
    signOut: () => setState((s) => ({ ...s, user: null })),
    updateProfile: (u) => setState((s) => (s.user ? { ...s, user: { ...s.user, ...u } } : s)),
    createReunion: (input) => {
      const r = makeReunion(input);
      setState((s) => ({ ...s, reunions: [r, ...s.reunions] }));
      return r;
    },
    updateReunion,
    joinByToken: (tok, note) => {
      const inv = state.invitations.find((i) => i.token === tok);
      if (inv) {
        const r = makeReunion({
          name: inv.name, category: inv.category, institution: '', batch: '', city: inv.city, description: inv.description,
          expected: inv.members, dateFrom: '', dateTo: '', budgetPerPerson: 0, coverPhotoId: inv.coverPhotoId
        });
        r.myRole = 'participant';
        r.people = [
          { id: 'host', name: inv.invitedBy, city: inv.city, role: 'organizer', attendance: 'yes', status: 'active' },
          { id: 'me', name: state.user?.name ?? 'You', city: state.user?.city ?? '', role: 'participant', attendance: null, status: 'active', note }
        ];
        setState((s) => ({ ...s, reunions: [r, ...s.reunions], invitations: s.invitations.filter((i) => i.token !== tok) }));
        return r.id;
      }
      const own = state.reunions.find((r) => r.inviteToken === tok);
      return own ? own.id : null;
    },
    declineInvitation: (tok) => setState((s) => ({ ...s, invitations: s.invitations.filter((i) => i.token !== tok) })),
    resetDemo: () => setState({ user: state.user, reunions: seedReunions(), invitations: seedInvitations() })
  }), [state, updateReunion]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

export function useReunion(id: string | undefined) {
  const { reunions, updateReunion } = useStore();
  const reunion = reunions.find((r) => r.id === id) ?? null;
  const update = useCallback((fn: (r: Reunion) => Reunion) => { if (id) updateReunion(id, fn); }, [id, updateReunion]);
  return { reunion, update };
}
