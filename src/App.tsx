import React, { useEffect, useState } from 'react';
import {
  Building2,
  Car,
  Compass,
  Globe,
  Heart,
  Home as HomeIcon,
  Landmark,
  LogOut,
  MapPin,
  Megaphone,
  Phone,
  Search,
  ShieldAlert,
  Siren,
  Stethoscope,
  Store,
  User as UserIcon,
  Utensils,
} from 'lucide-react';
import { AdminPanelView } from './components/AdminPanelView';
import { AuthModal } from './components/AuthModal';
import { BusinessCard } from './components/BusinessCard';
import { BusinessDetailModal } from './components/BusinessDetailModal';
import { BusinessPanelView } from './components/BusinessPanelView';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import type {
  Booking,
  Business,
  Category,
  LanguageCode,
  Notice,
  RoleName,
  User,
} from './types/village';
import { apiFetch } from './utils/api';
import { formatNoticeType, t } from './utils/i18n';
import { filterBusinesses, pickLocalized } from './utils/villageLogic';

type ActiveView = 'home' | 'directory' | 'rides' | 'panel';

const HERO_IMAGE_URL = '/src/assets/images/hero_panchkathia_bazar_1794930903544.jpg';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  medical: Stethoscope,
  travel: Car,
  food: Utensils,
  'banking-govt': Landmark,
  shops: Store,
  emergency: Siren,
};

export default function App() {
  const [lang, setLang] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('panchkathia_lang');
    return saved === 'en' ? 'en' : 'hi';
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('panchkathia_token'));
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('panchkathia_user');
    return raw ? (JSON.parse(raw) as User) : null;
  });

  const [view, setView] = useState<ActiveView>('home');
  const [categories, setCategories] = useState<Category[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [myRides, setMyRides] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [selectedSubCatId, setSelectedSubCatId] = useState<number | null>(null);
  const [openNowOnly, setOpenNowOnly] = useState(false);

  // Modals & notifications
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialRole, setAuthInitialRole] = useState<RoleName>('user');
  const [detailBusinessId, setDetailBusinessId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const loadPublicData = async () => {
    try {
      const [cats, biz, nts] = await Promise.all([
        apiFetch<Category[]>('/api/categories'),
        apiFetch<Business[]>('/api/businesses'),
        apiFetch<Notice[]>('/api/notices'),
      ]);
      setCategories(cats);
      setBusinesses(biz);
      setNotices(nts);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async (authToken: string | null) => {
    if (!authToken) {
      setFavourites([]);
      setMyRides([]);
      return;
    }
    try {
      const [favs, rides] = await Promise.all([
        apiFetch<string[]>('/api/favourites', { token: authToken }),
        apiFetch<Booking[]>('/api/bookings/my', { token: authToken }),
      ]);
      setFavourites(favs);
      setMyRides(rides);
    } catch {
      // Session invalid or expired
      setToken(null);
      setUser(null);
      localStorage.removeItem('panchkathia_token');
      localStorage.removeItem('panchkathia_user');
    }
  };

  useEffect(() => {
    loadPublicData();
  }, []);

  useEffect(() => {
    loadUserData(token);
  }, [token]);

  const handleToggleLanguage = async () => {
    const next: LanguageCode = lang === 'hi' ? 'en' : 'hi';
    setLang(next);
    localStorage.setItem('panchkathia_lang', next);
    if (token) {
      try {
        await apiFetch('/api/auth/language', {
          method: 'PATCH',
          token,
          body: JSON.stringify({ language: next }),
        });
      } catch {
        // Ignore non-critical sync error
      }
    }
  };

  const handleAuthSuccess = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('panchkathia_token', newToken);
    localStorage.setItem('panchkathia_user', JSON.stringify(newUser));
    if (newUser.role_name === 'admin' || newUser.role_name === 'business') {
      setView('panel');
    }
    showToast(
      lang === 'hi'
        ? `स्वागत है, ${newUser.full_name}!`
        : `Signed in as ${newUser.full_name}`
    );
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('panchkathia_token');
    localStorage.removeItem('panchkathia_user');
    setFavourites([]);
    setMyRides([]);
    if (view === 'panel') setView('home');
    showToast(lang === 'hi' ? 'सफलतापूर्वक लॉगआउट हो गए।' : 'Signed out.');
  };

  const handleCallBusiness = async (biz: Business) => {
    try {
      await apiFetch('/api/bookings/call-log', {
        method: 'POST',
        body: JSON.stringify({ business_id: biz.id, user_id: user?.id || 'guest' }),
      });
    } catch {
      // Non-blocking call log
    }
    showToast(
      lang === 'hi'
        ? `${pickLocalized(biz.name_en, biz.name_hi, lang)} को कॉल: ${biz.phone_primary}`
        : `Dialing ${biz.name_en}: ${biz.phone_primary}`
    );
    window.location.href = `tel:${biz.phone_primary}`;
  };

  const handleEmergencyDial = (label: string, number: string) => {
    showToast(
      lang === 'hi' ? `${label} पर कॉल: ${number}` : `Calling ${label}: ${number}`
    );
    window.location.href = `tel:${number}`;
  };

  const handleToggleFavourite = async (businessId: string) => {
    if (!token) {
      setAuthInitialRole('user');
      setAuthModalOpen(true);
      return;
    }
    const res = await apiFetch<{ favourited: boolean }>(`/api/favourites/${businessId}`, {
      method: 'POST',
      token,
    });
    setFavourites((prev) =>
      res.favourited ? [...prev, businessId] : prev.filter((id) => id !== businessId)
    );
  };

  const handleCancelRide = async (bookingId: string) => {
    if (!token) return;
    await apiFetch(`/api/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ reason: 'Cancelled by resident' }),
    });
    await loadUserData(token);
    showToast(lang === 'hi' ? 'राइड रद्द कर दी गई।' : 'Ride request cancelled.');
  };

  const mainCategories = categories.filter((c) => c.parent_id === null);
  const activeSubCategories = selectedCatId
    ? categories.filter((c) => c.parent_id === selectedCatId)
    : [];

  const filteredDirectory = filterBusinesses(businesses, {
    categoryId: selectedCatId,
    subcategoryId: selectedSubCatId,
    search: searchText,
    openNow: openNowOnly,
  });

  const favouriteBusinesses = businesses.filter((b) => favourites.includes(b.id));

  const openAuthFor = (role: RoleName) => {
    setAuthInitialRole(role);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-900 md:pb-10">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 md:h-16">
          {/* Zone 1: Single text wordmark */}
          <button
            type="button"
            onClick={() => setView('home')}
            className="text-left text-lg font-bold tracking-tight text-emerald-800 whitespace-nowrap shrink-0"
          >
            {t('brandName', lang)}
          </button>

          {/* Zone 2: 4 concise single-line nav links */}
          <nav aria-label="Primary navigation" className="hidden items-center gap-6 md:flex">
            <button
              type="button"
              onClick={() => setView('home')}
              className={`min-h-[40px] border-b-2 px-1 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                view === 'home'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('navHome', lang)}
            </button>
            <button
              type="button"
              onClick={() => setView('directory')}
              className={`min-h-[40px] border-b-2 px-1 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                view === 'directory'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('navDirectory', lang)}
            </button>
            <button
              type="button"
              onClick={() => setView('rides')}
              className={`min-h-[40px] border-b-2 px-1 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                view === 'rides'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('navRides', lang)}
            </button>
            <button
              type="button"
              onClick={() => setView('panel')}
              className={`min-h-[40px] border-b-2 px-1 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                view === 'panel'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('navPanel', lang)}
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <LogOut className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
                <span className="max-w-[120px] truncate">{user.full_name}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openAuthFor('user')}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
              >
                <UserIcon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('signIn', lang)}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        {toastMsg && (
          <div
            role="status"
            className="mb-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950"
          >
            <span>{toastMsg}</span>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              className="ml-4 text-xs font-semibold text-emerald-800 hover:underline"
            >
              OK
            </button>
          </div>
        )}

        {/* VIEW 1: HOME */}
        {view === 'home' && (
          <div className="space-y-8">
            {/* Hero Section (Balanced 2-column split on desktop) */}
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <div className="grid items-stretch lg:grid-cols-12">
                <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-7">
                  <div>
                    {/* Workspace Toolbar: Location + Language Toggle + PWA Install */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{t('villageLocation', lang)}</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleToggleLanguage}
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
                        >
                          <Globe className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                          <span>{lang === 'hi' ? 'English' : 'हिन्दी'}</span>
                        </button>
                        <PWAInstallButton lang={lang} />
                      </div>
                    </div>

                    <h1 className="mt-5 max-w-2xl text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl [text-wrap:balance]">
                      {t('heroHeadline', lang)}
                    </h1>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
                      {t('heroSub', lang)}
                    </p>
                  </div>

                  {/* Hero Search Bar */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setView('directory');
                    }}
                    className="mt-6 flex flex-col gap-2.5 sm:flex-row"
                  >
                    <div className="relative flex-1">
                      <Search
                        className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-slate-400"
                        aria-hidden="true"
                      />
                      <input
                        type="search"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder={t('searchPlaceholder', lang)}
                        aria-label={t('searchPlaceholder', lang)}
                        className="min-h-[46px] w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-emerald-700 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="min-h-[46px] rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
                    >
                      {t('searchBtn', lang)}
                    </button>
                  </form>
                </div>

                <div className="relative min-h-[220px] bg-slate-100 lg:col-span-5">
                  {!heroImgFailed ? (
                    <img
                      src={HERO_IMAGE_URL}
                      alt="Panchkathia Bazar Village Market, Barhait"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgFailed(true)}
                      className="h-full w-full object-cover lg:h-full"
                    />
                  ) : (
                    <div className="flex h-full min-h-[220px] items-center justify-center bg-gradient-to-br from-emerald-100 to-amber-50 p-6 text-center">
                      <span className="text-base font-bold text-emerald-900">
                        {t('brandName', lang)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Emergency 1-Tap Helpline Strip (4-column KPI/action row below hero split) */}
            <section aria-labelledby="emergency-heading" className="rounded-2xl border border-red-200 bg-red-50/50 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="emergency-heading" className="flex items-center gap-2 text-sm font-bold text-red-900">
                  <ShieldAlert className="h-4 w-4 text-red-700" aria-hidden="true" />
                  <span>{t('emergencyTitle', lang)}</span>
                </h2>
                <span className="text-xs font-medium text-red-800">
                  {lang === 'hi' ? 'बरहेट प्रखंड · साहिबगंज' : 'Barhait Block · Sahibganj'}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                <button
                  type="button"
                  onClick={() => handleEmergencyDial(lang === 'hi' ? 'पुलिस सहायता' : 'Police Helpline', '112')}
                  className="flex min-h-[46px] items-center justify-between rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-left transition-colors hover:bg-red-50"
                >
                  <span className="text-xs font-bold text-slate-900">
                    {lang === 'hi' ? 'पुलिस (थाना)' : 'Police'}
                  </span>
                  <span className="font-mono-nums text-xs font-bold text-red-700">112</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleEmergencyDial(lang === 'hi' ? 'एम्बुलेंस' : 'Ambulance', '108')}
                  className="flex min-h-[46px] items-center justify-between rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-left transition-colors hover:bg-red-50"
                >
                  <span className="text-xs font-bold text-slate-900">
                    {lang === 'hi' ? 'एम्बुलेंस' : 'Ambulance'}
                  </span>
                  <span className="font-mono-nums text-xs font-bold text-red-700">108</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleEmergencyDial(lang === 'hi' ? 'दमकल' : 'Fire Brigade', '101')}
                  className="flex min-h-[46px] items-center justify-between rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-left transition-colors hover:bg-red-50"
                >
                  <span className="text-xs font-bold text-slate-900">
                    {lang === 'hi' ? 'दमकल' : 'Fire'}
                  </span>
                  <span className="font-mono-nums text-xs font-bold text-red-700">101</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleEmergencyDial(lang === 'hi' ? 'ग्राम पंचायत' : 'Gram Panchayat', '+919876540604')}
                  className="flex min-h-[46px] items-center justify-between rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-left transition-colors hover:bg-red-50"
                >
                  <span className="text-xs font-bold text-slate-900">
                    {lang === 'hi' ? 'पंचायत भवन' : 'Panchayat'}
                  </span>
                  <Phone className="h-3.5 w-3.5 text-red-700" aria-hidden="true" />
                </button>
              </div>
            </section>

            {/* 6 Main Categories */}
            <section aria-labelledby="categories-heading">
              <div className="flex items-center justify-between">
                <h2 id="categories-heading" className="text-lg font-bold text-slate-900 sm:text-xl">
                  {t('categoriesTitle', lang)}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCatId(null);
                    setSelectedSubCatId(null);
                    setView('directory');
                  }}
                  className="text-xs font-semibold text-emerald-800 hover:underline"
                >
                  {t('viewAll', lang)}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {mainCategories.map((cat) => {
                  const IconComp = CATEGORY_ICONS[cat.slug] || Building2;
                  const subCount = categories.filter((c) => c.parent_id === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCatId(cat.id);
                        setSelectedSubCatId(null);
                        setView('directory');
                      }}
                      className="flex min-h-[104px] flex-col items-start justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-emerald-600 hover:bg-emerald-50/40"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                        <IconComp className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="mt-3">
                        <p className="text-sm font-bold text-slate-900">
                          {pickLocalized(cat.name_en, cat.name_hi, lang)}
                        </p>
                        <p className="font-mono-nums mt-0.5 text-xs text-slate-500">
                          {subCount} {lang === 'hi' ? 'सेवाएं' : 'services'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Village Notices */}
            {notices.length > 0 && (
              <section aria-labelledby="notices-heading">
                <h2 id="notices-heading" className="flex items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl">
                  <Megaphone className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                  <span>{t('noticesTitle', lang)}</span>
                </h2>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {notices.slice(0, 3).map((n) => (
                    <article
                      key={n.id}
                      className={`rounded-2xl border p-4 ${
                        n.priority === 'urgent'
                          ? 'border-red-200 bg-red-50/60'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`font-bold ${
                            n.priority === 'urgent' ? 'text-red-800' : 'text-emerald-800'
                          }`}
                        >
                          {n.priority === 'urgent'
                            ? lang === 'hi'
                              ? 'अति आवश्यक सूचना'
                              : 'Urgent Notice'
                            : formatNoticeType(n.notice_type, lang)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-nums text-slate-500">
                          {new Date(n.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-sm font-bold text-slate-900">
                        {pickLocalized(n.title_en, n.title_hi, lang)}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        {pickLocalized(n.body_en, n.body_hi, lang)}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Featured Verified Local Businesses */}
            <section aria-labelledby="featured-heading">
              <div className="flex items-center justify-between">
                <h2 id="featured-heading" className="text-lg font-bold text-slate-900 sm:text-xl">
                  {t('featuredTitle', lang)}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCatId(null);
                    setSelectedSubCatId(null);
                    setView('directory');
                  }}
                  className="text-xs font-semibold text-emerald-800 hover:underline"
                >
                  {t('viewAll', lang)}
                </button>
              </div>
              {loading ? (
                <p className="mt-4 text-sm text-slate-500">Loading directory...</p>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {businesses.slice(0, 6).map((biz) => (
                    <BusinessCard
                      key={biz.id}
                      business={biz}
                      categories={categories}
                      lang={lang}
                      isFavourite={favourites.includes(biz.id)}
                      onToggleFavourite={handleToggleFavourite}
                      onCall={handleCallBusiness}
                      onSelect={(b) => setDetailBusinessId(b.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* VIEW 2: DIRECTORY */}
        {view === 'directory' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {t('navDirectory', lang)}
                </h1>
                <p className="mt-0.5 text-xs text-slate-600">{t('villageLocation', lang)}</p>
              </div>
              <button
                type="button"
                onClick={handleToggleLanguage}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Globe className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                <span>{lang === 'hi' ? 'English' : 'हिन्दी'}</span>
              </button>
            </div>

            {/* Search + Open Now Filter */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder={t('searchPlaceholder', lang)}
                  className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pr-3 pl-10 text-sm focus:border-emerald-700 focus:bg-white focus:outline-none"
                />
              </div>
              <label className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={openNowOnly}
                  onChange={(e) => setOpenNowOnly(e.target.checked)}
                  className="h-4 w-4 accent-emerald-700"
                />
                <span>{t('openNowOnly', lang)}</span>
              </label>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedCatId(null);
                  setSelectedSubCatId(null);
                }}
                className={`min-h-[40px] rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  selectedCatId === null
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('allCategories', lang)}
              </button>
              {mainCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCatId(cat.id);
                    setSelectedSubCatId(null);
                  }}
                  className={`min-h-[40px] rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                    selectedCatId === cat.id
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {pickLocalized(cat.name_en, cat.name_hi, lang)}
                </button>
              ))}
            </div>

            {/* Subcategory Filter Tabs */}
            {activeSubCategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSubCatId(null)}
                  className={`min-h-[38px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    selectedSubCatId === null
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {t('allSubcategories', lang)}
                </button>
                {activeSubCategories.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubCatId(sub.id)}
                    className={`min-h-[38px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      selectedSubCatId === sub.id
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pickLocalized(sub.name_en, sub.name_hi, lang)}
                  </button>
                ))}
              </div>
            )}

            {/* Results Grid */}
            {filteredDirectory.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  {lang === 'hi'
                    ? 'कोई सेवा नहीं मिली। कृपया दूसरी श्रेणी या शब्द खोजें।'
                    : 'No matching businesses found. Try clearing filters.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDirectory.map((biz) => (
                  <BusinessCard
                    key={biz.id}
                    business={biz}
                    categories={categories}
                    lang={lang}
                    isFavourite={favourites.includes(biz.id)}
                    onToggleFavourite={handleToggleFavourite}
                    onCall={handleCallBusiness}
                    onSelect={(b) => setDetailBusinessId(b.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: MY RIDES & FAVOURITES */}
        {view === 'rides' && (
          <div className="space-y-8">
            <div className="border-b border-slate-200 pb-4">
              <h1 className="text-2xl font-bold text-slate-900">
                {t('navRides', lang)}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {lang === 'hi'
                  ? 'आपकी बुक की गई ऑटो/टोटो राइड्स और पसंदीदा दुकानें'
                  : 'Track your auto/toto ride requests and saved local shops'}
              </p>
            </div>

            {!user ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <p className="text-sm text-slate-600">
                  {lang === 'hi'
                    ? 'अपनी राइड्स और पसंदीदा सेवाएं देखने के लिए मोबाइल नंबर से लॉगिन करें।'
                    : 'Sign in with your mobile number to view your ride requests and saved favourites.'}
                </p>
                <button
                  type="button"
                  onClick={() => openAuthFor('user')}
                  className="mt-4 min-h-[44px] rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  {t('signIn', lang)}
                </button>
              </div>
            ) : (
              <>
                <section aria-labelledby="rides-list-heading">
                  <h2 id="rides-list-heading" className="text-lg font-bold text-slate-900">
                    {t('myRideRequests', lang)}
                  </h2>
                  {myRides.length === 0 ? (
                    <p className="mt-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                      {t('noRides', lang)}
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {myRides.map((bk) => (
                        <div
                          key={bk.id}
                          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4"
                        >
                          <div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="font-semibold text-slate-800">
                                {pickLocalized(bk.business_name_en || '', bk.business_name_hi || '', lang)}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold uppercase text-emerald-800">
                                {bk.status}
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-bold text-slate-900">
                              {bk.pickup_location} → {bk.drop_location}
                            </p>
                            <p className="font-mono-nums mt-0.5 text-xs text-slate-600">
                              {bk.passenger_count || 1} {lang === 'hi' ? 'सवारी' : 'passengers'} · Est. ₹
                              {bk.estimated_fare ?? 20}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {bk.business_phone && (
                              <a
                                href={`tel:${bk.business_phone}`}
                                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                              >
                                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>{t('callNow', lang)}</span>
                              </a>
                            )}
                            {(bk.status === 'pending' || bk.status === 'accepted') && (
                              <button
                                type="button"
                                onClick={() => handleCancelRide(bk.id)}
                                className="min-h-[40px] rounded-xl border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-800 hover:bg-red-100"
                              >
                                {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section aria-labelledby="fav-list-heading">
                  <h2 id="fav-list-heading" className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <Heart className="h-5 w-5 text-red-600" aria-hidden="true" />
                    <span>{t('savedFavourites', lang)}</span>
                  </h2>
                  {favouriteBusinesses.length === 0 ? (
                    <p className="mt-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                      {t('noFavourites', lang)}
                    </p>
                  ) : (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {favouriteBusinesses.map((biz) => (
                        <BusinessCard
                          key={biz.id}
                          business={biz}
                          categories={categories}
                          lang={lang}
                          isFavourite={true}
                          onToggleFavourite={handleToggleFavourite}
                          onCall={handleCallBusiness}
                          onSelect={(b) => setDetailBusinessId(b.id)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}

        {/* VIEW 4: PARTNER / ADMIN PANEL */}
        {view === 'panel' && (
          <>
            {user && token && user.role_name === 'business' ? (
              <BusinessPanelView
                token={token}
                lang={lang}
                categories={categories}
                onDataChanged={loadPublicData}
              />
            ) : user && token && user.role_name === 'admin' ? (
              <AdminPanelView
                token={token}
                lang={lang}
                onDataChanged={loadPublicData}
              />
            ) : (
              <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center">
                <h1 className="text-xl font-bold text-slate-900">
                  {lang === 'hi' ? 'पार्टनर या एडमिन लॉगिन चुनें' : 'Partner & Admin Access'}
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  {lang === 'hi'
                    ? 'अपनी दुकान/ऑटो जोड़ने के लिए "दुकान/ऑटो (Business)" चुनें, या गाँव ऐप प्रबंधन के लिए "एडमिन" लॉगिन करें।'
                    : 'Sign in as a Business Partner to manage your shop or toto rides, or as Admin to approve listings and publish notices.'}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => openAuthFor('business')}
                    className="min-h-[44px] rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                  >
                    {lang === 'hi' ? 'दुकान / ड्राइवर लॉगिन' : 'Business Partner Login'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthFor('admin')}
                    className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    {lang === 'hi' ? 'एडमिन लॉगिन' : 'Admin Login'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Mobile Thumb-Zone Bottom Tab Bar (md:hidden) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="fixed right-0 bottom-0 left-0 z-40 grid h-14 grid-cols-4 items-center border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden"
      >
        <button
          type="button"
          onClick={() => setView('home')}
          className={`flex h-full flex-col items-center justify-center ${
            view === 'home' ? 'text-emerald-800' : 'text-slate-500'
          }`}
        >
          <HomeIcon className="h-5 w-5" aria-hidden="true" />
          <span className="mt-1 text-[10px] font-semibold">{t('navHome', lang)}</span>
        </button>
        <button
          type="button"
          onClick={() => setView('directory')}
          className={`flex h-full flex-col items-center justify-center ${
            view === 'directory' ? 'text-emerald-800' : 'text-slate-500'
          }`}
        >
          <Compass className="h-5 w-5" aria-hidden="true" />
          <span className="mt-1 text-[10px] font-semibold">{t('navDirectory', lang)}</span>
        </button>
        <button
          type="button"
          onClick={() => setView('rides')}
          className={`flex h-full flex-col items-center justify-center ${
            view === 'rides' ? 'text-emerald-800' : 'text-slate-500'
          }`}
        >
          <Car className="h-5 w-5" aria-hidden="true" />
          <span className="mt-1 text-[10px] font-semibold">{t('navRides', lang)}</span>
        </button>
        <button
          type="button"
          onClick={() => setView('panel')}
          className={`flex h-full flex-col items-center justify-center ${
            view === 'panel' ? 'text-emerald-800' : 'text-slate-500'
          }`}
        >
          <Store className="h-5 w-5" aria-hidden="true" />
          <span className="mt-1 text-[10px] font-semibold">{t('navPanel', lang)}</span>
        </button>
      </nav>

      {/* Modals */}
      <AuthModal
        open={authModalOpen}
        lang={lang}
        initialRole={authInitialRole}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <BusinessDetailModal
        businessId={detailBusinessId}
        categories={categories}
        lang={lang}
        user={user}
        token={token}
        isFavourite={detailBusinessId ? favourites.includes(detailBusinessId) : false}
        onClose={() => setDetailBusinessId(null)}
        onRequireAuth={() => openAuthFor('user')}
        onCall={handleCallBusiness}
        onToggleFavourite={handleToggleFavourite}
        onRideBooked={() => {
          loadUserData(token);
          loadPublicData();
        }}
      />

      <OfflineIndicator lang={lang} />
    </div>
  );
}
