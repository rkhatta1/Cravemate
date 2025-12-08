// src/store/user-store.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUserStore = create(
  persist(
    (set) => ({
      // Onboarding Data
      onboardingStep: 1,
      dietaryPrefs: [],
      favorites: { 
        cuisines: [], 
        dishes: [], 
        restaurants: [] 
      },
      vibeGameAnswers: [], // Stores the text reviews they chose

      // Actions
      setDietaryPrefs: (prefs) => set({ dietaryPrefs: prefs }),
      
      updateFavorites: (key, value) => set((state) => ({
        favorites: {
          ...state.favorites,
          [key]: [...state.favorites[key], value]
        }
      })),

      addVibeAnswer: (answer) => set((state) => ({
        vibeGameAnswers: [...state.vibeGameAnswers, answer]
      })),

      setStep: (step) => set({ onboardingStep: step }),
      
      resetOnboarding: () => set({ 
        onboardingStep: 1, 
        dietaryPrefs: [], 
        favorites: { cuisines: [], dishes: [], restaurants: [] }, 
        vibeGameAnswers: [] 
      }),
    }),
    { name: 'cravemate-onboarding-storage' }
  )
);
