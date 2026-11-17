import type {
  BookingStatus,
  Business,
  LanguageCode,
  Review,
  RoleName,
} from '../types/village';

export interface BusinessFilterInput {
  categoryId?: number | null;
  subcategoryId?: number | null;
  search?: string;
  openNow?: boolean;
  includeAllStatuses?: boolean;
}

export function pickLocalized(en: string, hi: string, lang: LanguageCode): string {
  if (lang === 'hi') {
    return hi?.trim() ? hi : en;
  }
  return en?.trim() ? en : hi;
}

export function filterBusinesses(
  businesses: Business[],
  filter: BusinessFilterInput
): Business[] {
  const query = (filter.search || '').trim().toLowerCase();

  return businesses
    .filter((b) => {
      if (!filter.includeAllStatuses && b.approval_status !== 'approved') {
        return false;
      }
      if (filter.categoryId && b.category_id !== filter.categoryId) {
        return false;
      }
      if (filter.subcategoryId && b.subcategory_id !== filter.subcategoryId) {
        return false;
      }
      if (filter.openNow && !b.is_open_now) {
        return false;
      }
      if (query) {
        const haystack = [
          b.name_en,
          b.name_hi,
          b.description_en,
          b.description_hi,
          b.landmark,
          b.address_line,
          b.phone_primary,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (a.is_open_now !== b.is_open_now) return a.is_open_now ? -1 : 1;
      if (a.avg_rating !== b.avg_rating) return b.avg_rating - a.avg_rating;
      return b.created_at.localeCompare(a.created_at);
    });
}

export function computeBusinessRating(reviews: Review[]): {
  avg_rating: number;
  total_reviews: number;
} {
  const visible = reviews.filter((r) => !r.is_hidden);
  if (visible.length === 0) {
    return { avg_rating: 0, total_reviews: 0 };
  }
  const sum = visible.reduce((acc, r) => acc + r.rating, 0);
  return {
    avg_rating: Number((sum / visible.length).toFixed(2)),
    total_reviews: visible.length,
  };
}

export function validateRideRequest(input: {
  pickup_location?: string;
  drop_location?: string;
  passenger_count?: number;
}): string | null {
  if (!input.pickup_location || input.pickup_location.trim().length < 3) {
    return 'Pickup location must be at least 3 characters';
  }
  if (!input.drop_location || input.drop_location.trim().length < 3) {
    return 'Drop location must be at least 3 characters';
  }
  const count = Number(input.passenger_count ?? 1);
  if (!Number.isInteger(count) || count < 1 || count > 12) {
    return 'Passenger count must be between 1 and 12';
  }
  return null;
}

export function validateBusinessRegistration(input: {
  category_id?: number;
  name_en?: string;
  name_hi?: string;
  phone_primary?: string;
  address_line?: string;
}): string | null {
  if (!input.category_id) {
    return 'Please select a category';
  }
  if ((!input.name_en || !input.name_en.trim()) && (!input.name_hi || !input.name_hi.trim())) {
    return 'Business name is required';
  }
  const digits = (input.phone_primary || '').replace(/\D/g, '');
  if (digits.length < 10) {
    return 'Enter a valid 10-digit contact number';
  }
  if (!input.address_line || input.address_line.trim().length < 4) {
    return 'Address is required';
  }
  return null;
}

export function canTransitionBookingStatus(
  current: BookingStatus,
  next: BookingStatus,
  actorRole: RoleName
): boolean {
  if (actorRole === 'user') {
    return next === 'cancelled' && (current === 'pending' || current === 'accepted');
  }
  if (actorRole === 'business') {
    if (current === 'pending' && (next === 'accepted' || next === 'rejected')) {
      return true;
    }
    if (current === 'accepted' && next === 'completed') {
      return true;
    }
    return false;
  }
  return actorRole === 'admin';
}

export function normalizeIndianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return raw.trim();
}
