import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { currencyService, settingsService } from '../services/api';

export default function RatesPage() {
  const [currencies, setCurrencies] = useState([]);
  const [settings, setSettings] = useState(null);
  const [crossRates, setCrossRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [currenciesRes, settingsRes, crossRes] = await Promise.all([
        currencyService.getAll(),
        settingsService.get(),
        currencyService.getCrossRates(),
      ]);
      setCurrencies(currenciesRes.data);
      setSettings(settingsRes.data);
      setCrossRates(crossRes.data.cross_rates || {});
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error:', error);
      // Fallback data
      setCurrencies([
        { code: 'USD', name_uk: 'Долар США', flag: '🇺🇸', buy_rate: 42.10, sell_rate: 42.15 },
        { code: 'EUR', name_uk: 'Євро', flag: '🇪🇺', buy_rate: 49.30, sell_rate: 49.35 },
        { code: 'PLN', name_uk: 'Польський злотий', flag: '🇵🇱', buy_rate: 11.50, sell_rate: 11.65 },
        { code: 'GBP', name_uk: 'Фунт стерлінгів', flag: '🇬🇧', buy_rate: 56.10, sell_rate: 56.25 },
        { code: 'CHF', name_uk: 'Швейцарський франк', flag: '🇨🇭', buy_rate: 52.80, sell_rate: 52.95 },
        { code: 'CAD', name_uk: 'Канадський долар', flag: '🇨🇦', buy_rate: 31.20, sell_rate: 31.35 },
        { code: 'AUD', name_uk: 'Австралійський долар', flag: '🇦🇺', buy_rate: 30.40, sell_rate: 30.55 },
        { code: 'CZK', name_uk: 'Чеська крона', flag: '🇨🇿', buy_rate: 1.85, sell_rate: 1.90 },
        { code: 'TRY', name_uk: 'Турецька ліра', flag: '🇹🇷', buy_rate: 1.22, sell_rate: 1.28 },
        { code: 'JPY', name_uk: 'Японська єна', flag: '🇯🇵', buy_rate: 0.28, sell_rate: 0.29 },
        { code: 'CNY', name_uk: 'Китайський юань', flag: '🇨🇳', buy_rate: 5.80, sell_rate: 5.95 },
        { code: 'INR', name_uk: 'Індійська рупія', flag: '🇮🇳', buy_rate: 0.50, sell_rate: 0.52 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="bg-primary-light border-b border-white/10 px-4 lg:px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-bold">Курси валют</h1>
              <p className="text-xs text-text-secondary">Світ Валют</p>
            </div>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Оновити</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold">Актуальні курси валют</h1>
          <p className="text-sm text-text-secondary">
            Оновлено: <span className="text-accent-yellow">{lastUpdate.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</span>
          </p>
        </div>

        {/* Info banner */}
        <div className="p-4 bg-accent-blue/10 rounded-xl border border-accent-blue/20 mb-6">
          <p className="text-sm">
            <span className="font-medium text-accent-blue">Оптовий курс</span> діє при обміні від {settings?.min_wholesale_amount || 1000} $ або еквівалент в іншій валюті
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
          {currencies.filter(c => c.code !== 'UAH').map((currency, index, filtered) => (
            <div
              key={currency.code}
              className={`grid grid-cols-4 px-4 lg:px-6 py-4 items-center hover:bg-white/5 transition-colors ${index !== filtered.length - 1 ? 'border-b border-white/5' : ''
                }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{currency.flag}</span>
                <span className="font-bold">{currency.code}</span>
              </div>
              <div className="text-text-secondary text-sm lg:block">{currency.name_uk}</div>
              <div className="text-right">
                <span className="font-bold text-lg text-green-400">{currency.buy_rate?.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-lg text-red-400">{currency.sell_rate?.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Cross Rates */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Крос-курси</h2>
          <p className="text-sm text-text-secondary mb-4">Вигідний обмін між валютами без участі гривні</p>

          <div className="bg-primary-light rounded-2xl border border-white/10 overflow-hidden">
            <div className="grid grid-cols-3 px-4 lg:px-6 py-4 border-b border-white/10 bg-white/5">
              <div className="text-sm font-medium text-text-secondary">Валютна пара</div>
              <div className="text-sm font-medium text-text-secondary text-right">Купівля</div>
              <div className="text-sm font-medium text-text-secondary text-right">Продаж</div>
            </div>

            {Object.entries(crossRates).map(([pair, rate], index) => (
              <div
                key={pair}
                className={`grid grid-cols-3 px-4 lg:px-6 py-4 items-center hover:bg-white/5 transition-colors ${index !== Object.keys(crossRates).length - 1 ? 'border-b border-white/5' : ''
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
      </main>

      {/* Footer */}
      <footer className="bg-primary-light border-t border-white/10 px-4 py-6 mt-12">
        <div className="max-w-4xl mx-auto text-center text-sm text-text-secondary">
          <p>© 2025 Світ Валют. Всі права захищено.</p>
        </div>
      </footer>
    </div>
  );
}
