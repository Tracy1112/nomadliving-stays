import { create } from 'zustand';
import { Booking } from './types';
import { DateRange } from 'react-day-picker';

// Define the state's shape
type PropertyState = {
  propertyId: string;
  price: number;
  bookings: Booking[];
  range: DateRange | undefined;
  // Actions
  setProperty: (propertyId: string, price: number) => void;
  setBookings: (bookings: Booking[]) => void;
  setRange: (range: DateRange | undefined) => void;
  reset: () => void;
};

// Create the store
export const useProperty = create<PropertyState>((set) => {
  return {
    propertyId: '',
    price: 0,
    bookings: [],
    range: undefined,
    // Actions
    setProperty: (propertyId: string, price: number) =>
      set({ propertyId, price }),
    setBookings: (bookings: Booking[]) => set({ bookings }),
    setRange: (range: DateRange | undefined) => set({ range }),
    reset: () =>
      set({
        propertyId: '',
        price: 0,
        bookings: [],
        range: undefined,
      }),
  };
});
