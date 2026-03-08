import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TrackedShowsState {
  trackedShowIds: number[];
  toggleTrackedShow: (showId: number) => void;
  isTracked: (showId: number) => boolean;
}

export const useTrackedShowsStore = create<TrackedShowsState>()(
  persist(
    (set, get) => ({
      trackedShowIds: [],
      toggleTrackedShow: (showId: number) => {
        const current = get().trackedShowIds;
        if (current.includes(showId)) {
          set({ trackedShowIds: current.filter(id => id !== showId) });
        } else {
          set({ trackedShowIds: [...current, showId] });
        }
      },
      isTracked: (showId: number) => {
        return get().trackedShowIds.includes(showId);
      },
    }),
    {
      name: 'plus-tracked-shows',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);