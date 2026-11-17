import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransitionBookingStatus,
  computeBusinessRating,
  filterBusinesses,
  normalizeIndianPhone,
  pickLocalized,
  validateBusinessRegistration,
  validateRideRequest,
} from './villageLogic';
import type { Business, Review } from '../types/village';

const sampleBusinesses: Business[] = [
  {
    id: 'b1',
    owner_id: 'u1',
    category_id: 1,
    subcategory_id: 11,
    name_en: 'Jharkhand Medical Store',
    name_hi: 'झारखंड मेडिकल स्टोर',
    description_en: 'Medicines and first aid',
    description_hi: 'दवाइयां और प्राथमिक उपचार',
    phone_primary: '+919876543201',
    address_line: 'Panchkathia Bazar Chowk',
    landmark: 'Near High School',
    village: 'Panchkathia Bazar',
    block: 'Barhait',
    district: 'Sahibganj',
    state: 'Jharkhand',
    pincode: '816102',
    approval_status: 'approved',
    is_open_now: true,
    avg_rating: 4.8,
    total_reviews: 5,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b2',
    owner_id: 'u2',
    category_id: 2,
    subcategory_id: 22,
    name_en: 'Raju Toto Service',
    name_hi: 'राजू टोटो सेवा',
    description_en: 'Panchkathia to Barhait ride',
    description_hi: 'पंचकठिया से बरहेट सवारी',
    phone_primary: '+919876543202',
    address_line: 'Stand No 2',
    landmark: 'Panchkathia Chowk',
    village: 'Panchkathia Bazar',
    block: 'Barhait',
    district: 'Sahibganj',
    state: 'Jharkhand',
    pincode: '816102',
    approval_status: 'pending',
    is_open_now: true,
    avg_rating: 0,
    total_reviews: 0,
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
];

test('filterBusinesses hides pending listings by default and matches Hindi/English search', () => {
  const allApproved = filterBusinesses(sampleBusinesses, {});
  assert.equal(allApproved.length, 1);
  assert.equal(allApproved[0].id, 'b1');

  const hindiMatch = filterBusinesses(sampleBusinesses, { search: 'मेडिकल' });
  assert.equal(hindiMatch.length, 1);

  const includePending = filterBusinesses(sampleBusinesses, { includeAllStatuses: true });
  assert.equal(includePending.length, 2);
});

test('computeBusinessRating ignores hidden reviews and computes rounded average', () => {
  const reviews: Review[] = [
    { id: 'r1', business_id: 'b1', user_id: 'u1', rating: 5, comment: 'Great', is_hidden: false, created_at: '' },
    { id: 'r2', business_id: 'b1', user_id: 'u2', rating: 4, comment: 'Good', is_hidden: false, created_at: '' },
    { id: 'r3', business_id: 'b1', user_id: 'u3', rating: 1, comment: 'Spam', is_hidden: true, created_at: '' },
  ];
  assert.deepEqual(computeBusinessRating(reviews), { avg_rating: 4.5, total_reviews: 2 });
});

test('validateRideRequest & validateBusinessRegistration enforce required fields', () => {
  assert.ok(validateRideRequest({ pickup_location: 'ab', drop_location: 'Barhait', passenger_count: 1 }));
  assert.equal(validateRideRequest({ pickup_location: 'Panchkathia Chowk', drop_location: 'Barhait', passenger_count: 2 }), null);
  assert.ok(validateBusinessRegistration({ category_id: 1, name_en: 'Shop', phone_primary: '123', address_line: 'Bazar' }));
  assert.equal(validateBusinessRegistration({ category_id: 1, name_en: 'Shop', phone_primary: '9876543210', address_line: 'Bazar Road' }), null);
});

test('canTransitionBookingStatus enforces role state transitions', () => {
  assert.equal(canTransitionBookingStatus('pending', 'accepted', 'business'), true);
  assert.equal(canTransitionBookingStatus('pending', 'completed', 'business'), false);
  assert.equal(canTransitionBookingStatus('accepted', 'completed', 'business'), true);
  assert.equal(canTransitionBookingStatus('pending', 'cancelled', 'user'), true);
  assert.equal(canTransitionBookingStatus('completed', 'cancelled', 'user'), false);
});

test('pickLocalized & normalizeIndianPhone format properly', () => {
  assert.equal(pickLocalized('Medical', 'मेडिकल', 'hi'), 'मेडिकल');
  assert.equal(pickLocalized('Medical', 'मेडिकल', 'en'), 'Medical');
  assert.equal(normalizeIndianPhone('9876543210'), '+919876543210');
});
