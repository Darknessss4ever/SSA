import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Subscription } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  subscription: Subscription | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, subscription?: Subscription | null) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  updateSubscription: (sub: Subscription | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      subscription: null,
      isAuthenticated: false,
      setAuth: (user, token, subscription = null) => {
        localStorage.setItem('token', token);
        set({ user, token, subscription, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, subscription: null, isAuthenticated: false });
      },
      updateUser: (updates) =>
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),
      updateSubscription: (sub) => set({ subscription: sub }),
    }),
    { name: 'shsa-auth' }
  )
);
