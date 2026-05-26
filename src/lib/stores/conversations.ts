'use client';

import { create } from 'zustand';

export interface ConvoMini {
  id: string;
  title: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface State {
  conversations: ConvoMini[];
  set: (list: ConvoMini[]) => void;
  upsert: (convo: ConvoMini) => void;
  remove: (id: string) => void;
  patch: (id: string, patch: Partial<ConvoMini>) => void;
  touch: (id: string) => void;
}

export const useConversations = create<State>((set, get) => ({
  conversations: [],
  set: (list) => set({ conversations: list }),
  upsert: (convo) => {
    const idx = get().conversations.findIndex((c) => c.id === convo.id);
    if (idx === -1) {
      set({ conversations: [convo, ...get().conversations] });
    } else {
      const list = [...get().conversations];
      list[idx] = { ...list[idx], ...convo };
      set({ conversations: sort(list) });
    }
  },
  remove: (id) =>
    set({ conversations: get().conversations.filter((c) => c.id !== id) }),
  patch: (id, p) => {
    const list = get().conversations.map((c) =>
      c.id === id ? { ...c, ...p } : c,
    );
    set({ conversations: sort(list) });
  },
  touch: (id) => {
    const list = get().conversations.map((c) =>
      c.id === id ? { ...c, updated_at: new Date().toISOString() } : c,
    );
    set({ conversations: sort(list) });
  },
}));

function sort(list: ConvoMini[]): ConvoMini[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}
