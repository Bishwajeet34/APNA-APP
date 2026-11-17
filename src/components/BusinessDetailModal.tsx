import React, { useEffect, useState } from 'react';
import {
  Car,
  Clock,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  X,
} from 'lucide-react';
import type {
  Business,
  BusinessService,
  BusinessTiming,
  Category,
  LanguageCode,
  Review,
  User,
} from '../types/village';
import { apiFetch } from '../utils/api';
import { pickLocalized } from '../utils/villageLogic';

interface BusinessDetailData extends Business {
  timings: BusinessTiming[];
  services: BusinessService[];
  reviews: Review[];
}

interface BusinessDetailModalProps {
  businessId: string | null;
  categories: Category[];
  lang: LanguageCode;
  user: User | null;
  token: string | null;
  isFavourite: boolean;
  onClose: () => void;
  onRequireAuth: () => void;
  onCall: (business: Business) => void;
  onToggleFavourite: (businessId: string) => void;
  onRideBooked: () => void;
}

const DAY_LABELS_HI = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
const DAY_LABELS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const BusinessDetailModal: React.FC<BusinessDetailModalProps> = ({
  businessId,
  categories,
  lang,
  user,
  token,
  isFavourite,
  onClose,
  onRequireAuth,
  onCall,
  onToggleFavourite,
  onRideBooked,
}) => {
  const [detail, setDetail] = useState<BusinessDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  // Ride booking form
  const [showRideForm, setShowRideForm] = useState(false);
  const [pickup, setPickup] = useState('Panchkathia Bazar Chowk');
  const [drop, setDrop] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [notes, setNotes] = useState('');
  const [rideMessage, setRideMessage] = useState<string | null>(null);
  const [rideError, setRideError] = useState<string | null>(null);
  const [submittingRide, setSubmittingRide] = useState(false);

  // Review form
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);

  // Report form
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('Wrong phone number');
  const [reportDetails, setReportDetails] = useState('');
  const [reportMessage, setReportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;
    setImgFailed(false);
    setShowRideForm(false);
    setShowReportForm(false);
    setRideMessage(null);
    setRideError(null);
    setReviewNotice(null);
    setReportMessage(null);
    setLoading(true);
    apiFetch<BusinessDetailData>(`/api/businesses/${businessId}`)
      .then((d) => setDetail(d))
      .finally(() => setLoading(false));
  }, [businessId]);

  if (!businessId) return null;

  const refreshDetail = async () => {
    const d = await apiFetch<BusinessDetailData>(`/api/businesses/${businessId}`);
    setDetail(d);
  };

  const handleRideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) {
      onRequireAuth();
      return;
    }
    setRideError(null);
    setSubmittingRide(true);
    try {
      await apiFetch('/api/bookings/ride', {
        method: 'POST',
        token,
        body: JSON.stringify({
          business_id: businessId,
          pickup_location: pickup,
          drop_location: drop,
          passenger_count: passengers,
          notes,
        }),
      });
      setRideMessage(
        lang === 'hi'
          ? 'राइड अनुरोध सफलतापूर्वक भेज दिया गया! आप "मेरी राइड्स" में स्थिति देख सकते हैं।'
          : 'Ride request sent! Track driver acceptance in My Rides.'
      );
      setDrop('');
      setNotes('');
      setShowRideForm(false);
      onRideBooked();
    } catch (err) {
      setRideError(err instanceof Error ? err.message : 'Failed to book ride');
    } finally {
      setSubmittingRide(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      onRequireAuth();
      return;
    }
    await apiFetch('/api/reviews', {
      method: 'POST',
      token,
      body: JSON.stringify({ business_id: businessId, rating, comment }),
    });
    setComment('');
    setReviewNotice(lang === 'hi' ? 'आपका रिव्यू सेव हो गया।' : 'Thank you! Your review is live.');
    await refreshDetail();
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      onRequireAuth();
      return;
    }
    await apiFetch('/api/reports', {
      method: 'POST',
      token,
      body: JSON.stringify({
        target_type: 'business',
        target_id: businessId,
        reason: reportReason,
        details: reportDetails,
      }),
    });
    setReportDetails('');
    setShowReportForm(false);
    setReportMessage(
      lang === 'hi' ? 'रिपोर्ट एडमिन को भेज दी गई है।' : 'Report sent to village admin for review.'
    );
  };

  const mainCat = detail ? categories.find((c) => c.id === detail.category_id) : null;
  const subCat = detail ? categories.find((c) => c.id === detail.subcategory_id) : null;
  const isTravelOrMedical = detail ? detail.category_id === 2 || detail.subcategory_id === 14 : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Business details"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
        {loading || !detail ? (
          <div className="flex h-64 items-center justify-center p-8 text-sm text-slate-500">
            {lang === 'hi' ? 'जानकारी लोड हो रही है...' : 'Loading details...'}
          </div>
        ) : (
          <>
            <div className="relative aspect-[16/9] w-full bg-slate-100">
              {detail.photo_url && !imgFailed ? (
                <img
                  src={detail.photo_url}
                  alt={pickLocalized(detail.name_en, detail.name_hi, lang)}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 via-slate-100 to-amber-50">
                  <span className="text-base font-bold text-emerald-900">
                    {pickLocalized(detail.name_en, detail.name_hi, lang)}
                  </span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 pt-16 text-white">
                <div className="flex items-center gap-2 text-xs text-white/90">
                  <span>{mainCat ? pickLocalized(mainCat.name_en, mainCat.name_hi, lang) : ''}</span>
                  {subCat && (
                    <>
                      <span aria-hidden="true">/</span>
                      <span>{pickLocalized(subCat.name_en, subCat.name_hi, lang)}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>
                    {detail.is_open_now
                      ? lang === 'hi'
                        ? 'अभी खुला'
                        : 'Open Now'
                      : lang === 'hi'
                      ? 'बंद'
                      : 'Closed'}
                  </span>
                </div>
                <h2 className="mt-1 text-xl font-bold sm:text-2xl">
                  {pickLocalized(detail.name_en, detail.name_hi, lang)}
                </h2>
              </div>

              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleFavourite(detail.id)}
                  aria-label="Toggle favourite"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm hover:bg-white"
                >
                  <Heart className={`h-5 w-5 ${isFavourite ? 'fill-red-600 text-red-600' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close details"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm hover:bg-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              {/* Address & Description */}
              <div>
                <p className="text-sm leading-relaxed text-slate-700">
                  {pickLocalized(detail.description_en, detail.description_hi, lang)}
                </p>
                <div className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  <span>
                    {detail.address_line}
                    {detail.landmark ? ` (${detail.landmark})` : ''} · {detail.village}, {detail.block}, {detail.district} -{' '}
                    <span className="font-mono-nums">{detail.pincode}</span>
                  </span>
                </div>
                <p className="font-mono-nums mt-1.5 pl-6 text-xs font-semibold text-slate-700">
                  {detail.phone_primary}
                </p>
              </div>

              {/* Primary Booking Actions: Call + Ride Request + WhatsApp */}
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => onCall(detail)}
                  className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  <span>{lang === 'hi' ? 'अभी कॉल करें' : 'Call Now'}</span>
                </button>

                {isTravelOrMedical && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!token) {
                        onRequireAuth();
                        return;
                      }
                      setShowRideForm((v) => !v);
                    }}
                    className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-100 whitespace-nowrap"
                  >
                    <Car className="h-4 w-4" aria-hidden="true" />
                    <span>{lang === 'hi' ? 'राइड बुक करें' : 'Book Ride'}</span>
                  </button>
                )}

                {detail.whatsapp_number && (
                  <a
                    href={`https://wa.me/${detail.whatsapp_number.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap"
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>

              {rideMessage && (
                <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-medium text-emerald-900">
                  {rideMessage}
                </div>
              )}

              {showRideForm && (
                <form onSubmit={handleRideSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    {lang === 'hi' ? 'सवारी (Ride) अनुरोध भेजें' : 'Request a Ride'}
                  </h3>
                  {rideError && (
                    <p className="text-xs font-medium text-red-700">{rideError}</p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="ride-pickup" className="block text-xs font-semibold text-slate-700">
                        {lang === 'hi' ? 'कहाँ से (Pickup)' : 'Pickup Location'}
                      </label>
                      <input
                        id="ride-pickup"
                        type="text"
                        required
                        value={pickup}
                        onChange={(e) => setPickup(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="ride-drop" className="block text-xs font-semibold text-slate-700">
                        {lang === 'hi' ? 'कहाँ जाना है (Drop)' : 'Drop Location'}
                      </label>
                      <input
                        id="ride-drop"
                        type="text"
                        required
                        value={drop}
                        onChange={(e) => setDrop(e.target.value)}
                        placeholder={lang === 'hi' ? 'जैसे: बरहेट प्रखंड कार्यालय' : 'e.g. Barhait Block Office'}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="ride-passengers" className="block text-xs font-semibold text-slate-700">
                        {lang === 'hi' ? 'सवारी संख्या' : 'Passengers'}
                      </label>
                      <input
                        id="ride-passengers"
                        type="number"
                        min={1}
                        max={12}
                        value={passengers}
                        onChange={(e) => setPassengers(Number(e.target.value))}
                        className="font-mono-nums mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="ride-notes" className="block text-xs font-semibold text-slate-700">
                        {lang === 'hi' ? 'अतिरिक्त जानकारी (वैकल्पिक)' : 'Landmark / Note'}
                      </label>
                      <input
                        id="ride-notes"
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={lang === 'hi' ? 'जैसे: स्कूल गेट के पास' : 'e.g. Near school gate'}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={submittingRide}
                    className="min-h-[44px] w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                  >
                    {submittingRide
                      ? lang === 'hi'
                        ? 'भेजा जा रहा है...'
                        : 'Sending...'
                      : lang === 'hi'
                      ? 'राइड कन्फर्म करें'
                      : 'Confirm Ride Request'}
                  </button>
                </form>
              )}

              {/* Services & Rates */}
              {detail.services.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {lang === 'hi' ? 'सेवाएं और अनुमानित शुल्क' : 'Services & Rates'}
                  </h3>
                  <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {detail.services.map((srv) => (
                      <div key={srv.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                        <span className="font-medium text-slate-800">
                          {pickLocalized(srv.service_name_en, srv.service_name_hi, lang)}
                        </span>
                        <span className="font-mono-nums shrink-0 font-semibold text-emerald-800">
                          {srv.price_min !== null
                            ? srv.price_max
                              ? `₹${srv.price_min}–₹${srv.price_max}`
                              : `₹${srv.price_min}`
                            : 'Call for rate'}
                          <span className="ml-1 text-xs font-normal text-slate-500">
                            /{srv.price_unit}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timings */}
              {detail.timings.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                    <Clock className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <span>{lang === 'hi' ? 'खुलने का समय' : 'Opening Hours'}</span>
                  </h3>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {detail.timings.map((tm) => (
                      <div key={tm.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                        <span className="font-semibold text-slate-700">
                          {lang === 'hi' ? DAY_LABELS_HI[tm.day_of_week] : DAY_LABELS_EN[tm.day_of_week]}
                        </span>
                        <span className="font-mono-nums text-slate-600">
                          {tm.is_closed ? (lang === 'hi' ? 'बंद' : 'Closed') : `${tm.open_time} – ${tm.close_time}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews & Add Review */}
              <div className="border-t border-slate-200 pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    {lang === 'hi' ? 'रेटिंग और समीक्षा' : 'Reviews & Ratings'}
                  </h3>
                  <span className="font-mono-nums inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    {detail.avg_rating > 0 ? detail.avg_rating.toFixed(1) : '0.0'} · {detail.total_reviews}{' '}
                    {lang === 'hi' ? 'रिव्यू' : 'reviews'}
                  </span>
                </div>

                {detail.reviews.length > 0 && (
                  <div className="mt-3 space-y-2.5">
                    {detail.reviews.map((rev) => (
                      <div key={rev.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{rev.user_name || 'Resident'}</span>
                          <span className="font-mono-nums text-amber-700">★ {rev.rating}/5</span>
                        </div>
                        {rev.comment && <p className="mt-1 text-slate-600">{rev.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {reviewNotice && (
                  <p className="mt-3 text-xs font-semibold text-emerald-700">{reviewNotice}</p>
                )}

                <form onSubmit={handleReviewSubmit} className="mt-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <label htmlFor="review-rating" className="text-xs font-semibold text-slate-700">
                      {lang === 'hi' ? 'रेटिंग दें:' : 'Your Rating:'}
                    </label>
                    <select
                      id="review-rating"
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold"
                    >
                      <option value={5}>5 ★ Excellent</option>
                      <option value={4}>4 ★ Good</option>
                      <option value={3}>3 ★ Okay</option>
                      <option value={2}>2 ★ Poor</option>
                      <option value={1}>1 ★ Bad</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={lang === 'hi' ? 'अपना अनुभव लिखें...' : 'Share your experience...'}
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="min-h-[42px] rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                    >
                      {lang === 'hi' ? 'भेजें' : 'Post'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Report Issue */}
              <div className="border-t border-slate-200 pt-4">
                {reportMessage && (
                  <p className="mb-2 text-xs font-semibold text-emerald-700">{reportMessage}</p>
                )}
                {!showReportForm ? (
                  <button
                    type="button"
                    onClick={() => setShowReportForm(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-700"
                  >
                    <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{lang === 'hi' ? 'गलत नंबर या बंद दुकान की रिपोर्ट करें' : 'Report wrong info or closed shop'}</span>
                  </button>
                ) : (
                  <form onSubmit={handleReportSubmit} className="space-y-2.5 rounded-xl bg-slate-50 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        {lang === 'hi' ? 'समस्या बताएं' : 'Report an Issue'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowReportForm(false)}
                        className="text-xs text-slate-500 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                    </div>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                    >
                      <option value="Wrong phone number">Wrong phone number</option>
                      <option value="Shop permanently closed">Shop permanently closed</option>
                      <option value="Incorrect address or timings">Incorrect address or timings</option>
                      <option value="Overcharging / Misbehavior">Overcharging / Misbehavior</option>
                    </select>
                    <input
                      type="text"
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder={lang === 'hi' ? 'विवरण लिखें...' : 'Additional details...'}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                    />
                    <button
                      type="submit"
                      className="min-h-[40px] rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800"
                    >
                      {lang === 'hi' ? 'रिपोर्ट भेजें' : 'Submit Report'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
