export type ReservationType =
  | 'flight'
  | 'hotel'
  | 'car'
  | 'rail'
  | 'cruise'
  | 'activity'
  | 'restaurant'
  | 'transport'
  | 'other';

export interface APIDestination {
  id: string;
  tripId: string;
  city: string;
  state?: string | null;
  country: string;
  arrivalDate?: string | null;
  departureDate?: string | null;
  sortOrder: string;
}

export interface APITripMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
}

export interface APITrip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  originAirport?: string | null;
  destinationCity?: string | null;
  destinationCountry?: string | null;
  coverImage?: string | null;
  status?: string;
  createdBy?: string;
  tripDestinations?: APIDestination[];
  tripMembers?: APITripMember[];
}

export interface APIReservation {
  id: string;
  tripId: string;
  type: ReservationType;
  title: string;
  confirmationNumber?: string | null;
  providerName?: string | null;
  providerPhone?: string | null;
  providerWebsite?: string | null;
  startDateTime: string;
  endDateTime?: string | null;
  location?: string | null;
  currency?: string | null;
  totalCost?: string | null;
  notes?: string | null;
  source?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface APIGmailAccount {
  id: string;
  email: string;
  status: string;
  lastSyncAt: string | null;
  watchExpiration: string | null;
}

export interface APITripitFeed {
  id: string;
  accountId: string;
  icalUrl: string;
  status: 'active' | 'paused' | 'error';
  lastSyncAt: string | null;
  lastError: string | null;
}

export interface TripitSyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}
