import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, MessageSquare, MapPin, ChevronDown } from 'lucide-react';

const defaultServices = [
  { id: 1, title: 'Приймаємо валюту, яка вийшла з обігу', link_url: '/services/old-currency' },
  { id: 2, title: 'Приймаємо зношену валюту', link_url: '/services/damaged-currency' },
  { id: 3, title: 'Старі франки на нові або USD', link_url: '/services/old-francs' },
];

export default function Header({ onMenuToggle, onOpenChat, currencies = [], services = [], onPresetExchange, currencyInfoMap = {}, branches = [] }) {
  const navigate = useNavigate();
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  const serviceItems = services?.length > 0 ? services : defaultServices;

  // Show ALL currencies including UAH
  const availableCurrencies = currencies;

  // Chat availability — 08:00–20:00 Kyiv time
  const isChatAvailable = () => {
    const now = new Date();
    const kyivTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
    const totalMinutes = kyivTime.getHours() * 60 + kyivTime.getMinutes();
    return totalMinutes >= 480 && totalMinutes <= 1200;
  };
  const chatOnline = isChatAvailable();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Determine if at top (for glass effect)
      setIsScrolled(currentScrollY > 20);

      // Determine visibility (Hide on down, Show on up)
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling Down & past threshold -> Hide
        setIsVisible(false);
      } else {
        // Scrolling Up or at top -> Show
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Header Classes:
  // - Fixed: Always sticky
  // - Transition: Smooth slide/fade
  // - Glass: When scrolled (bg-primary/50 + backdrop-blur-xl)
  // - Hidden: -translate-y-full
  const headerClasses = `
    fixed top-0 left-0 right-0 z-50 transition-all duration-300 transform
    ${isScrolled ? 'bg-primary/50 backdrop-blur-xl border-b border-white/10 shadow-lg' : 'bg-primary border-b border-white/10'}
    ${isVisible ? 'translate-y-0' : '-translate-y-full'}
  `;

  return (
    <header className={headerClasses}>
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-auto py-2 lg:h-20 lg:py-0 gap-2">
          {/* Mobile Menu Button - Optimized Size */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden flex flex-col items-center justify-center w-12 h-12 bg-[#1a1f2e] border border-white/10 rounded-xl text-text-secondary hover:text-white transition-colors gap-0.5 shadow-lg shrink-0"
          >
            <Menu className="w-5 h-5 text-[#4488FF]" />
            <span className="text-[9px] font-medium leading-none text-white">меню</span>
          </button>

          {/* Logo - Flexible Width */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onPresetExchange('reset');
            }}
            className="flex items-center justify-center shrink min-w-0 pointer-events-auto"
          >
            <div className="h-8 sm:h-10 lg:h-12 w-auto max-w-[160px] sm:max-w-none">
              {/* Use the Logo component */}
              <img src="/logo.png" alt="Svit Valut" className="h-full w-auto object-contain" />
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
                {availableCurrencies.map(currency => {
                  const info = currencyInfoMap[currency.code] || {};
                  const buyUrl = info.buy_url;
                  const targetUrl = buyUrl || `/#buy-${currency.code}`;

                  return (
                    <a
                      key={currency.code}
                      href={targetUrl}
                      onClick={(e) => {
                        e.preventDefault();
                        setPurchaseOpen(false);
                        if (buyUrl) {
                          onPresetExchange('buy', currency.code);
                          navigate(buyUrl);
                        } else {
                          onPresetExchange('buy', currency.code);
                          window.history.pushState(null, '', targetUrl);
                        }
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors border-b border-white/5 last:border-b-0"
                    >
                      <span className="text-lg">{currency.flag}</span>
                      <div>
                        <div className="font-bold text-sm text-white">{currency.code}</div>
                        <div className="text-[10px] text-text-secondary">Придбати {currency.code}</div>
                      </div>
                    </a>
                  );
                })}
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
                {availableCurrencies.map(currency => {
                  const info = currencyInfoMap[currency.code] || {};
                  const sellUrl = info.sell_url;
                  const targetUrl = sellUrl || `/#sell-${currency.code}`;

                  return (
                    <a
                      key={currency.code}
                      href={targetUrl}
                      onClick={(e) => {
                        e.preventDefault();
                        setSellOpen(false);
                        if (sellUrl) {
                          onPresetExchange('sell', currency.code);
                          navigate(sellUrl);
                        } else {
                          onPresetExchange('sell', currency.code);
                          window.history.pushState(null, '', targetUrl);
                        }
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors border-b border-white/5 last:border-b-0"
                    >
                      <span className="text-lg">{currency.flag}</span>
                      <div>
                        <div className="font-bold text-sm text-white">{currency.code}</div>
                        <div className="text-[10px] text-text-secondary">Продати {currency.code}</div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Services Dropdown */}
            <div
              className="relative group"
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
            >
              <Link to="/services" className="flex items-center gap-1 text-text-secondary hover:text-white text-base font-medium transition-colors py-2">
                Додаткові послуги
                <ChevronDown className={`w-3 h-3 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} />
              </Link>

              <div className={`absolute top-full left-0 mt-0 w-64 bg-primary-light border border-white/10 rounded-xl shadow-xl overflow-hidden transition-all duration-200 ${servicesOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                {serviceItems.map(service => (
                  <Link
                    key={service.id}
                    to={service.link_url || `/services/${service.slug || service.id}`}
                    onClick={() => setServicesOpen(false)}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors border-b border-white/5 last:border-b-0 block"
                  >
                    <div>
                      <div className="font-medium text-sm text-white">{service.title}</div>
                    </div>
                  </Link>
                ))}
                <Link
                  to="/services"
                  onClick={() => setServicesOpen(false)}
                  className="w-full text-left px-4 py-3 hover:bg-accent-yellow/10 flex items-center gap-2 transition-colors bg-white/5 block"
                >
                  <span className="text-sm font-medium text-accent-yellow">Всі послуги →</span>
                </Link>
              </div>
            </div>


            <Link to="/contacts" className="text-text-secondary hover:text-white text-base font-medium transition-colors">
              Контакти
            </Link>
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-2 lg:gap-4 shrink-0">
            {/* Location & Hours (Visible on Mobile now) - Optimized Size */}
            <a
              href="#branches"
              className="flex flex-col items-center justify-center bg-[#1a1f2e] border border-white/10 rounded-xl px-2 py-1 h-12 lg:h-[60px] lg:rounded-2xl hover:bg-white/10 transition-colors group min-w-[100px] lg:min-w-[120px] lg:px-4 shadow-lg shrink-0"
            >
              <div className="flex items-center gap-1">
                <span className="text-white text-[9px] lg:text-sm font-medium">м. Київ</span>
                <MapPin className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-[#4488FF] fill-[#4488FF]/20" />
                <span className="text-[#4488FF] text-[9px] lg:text-sm font-bold">{branches?.length > 0 ? branches.length : 5} пунктів</span>
              </div>
              <div className="text-[9px] lg:text-[11px] text-text-secondary/80 font-medium whitespace-nowrap">
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
                <div className={`text-[10px] font-medium leading-none flex items-center gap-1 ${chatOnline ? 'text-green-400' : 'text-red-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${chatOnline ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}></span>
                  {chatOnline ? 'в мережі' : 'не в мережі'}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
