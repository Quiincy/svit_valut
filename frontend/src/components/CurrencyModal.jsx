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

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
          {currencies.map((currency) => (
            <button
              key={currency.code}
              onClick={() => onSelect(currency)}
              className="w-full flex items-center justify-between p-4 bg-primary rounded-xl border border-white/10 hover:border-accent-yellow transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{currency.flag}</span>
                <div className="text-left">
                  <div className="font-bold">{currency.code}</div>
                  <div className="text-sm text-text-secondary">{currency.name_uk}</div>
                </div>
              </div>
              <span className={`font-semibold ${currency.is_popular ? 'text-success' : 'text-accent-yellow'}`}>
                {currency.buy_rate?.toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
