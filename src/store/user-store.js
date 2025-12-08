// src/store/user-store.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUserStore = create(
  persist(
    (set) => ({
      // Onboarding Data
      onboardingStep: 1,
      profile: {
        username: "",
        location: "",
      },
      dietaryPrefs: [],
      favorites: { 
        cuisines: [], 
        dishes: [] // [{ cuisine, name, restaurant }]
      },
      vibeGameAnswers: [], // Stores the text reviews they chose

      // Actions
      setDietaryPrefs: (prefs) => set({ dietaryPrefs: prefs }),
      
      updateProfile: (data) => set((state) => ({
        profile: {
          ...state.profile,
          ...data,
        },
      })),

      setFavorites: (payload) => set((state) => ({
        favorites: {
          ...state.favorites,
          ...payload,
        },
      })),

      addVibeAnswer: (answer) => set((state) => ({
        vibeGameAnswers: [...state.vibeGameAnswers, answer]
      })),

      setVibeAnswers: (answers) => set({ vibeGameAnswers: answers }),

      setStep: (step) => set({ onboardingStep: step }),
      
      resetOnboarding: () => set({ 
        onboardingStep: 1, 
        profile: {
          username: "",
          location: "",
        },
        dietaryPrefs: [], 
        favorites: { cuisines: [], dishes: [] }, 
        vibeGameAnswers: [] 
      }),
    }),
    { name: 'cravemate-onboarding-storage' }
  )
);
