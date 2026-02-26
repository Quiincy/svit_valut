import { Link } from 'react-router-dom';

export default function RatesSection({ currencies, crossRates = {}, updatedAt, settings }) {
  const topCurrencies = currencies.filter(c => c.code !== 'UAH').slice(0, 5);
  const commonCrossPairs = Object.entries(crossRates).slice(0, 3);

  // Format the date if provided, otherwise fallback to "just now" or empty
  // Format the date if provided, otherwise fallback to "just now" or empty
  const formatDate = (dateString) => {
    const date = dateString ? new Date(dateString) : new Date();
    const time = date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    const day = date.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${time}. ${day}`;
  };

  const formattedTime = formatDate(updatedAt);

  return (
    <section id="rates" className="py-12 lg:py-20 px-4 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold mb-1">Роздрібні курси валют</h2>
                <p className="text-sm text-text-secondary">
                  Оновлено: {formattedTime}
                </p>
              </div>
            </div>

            {/* UAH Rates Table */}
            <div className="bg-primary-light rounded-2xl border border-white/10 overflow-hidden">
              <div className="grid grid-cols-3 px-4 lg:px-6 py-3 border-b border-white/10 text-sm text-text-secondary">
                <div>Валюта</div>
                <div className="text-right">Купівля</div>
                <div className="text-right">Продаж</div>
              </div>

              {topCurrencies.map((currency) => (
                <div
                  key={currency.code}
                  className="grid grid-cols-3 px-4 lg:px-6 py-4 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl lg:text-2xl">{currency.flag}</span>
                    <span className="font-semibold">{currency.code} - UAH</span>
                  </div>
                  <div className="text-right font-semibold text-lg text-green-400">
                    {currency.buy_rate?.toFixed(2)}
                  </div>
                  <div className="text-right font-semibold text-lg text-red-400">
                    {currency.sell_rate?.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold mb-1">Крос-курси</h2>
                <p className="text-sm text-text-secondary">Розраховано автоматично</p>
              </div>
            </div>

            {/* Cross Rates Table */}
            <div className="bg-primary-light rounded-2xl border border-white/10 overflow-hidden">
              <div className="grid grid-cols-3 px-4 lg:px-6 py-3 border-b border-white/10 text-sm text-text-secondary">
                <div>Пара</div>
                <div className="text-right">Купівля</div>
                <div className="text-right">Продаж</div>
              </div>

              {commonCrossPairs.map(([pair, rate]) => (
                <div
                  key={pair}
                  className="grid grid-cols-3 px-4 lg:px-6 py-4 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{pair}</span>
                  </div>
                  <div className="text-right font-semibold text-lg text-green-400">
                    {rate.buy?.toFixed(4)}
                  </div>
                  <div className="text-right font-semibold text-lg text-red-400">
                    {rate.sell?.toFixed(4)}
                  </div>
                </div>
              ))}

              {commonCrossPairs.length === 0 && (
                <div className="px-6 py-8 text-center text-text-secondary italic">
                  Дані про крос-курси завантажуються...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* View All Button */}
        <div className="flex justify-center mt-8">
          <Link
            to={settings?.rates_url || '/rates'}
            className="inline-flex items-center gap-2 px-8 py-3 bg-accent-yellow rounded-xl text-primary font-bold hover:opacity-90 transition-all shadow-lg shadow-accent-yellow/20"
          >
            Дивитися всі курси →
          </Link>
        </div>
      </div>
    </section>
  );
}
