import React, { useState } from 'react';
import { Car, Heart, MapPin, Phone, Star, Store } from 'lucide-react';
import type { Business, Category, LanguageCode } from '../types/village';
import { pickLocalized } from '../utils/villageLogic';

interface BusinessCardProps {
  business: Business;
  categories: Category[];
  lang: LanguageCode;
  isFavourite: boolean;
  onToggleFavourite: (businessId: string) => void;
  onCall: (business: Business) => void;
  onSelect: (business: Business) => void;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({
  business,
  categories,
  lang,
  isFavourite,
  onToggleFavourite,
  onCall,
  onSelect,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const mainCat = categories.find((c) => c.id === business.category_id);
  const subCat = categories.find((c) => c.id === business.subcategory_id);
  const categoryLabel = subCat
    ? pickLocalized(subCat.name_en, subCat.name_hi, lang)
    : mainCat
    ? pickLocalized(mainCat.name_en, mainCat.name_hi, lang)
    : '';
  const title = pickLocalized(business.name_en, business.name_hi, lang);
  const description = pickLocalized(business.description_en, business.description_hi, lang);
  const isRide = business.category_id === 2;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        {business.photo_url && !imgFailed ? (
          <img
            src={business.photo_url}
            alt={title}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-slate-100 to-amber-50 px-4 text-center">
            {isRide ? (
              <Car className="h-9 w-9 text-emerald-700/70" aria-hidden="true" />
            ) : (
              <Store className="h-9 w-9 text-emerald-700/70" aria-hidden="true" />
            )}
            <span className="mt-2 line-clamp-1 text-xs font-semibold text-slate-600">
              {categoryLabel}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavourite(business.id);
          }}
          aria-label={isFavourite ? `Remove ${title} from favourites` : `Save ${title} to favourites`}
          className="absolute top-2.5 right-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm backdrop-blur-xs transition-colors hover:bg-white"
        >
          <Heart
            className={`h-4 w-4 ${isFavourite ? 'fill-red-600 text-red-600' : 'text-slate-700'}`}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <span className="font-medium text-slate-700">{categoryLabel}</span>
          <span aria-hidden="true">·</span>
          <span className={business.is_open_now ? 'font-semibold text-emerald-700' : 'font-semibold text-red-700'}>
            {business.is_open_now
              ? lang === 'hi'
                ? 'अभी खुला'
                : 'Open'
              : lang === 'hi'
              ? 'बंद'
              : 'Closed'}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-nums inline-flex items-center gap-1 font-semibold text-slate-700">
            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
            {business.avg_rating > 0 ? business.avg_rating.toFixed(1) : 'New'}
            {business.total_reviews > 0 ? ` (${business.total_reviews})` : ''}
          </span>
        </div>

        <h3 className="mt-1.5 line-clamp-1 text-base font-bold text-slate-900">
          {title}
        </h3>

        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">
          {description}
        </p>

        <div className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="line-clamp-1">
            {business.landmark || business.address_line}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => onCall(business)}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{lang === 'hi' ? 'कॉल करें' : 'Call Now'}</span>
          </button>
          <button
            type="button"
            onClick={() => onSelect(business)}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap"
          >
            {isRide
              ? lang === 'hi'
                ? 'राइड / विवरण'
                : 'Book / Details'
              : lang === 'hi'
              ? 'विवरण देखें'
              : 'Details'}
          </button>
        </div>
      </div>
    </article>
  );
};
