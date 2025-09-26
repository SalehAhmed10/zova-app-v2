import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CalendarState {
  // View state
  currentView: 'day' | 'week';
  selectedDate: Date;

  // Dialog state
  showWeeklyDialog: boolean;

  // Time picker state
  editingDay: string | null;
  timePickerMode: 'start' | 'end';
  showTimePicker: boolean;
  tempTime: Date;

  // Actions
  setCurrentView: (view: 'day' | 'week') => void;
  setSelectedDate: (date: Date) => void;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  goToToday: () => void;

  setShowWeeklyDialog: (show: boolean) => void;

  setEditingDay: (day: string | null) => void;
  setTimePickerMode: (mode: 'start' | 'end') => void;
  setShowTimePicker: (show: boolean) => void;
  setTempTime: (time: Date) => void;
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentView: 'day',
      selectedDate: new Date(),
      showWeeklyDialog: false,
      editingDay: null,
      timePickerMode: 'start',
      showTimePicker: false,
      tempTime: new Date(),

      // Actions
      setCurrentView: (view) => set({ currentView: view }),

      setSelectedDate: (date) => set({ selectedDate: date }),

      goToPreviousDay: () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentDate = get().selectedDate;
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() - 1);
        newDate.setHours(0, 0, 0, 0);

        if (newDate >= today) {
          set({ selectedDate: newDate });
        }
      },

      goToNextDay: () => {
        const currentDate = get().selectedDate;
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + 1);
        set({ selectedDate: newDate });
      },

      goToToday: () => set({ selectedDate: new Date() }),

      setShowWeeklyDialog: (show) => set({ showWeeklyDialog: show }),

      setEditingDay: (day) => set({ editingDay: day }),
      setTimePickerMode: (mode) => set({ timePickerMode: mode }),
      setShowTimePicker: (show) => set({ showTimePicker: show }),
      setTempTime: (time) => set({ tempTime: time }),
    }),
    {
      name: 'calendar-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentView: state.currentView,
        // Don't persist date/time related state
      }),
    }
  )
);