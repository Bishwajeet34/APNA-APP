export type RoleName = 'admin' | 'user' | 'business';
export type LanguageCode = 'hi' | 'en';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type BookingType = 'call_tap' | 'ride_request';
export type BookingStatus = 'initiated' | 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
export type NoticeType = 'general' | 'panchayat' | 'emergency' | 'power_water' | 'health_camp';
export type NoticePriority = 'normal' | 'urgent';
export type ReportTargetType = 'business' | 'review' | 'user';
export type ReportStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';

export interface Role {
  id: number;
  name: RoleName;
  description: string;
}

export interface User {
  id: string;
  role_id: number;
  role_name: RoleName;
  full_name: string;
  phone?: string;
  email?: string;
  password_hash?: string;
  preferred_language: LanguageCode;
  village_ward: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  parent_id: number | null;
  slug: string;
  name_en: string;
  name_hi: string;
  icon_name: string;
  sort_order: number;
  is_active: boolean;
}

export interface Business {
  id: string;
  owner_id: string;
  category_id: number;
  subcategory_id: number | null;
  name_en: string;
  name_hi: string;
  description_en: string;
  description_hi: string;
  phone_primary: string;
  phone_secondary?: string;
  whatsapp_number?: string;
  address_line: string;
  landmark: string;
  village: string;
  block: string;
  district: string;
  state: string;
  pincode: string;
  photo_url?: string;
  approval_status: ApprovalStatus;
  rejection_reason?: string;
  approved_by?: string;
  approved_at?: string;
  is_open_now: boolean;
  avg_rating: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessTiming {
  id: number;
  business_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface BusinessService {
  id: string;
  business_id: string;
  service_name_en: string;
  service_name_hi: string;
  price_min: number | null;
  price_max: number | null;
  price_unit: string;
  is_available: boolean;
}

export interface Review {
  id: string;
  business_id: string;
  user_id: string;
  user_name?: string;
  rating: number;
  comment: string;
  is_hidden: boolean;
  created_at: string;
}

export interface Favourite {
  id: string;
  user_id: string;
  business_id: string;
  created_at: string;
}

export interface Notice {
  id: string;
  posted_by: string;
  title_en: string;
  title_hi: string;
  body_en: string;
  body_hi: string;
  notice_type: NoticeType;
  priority: NoticePriority;
  is_active: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  reported_by: string;
  reporter_name?: string;
  target_type: ReportTargetType;
  target_id: string;
  target_label?: string;
  reason: string;
  details: string;
  status: ReportStatus;
  resolved_by?: string;
  resolution_note?: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  user_name?: string;
  user_phone?: string;
  business_id: string;
  business_name_en?: string;
  business_name_hi?: string;
  business_phone?: string;
  booking_type: BookingType;
  pickup_location?: string;
  drop_location?: string;
  pickup_time?: string;
  passenger_count?: number;
  notes?: string;
  estimated_fare?: number;
  status: BookingStatus;
  cancelled_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminLog {
  id: number;
  admin_id: string;
  admin_name?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  new_data?: Record<string, unknown>;
  created_at: string;
}

export interface VillageDatabase {
  roles: Role[];
  users: User[];
  categories: Category[];
  businesses: Business[];
  business_timings: BusinessTiming[];
  business_services: BusinessService[];
  reviews: Review[];
  favourites: Favourite[];
  notices: Notice[];
  reports: Report[];
  bookings: Booking[];
  admin_logs: AdminLog[];
}
