import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';

import { METRIC_META } from '@/lib/metrics';
import type { Goal, Membership, MetricKind, RouteOption, Trip } from '@/types';

import { DEFAULT_GOALS } from './seed';

const STORAGE_KEY = 'greenroute/state/v1';

type PersistedState = {
  trips: Trip[];
  goals: Goal[];
  memberships: Record<string, Membership>;
};

type State = PersistedState & { hydrated: boolean };

type Action =
  | { type: 'hydrate'; state: Partial<PersistedState> | null }
  | { type: 'addTrip'; trip: Trip }
  | { type: 'removeTrip'; id: string }
  | { type: 'clearTrips' }
  | { type: 'addGoal'; kind: MetricKind }
  | { type: 'removeGoal'; id: string }
  | { type: 'adjustGoal'; id: string; direction: 1 | -1 }
  | { type: 'joinTeam'; challengeId: string; teamId: string }
  | { type: 'leaveChallenge'; challengeId: string };

const initialState: State = { trips: [], goals: DEFAULT_GOALS, memberships: {}, hydrated: false };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.state, hydrated: true };
    case 'addTrip':
      return { ...state, trips: [action.trip, ...state.trips] };
    case 'removeTrip':
      return { ...state, trips: state.trips.filter((trip) => trip.id !== action.id) };
    case 'clearTrips':
      return { ...state, trips: [] };
    case 'addGoal':
      if (state.goals.some((goal) => goal.kind === action.kind)) return state;
      return {
        ...state,
        goals: [...state.goals, { id: action.kind, kind: action.kind, target: METRIC_META[action.kind].defaultTarget }],
      };
    case 'removeGoal':
      return { ...state, goals: state.goals.filter((goal) => goal.id !== action.id) };
    case 'adjustGoal':
      return {
        ...state,
        goals: state.goals.map((goal) => {
          if (goal.id !== action.id) return goal;
          const { step, min } = METRIC_META[goal.kind];
          return { ...goal, target: Math.max(min, goal.target + action.direction * step) };
        }),
      };
    case 'joinTeam':
      return {
        ...state,
        memberships: {
          ...state.memberships,
          [action.challengeId]: { teamId: action.teamId, joinedAt: new Date().toISOString() },
        },
      };
    case 'leaveChallenge': {
      const { [action.challengeId]: _left, ...memberships } = state.memberships;
      return { ...state, memberships };
    }
  }
}

type Store = State & {
  recordTrip: (route: RouteOption, carCo2G: number, fromName: string, toName: string) => Trip;
  removeTrip: (id: string) => void;
  clearTrips: () => void;
  addGoal: (kind: MetricKind) => void;
  removeGoal: (id: string) => void;
  adjustGoal: (id: string, direction: 1 | -1) => void;
  joinTeam: (challengeId: string, teamId: string) => void;
  leaveChallenge: (challengeId: string) => void;
};

const AppStoreContext = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => dispatch({ type: 'hydrate', state: raw ? JSON.parse(raw) : null }))
      .catch(() => dispatch({ type: 'hydrate', state: null }));
  }, []);

  const { hydrated, ...persisted } = state;
  const serialized = JSON.stringify(persisted);
  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(STORAGE_KEY, serialized).catch(() => {});
  }, [hydrated, serialized]);

  const actions = useMemo(
    () => ({
      recordTrip: (route: RouteOption, carCo2G: number, fromName: string, toName: string) => {
        const trip: Trip = {
          id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          date: new Date().toISOString(),
          mode: route.mode,
          distanceM: route.distanceM,
          durationS: route.durationS,
          co2G: route.co2G,
          savedG: Math.max(0, carCo2G - route.co2G),
          fromName,
          toName,
        };
        dispatch({ type: 'addTrip', trip });
        return trip;
      },
      removeTrip: (id: string) => dispatch({ type: 'removeTrip', id }),
      clearTrips: () => dispatch({ type: 'clearTrips' }),
      addGoal: (kind: MetricKind) => dispatch({ type: 'addGoal', kind }),
      removeGoal: (id: string) => dispatch({ type: 'removeGoal', id }),
      adjustGoal: (id: string, direction: 1 | -1) => dispatch({ type: 'adjustGoal', id, direction }),
      joinTeam: (challengeId: string, teamId: string) => dispatch({ type: 'joinTeam', challengeId, teamId }),
      leaveChallenge: (challengeId: string) => dispatch({ type: 'leaveChallenge', challengeId }),
    }),
    [],
  );

  const store = useMemo(() => ({ ...state, ...actions }), [state, actions]);
  return <AppStoreContext.Provider value={store}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): Store {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error('useAppStore должен вызываться внутри AppStoreProvider');
  return store;
}
