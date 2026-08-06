// lib/store/pin-store.ts
import { create } from 'zustand';

interface PinState {
  isVerified: boolean;
  verifiedAt: number | null;
  setVerified: (verified: boolean) => void;
  checkTimeout: () => boolean;
}

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export const usePinStore = create<PinState>((set, get) => ({
  isVerified: false,
  verifiedAt: null,
  setVerified: (verified: boolean) => {
    set({
      isVerified: verified,
      verifiedAt: verified ? Date.now() : null,
    });
  },
  checkTimeout: () => {
    const { isVerified, verifiedAt } = get();
    if (!isVerified || !verifiedAt) return false;
    const now = Date.now();
    if (now - verifiedAt > FIFTEEN_MINUTES_MS) {
      set({ isVerified: false, verifiedAt: null });
      return false;
    }
    return true;
  },
}));
