import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Service {
  id: string;
  title: string;
  description: string;
  base_price: number;
  price_type: 'fixed' | 'hourly';
  duration_minutes?: number;
  category_name: string;
  subcategory_name: string;
  // Optional additional fields that might be present
  is_active?: boolean;
  allows_sos_booking?: boolean;
  is_home_service?: boolean;
  is_remote_service?: boolean;
  house_call_available?: boolean;
  house_call_extra_fee?: number | null;
  requires_deposit?: boolean;
  deposit_percentage?: number | null;
  cancellation_policy?: string | null;
  service_specific_terms?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  bookings_count?: number;
}

interface BookingState {
  selectedService: Service | null;
  selectedDate: string | null;
  selectedTime: string | null;
  customerNotes: string;
  serviceAddress: string;
  _hasHydrated: boolean;
}

interface BookingActions {
  setSelectedService: (service: Service | null) => void;
  setSelectedDate: (date: string | null) => void;
  setSelectedTime: (time: string | null) => void;
  setCustomerNotes: (notes: string) => void;
  setServiceAddress: (address: string) => void;
  resetBooking: () => void;
  setHasHydrated: (hydrated: boolean) => void;
}

type BookingStore = BookingState & BookingActions;

const initialState: BookingState = {
  selectedService: null,
  selectedDate: null,
  selectedTime: null,
  customerNotes: '',
  serviceAddress: '',
  _hasHydrated: false,
};

export const useBookingStore = create<BookingStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setSelectedService: (service) => set({ selectedService: service }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setSelectedTime: (time) => set({ selectedTime: time }),
      setCustomerNotes: (notes) => set({ customerNotes: notes }),
      setServiceAddress: (address) => set({ serviceAddress: address }),

      resetBooking: () => set(initialState),

      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
    }),
    {
      name: 'booking-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);