import { useState } from 'react';
import { X, MapPin, DollarSign, Briefcase, HelpCircle, Phone, ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MobileNav({ isOpen, onClose, settings, currencies = [], services = [], onPresetExchange, currencyInfoMap = {} }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(null); // 'buy', 'sell', 'services'

  if (!isOpen) return null;

  const toggleTab = (tab) => {
    setActiveTab(activeTab === tab ? null : tab);
  };

  const availableCurrencies = currencies.filter(c => c.code !== 'UAH');

  const defaultServices = [
    { id: 1, title: 'Приймаємо валюту, яка вийшла з обігу', link_url: '/services/old-currency' },
    { id: 2, title: 'Приймаємо зношену валюту', link_url: '/services/damaged-currency' },
    { id: 3, title: 'Старі франки на нові або USD', link_url: '/services/old-francs' },
  ];
  const serviceItems = services?.length > 0 ? services : defaultServices;

  const handleLinkClick = (href) => {
    onClose();
    if (href.startsWith('#')) {
      // Handle hash navigation if needed
      const element = document.querySelector(href);
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(href);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] lg:hidden">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div className="absolute left-0 top-0 bottom-0 w-[300px] bg-primary-light/95 backdrop-blur-xl border-r border-white/10 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div onClick={() => { onClose(); onPresetExchange('reset'); }} className="cursor-pointer">
              <img src="/logo.png" alt="Svit Valut" className="h-8 w-auto object-contain" />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-white"
            aria-label="Закрити меню">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">

          {/* Purchase Accordion */}
          <div className="border-b border-white/5 pb-2">
            <button
              onClick={() => toggleTab('buy')}
              className="w-full flex items-center justify-between px-4 py-3 text-white font-medium hover:bg-white/5 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-accent-green" />
                <span>Придбати</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${activeTab === 'buy' ? 'rotate-180' : ''}`} />
            </button>

            {activeTab === 'buy' && (
              <div className="pl-4 pr-2 space-y-1 mt-1 animate-fadeIn">
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
                        onClose();
                        if (buyUrl) {
                          onPresetExchange('buy', currency.code);
                          navigate(buyUrl);
                        } else {
                          onPresetExchange('buy', currency.code);
                          navigate('/');
                          // Reset hash or handle elsewhere? 
                          // Actually handlePresetExchange handles navigation/scrolling
                        }
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors text-sm"
                    >
                      <span className="text-base">{currency.flag}</span>
                      <span>{currency.code}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sell Accordion */}
          <div className="border-b border-white/5 pb-2">
            <button
              onClick={() => toggleTab('sell')}
              className="w-full flex items-center justify-between px-4 py-3 text-white font-medium hover:bg-white/5 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-accent-red" />
                <span>Продати</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${activeTab === 'sell' ? 'rotate-180' : ''}`} />
            </button>

            {activeTab === 'sell' && (
              <div className="pl-4 pr-2 space-y-1 mt-1 animate-fadeIn">
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
                        onClose();
                        if (sellUrl) {
                          onPresetExchange('sell', currency.code);
                          navigate(sellUrl);
                        } else {
                          onPresetExchange('sell', currency.code);
                          navigate('/');
                        }
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors text-sm"
                    >
                      <span className="text-base">{currency.flag}</span>
                      <span>{currency.code}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Services Accordion */}
          <div className="border-b border-white/5 pb-2">
            <button
              onClick={() => toggleTab('services')}
              className="w-full flex items-center justify-between px-4 py-3 text-white font-medium hover:bg-white/5 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-accent-yellow" />
                <span>Послуги</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${activeTab === 'services' ? 'rotate-180' : ''}`} />
            </button>

            {activeTab === 'services' && (
              <div className="pl-4 pr-2 space-y-1 mt-1 animate-fadeIn">
                {serviceItems.map(service => (
                  <a
                    key={service.id}
                    href={service.link_url || `/services/${service.slug || service.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleLinkClick(service.link_url || `/services/${service.slug || service.id}`);
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors text-sm"
                  >
                    <span>{service.title}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Static Links */}
          <a href={settings?.rates_url || '/rates'} onClick={(e) => { e.preventDefault(); handleLinkClick(settings?.rates_url || '/rates'); }} className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:text-white hover:bg-white/5 transition-colors">
            <DollarSign className="w-5 h-5" />
            <span className="font-medium">Курс валют</span>
          </a>

          <a href="#branches" onClick={(e) => { e.preventDefault(); onClose(); const el = document.getElementById('branches'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:text-white hover:bg-white/5 transition-colors">
            <MapPin className="w-5 h-5" />
            <span className="font-medium">Відділення</span>
          </a>

          <a href={settings?.contacts_url || '/contacts'} onClick={(e) => { e.preventDefault(); handleLinkClick(settings?.contacts_url || '/contacts'); }} className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:text-white hover:bg-white/5 transition-colors">
            <Phone className="w-5 h-5" />
            <span className="font-medium">Контакти</span>
          </a>

        </div>

        {/* Footer Info */}
        <div className="p-6 border-t border-white/5">
          <div className="p-4 bg-accent-yellow/10 rounded-xl border border-accent-yellow/20">
            <div className="text-sm text-text-secondary mb-1">Гаряча лінія</div>
            <a href="tel:0960488884" className="text-lg font-bold text-accent-yellow">
              (096) 048-88-84
            </a>
            <div className="text-xs text-text-secondary mt-1">щодня: 8:00-20:00</div>
          </div>
        </div>

      </div>
    </div>
  );
}
