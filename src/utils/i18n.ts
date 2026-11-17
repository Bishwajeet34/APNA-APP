import type { LanguageCode } from '../types/village';

export const UI_COPY: Record<string, { hi: string; en: string }> = {
  brandName: { hi: 'पंचकठिया बाजार', en: 'Panchkathia Bazar' },
  villageLocation: {
    hi: 'पंचकठिया बाजार · प्रखंड बरहेट · जिला साहिबगंज · झारखंड 816102',
    en: 'Panchkathia Bazar · Barhait Block · Sahibganj · Jharkhand 816102',
  },
  navHome: { hi: 'होम', en: 'Home' },
  navDirectory: { hi: 'सभी सेवाएं', en: 'Directory' },
  navRides: { hi: 'मेरी राइड्स', en: 'My Rides' },
  navPanel: { hi: 'पार्टनर / एडमिन', en: 'Partner / Admin' },
  signIn: { hi: 'लॉगिन करें', en: 'Sign In' },
  signOut: { hi: 'लॉगआउट', en: 'Sign Out' },
  installApp: { hi: 'ऐप इंस्टॉल करें', en: 'Install App' },
  heroHeadline: {
    hi: 'पंचकठिया बाजार की हर दुकान, डॉक्टर, सवारी और पंचायत सूचना एक जगह',
    en: 'Every shop, doctor, ride, and village notice in Panchkathia Bazar',
  },
  heroSub: {
    hi: 'सीधे कॉल करें, ऑटो/टोटो बुक करें या गाँव की ताज़ा जानकारी देखें।',
    en: 'Call directly, request an auto or toto ride, and check verified village updates.',
  },
  searchPlaceholder: {
    hi: 'दुकान, दवा, डॉक्टर, टोटो या सीएसपी खोजें...',
    en: 'Search shops, medical, doctor, toto, or CSP...',
  },
  searchBtn: { hi: 'खोजें', en: 'Search' },
  emergencyTitle: {
    hi: 'आपातकालीन 1-टैप कॉल',
    en: 'Emergency 1-Tap Helpline',
  },
  noticesTitle: { hi: 'गाँव सूचना पट्ट', en: 'Village Notice Board' },
  categoriesTitle: { hi: 'मुख्य सेवा श्रेणियां', en: 'Browse by Category' },
  featuredTitle: { hi: 'गाँव की प्रमुख सेवाएं', en: 'Verified Local Services' },
  viewAll: { hi: 'सभी देखें', en: 'View All' },
  openNowOnly: { hi: 'केवल अभी खुले हुए', en: 'Open Now Only' },
  allCategories: { hi: 'सभी श्रेणियां', en: 'All Categories' },
  allSubcategories: { hi: 'सभी उप-श्रेणियां', en: 'All' },
  openBadge: { hi: 'अभी खुला', en: 'Open' },
  closedBadge: { hi: 'बंद', en: 'Closed' },
  callNow: { hi: 'कॉल करें', en: 'Call Now' },
  bookRide: { hi: 'राइड बुक करें', en: 'Book Ride' },
  whatsapp: { hi: 'व्हाट्सएप', en: 'WhatsApp' },
  servicesAndRates: { hi: 'सेवाएं और शुल्क', en: 'Services & Rates' },
  weeklyTimings: { hi: 'खुलने का समय', en: 'Opening Hours' },
  reviewsTitle: { hi: 'समीक्षा और रेटिंग', en: 'Reviews & Ratings' },
  addReview: { hi: 'अपना अनुभव लिखें', en: 'Write a Review' },
  submitReview: { hi: 'रिव्यू भेजें', en: 'Submit Review' },
  reportListing: { hi: 'गलत जानकारी की रिपोर्ट करें', en: 'Report Issue' },
  savedFavourites: { hi: 'पसंदीदा सेवाएं', en: 'Saved Favourites' },
  noFavourites: {
    hi: 'अभी कोई पसंदीदा दुकान या ड्राइवर सेव नहीं है।',
    en: 'No favourite shops or drivers saved yet.',
  },
  noRides: {
    hi: 'अभी कोई राइड बुकिंग नहीं की गई है।',
    en: 'No ride requests booked yet.',
  },
  myRideRequests: { hi: 'मेरी राइड बुकिंग्स', en: 'My Ride Requests' },
  businessPanelTitle: { hi: 'दुकानदार और ड्राइवर पैनल', en: 'Business & Driver Panel' },
  adminPanelTitle: { hi: 'एडमिन नियंत्रण केंद्र', en: 'Admin Control Center' },
  registerBusinessBtn: { hi: 'नयी दुकान / ऑटो रजिस्टर करें', en: 'Register New Shop / Ride' },
  pendingNoticeBanner: {
    hi: 'एडमिन की मंजूरी (Approval) मिलने के बाद ही आपकी दुकान गाँव के लोगों को दिखेगी।',
    en: 'Your listing goes live to villagers only after Admin approval.',
  },
};

export function t(key: keyof typeof UI_COPY, lang: LanguageCode): string {
  return UI_COPY[key]?.[lang] ?? UI_COPY[key]?.en ?? String(key);
}

export function formatNoticeType(type: string, lang: LanguageCode): string {
  const map: Record<string, { hi: string; en: string }> = {
    general: { hi: 'सामान्य सूचना', en: 'General' },
    panchayat: { hi: 'ग्राम पंचायत', en: 'Panchayat' },
    emergency: { hi: 'आपातकालीन', en: 'Emergency' },
    power_water: { hi: 'बिजली / पानी', en: 'Power & Water' },
    health_camp: { hi: 'स्वास्थ्य शिविर', en: 'Health Camp' },
  };
  return map[type]?.[lang] ?? type;
}

