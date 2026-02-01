import { Link } from 'react-router-dom';

export default function RatesSection({ currencies }) {
  const topCurrencies = currencies.slice(0, 5);
  const now = new Date();

  return (
    <section id="rates" className="py-12 lg:py-20 px-4 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl lg:text-4xl font-bold mb-1">Актуальні курси валют</h2>
            <p className="text-sm text-text-secondary">
              Оновлено: <span className="text-accent-yellow">{now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</span>, {now.toLocaleDateString('uk-UA')}
            </p>
          </div>
        </div>

        {/* Rates Table */}
        <div className="bg-primary-light rounded-2xl border border-white/10 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-3 px-4 lg:px-6 py-3 border-b border-white/10 text-sm text-text-secondary">
            <div>Валюта</div>
            <div className="text-right">Купівля</div>
            <div className="text-right">Продаж</div>
          </div>

          {/* Rows */}
          {topCurrencies.map((currency) => (
            <div 
              key={currency.code}
              className="grid grid-cols-3 px-4 lg:px-6 py-4 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl lg:text-2xl">{currency.flag}</span>
                <span className="font-semibold">{currency.code} - UAH</span>
              </div>
              <div className="text-right font-semibold text-lg">
                {currency.buy_rate?.toFixed(2)}
              </div>
              <div className="text-right font-semibold text-lg">
                {currency.sell_rate?.toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <Link 
          to="/rates"
          className="block w-full mt-4 py-4 bg-accent-blue rounded-xl text-white font-medium hover:bg-accent-blue/90 transition-colors text-center"
        >
          Дивитися всі курси →
        </Link>
      </div>
    </section>
  );
}
