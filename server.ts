import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { getDb, saveDb, verifyPassword } from './server/db';
import type { ApprovalStatus, BookingStatus, RoleName, User } from './src/types/village';
import {
  canTransitionBookingStatus,
  computeBusinessRating,
  filterBusinesses,
  normalizeIndianPhone,
  validateBusinessRegistration,
  validateRideRequest,
} from './src/utils/villageLogic';

dotenv.config();

const PORT = 3000;
const TOKEN_SECRET = process.env.AUTH_SECRET || 'panchkathia-bazar-village-secret-816102';

interface AuthPayload {
  id: string;
  role: RoleName;
  exp: number;
}

interface AuthedRequest extends Request {
  authUser?: User;
}

const otpStore = new Map<string, { otp: string; expiresAt: number; role: RoleName; fullName?: string }>();

function signToken(payload: AuthPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyTokenString(token: string): AuthPayload | null {
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as AuthPayload;
  if (Date.now() > parsed.exp) return null;
  return parsed;
}

function sanitizeUser(user: User) {
  const { password_hash: _omit, ...safe } = user;
  return safe;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const payload = verifyTokenString(header.slice(7));
  if (!payload) {
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
    return;
  }
  const db = getDb();
  const user = db.users.find((u) => u.id === payload.id);
  if (!user || !user.is_active) {
    res.status(403).json({ error: 'Account unavailable' });
    return;
  }
  req.authUser = user;
  next();
}

function requireRole(...roles: RoleName[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.authUser || !roles.includes(req.authUser.role_name)) {
      res.status(403).json({ error: 'Permission denied for your role' });
      return;
    }
    next();
  };
}

function appendAdminLog(
  admin: User,
  action: string,
  entityType: string,
  entityId: string,
  newData?: Record<string, unknown>
) {
  const db = getDb();
  const nextId = db.admin_logs.length > 0 ? Math.max(...db.admin_logs.map((l) => l.id)) + 1 : 1;
  db.admin_logs.unshift({
    id: nextId,
    admin_id: admin.id,
    admin_name: admin.full_name,
    action,
    entity_type: entityType,
    entity_id: entityId,
    new_data: newData,
    created_at: new Date().toISOString(),
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Health
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', village: 'Panchkathia Bazar', pincode: '816102' });
  });

  // ==========================================
  // AUTH ROUTES (User OTP, Business OTP, Admin Email+Pass+OTP)
  // ==========================================
  app.post('/api/auth/send-otp', (req, res) => {
    const { phone, role = 'user', fullName } = req.body as {
      phone?: string;
      role?: RoleName;
      fullName?: string;
    };
    if (!['user', 'business'].includes(role)) {
      res.status(400).json({ error: 'Invalid role selected' });
      return;
    }
    const normalized = normalizeIndianPhone(phone || '');
    const digits = normalized.replace(/\D/g, '');
    if (digits.length < 10) {
      res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });
      return;
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    otpStore.set(`${role}:${normalized}`, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      role,
      fullName: fullName?.trim(),
    });
    res.json({
      ok: true,
      phone: normalized,
      previewOtp: otp,
    });
  });

  app.post('/api/auth/verify-otp', (req, res) => {
    const { phone, otp, role = 'user', fullName } = req.body as {
      phone?: string;
      otp?: string;
      role?: RoleName;
      fullName?: string;
    };
    const normalized = normalizeIndianPhone(phone || '');
    const key = `${role}:${normalized}`;
    const record = otpStore.get(key);
    if (!record || Date.now() > record.expiresAt || record.otp !== String(otp || '').trim()) {
      res.status(401).json({ error: 'Invalid or expired OTP' });
      return;
    }
    otpStore.delete(key);

    const db = getDb();
    const now = new Date().toISOString();
    let user = db.users.find((u) => u.phone === normalized && u.role_name === role);
    if (!user) {
      const roleRow = db.roles.find((r) => r.name === role) || db.roles[1];
      user = {
        id: `usr-${crypto.randomUUID().slice(0, 8)}`,
        role_id: roleRow.id,
        role_name: role,
        full_name: fullName?.trim() || record.fullName || (role === 'business' ? 'Village Partner' : 'Gaon Resident'),
        phone: normalized,
        preferred_language: 'hi',
        village_ward: 'Panchkathia Bazar',
        is_active: true,
        is_verified: true,
        created_at: now,
        updated_at: now,
      };
      db.users.push(user);
      saveDb(db);
    }

    const token = signToken({
      id: user.id,
      role: user.role_name,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    res.json({ token, user: sanitizeUser(user) });
  });

  app.post('/api/auth/admin/step1', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    const db = getDb();
    const admin = db.users.find(
      (u) => u.email?.toLowerCase() === (email || '').trim().toLowerCase() && u.role_name === 'admin'
    );
    if (!admin || !admin.password_hash || !verifyPassword(password || '', admin.password_hash)) {
      res.status(401).json({ error: 'Invalid admin email or password' });
      return;
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    otpStore.set(`admin:${admin.email}`, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      role: 'admin',
    });
    res.json({ ok: true, previewOtp: otp });
  });

  app.post('/api/auth/admin/step2', (req, res) => {
    const { email, otp } = req.body as { email?: string; otp?: string };
    const cleanEmail = (email || '').trim().toLowerCase();
    const db = getDb();
    const admin = db.users.find((u) => u.email?.toLowerCase() === cleanEmail && u.role_name === 'admin');
    const record = admin ? otpStore.get(`admin:${admin.email}`) : undefined;
    if (!admin || !record || Date.now() > record.expiresAt || record.otp !== String(otp || '').trim()) {
      res.status(401).json({ error: 'Invalid or expired Admin OTP' });
      return;
    }
    otpStore.delete(`admin:${admin.email}`);
    const token = signToken({
      id: admin.id,
      role: 'admin',
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ token, user: sanitizeUser(admin) });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    res.json({ user: sanitizeUser(req.authUser!) });
  });

  app.patch('/api/auth/language', requireAuth, (req: AuthedRequest, res) => {
    const { language } = req.body as { language?: 'hi' | 'en' };
    if (language !== 'hi' && language !== 'en') {
      res.status(400).json({ error: 'Language must be hi or en' });
      return;
    }
    const db = getDb();
    const target = db.users.find((u) => u.id === req.authUser!.id);
    if (target) {
      target.preferred_language = language;
      target.updated_at = new Date().toISOString();
      saveDb(db);
    }
    res.json({ ok: true, preferred_language: language });
  });

  // ==========================================
  // PUBLIC DIRECTORY, NOTICES, REVIEWS, FAVOURITES, REPORTS
  // ==========================================
  app.get('/api/categories', (_req, res) => {
    const db = getDb();
    res.json(db.categories.filter((c) => c.is_active));
  });

  app.get('/api/businesses', (req, res) => {
    const db = getDb();
    const categoryId = req.query.category_id ? Number(req.query.category_id) : null;
    const subcategoryId = req.query.subcategory_id ? Number(req.query.subcategory_id) : null;
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const openNow = req.query.open_now === 'true';

    const items = filterBusinesses(db.businesses, {
      categoryId,
      subcategoryId,
      search,
      openNow,
    });
    res.json(items);
  });

  app.get('/api/businesses/:id', (req, res) => {
    const db = getDb();
    const biz = db.businesses.find((b) => b.id === req.params.id);
    if (!biz) {
      res.status(404).json({ error: 'Business not found' });
      return;
    }
    const timings = db.business_timings.filter((t) => t.business_id === biz.id);
    const services = db.business_services.filter((s) => s.business_id === biz.id && s.is_available);
    const reviews = db.reviews
      .filter((r) => r.business_id === biz.id && !r.is_hidden)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    res.json({ ...biz, timings, services, reviews });
  });

  app.get('/api/notices', (_req, res) => {
    const db = getDb();
    const active = db.notices
      .filter((n) => n.is_active)
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority === 'urgent' ? -1 : 1;
        return b.created_at.localeCompare(a.created_at);
      });
    res.json(active);
  });

  app.post('/api/reviews', requireAuth, (req: AuthedRequest, res) => {
    const { business_id, rating, comment } = req.body as {
      business_id?: string;
      rating?: number;
      comment?: string;
    };
    if (!business_id || !rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Valid business and rating (1-5) required' });
      return;
    }
    const db = getDb();
    const biz = db.businesses.find((b) => b.id === business_id);
    if (!biz) {
      res.status(404).json({ error: 'Business not found' });
      return;
    }
    const existing = db.reviews.find((r) => r.business_id === business_id && r.user_id === req.authUser!.id);
    const now = new Date().toISOString();
    if (existing) {
      existing.rating = Number(rating);
      existing.comment = (comment || '').trim();
      existing.created_at = now;
    } else {
      db.reviews.push({
        id: `rev-${crypto.randomUUID().slice(0, 8)}`,
        business_id,
        user_id: req.authUser!.id,
        user_name: req.authUser!.full_name,
        rating: Number(rating),
        comment: (comment || '').trim(),
        is_hidden: false,
        created_at: now,
      });
    }
    const bizReviews = db.reviews.filter((r) => r.business_id === business_id);
    const stats = computeBusinessRating(bizReviews);
    biz.avg_rating = stats.avg_rating;
    biz.total_reviews = stats.total_reviews;
    biz.updated_at = now;
    saveDb(db);
    res.json({ ok: true, avg_rating: biz.avg_rating, total_reviews: biz.total_reviews });
  });

  app.get('/api/favourites', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const favIds = db.favourites.filter((f) => f.user_id === req.authUser!.id).map((f) => f.business_id);
    res.json(favIds);
  });

  app.post('/api/favourites/:businessId', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const idx = db.favourites.findIndex(
      (f) => f.user_id === req.authUser!.id && f.business_id === req.params.businessId
    );
    if (idx >= 0) {
      db.favourites.splice(idx, 1);
      saveDb(db);
      res.json({ favourited: false });
      return;
    }
    db.favourites.push({
      id: `fav-${crypto.randomUUID().slice(0, 8)}`,
      user_id: req.authUser!.id,
      business_id: req.params.businessId,
      created_at: new Date().toISOString(),
    });
    saveDb(db);
    res.json({ favourited: true });
  });

  app.post('/api/reports', requireAuth, (req: AuthedRequest, res) => {
    const { target_type = 'business', target_id, reason, details } = req.body as {
      target_type?: 'business' | 'review' | 'user';
      target_id?: string;
      reason?: string;
      details?: string;
    };
    if (!target_id || !reason?.trim()) {
      res.status(400).json({ error: 'Reason is required' });
      return;
    }
    const db = getDb();
    const biz = db.businesses.find((b) => b.id === target_id);
    const now = new Date().toISOString();
    const report = {
      id: `rep-${crypto.randomUUID().slice(0, 8)}`,
      reported_by: req.authUser!.id,
      reporter_name: req.authUser!.full_name,
      target_type,
      target_id,
      target_label: biz?.name_en || target_id,
      reason: reason.trim(),
      details: (details || '').trim(),
      status: 'open' as const,
      created_at: now,
      updated_at: now,
    };
    db.reports.unshift(report);
    saveDb(db);
    res.status(201).json(report);
  });

  // ==========================================
  // BOOKINGS: 1-TAP CALL LOG + RIDE REQUEST
  // ==========================================
  app.post('/api/bookings/call-log', (req, res) => {
    const { business_id, user_id } = req.body as { business_id?: string; user_id?: string };
    if (!business_id) {
      res.status(400).json({ error: 'business_id required' });
      return;
    }
    const db = getDb();
    const biz = db.businesses.find((b) => b.id === business_id);
    const now = new Date().toISOString();
    const log = {
      id: `call-${crypto.randomUUID().slice(0, 8)}`,
      user_id: user_id || 'guest',
      business_id,
      business_name_en: biz?.name_en,
      business_name_hi: biz?.name_hi,
      business_phone: biz?.phone_primary,
      booking_type: 'call_tap' as const,
      status: 'initiated' as const,
      created_at: now,
      updated_at: now,
    };
    db.bookings.unshift(log);
    saveDb(db);
    res.status(201).json(log);
  });

  app.post('/api/bookings/ride', requireAuth, (req: AuthedRequest, res) => {
    const { business_id, pickup_location, drop_location, passenger_count, notes } = req.body as {
      business_id?: string;
      pickup_location?: string;
      drop_location?: string;
      passenger_count?: number;
      notes?: string;
    };
    const err = validateRideRequest({ pickup_location, drop_location, passenger_count });
    if (err) {
      res.status(400).json({ error: err });
      return;
    }
    const db = getDb();
    const biz = db.businesses.find((b) => b.id === business_id && b.approval_status === 'approved');
    if (!biz) {
      res.status(404).json({ error: 'Selected ride service is not available' });
      return;
    }
    const count = Number(passenger_count || 1);
    const now = new Date().toISOString();
    const booking = {
      id: `bk-${crypto.randomUUID().slice(0, 8)}`,
      user_id: req.authUser!.id,
      user_name: req.authUser!.full_name,
      user_phone: req.authUser!.phone,
      business_id: biz.id,
      business_name_en: biz.name_en,
      business_name_hi: biz.name_hi,
      business_phone: biz.phone_primary,
      booking_type: 'ride_request' as const,
      pickup_location: pickup_location!.trim(),
      drop_location: drop_location!.trim(),
      pickup_time: now,
      passenger_count: count,
      notes: (notes || '').trim(),
      estimated_fare: count * 20,
      status: 'pending' as const,
      created_at: now,
      updated_at: now,
    };
    db.bookings.unshift(booking);
    saveDb(db);
    res.status(201).json(booking);
  });

  app.get('/api/bookings/my', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const rides = db.bookings.filter(
      (b) => b.user_id === req.authUser!.id && b.booking_type === 'ride_request'
    );
    res.json(rides);
  });

  app.patch('/api/bookings/:id/cancel', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const booking = db.bookings.find((b) => b.id === req.params.id && b.user_id === req.authUser!.id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    if (!canTransitionBookingStatus(booking.status, 'cancelled', 'user')) {
      res.status(400).json({ error: 'This ride cannot be cancelled now' });
      return;
    }
    booking.status = 'cancelled';
    booking.cancelled_reason = req.body.reason || 'Cancelled by resident';
    booking.updated_at = new Date().toISOString();
    saveDb(db);
    res.json(booking);
  });

  // ==========================================
  // BUSINESS OWNER PANEL ROUTES
  // ==========================================
  app.get('/api/business/my', requireAuth, requireRole('business', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const list = db.businesses.filter((b) => b.owner_id === req.authUser!.id);
    res.json(list);
  });

  app.post('/api/business/register', requireAuth, requireRole('business', 'admin'), (req: AuthedRequest, res) => {
    const body = req.body as {
      category_id?: number;
      subcategory_id?: number | null;
      name_en?: string;
      name_hi?: string;
      description_en?: string;
      description_hi?: string;
      phone_primary?: string;
      whatsapp_number?: string;
      address_line?: string;
      landmark?: string;
    };
    const err = validateBusinessRegistration(body);
    if (err) {
      res.status(400).json({ error: err });
      return;
    }
    const db = getDb();
    const now = new Date().toISOString();
    const newBiz = {
      id: `biz-${crypto.randomUUID().slice(0, 8)}`,
      owner_id: req.authUser!.id,
      category_id: Number(body.category_id),
      subcategory_id: body.subcategory_id ? Number(body.subcategory_id) : null,
      name_en: (body.name_en || body.name_hi || '').trim(),
      name_hi: (body.name_hi || body.name_en || '').trim(),
      description_en: (body.description_en || '').trim(),
      description_hi: (body.description_hi || '').trim(),
      phone_primary: normalizeIndianPhone(body.phone_primary || ''),
      whatsapp_number: body.whatsapp_number ? normalizeIndianPhone(body.whatsapp_number) : undefined,
      address_line: (body.address_line || '').trim(),
      landmark: (body.landmark || '').trim(),
      village: 'Panchkathia Bazar',
      block: 'Barhait',
      district: 'Sahibganj',
      state: 'Jharkhand',
      pincode: '816102',
      approval_status: 'pending' as const,
      is_open_now: true,
      avg_rating: 0,
      total_reviews: 0,
      created_at: now,
      updated_at: now,
    };
    db.businesses.unshift(newBiz);
    saveDb(db);
    res.status(201).json(newBiz);
  });

  app.patch('/api/business/:id/toggle-open', requireAuth, requireRole('business', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const biz = db.businesses.find(
      (b) => b.id === req.params.id && (b.owner_id === req.authUser!.id || req.authUser!.role_name === 'admin')
    );
    if (!biz) {
      res.status(404).json({ error: 'Business not found' });
      return;
    }
    biz.is_open_now = !biz.is_open_now;
    biz.updated_at = new Date().toISOString();
    saveDb(db);
    res.json(biz);
  });

  app.post('/api/business/:id/services', requireAuth, requireRole('business', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const biz = db.businesses.find(
      (b) => b.id === req.params.id && (b.owner_id === req.authUser!.id || req.authUser!.role_name === 'admin')
    );
    if (!biz) {
      res.status(404).json({ error: 'Business not found' });
      return;
    }
    const { service_name_en, service_name_hi, price_min, price_unit } = req.body as {
      service_name_en?: string;
      service_name_hi?: string;
      price_min?: number;
      price_unit?: string;
    };
    if (!service_name_en?.trim() && !service_name_hi?.trim()) {
      res.status(400).json({ error: 'Service name is required' });
      return;
    }
    const service = {
      id: `srv-${crypto.randomUUID().slice(0, 8)}`,
      business_id: biz.id,
      service_name_en: (service_name_en || service_name_hi || '').trim(),
      service_name_hi: (service_name_hi || service_name_en || '').trim(),
      price_min: price_min !== undefined ? Number(price_min) : null,
      price_max: null,
      price_unit: price_unit || 'fixed',
      is_available: true,
    };
    db.business_services.push(service);
    saveDb(db);
    res.status(201).json(service);
  });

  app.get('/api/business/ride-requests', requireAuth, requireRole('business', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const myBizIds = new Set(db.businesses.filter((b) => b.owner_id === req.authUser!.id).map((b) => b.id));
    const requests = db.bookings.filter(
      (bk) => bk.booking_type === 'ride_request' && myBizIds.has(bk.business_id)
    );
    res.json(requests);
  });

  app.patch('/api/business/ride-requests/:id', requireAuth, requireRole('business', 'admin'), (req: AuthedRequest, res) => {
    const { status } = req.body as { status?: BookingStatus };
    const db = getDb();
    const booking = db.bookings.find((b) => b.id === req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'Ride request not found' });
      return;
    }
    const biz = db.businesses.find((b) => b.id === booking.business_id);
    if (!biz || (biz.owner_id !== req.authUser!.id && req.authUser!.role_name !== 'admin')) {
      res.status(403).json({ error: 'Permission denied' });
      return;
    }
    if (!status || !canTransitionBookingStatus(booking.status, status, 'business')) {
      res.status(400).json({ error: 'Invalid ride status transition' });
      return;
    }
    booking.status = status;
    booking.updated_at = new Date().toISOString();
    saveDb(db);
    res.json(booking);
  });

  // ==========================================
  // ADMIN ROUTES (Dashboard, Approvals, Notices, Reports, Logs)
  // ==========================================
  app.get('/api/admin/dashboard', requireAuth, requireRole('admin'), (_req, res) => {
    const db = getDb();
    res.json({
      total_users: db.users.length,
      pending_businesses: db.businesses.filter((b) => b.approval_status === 'pending').length,
      approved_businesses: db.businesses.filter((b) => b.approval_status === 'approved').length,
      open_reports: db.reports.filter((r) => r.status === 'open').length,
      total_rides: db.bookings.filter((b) => b.booking_type === 'ride_request').length,
      total_calls: db.bookings.filter((b) => b.booking_type === 'call_tap').length,
    });
  });

  app.get('/api/admin/businesses', requireAuth, requireRole('admin'), (req, res) => {
    const db = getDb();
    const status = (req.query.status as ApprovalStatus | 'all') || 'pending';
    const rows = db.businesses
      .filter((b) => (status === 'all' ? true : b.approval_status === status))
      .map((b) => {
        const owner = db.users.find((u) => u.id === b.owner_id);
        return {
          ...b,
          owner_name: owner?.full_name || 'Partner',
          owner_phone: owner?.phone || b.phone_primary,
        };
      });
    res.json(rows);
  });

  app.patch('/api/admin/businesses/:id/approve', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const biz = db.businesses.find((b) => b.id === req.params.id);
    if (!biz) {
      res.status(404).json({ error: 'Business not found' });
      return;
    }
    const now = new Date().toISOString();
    biz.approval_status = 'approved';
    biz.rejection_reason = undefined;
    biz.approved_by = req.authUser!.id;
    biz.approved_at = now;
    biz.updated_at = now;
    appendAdminLog(req.authUser!, 'APPROVE_BUSINESS', 'business', biz.id, { name_en: biz.name_en });
    saveDb(db);
    res.json(biz);
  });

  app.patch('/api/admin/businesses/:id/reject', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const biz = db.businesses.find((b) => b.id === req.params.id);
    if (!biz) {
      res.status(404).json({ error: 'Business not found' });
      return;
    }
    const reason = (req.body.reason || 'Details incomplete').trim();
    biz.approval_status = 'rejected';
    biz.rejection_reason = reason;
    biz.updated_at = new Date().toISOString();
    appendAdminLog(req.authUser!, 'REJECT_BUSINESS', 'business', biz.id, { name_en: biz.name_en, reason });
    saveDb(db);
    res.json(biz);
  });

  app.post('/api/admin/notices', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
    const { title_en, title_hi, body_en, body_hi, notice_type = 'general', priority = 'normal' } = req.body as {
      title_en?: string;
      title_hi?: string;
      body_en?: string;
      body_hi?: string;
      notice_type?: 'general' | 'panchayat' | 'emergency' | 'power_water' | 'health_camp';
      priority?: 'normal' | 'urgent';
    };
    if ((!title_en?.trim() && !title_hi?.trim()) || (!body_en?.trim() && !body_hi?.trim())) {
      res.status(400).json({ error: 'Notice title and message are required' });
      return;
    }
    const db = getDb();
    const notice = {
      id: `not-${crypto.randomUUID().slice(0, 8)}`,
      posted_by: req.authUser!.id,
      title_en: (title_en || title_hi || '').trim(),
      title_hi: (title_hi || title_en || '').trim(),
      body_en: (body_en || body_hi || '').trim(),
      body_hi: (body_hi || body_en || '').trim(),
      notice_type,
      priority,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    db.notices.unshift(notice);
    appendAdminLog(req.authUser!, 'POST_NOTICE', 'notice', notice.id, { title_en: notice.title_en, priority });
    saveDb(db);
    res.status(201).json(notice);
  });

  app.delete('/api/admin/notices/:id', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const notice = db.notices.find((n) => n.id === req.params.id);
    if (!notice) {
      res.status(404).json({ error: 'Notice not found' });
      return;
    }
    notice.is_active = false;
    appendAdminLog(req.authUser!, 'ARCHIVE_NOTICE', 'notice', notice.id, { title_en: notice.title_en });
    saveDb(db);
    res.json({ ok: true });
  });

  app.get('/api/admin/reports', requireAuth, requireRole('admin'), (_req, res) => {
    const db = getDb();
    res.json(db.reports);
  });

  app.patch('/api/admin/reports/:id/resolve', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const report = db.reports.find((r) => r.id === req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    report.status = req.body.status === 'dismissed' ? 'dismissed' : 'resolved';
    report.resolved_by = req.authUser!.id;
    report.resolution_note = (req.body.resolution_note || 'Reviewed by Admin').trim();
    report.updated_at = new Date().toISOString();
    appendAdminLog(req.authUser!, 'RESOLVE_REPORT', 'report', report.id, { status: report.status });
    saveDb(db);
    res.json(report);
  });

  app.get('/api/admin/logs', requireAuth, requireRole('admin'), (_req, res) => {
    const db = getDb();
    res.json(db.admin_logs.slice(0, 50));
  });

  // ==========================================
  // VITE / STATIC SERVING
  // ==========================================
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve('dist/index.html'));
  if (isProd) {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Panchkathia Bazar server listening on http://localhost:${PORT}`);
  });
}

startServer();
