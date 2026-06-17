import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { api } from '../api';
import { tokenStore } from '../tokenStore';

interface AuthState {
  currentUser: User | null;
  token: string | null;
  login:  (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  ssoLogin: (ssoToken: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      token: null,
      login: async (email, password) => {
        try {
          const { token, user } = await api.login(email, password);
          tokenStore.set(token);
          set({ currentUser: user, token });
          return { ok: true };
        } catch (err: any) {
          const msg = err?.message?.includes('API')
            ? '이메일 또는 비밀번호가 올바르지 않습니다.'
            : err.message;
          return { ok: false, message: msg };
        }
      },
      ssoLogin: async (ssoToken) => {
        try {
          const { token, user } = await api.sso(ssoToken);
          tokenStore.set(token);
          set({ currentUser: user, token });
          return { ok: true };
        } catch (err: any) {
          return { ok: false, message: err?.message ?? 'SSO 로그인에 실패했습니다.' };
        }
      },
      logout: () => {
        tokenStore.set(null);
        set({ currentUser: null, token: null });
      },
    }),
    {
      name: 'scon-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.token) tokenStore.set(state.token);
      },
    }
  )
);
