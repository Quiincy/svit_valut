import { useState } from 'react';
import { Menu, MessageSquare, MapPin, ChevronDown } from 'lucide-react';

export default function Header({ onMenuToggle, onOpenChat, currencies = [], onPresetExchange }) {
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);

  // Filter currencies for dropdowns (exclude UAH)
  const availableCurrencies = currencies.filter(c => c.code !== 'UAH');

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-auto py-2 lg:h-20 lg:py-0 gap-2">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden flex flex-col items-center justify-center w-[60px] h-[60px] bg-[#1a1f2e] border border-white/10 rounded-2xl text-text-secondary hover:text-white transition-colors gap-1 shadow-lg"
          >
            <Menu className="w-6 h-6 text-[#4488FF]" />
            <span className="text-[10px] font-medium leading-none text-white">меню</span>
          </button>

          {/* Logo */}
          <a href="/" className="flex items-center gap-1.5 lg:gap-2 shrink-0">
            <div className="relative flex items-center justify-center">
              <span className="text-3xl lg:text-4xl font-bold text-[#4488FF] font-sans">$</span>
            </div>
            <div className="text-left flex flex-col justify-center h-full pt-1">
              <div className="font-bold text-lg lg:text-xl leading-none tracking-wide text-white">СВІТ</div>
              <div className="text-[10px] lg:text-xs font-medium text-text-secondary tracking-[2px] uppercase leading-none mt-0.5">ВАЛЮТ</div>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">

            {/* Purchase Dropdown */}
            <div
              className="relative group"
              onMouseEnter={() => setPurchaseOpen(true)}
              onMouseLeave={() => setPurchaseOpen(false)}
            >
              <button className="flex items-center gap-1 text-text-secondary hover:text-white text-base font-medium transition-colors py-2">
                Придбати
                <ChevronDown className={`w-3 h-3 transition-transform ${purchaseOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              <div className={`absolute top-full left-0 mt-0 w-48 bg-primary-light border border-white/10 rounded-xl shadow-xl overflow-hidden transition-all duration-200 options-scroll max-h-[60vh] overflow-y-auto ${purchaseOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                {availableCurrencies.map(currency => (
                  <button
                    key={currency.code}
                    onClick={() => {
                      onPresetExchange('buy', currency.code);
                      setPurchaseOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors border-b border-white/5 last:border-b-0"
                  >
                    <span className="text-lg">{currency.flag}</span>
                    <div>
                      <div className="font-bold text-sm text-white">{currency.code}</div>
                      <div className="text-[10px] text-text-secondary">Придбати {currency.code}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sell Dropdown */}
            <div
              className="relative group"
              onMouseEnter={() => setSellOpen(true)}
              onMouseLeave={() => setSellOpen(false)}
            >
              <button className="flex items-center gap-1 text-text-secondary hover:text-white text-base font-medium transition-colors py-2">
                Продати
                <ChevronDown className={`w-3 h-3 transition-transform ${sellOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              <div className={`absolute top-full left-0 mt-0 w-48 bg-primary-light border border-white/10 rounded-xl shadow-xl overflow-hidden transition-all duration-200 options-scroll max-h-[60vh] overflow-y-auto ${sellOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                {availableCurrencies.map(currency => (
                  <button
                    key={currency.code}
                    onClick={() => {
                      onPresetExchange('sell', currency.code);
                      setSellOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors border-b border-white/5 last:border-b-0"
                  >
                    <span className="text-lg">{currency.flag}</span>
                    <div>
                      <div className="font-bold text-sm text-white">{currency.code}</div>
                      <div className="text-[10px] text-text-secondary">Продати {currency.code}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <a href="#services" className="text-text-secondary hover:text-white text-base font-medium transition-colors">
              Додаткові послуги
            </a>

            <a href="#footer" className="text-text-secondary hover:text-white text-base font-medium transition-colors">
              Контакти
            </a>
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-2 lg:gap-4 shrink-0">
            {/* Location & Hours (Visible on Mobile now) */}
            <a
              href="#branches"
              className="flex flex-col items-center justify-center bg-[#1a1f2e] border border-white/10 rounded-2xl px-2 py-1.5 h-[60px] hover:bg-white/10 transition-colors group min-w-[120px] lg:px-4 shadow-lg"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-white text-[10px] lg:text-sm font-medium">м. Київ</span>
                <MapPin className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-[#4488FF] fill-[#4488FF]/20" />
                <span className="text-[#4488FF] text-[10px] lg:text-sm font-bold">5 пунктів</span>
              </div>
              <div className="text-[10px] lg:text-[11px] text-text-secondary/80 font-medium whitespace-nowrap">
                щодня: 8:00–20:00
              </div>
            </a>

            {/* Chat Widget Button (Modified for Mobile to match screenshot) */}


            {/* Desktop Chat Widget (Hidden on Mobile) */}
            <button
              onClick={onOpenChat}
              className="hidden lg:flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-1.5 pr-4 hover:bg-white/10 transition-colors text-left"
            >
              <div className="w-9 h-9 bg-accent-yellow rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-accent-yellow/20">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-bold text-white leading-none mb-1">Ірина</div>
                <div className="text-[10px] font-medium text-blue-400 leading-none flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                  в мережі
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
