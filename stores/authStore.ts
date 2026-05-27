import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Enums } from '../types/database';

export type AppRole = Enums<'app_role'>;

interface AuthStore {
  user: User | null;
  session: Session | null;
  role: 'user' | null;
  isLoading: boolean;
  initialize: (sessionOverride?: Session | null) => Promise<void>;
  signOut: () => Promise<void>;
}

async function fetchUserRole(userId: string): Promise<AppRole> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  return (data?.role as AppRole) ?? 'user';
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  role: null,
  isLoading: true,

  initialize: async (sessionOverride?: Session | null) => {
    set({ isLoading: true });

    // When called from onAuthStateChange, use the session passed directly.
    // This avoids calling getSession() while signUp/signIn holds the internal
    // auth lock — which would deadlock and leave those calls hanging forever.
    const session =
      sessionOverride !== undefined
        ? sessionOverride
        : (await supabase.auth.getSession()).data.session;

    if (session?.user) {
      const role = await fetchUserRole(session.user.id);
      if (role !== 'user') {
        await supabase.auth.signOut();
        set({ session: null, user: null, role: null, isLoading: false });
        return;
      }
      set({ session, user: session.user, role: 'user', isLoading: false });
    } else {
      set({ session: null, user: null, role: null, isLoading: false });
    }
  },

  signOut: async () => {
    // Clear local state immediately so navigation isn't blocked by a slow network call
    set({ user: null, session: null, role: null });
    supabase.auth.signOut().catch(() => {});
  },
}));
