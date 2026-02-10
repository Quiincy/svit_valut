import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, Outlet, useOutletContext } from 'react-router-dom';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import BranchesSection from './components/BranchesSection';
import RatesSection from './components/RatesSection';
import ServicesSection from './components/ServicesSection';
import FAQSection from './components/FAQSection';
import ChatSection from './components/ChatSection';
import Footer from './components/Footer';
import CurrencyModal from './components/CurrencyModal';
import SuccessModal from './components/SuccessModal';
import MobileNav from './components/MobileNav';
import LiveChat from './components/LiveChat';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import OperatorDashboard from './pages/OperatorDashboard';
import RatesPage from './pages/RatesPage';
import ServicePage from './pages/ServicePage';
import ContactsPage from './pages/ContactsPage';
import FAQPage from './pages/FAQPage';
import AllServicesPage from './pages/AllServicesPage';
import {
  currencyService, branchService, settingsService, faqService, servicesService,
  reservationService, authService, restoreAuth, clearAuthCredentials
} from './services/api';

// Public Layout: Handles State, Data Fetching, Header, Footer
function PublicLayout() {
  const { hash, pathname } = useLocation();
  const navigate = useNavigate();
  const [currencies, setCurrencies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [settings, setSettings] = useState(null);
  const [faqItems, setFaqItems] = useState([]);
  const [services, setServices] = useState([]);
  const [crossRates, setCrossRates] = useState({});
  const [branchCurrencyMap, setBranchCurrencyMap] = useState({});
  const [currencyInfoMap, setCurrencyInfoMap] = useState({});
  const [headerCurrencies, setHeaderCurrencies] = useState([]);
  const [ratesUpdated, setRatesUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [currencyModalType, setCurrencyModalType] = useState('give');
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const [giveAmount, setGiveAmount] = useState(100);
  const [giveCurrency, setGiveCurrency] = useState({ code: 'USD', name_uk: 'Долар', flag: '🇺🇸', buy_rate: 42.10 });
  const [getCurrency, setGetCurrency] = useState({ code: 'UAH', name_uk: 'Гривня', flag: '🇺🇦' });
  const [getAmount, setGetAmount] = useState(0);
  const [activeBranch, setActiveBranch] = useState(null);

  // Independent Selection States
  const [sellCurrency, setSellCurrency] = useState({ code: 'USD', name_uk: 'Долар', flag: '🇺🇸', buy_rate: 42.10 });
  const [buyCurrency, setBuyCurrency] = useState({ code: 'USD', name_uk: 'Долар', flag: '🇺🇸', buy_rate: 42.10 });

  // Preset action from header dropdowns: { type: 'buy'|'sell', currency, timestamp }
  const [presetAction, setPresetAction] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Handle hash scrolling and preset currency links
  useEffect(() => {
    if (hash) {
      setTimeout(() => {
        const id = hash.replace('#', '');
        const buyMatch = id.match(/^buy-([A-Z]{3})$/);
        const sellMatch = id.match(/^sell-([A-Z]{3})$/);

        if (buyMatch) {
          handlePresetExchange('buy', buyMatch[1]);
          return;
        }
        if (sellMatch) {
          handlePresetExchange('sell', sellMatch[1]);
          return;
        }

        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [hash, loading, branches]);

  // Handle SEO URL routing (URL -> State)
  useEffect(() => {
    if (!loading && Object.keys(currencyInfoMap).length > 0) {
      for (const [code, info] of Object.entries(currencyInfoMap)) {
        if (info.buy_url && pathname === info.buy_url) {
          if (getCurrency.code === code && giveCurrency.code === 'UAH') return;
          handlePresetExchange('buy', code);
          return;
        }
        if (info.sell_url && pathname === info.sell_url) {
          if (giveCurrency.code === code && getCurrency.code === 'UAH') return;
          handlePresetExchange('sell', code);
          return;
        }
      }
    }
  }, [pathname, loading, currencyInfoMap, giveCurrency, getCurrency]);

  // Handle State -> URL & Metadata Sync
  useEffect(() => {
    if (loading || !currencies.length) return;

    let targetCode = null;
    let mode = null;

    if (giveCurrency.code === 'UAH' && getCurrency.code !== 'UAH') {
      mode = 'buy';
      targetCode = getCurrency.code;
    } else if (giveCurrency.code !== 'UAH' && getCurrency.code === 'UAH') {
      mode = 'sell';
      targetCode = giveCurrency.code;
    }

    if (targetCode && mode && currencyInfoMap[targetCode]) {
      const info = currencyInfoMap[targetCode];

      if (info.seo_h1) {
        document.title = `${info.seo_h1} | Світ Валют`;
      }
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && info.seo_text) {
        const plainText = info.seo_text.replace(/<[^>]*>?/gm, '').substring(0, 160);
        metaDesc.setAttribute('content', plainText);
      }
      // 2. Update URL if needed
      const targetUrl = mode === 'buy' ? info.buy_url : info.sell_url;

      // Prevent automatic redirect from homepage to the default currency SEO URL (Sell USD)
      const isOnDedicatedPage = pathname.startsWith('/contacts') || pathname.startsWith('/faq') || pathname.startsWith('/services') || pathname.startsWith('/rates');
      if (isOnDedicatedPage) {
        // Don't redirect when on dedicated pages
      } else if (pathname === '/' && targetCode === 'USD' && mode === 'sell') {
        // Do nothing, let the URL stay at /
      } else if (targetUrl && pathname !== targetUrl) {
        navigate(targetUrl, { replace: true });
      }
    } else {
      document.title = 'Світ Валют | Обмін валют в Києві';
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', 'Обмін валют в Києві. Найкращі курси, безпечно та швидко.');
      }

      if (pathname !== '/' && !pathname.startsWith('/services') && !pathname.startsWith('/rates') && !pathname.startsWith('/contacts') && !pathname.startsWith('/faq')) {
        navigate('/', { replace: true });
      }
    }
  }, [giveCurrency, getCurrency, loading, currencyInfoMap, pathname, navigate, currencies]);

  useEffect(() => {
    calculateExchange();
  }, [giveAmount, giveCurrency, getCurrency, crossRates]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [currenciesRes, branchesRes, settingsRes, faqRes, servicesRes, crossRatesRes, ratesRes, currInfoRes] = await Promise.all([
        currencyService.getAll(),
        branchService.getAll(),
        settingsService.get(),
        faqService.getAll(),
        servicesService.getAll(),
        currencyService.getCrossRates(),
        currencyService.getRates(),
        currencyService.getAllCurrencyInfo().catch(() => ({ data: {} })),
      ]);

      setCurrencyInfoMap(currInfoRes.data || {});

      const allCurrs = currenciesRes.data;
      const currencyMeta = {};
      allCurrs.forEach(c => { currencyMeta[c.code] = c; });

      const baseRates = ratesRes.data?.rates || {};
      const baseCurrencies = Object.entries(baseRates).map(([code, rates]) => {
        const meta = currencyMeta[code] || {};
        return {
          code,
          name: meta.name || code,
          name_uk: meta.name_uk || code,
          flag: meta.flag || '🏳️',
          buy_rate: rates.buy,
          sell_rate: rates.sell,
          is_popular: meta.is_popular || false,
        };
      });

      const uah = { code: 'UAH', name_uk: 'Гривня', flag: '🇺🇦', buy_rate: 1, sell_rate: 1 };
      const finalCurrencies = baseCurrencies.length > 0 ? baseCurrencies : allCurrs;

      setCurrencies(finalCurrencies);

      const fullHeaderCurrencies = allCurrs.map(c => {
        const rates = baseRates[c.code] || {};
        return {
          ...c,
          buy_rate: rates.buy || 0,
          sell_rate: rates.sell || 0,
        };
      });
      setHeaderCurrencies(fullHeaderCurrencies);
      setBranches(branchesRes.data);
      setSettings(settingsRes.data);
      setFaqItems(faqRes.data);
      setServices(servicesRes.data);
      setCrossRates(crossRatesRes.data.cross_rates || {});

      if (ratesRes.data?.updated_at) {
        setRatesUpdated(ratesRes.data.updated_at);
      }

      if (finalCurrencies.length > 0) {
        const defaultCurrency = finalCurrencies.find(c => c.code === 'USD') || finalCurrencies[0];
        setGiveCurrency(defaultCurrency);
        setGetCurrency(uah);
        setSellCurrency(defaultCurrency);
        setBuyCurrency(defaultCurrency);
      }

      if (branchesRes.data.length > 0) {
        const branchMap = {};
        const currencyMap = new Map();
        try {
          const branchRatePromises = branchesRes.data.map(b =>
            currencyService.getBranchRates(b.id).then(res => ({ branchId: b.id, currencies: res.data }))
          );
          const allBranchRates = await Promise.all(branchRatePromises);
          allBranchRates.forEach(({ branchId, currencies: branchCurrs }) => {
            branchMap[branchId] = branchCurrs;
            branchCurrs.forEach(c => {
              if (!currencyMap.has(c.code)) {
                currencyMap.set(c.code, c);
              }
            });
          });
        } catch (err) {
          console.error('Failed to load branch currencies:', err);
        }
        setBranchCurrencyMap(branchMap);

        const allBranchCurrencies = Array.from(currencyMap.values());
        if (allBranchCurrencies.length > 0) {
          setCurrencies(allBranchCurrencies);
          const usdOrFirst = allBranchCurrencies.find(c => c.code === 'USD') || allBranchCurrencies[0];
          setGiveCurrency(usdOrFirst);
          setGetCurrency(uah);
          setSellCurrency(usdOrFirst);
          setBuyCurrency(usdOrFirst);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Fallback logic omitted for brevity, keeping same structure
    } finally {
      setLoading(false);
    }
  };

  const calculateExchange = () => {
    if (giveCurrency.code === 'UAH') {
      const rate = getCurrency.sell_rate || 42.15;
      setGetAmount(giveAmount / rate);
    } else if (getCurrency.code === 'UAH') {
      const rate = giveCurrency.buy_rate || 42.10;
      setGetAmount(giveAmount * rate);
    } else {
      const pair = `${giveCurrency.code}/${getCurrency.code}`;
      const crossRate = crossRates[pair];

      if (crossRate) {
        setGetAmount(giveAmount * crossRate.buy);
      } else {
        const rate = (giveCurrency.buy_rate || 0) / (getCurrency.sell_rate || 1);
        setGetAmount(giveAmount * rate);
      }
    }
  };

  const openCurrencyModal = (type) => {
    setCurrencyModalType(type);
    setCurrencyModalOpen(true);
  };

  const handleCurrencySelect = (currency) => {
    if (currencyModalType === 'sell_currency') {
      setSellCurrency(currency);
      if (giveCurrency.code !== 'UAH') {
        setGiveCurrency(currency);
      }
    } else if (currencyModalType === 'buy_currency') {
      setBuyCurrency(currency);
      if (getCurrency.code !== 'UAH') {
        setGetCurrency(currency);
      }
    } else {
      if (currencyModalType === 'give') setGiveCurrency(currency);
      else setGetCurrency(currency);
    }
    setCurrencyModalOpen(false);
  };

  const handleSwapCurrencies = () => {
    const temp = giveCurrency;
    setGiveCurrency(getCurrency);
    setGetCurrency(temp);
  };

  const handleBranchChange = async (branch) => {
    setActiveBranch(branch);
    try {
      const ratesRes = await currencyService.getBranchRates(branch.id);
      const allCurrs = ratesRes.data.filter(c => c.code !== 'UAH');
      setCurrencies(allCurrs);

      if (allCurrs.length > 0) {
        const uah = { code: 'UAH', name_uk: 'Гривня', flag: '🇺🇦', buy_rate: 1, sell_rate: 1 };
        const firstCurrency = allCurrs[0];
        setGiveCurrency(firstCurrency);
        setGetCurrency(uah);
        setSellCurrency(firstCurrency);
        setBuyCurrency(firstCurrency);
      }
    } catch (error) {
      console.error('Error fetching branch rates:', error);
    }
  };

  const handleReservation = async (data) => {
    try {
      const response = await reservationService.create(data);
      console.log('Reservation created:', response.data);
      setSuccessModalOpen(true);
      setGiveAmount(500);
    } catch (error) {
      console.error('Reservation error:', error);
      throw new Error(error.response?.data?.detail || 'Помилка створення бронювання');
    }
  };

  const handlePresetExchange = (type, currencyCode) => {
    const targetCurrency = currencies.find(c => c.code === currencyCode);
    if (!targetCurrency) return;

    const uah = currencies.find(c => c.code === 'UAH') || { code: 'UAH', name_uk: 'Гривня', flag: '🇺🇦', buy_rate: 1, sell_rate: 1 };

    if (type === 'buy') {
      setGiveCurrency(uah);
      setGetCurrency(targetCurrency);
      setBuyCurrency(targetCurrency);
    } else {
      setGiveCurrency(targetCurrency);
      setGetCurrency(uah);
      setSellCurrency(targetCurrency);
    }

    setPresetAction({ type, currency: targetCurrency, timestamp: Date.now() });

    // Check if current path is already the correct SEO URL for this currency/mode
    // If so, do NOT navigate to /
    let isCorrectUrl = false;
    const info = currencyInfoMap[targetCurrency.code];
    if (info) {
      if (type === 'buy' && pathname === info.buy_url) isCorrectUrl = true;
      if (type === 'sell' && pathname === info.sell_url) isCorrectUrl = true;
    }

    // Ensure we are on home page (or the correct SEO page)
    if (pathname !== '/' && !isCorrectUrl) {
      navigate('/');
    }

    // Scroll to calculator is handled by HeroSection via presetAction
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Context to pass to children (HomePage, RatesPage, etc.)
  const contextValue = {
    currencies,
    branches,
    settings,
    faqItems,
    services,
    crossRates,
    branchCurrencyMap,
    currencyInfoMap,
    ratesUpdated,
    giveAmount, setGiveAmount,
    giveCurrency, setGiveCurrency,
    getCurrency, setGetCurrency,
    getAmount,
    openCurrencyModal,
    handleSwapCurrencies,
    handleReservation,
    activeBranch,
    handleBranchChange,
    sellCurrency, setSellCurrency,
    buyCurrency, setBuyCurrency,
    presetAction,
    onOpenChat: () => {
      const now = new Date();
      const kyivTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
      const totalMinutes = kyivTime.getHours() * 60 + kyivTime.getMinutes();
      const isOnline = totalMinutes >= 450 && totalMinutes <= 1230;
      if (isOnline) {
        setChatOpen(true);
      } else {
        alert('Напишіть в робочий час! \nЧат працює щодня з 7:30 до 20:30');
      }
    }
  };

  return (
    <div className="min-h-screen bg-primary">
      <Header
        onMenuToggle={() => setMobileMenuOpen(true)}
        onOpenChat={() => {
          const now = new Date();
          const kyivTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
          const totalMinutes = kyivTime.getHours() * 60 + kyivTime.getMinutes();
          const isOnline = totalMinutes >= 450 && totalMinutes <= 1230;
          if (isOnline) {
            setChatOpen(true);
          } else {
            alert('Напишіть в робочий час! \nЧат працює щодня з 7:30 до 20:30');
          }
        }}
        settings={settings}
        currencies={headerCurrencies}
        currencyInfoMap={currencyInfoMap}
        services={services}
        branches={branches}
        onPresetExchange={handlePresetExchange}
      />
      <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} settings={settings} />

      <main>
        <Outlet context={contextValue} />
      </main>

      <Footer settings={settings} />

      <CurrencyModal
        isOpen={currencyModalOpen}
        onClose={() => setCurrencyModalOpen(false)}
        currencies={currencies}
        onSelect={handleCurrencySelect}
        type={currencyModalType}
      />

      <SuccessModal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
      />

      <LiveChat
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />

      {!chatOpen && (() => {
        const now = new Date();
        const kyivTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
        const totalMinutes = kyivTime.getHours() * 60 + kyivTime.getMinutes();
        const fabOnline = totalMinutes >= 450 && totalMinutes <= 1230;
        return (
          <button
            onClick={() => {
              if (fabOnline) {
                setChatOpen(true);
              } else {
                alert('Напишіть в робочий час! \nЧат працює щодня з 7:30 до 20:30');
              }
            }}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-accent-yellow rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          >
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {/* Status dot */}
            <span className={`absolute top-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-primary ${fabOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
          </button>
        );
      })()}
    </div>
  );
}

function HomePage() {
  const {
    giveAmount, setGiveAmount,
    giveCurrency, setGiveCurrency,
    getCurrency, setGetCurrency,
    getAmount,
    openCurrencyModal,
    handleSwapCurrencies,
    handleReservation,
    branches,
    settings,
    activeBranch,
    handleBranchChange,
    sellCurrency,
    buyCurrency,
    presetAction,
    branchCurrencyMap,
    currencyInfoMap,
    onOpenChat,
    currencies,
    crossRates,
    ratesUpdated,
    services,
    faqItems
  } = useOutletContext();

  return (
    <>
      <HeroSection
        giveAmount={giveAmount}
        setGiveAmount={setGiveAmount}
        giveCurrency={giveCurrency}
        setGiveCurrency={setGiveCurrency}
        getCurrency={getCurrency}
        setGetCurrency={setGetCurrency}
        getAmount={getAmount}
        onOpenCurrencyModal={openCurrencyModal}
        onSwapCurrencies={handleSwapCurrencies}
        onReserve={handleReservation}
        branches={branches}
        settings={settings}
        activeBranch={activeBranch}
        onBranchChange={handleBranchChange}
        sellCurrency={sellCurrency}
        buyCurrency={buyCurrency}
        presetAction={presetAction}
        branchCurrencyMap={branchCurrencyMap}
        currencyInfoMap={currencyInfoMap}
        onOpenChat={onOpenChat}
      />
      <FeaturesSection settings={settings} />
      <ChatSection settings={settings} />
      <BranchesSection branches={branches} settings={settings} />
      <RatesSection currencies={currencies} crossRates={crossRates} updatedAt={ratesUpdated} />
      <ServicesSection services={services} />
      <FAQSection faqItems={faqItems} />
    </>
  );
}

function ProtectedRoute({ children, user, requiredRole }) {
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/panel" replace />;
  return children;
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (restoreAuth()) {
      try {
        const res = await authService.me();
        setUser(res.data);
      } catch (error) {
        clearAuthCredentials();
      }
    }
    setAuthLoading(false);
  };

  const handleLogin = async (username, password) => {
    const res = await authService.login(username, password);
    setUser(res.data.user);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="rates" element={<RatesPage />} />
          <Route path="services" element={<AllServicesPage />} />
          <Route path="services/:slug" element={<ServicePage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="faq" element={<FAQPage />} />
          <Route path="*" element={<HomePage />} />
        </Route>

        <Route path="/login" element={user ? <Navigate to="/panel" replace /> : <LoginPage onLogin={handleLogin} />} />
        <Route path="/panel" element={
          user ? (user.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/operator" replace />) : <Navigate to="/login" replace />
        } />
        <Route path="/admin" element={
          <ProtectedRoute user={user} requiredRole="admin">
            <AdminDashboard user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        } />
        <Route path="/operator" element={
          <ProtectedRoute user={user}>
            <OperatorDashboard user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
