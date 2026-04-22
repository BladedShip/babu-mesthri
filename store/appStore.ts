import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import { storage } from './mmkv';

const zustandStorage: StateStorage = {
  setItem: (name, value) => {
    return storage.set(name, value);
  },
  getItem: (name) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name) => {
    return storage.remove(name);
  },
};

import { ChatMessage } from '../services/InferenceService';

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

export type ToolConsentDecision = 'allow_once' | 'allow_always' | 'deny';

export interface PendingToolConsent {
  toolName: string;
  params: Record<string, any>;
  resolve: (decision: ToolConsentDecision) => void;
}

export interface AppState {
  isOfflineMode: boolean;
  activeModelId: string | null;
  chats: Record<string, ChatSession>;
  activeChatId: string | null;

  // Tool consent
  toolAlwaysAllowed: string[];
  pendingToolConsent: PendingToolConsent | null;

  setOfflineMode: (enabled: boolean) => void;
  setActiveModel: (id: string) => void;

  createChat: () => string;
  switchChat: (id: string) => void;
  deleteChat: (id: string) => void;
  appendMessageToActiveChat: (message: ChatMessage) => void;
  updateActiveChatHistory: (messages: ChatMessage[]) => void;
  setAutoTitle: (chatId: string, title: string) => void;

  // Tool consent actions
  setPendingToolConsent: (consent: PendingToolConsent | null) => void;
  addAlwaysAllowedTool: (toolName: string) => void;
  removeAlwaysAllowedTool: (toolName: string) => void;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isOfflineMode: true,
      activeModelId: null,
      chats: {},
      activeChatId: null,
      toolAlwaysAllowed: [],
      pendingToolConsent: null,

      setOfflineMode: (enabled) => set({ isOfflineMode: enabled }),
      setActiveModel: (id) => set({ activeModelId: id }),

      createChat: () => {
        const newId = generateId();
        const initialSystemMessage: ChatMessage = { role: 'system', content: 'You are Babu-Mesthri, a highly secure, private, strictly offline LLM assistant running directly on macOS/iOS local hardware.' };

        set((state) => ({
          chats: {
            ...state.chats,
            [newId]: {
              id: newId,
              title: 'New Chat',
              messages: [initialSystemMessage],
              createdAt: Date.now()
            }
          },
          activeChatId: newId
        }));
        return newId;
      },

      switchChat: (id) => set({ activeChatId: id }),

      deleteChat: (id) => set((state) => {
        const newChats = { ...state.chats };
        delete newChats[id];

        // If deleting active chat, select another or null
        const activeId = state.activeChatId === id
          ? (Object.keys(newChats)[0] || null)
          : state.activeChatId;

        return { chats: newChats, activeChatId: activeId };
      }),

      appendMessageToActiveChat: (message) => set((state) => {
        const activeId = state.activeChatId;
        if (!activeId || !state.chats[activeId]) return state;

        const chat = state.chats[activeId];
        return {
          chats: {
            ...state.chats,
            [activeId]: {
              ...chat,
              messages: [...chat.messages, message]
            }
          }
        };
      }),

      updateActiveChatHistory: (messages) => set((state) => {
        const activeId = state.activeChatId;
        if (!activeId || !state.chats[activeId]) return state;

        const chat = state.chats[activeId];
        return {
          chats: {
            ...state.chats,
            [activeId]: {
              ...chat,
              messages: [...messages] // copy reference
            }
          }
        };
      }),

      setAutoTitle: (chatId, title) => set((state) => {
        if (!state.chats[chatId]) return state;
        return {
          chats: {
            ...state.chats,
            [chatId]: {
              ...state.chats[chatId],
              title
            }
          }
        };
      }),

      // Tool consent actions
      setPendingToolConsent: (consent) => set({ pendingToolConsent: consent }),

      addAlwaysAllowedTool: (toolName) => set((state) => ({
        toolAlwaysAllowed: state.toolAlwaysAllowed.includes(toolName)
          ? state.toolAlwaysAllowed
          : [...state.toolAlwaysAllowed, toolName]
      })),

      removeAlwaysAllowedTool: (toolName) => set((state) => ({
        toolAlwaysAllowed: state.toolAlwaysAllowed.filter(t => t !== toolName)
      })),
    }),
    {
      name: 'babu-app-storage',
      storage: createJSONStorage(() => zustandStorage),
      // Exclude non-serializable and transient state from persistence
      partialize: (state) => ({
        isOfflineMode: state.isOfflineMode,
        activeModelId: state.activeModelId,
        chats: state.chats,
        activeChatId: state.activeChatId,
        toolAlwaysAllowed: state.toolAlwaysAllowed,
        // pendingToolConsent is intentionally excluded — it's transient
      }),
    }
  )
);
