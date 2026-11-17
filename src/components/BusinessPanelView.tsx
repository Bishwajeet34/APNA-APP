import React, { useEffect, useState } from 'react';
import { Car, Check, Clock, Plus, Store, X } from 'lucide-react';
import type { Booking, Business, Category, LanguageCode } from '../types/village';
import { apiFetch } from '../utils/api';
import { pickLocalized } from '../utils/villageLogic';

interface BusinessPanelViewProps {
  token: string;
  lang: LanguageCode;
  categories: Category[];
  onDataChanged: () => void;
}

export const BusinessPanelView: React.FC<BusinessPanelViewProps> = ({
  token,
  lang,
  categories,
  onDataChanged,
}) => {
  const [myBusinesses, setMyBusinesses] = useState<Business[]>([]);
  const [rideRequests, setRideRequests] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  // Registration form
  const mainCats = categories.filter((c) => c.parent_id === null);
  const [catId, setCatId] = useState<number>(mainCats[0]?.id || 1);
  const [subCatId, setSubCatId] = useState<number | ''>('');
  const [nameHi, setNameHi] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [descHi, setDescHi] = useState('');
  const [descEn, setDescEn] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('Panchkathia Bazar, Barhait');
  const [landmark, setLandmark] = useState('');
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);

  // Add service form
  const [serviceBizId, setServiceBizId] = useState<string | null>(null);
  const [srvHi, setSrvHi] = useState('');
  const [srvEn, setSrvEn] = useState('');
  const [srvPrice, setSrvPrice] = useState('');
  const [srvUnit, setSrvUnit] = useState('per trip');

  const subCats = categories.filter((c) => c.parent_id === catId);

  const loadPanel = async () => {
    setLoading(true);
    try {
      const [bizList, rides] = await Promise.all([
        apiFetch<Business[]>('/api/business/my', { token }),
        apiFetch<Booking[]>('/api/business/ride-requests', { token }),
      ]);
      setMyBusinesses(bizList);
      setRideRequests(rides);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPanel();
  }, [token]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr(null);
    setFormMsg(null);
    try {
      await apiFetch('/api/business/register', {
        method: 'POST',
        token,
        body: JSON.stringify({
          category_id: catId,
          subcategory_id: subCatId || null,
          name_hi: nameHi,
          name_en: nameEn || nameHi,
          description_hi: descHi,
          description_en: descEn || descHi,
          phone_primary: phone,
          address_line: address,
          landmark,
        }),
      });
      setNameHi('');
      setNameEn('');
      setDescHi('');
      setDescEn('');
      setPhone('');
      setLandmark('');
      setShowRegisterForm(false);
      setFormMsg(
        lang === 'hi'
          ? 'पंजीकरण सबमिट हो गया! एडमिन की मंजूरी के बाद यह ऐप में दिखेगा।'
          : 'Submitted! Your listing is pending Admin approval.'
      );
      await loadPanel();
      onDataChanged();
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  const handleToggleOpen = async (bizId: string) => {
    await apiFetch(`/api/business/${bizId}/toggle-open`, { method: 'PATCH', token });
    await loadPanel();
    onDataChanged();
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceBizId) return;
    await apiFetch(`/api/business/${serviceBizId}/services`, {
      method: 'POST',
      token,
      body: JSON.stringify({
        service_name_hi: srvHi,
        service_name_en: srvEn || srvHi,
        price_min: srvPrice ? Number(srvPrice) : undefined,
        price_unit: srvUnit,
      }),
    });
    setSrvHi('');
    setSrvEn('');
    setSrvPrice('');
    setServiceBizId(null);
    setFormMsg(lang === 'hi' ? 'नई सेवा / दर जोड़ दी गई।' : 'Service rate added.');
  };

  const handleRideAction = async (bookingId: string, status: 'accepted' | 'rejected' | 'completed') => {
    await apiFetch(`/api/business/ride-requests/${bookingId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ status }),
    });
    await loadPanel();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'hi' ? 'दुकानदार और ड्राइवर पैनल' : 'Business & Driver Panel'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {lang === 'hi'
              ? 'अपनी दुकान या ऑटो/टोटो जोड़ें, खुलने की स्थिति बदलें और राइड अनुरोध स्वीकार करें।'
              : 'Register your shop or vehicle, toggle open status, and manage incoming ride requests.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowRegisterForm((v) => !v)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>{lang === 'hi' ? 'नया व्यवसाय जोड़ें' : 'Register Shop / Ride'}</span>
        </button>
      </div>

      {formMsg && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
          {formMsg}
        </div>
      )}

      {showRegisterForm && (
        <form onSubmit={handleRegister} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              {lang === 'hi' ? 'नई दुकान / सेवा / ऑटो रजिस्टर करें' : 'Register New Business or Vehicle'}
            </h2>
            <button
              type="button"
              onClick={() => setShowRegisterForm(false)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {formErr && <p className="text-xs font-semibold text-red-700">{formErr}</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="biz-cat" className="block text-xs font-semibold text-slate-700">
                {lang === 'hi' ? 'मुख्य श्रेणी (Category)' : 'Category'}
              </label>
              <select
                id="biz-cat"
                value={catId}
                onChange={(e) => {
                  setCatId(Number(e.target.value));
                  setSubCatId('');
                }}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                {mainCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {pickLocalized(c.name_en, c.name_hi, lang)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="biz-subcat" className="block text-xs font-semibold text-slate-700">
                {lang === 'hi' ? 'उप-श्रेणी (Subcategory)' : 'Subcategory'}
              </label>
              <select
                id="biz-subcat"
                value={subCatId}
                onChange={(e) => setSubCatId(e.target.value ? Number(e.target.value) : '')}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">{lang === 'hi' ? 'चुनें...' : 'Select...'}</option>
                {subCats.map((s) => (
                  <option key={s.id} value={s.id}>
                    {pickLocalized(s.name_en, s.name_hi, lang)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="biz-name-hi" className="block text-xs font-semibold text-slate-700">
                {lang === 'hi' ? 'दुकान / वाहन का नाम (हिन्दी में)' : 'Name in Hindi'}
              </label>
              <input
                id="biz-name-hi"
                type="text"
                required
                value={nameHi}
                onChange={(e) => setNameHi(e.target.value)}
                placeholder="जैसे: माँ काली किराना स्टोर"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label htmlFor="biz-name-en" className="block text-xs font-semibold text-slate-700">
                {lang === 'hi' ? 'नाम (English में)' : 'Name in English'}
              </label>
              <input
                id="biz-name-en"
                type="text"
                required
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Maa Kali Kirana Store"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="biz-phone" className="block text-xs font-semibold text-slate-700">
                {lang === 'hi' ? 'संपर्क मोबाइल नंबर' : 'Contact Phone'}
              </label>
              <input
                id="biz-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="font-mono-nums mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label htmlFor="biz-landmark" className="block text-xs font-semibold text-slate-700">
                {lang === 'hi' ? 'पहचान स्थान (Landmark)' : 'Landmark'}
              </label>
              <input
                id="biz-landmark"
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Near Panchkathia Chowk"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="biz-addr" className="block text-xs font-semibold text-slate-700">
              {lang === 'hi' ? 'पूरा पता' : 'Address'}
            </label>
            <input
              id="biz-addr"
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="biz-desc-hi" className="block text-xs font-semibold text-slate-700">
                {lang === 'hi' ? 'सेवाओं का विवरण (हिन्दी)' : 'Description (Hindi)'}
              </label>
              <input
                id="biz-desc-hi"
                type="text"
                value={descHi}
                onChange={(e) => setDescHi(e.target.value)}
                placeholder="सभी राशन और दैनिक सामान उपलब्ध"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label htmlFor="biz-desc-en" className="block text-xs font-semibold text-slate-700">
                {lang === 'hi' ? 'विवरण (English)' : 'Description (English)'}
              </label>
              <input
                id="biz-desc-en"
                type="text"
                value={descEn}
                onChange={(e) => setDescEn(e.target.value)}
                placeholder="Daily essentials and grains"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            className="min-h-[44px] rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            {lang === 'hi' ? 'एडमिन मंजूरी के लिए भेजें' : 'Submit for Admin Approval'}
          </button>
        </form>
      )}

      {/* My Registered Businesses */}
      <section aria-labelledby="my-biz-heading">
        <h2 id="my-biz-heading" className="text-lg font-bold text-slate-900">
          {lang === 'hi' ? 'मेरी पंजीकृत दुकानें / वाहन' : 'My Registered Listings'}
        </h2>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading...</p>
        ) : myBusinesses.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            {lang === 'hi'
              ? 'अभी कोई दुकान या ऑटो पंजीकृत नहीं है। ऊपर "नया व्यवसाय जोड़ें" दबाएं।'
              : 'No shops or rides registered yet. Click "Register Shop / Ride" above to add one.'}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {myBusinesses.map((biz) => (
              <div key={biz.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`font-semibold ${
                          biz.approval_status === 'approved'
                            ? 'text-emerald-700'
                            : biz.approval_status === 'rejected'
                            ? 'text-red-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {biz.approval_status === 'approved'
                          ? lang === 'hi'
                            ? 'स्वीकृत (Live)'
                            : 'Approved & Live'
                          : biz.approval_status === 'rejected'
                          ? lang === 'hi'
                            ? 'अस्वीकृत'
                            : 'Rejected'
                          : lang === 'hi'
                          ? 'मंजूरी लंबित (Pending)'
                          : 'Pending Admin Approval'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-nums text-slate-500">{biz.phone_primary}</span>
                    </div>
                    <h3 className="mt-1 text-base font-bold text-slate-900">
                      {pickLocalized(biz.name_en, biz.name_hi, lang)}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-600">{biz.address_line}</p>
                    {biz.rejection_reason && (
                      <p className="mt-1.5 text-xs font-medium text-red-700">
                        Reason: {biz.rejection_reason}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleOpen(biz.id)}
                    className={`min-h-[40px] rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                      biz.is_open_now
                        ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                        : 'border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {biz.is_open_now
                      ? lang === 'hi'
                        ? 'खुला है (Open)'
                        : 'Open Now'
                      : lang === 'hi'
                      ? 'बंद है (Closed)'
                      : 'Closed'}
                  </button>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setServiceBizId(serviceBizId === biz.id ? null : biz.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:underline"
                  >
                    <Store className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{lang === 'hi' ? '+ सेवा या किराया दर जोड़ें' : '+ Add Service / Fare Rate'}</span>
                  </button>

                  {serviceBizId === biz.id && (
                    <form onSubmit={handleAddService} className="mt-3 grid gap-2 sm:grid-cols-3">
                      <input
                        type="text"
                        required
                        value={srvHi}
                        onChange={(e) => setSrvHi(e.target.value)}
                        placeholder={lang === 'hi' ? 'सेवा नाम (हिन्दी)' : 'Service (Hindi)'}
                        className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                      />
                      <input
                        type="text"
                        value={srvEn}
                        onChange={(e) => setSrvEn(e.target.value)}
                        placeholder={lang === 'hi' ? 'नाम (English)' : 'Service (English)'}
                        className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                      />
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          value={srvPrice}
                          onChange={(e) => setSrvPrice(e.target.value)}
                          placeholder="₹"
                          className="font-mono-nums w-20 rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                        />
                        <select
                          value={srvUnit}
                          onChange={(e) => setSrvUnit(e.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
                        >
                          <option value="per trip">per trip</option>
                          <option value="fixed">fixed</option>
                          <option value="per visit">per visit</option>
                        </select>
                        <button
                          type="submit"
                          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Incoming Ride Requests */}
      <section aria-labelledby="incoming-rides-heading">
        <h2 id="incoming-rides-heading" className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Car className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          <span>{lang === 'hi' ? 'आने वाले राइड अनुरोध' : 'Incoming Ride Requests'}</span>
        </h2>

        {rideRequests.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            {lang === 'hi' ? 'अभी कोई राइड अनुरोध नहीं आया है।' : 'No incoming ride requests yet.'}
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {rideRequests.map((bk) => (
              <div
                key={bk.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">{bk.user_name || 'Resident'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-nums">{bk.user_phone}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold uppercase text-emerald-800">{bk.status}</span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {bk.pickup_location} → {bk.drop_location}
                  </p>
                  <p className="font-mono-nums mt-0.5 flex items-center gap-2 text-xs text-slate-600">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {bk.passenger_count || 1} {lang === 'hi' ? 'सवारी' : 'passengers'} · Est. ₹
                      {bk.estimated_fare ?? 20}
                    </span>
                    {bk.notes && <span>· {bk.notes}</span>}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {bk.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRideAction(bk.id, 'accepted')}
                        className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                        <span>{lang === 'hi' ? 'स्वीकार करें' : 'Accept'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRideAction(bk.id, 'rejected')}
                        className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-800 hover:bg-red-100"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                        <span>{lang === 'hi' ? 'मना करें' : 'Reject'}</span>
                      </button>
                    </>
                  )}
                  {bk.status === 'accepted' && (
                    <button
                      type="button"
                      onClick={() => handleRideAction(bk.id, 'completed')}
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      <span>{lang === 'hi' ? 'सफर पूरा हुआ' : 'Mark Completed'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
