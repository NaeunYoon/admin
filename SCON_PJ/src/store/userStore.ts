import { create } from 'zustand';
import type { User } from '../types';
import { api } from '../api';

interface UserState {
  users: User[];
  fetchUsers: () => Promise<void>;
  addUser:    (data: any) => Promise<User>;
  updateUser: (id: string, data: { role: string; department: string }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

export const useUserStore = create<UserState>()((set) => ({
  users: [],

  fetchUsers: async () => {
    const users = await api.getUsers();
    set({ users });
  },

  addUser: async (data) => {
    const user = await api.createUser(data);
    set(s => ({ users: [...s.users, user] }));
    return user;
  },

  updateUser: async (id, data) => {
    await api.updateUser(id, data);
    set(s => ({ users: s.users.map(u => u.id === id ? { ...u, ...data } : u) }));
  },

  deleteUser: async (id) => {
    await api.deleteUser(id);
    set(s => ({ users: s.users.filter(u => u.id !== id) }));
  },
}));

export const getUsers = () => useUserStore.getState().users;
