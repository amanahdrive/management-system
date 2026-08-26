// lib/store/pin-store.ts
import { create } from 'zustand';

interface PinState {
  isVerified: boolean;
  verifiedAt: number | null;
  setVerified: (verified: boolean) => void;
  lockSession: () => void;
  checkTimeout: () => boolean;
  initSession: () => void;
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const SESSION_KEY = 'amanah_web_pin_verified_at';

export const usePinStore = create<PinState>((set, get) => ({
  isVerified: false,
  verifiedAt: null,

  initSession: () => {
    if (typeof window === 'undefined') return;
    try {
      const savedAt = sessionStorage.getItem(SESSION_KEY);
      if (savedAt) {
        const time = parseInt(savedAt, 10);
        if (Date.now() - time < TWO_HOURS_MS) {
          set({ isVerified: true, verifiedAt: time });
          return;
        }
      }
    } catch {}
    set({ isVerified: false, verifiedAt: null });
  },

  setVerified: (verified: boolean) => {
    const now = verified ? Date.now() : null;
    if (typeof window !== 'undefined') {
      try {
        if (verified && now) {
          sessionStorage.setItem(SESSION_KEY, now.toString());
        } else {
          sessionStorage.removeItem(SESSION_KEY);
        }
      } catch {}
    }
    set({
      isVerified: verified,
      verifiedAt: now,
    });
  },

  lockSession: () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_KEY);
      } catch {}
    }
    set({ isVerified: false, verifiedAt: null });
  },

  checkTimeout: () => {
    const { isVerified, verifiedAt } = get();
    if (!isVerified || !verifiedAt) return false;
    const now = Date.now();
    if (now - verifiedAt > TWO_HOURS_MS) {
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem(SESSION_KEY);
        } catch {}
      }
      set({ isVerified: false, verifiedAt: null });
      return false;
    }
    return true;
  },
}));
