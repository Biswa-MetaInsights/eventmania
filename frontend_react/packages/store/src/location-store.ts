import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface City {
  name: string;
  country: string;
  lat: number;
  lng: number;
}

export const CITIES: City[] = [
  { name: "New York",      country: "US", lat: 40.7128,  lng: -74.0060  },
  { name: "Los Angeles",   country: "US", lat: 34.0522,  lng: -118.2437 },
  { name: "Chicago",       country: "US", lat: 41.8781,  lng: -87.6298  },
  { name: "San Francisco", country: "US", lat: 37.7749,  lng: -122.4194 },
  { name: "Austin",        country: "US", lat: 30.2672,  lng: -97.7431  },
  { name: "Toronto",       country: "CA", lat: 43.6532,  lng: -79.3832  },
  { name: "London",        country: "GB", lat: 51.5074,  lng: -0.1278   },
  { name: "Paris",         country: "FR", lat: 48.8566,  lng: 2.3522    },
  { name: "Berlin",        country: "DE", lat: 52.5200,  lng: 13.4050   },
  { name: "Amsterdam",     country: "NL", lat: 52.3676,  lng: 4.9041    },
  { name: "Brussels",      country: "BE", lat: 50.8503,  lng: 4.3517    },
  { name: "Zurich",        country: "CH", lat: 47.3769,  lng: 8.5417    },
  { name: "Dubai",         country: "AE", lat: 25.2048,  lng: 55.2708   },
  { name: "Singapore",     country: "SG", lat: 1.3521,   lng: 103.8198  },
  { name: "Mumbai",        country: "IN", lat: 19.0760,  lng: 72.8777   },
  { name: "Bangalore",     country: "IN", lat: 12.9716,  lng: 77.5946   },
  { name: "Tokyo",         country: "JP", lat: 35.6762,  lng: 139.6503  },
  { name: "Sydney",        country: "AU", lat: -33.8688, lng: 151.2093  },
  { name: "São Paulo",     country: "BR", lat: -23.5505, lng: -46.6333  },
  { name: "Cape Town",     country: "ZA", lat: -33.9249, lng: 18.4241   },
];

export const DEFAULT_CITY = CITIES[0]; // New York

interface LocationState {
  selectedCity: City;
  _hasHydrated: boolean;
  setCity: (city: City) => void;
  setHasHydrated: (v: boolean) => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      selectedCity: DEFAULT_CITY,
      _hasHydrated: false,
      setCity: (city) => set({ selectedCity: city }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "eventmind-location",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
