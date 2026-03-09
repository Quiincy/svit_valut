import { Link, useOutletContext, useLocation } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import SeoTextBlock from '../components/SeoTextBlock';
import { Helmet } from 'react-helmet-async';

export default function RatesPage() {
  const { currencies, settings, crossRates, ratesUpdated, seoList } = useOutletContext();
  const location = useLocation();

  // Compute activeSeo for the current page
  const pathname = decodeURIComponent(location.pathname);
  const cleanPathname = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  const reqPath = cleanPathname.toLowerCase();
  const activeSeo = (seoList || []).find(s => {
    if (!s.url_path) return false;
    let dbPath = s.url_path.toLowerCase();
    if (!dbPath.startsWith('/')) dbPath = '/' + dbPath;
    if (dbPath.endsWith('/') && dbPath.length > 1) dbPath = dbPath.slice(0, -1);
    return dbPath === reqPath;
  });

  const pageH1 = activeSeo?.h1 || 'Актуальні курси валют';
  const pageTitle = activeSeo?.title ? (activeSeo.title.includes('Світ Валют') ? activeSeo.title : `${activeSeo.title} | Світ Валют`) : 'Актуальні курси валют | Світ Валют';
  const pageDesc = activeSeo?.description || activeSeo?.text?.replace(/<[^>]*>?/gm, '').substring(0, 160) || 'Актуальні курси валют в Києві.';

  // Use lastUpdate from context or fallback to now if not passed
  const lastUpdateDate = ratesUpdated ? new Date(ratesUpdated) : new Date();

  return (
    <div className="bg-primary pb-12">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
      </Helmet>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 lg:px-8 py-8 pt-24 lg:pt-32">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl lg:text-3xl font-bold">{pageH1}</h1>
          <p className="text-sm text-text-secondary">
            Оновлено: <span className="text-accent-yellow">{lastUpdateDate.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
          </p>
        </div>

        {/* Info banner */}
        <div className="p-4 bg-accent-yellow/10 rounded-xl border border-accent-yellow/20 mb-6">
          <p className="text-sm">
            <span className="font-medium text-accent-yellow">Оптовий курс</span> діє при обміні від {settings?.min_wholesale_amount || 1000} $ або еквівалент в іншій валюті
          </p>
        </div>

        {/* Rates Table */}
        <div className="bg-primary-light rounded-2xl border border-white/10 overflow-hidden mb-12">
          {/* Header */}
          <div className="grid grid-cols-4 px-4 lg:px-6 py-4 border-b border-white/10 bg-white/5">
            <div className="text-sm font-medium text-text-secondary">Валюта</div>
            <div className="text-sm font-medium text-text-secondary">Назва</div>
            <div className="text-sm font-medium text-text-secondary text-right">Купівля</div>
            <div className="text-sm font-medium text-text-secondary text-right">Продаж</div>
          </div>

          {/* Rows */}
          {(currencies || []).filter(c => c.code !== 'UAH').map((currency, index, filtered) => {
            // Determine link URL (prefer sell_url, fallback to buy_url or auto-generated)
            const linkUrl = currency.sell_url || currency.buy_url || `/buy-${currency.code.toLowerCase()}`;
            return (
              <Link
                to={linkUrl}
                key={currency.code}
                className={`grid grid-cols-4 px-4 lg:px-6 py-4 items-center hover:bg-white/5 transition-colors cursor-pointer group ${index !== filtered.length - 1 ? 'border-b border-white/5' : ''
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{currency.flag}</span>
                  <span className="font-bold group-hover:text-accent-yellow transition-colors">{currency.code}</span>
                </div>
                <div className="text-text-secondary text-sm lg:block">{currency.name_uk}</div>
                <div className="text-right">
                  <span className="font-bold text-lg text-green-400">{currency.buy_rate?.toFixed(2)}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-lg text-red-400">{currency.sell_rate?.toFixed(2)}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Cross Rates */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Крос-курси</h2>
          <p className="text-sm text-text-secondary mb-4">Вигідний обмін однієї валюти на іншу</p>

          <div className="bg-primary-light rounded-2xl border border-white/10 overflow-hidden">
            <div className="grid grid-cols-3 px-4 lg:px-6 py-4 border-b border-white/10 bg-white/5">
              <div className="text-sm font-medium text-text-secondary">Валютна пара</div>
              <div className="text-sm font-medium text-text-secondary text-right">Купівля</div>
              <div className="text-sm font-medium text-text-secondary text-right">Продаж</div>
            </div>

            {Object.entries(crossRates || {}).map(([pair, rate], index) => (
              <div
                key={pair}
                className={`grid grid-cols-3 px-4 lg:px-6 py-4 items-center hover:bg-white/5 transition-colors ${index !== Object.keys(crossRates || {}).length - 1 ? 'border-b border-white/5' : ''
                  }`}
              >
                <div className="font-bold">{pair}</div>
                <div className="text-right">
                  <span className="font-bold text-lg text-green-400">{rate.buy?.toFixed(4)}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-lg text-red-400">{rate.sell?.toFixed(4)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-8 mt-6 text-sm text-text-secondary">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span>Купівля — ми купуємо у вас</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span>Продаж — ми продаємо вам</span>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent-yellow rounded-xl text-primary font-bold hover:opacity-90"
          >
            Забронювати валюту
          </Link>
        </div>
        {/* SEO Text Block */}
        {activeSeo?.text && (
          <div className="mt-8 bg-primary-light rounded-2xl border border-white/10 p-6">
            {activeSeo.h2 && <h2 className="text-2xl font-bold mb-4">{activeSeo.h2}</h2>}
            <SeoTextBlock html={activeSeo.text} prose />
          </div>
        )}

      </main>
    </div>
  );
}
