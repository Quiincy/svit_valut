import { X } from 'lucide-react';

export default function CurrencyModal({ isOpen, onClose, currencies, onSelect, type }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-end lg:items-center justify-center z-[200]"
      onClick={onClose}
    >
      <div
        className="bg-primary-light rounded-t-3xl lg:rounded-3xl p-6 w-full max-w-md max-h-[80vh] border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Оберіть валюту</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-2 grid grid-cols-3 gap-3 lg:grid-cols-1 lg:space-y-2">
          {currencies.filter(c => c.code !== 'UAH').map((currency) => (
            <button
              key={currency.code}
              onClick={() => onSelect(currency)}
              className="group relative w-full flex flex-col lg:flex-row items-center justify-center lg:justify-between p-3 lg:p-4 bg-primary rounded-xl border border-white/10 hover:border-accent-yellow transition-all"
            >
              <div className="flex flex-col lg:flex-row items-center gap-2 lg:gap-3">
                <span className="text-3xl lg:text-2xl filter drop-shadow-lg">{currency.flag}</span>
                <div className="text-center lg:text-left">
                  <div className="font-bold text-sm lg:text-base">{currency.code}</div>
                  <div className="hidden lg:block text-xs text-text-secondary">{currency.name_uk}</div>
                </div>
              </div>
              {currency.code !== 'UAH' && (
                <div className="mt-1 lg:mt-0 text-xs lg:text-sm font-semibold bg-white/5 px-2 py-0.5 rounded lg:bg-transparent lg:p-0">
                  <span className={currency.is_popular ? 'text-success' : 'text-accent-yellow'}>
                    {currency.buy_rate?.toFixed(2)}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
