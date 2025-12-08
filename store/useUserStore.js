import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUserStore = create(
  persist(
    (set) => ({
      user: null, // Basic auth info
      profileData: {
        dietary: [],
        favorites: {
          cuisines: [],
          dishes: [],
          restaurants: []
        },
        location: '',
      },
      vibeGameResults: [], // Stores the option IDs selected during the game

      // Actions
      setUser: (user) => set({ user }),
      updateProfile: (data) => set((state) => ({ 
        profileData: { ...state.profileData, ...data } 
      })),
      addVibeSelection: (selection) => set((state) => ({
        vibeGameResults: [...state.vibeGameResults, selection]
      })),
      resetStore: () => set({ user: null, profileData: {}, vibeGameResults: [] }),
    }),
    {
      name: 'cravemate-user-storage', // name of the item in the storage (must be unique)
    }
  )
);
