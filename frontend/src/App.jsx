import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import AllServicesPage from './pages/AllServicesPage';
import {
  currencyService, branchService, settingsService, faqService, servicesService,
  reservationService, authService, restoreAuth, clearAuthCredentials
} from './services/api';

// Main public website
function PublicSite() {
  const { hash } = useLocation();
  const [currencies, setCurrencies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [settings, setSettings] = useState(null);
  const [faqItems, setFaqItems] = useState([]);
  const [services, setServices] = useState([]);
  const [crossRates, setCrossRates] = useState({});
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

  // Handle hash scrolling and preset currency links (e.g. /#buy-USD, /#sell-EUR)
  useEffect(() => {
    if (hash) {
      setTimeout(() => {
        const id = hash.replace('#', '');

        // Check for buy/sell preset links
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

        // Standard section scrolling
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [hash, loading, branches]);

  useEffect(() => {
    calculateExchange();
  }, [giveAmount, giveCurrency, getCurrency, crossRates]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [currenciesRes, branchesRes, settingsRes, faqRes, servicesRes, crossRatesRes] = await Promise.all([
        currencyService.getAll(),
        branchService.getAll(),
        settingsService.get(),
        faqService.getAll(),
        servicesService.getAll(),
        currencyService.getCrossRates(),
      ]);

      const allCurrs = currenciesRes.data;
      const uah = { code: 'UAH', name_uk: 'Гривня', flag: '🇺🇦', buy_rate: 1, sell_rate: 1 };
      const finalCurrencies = allCurrs.some(c => c.code === 'UAH') ? allCurrs : [uah, ...allCurrs];

      setCurrencies(finalCurrencies);
      setBranches(branchesRes.data);
      setSettings(settingsRes.data);
      setFaqItems(faqRes.data);
      setServices(servicesRes.data);
      setCrossRates(crossRatesRes.data.cross_rates || {});

      if (finalCurrencies.length > 0) {
        const defaultCurrency = finalCurrencies.find(c => c.code === 'USD') || finalCurrencies[0];
        setGiveCurrency(defaultCurrency);
        setGetCurrency(finalCurrencies.find(c => c.code === 'UAH') || finalCurrencies[1]);

        // Initialize independent states
        setSellCurrency(defaultCurrency);
        setBuyCurrency(defaultCurrency);
      }
      if (branchesRes.data.length > 0) {
        // Don't auto-select a branch — show "Будь-яке відділення" by default
        // Load rates from branch 1 as the global default rates
        try {
          const branchRatesRes = await currencyService.getBranchRates(branchesRes.data[0].id);
          const branchCurrencies = branchRatesRes.data.filter(c => c.code !== 'UAH');
          if (branchCurrencies && branchCurrencies.length > 0) {
            setCurrencies(branchCurrencies);
            const uah = { code: 'UAH', name_uk: 'Гривня', flag: '🇺🇦', buy_rate: 1, sell_rate: 1 };
            const newDefault = branchCurrencies[0];
            setGiveCurrency(newDefault);
            setGetCurrency(uah);
            setSellCurrency(newDefault);
            setBuyCurrency(newDefault);
          }
        } catch (err) {
          console.error('Failed to load branch currencies:', err);
        }
      }

      // Get rates update time
      const ratesRes = await currencyService.getRates();
      if (ratesRes.data && ratesRes.data.updated_at) {
        setRatesUpdated(ratesRes.data.updated_at);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setCurrencies([
        { code: 'USD', name_uk: 'Долар', flag: '🇺🇸', buy_rate: 42.10, sell_rate: 42.15, is_popular: true },
        { code: 'EUR', name_uk: 'Євро', flag: '🇪🇺', buy_rate: 49.30, sell_rate: 49.35, is_popular: true },
        { code: 'PLN', name_uk: 'Злотий', flag: '🇵🇱', buy_rate: 11.50, sell_rate: 11.65 },
        { code: 'GBP', name_uk: 'Фунт', flag: '🇬🇧', buy_rate: 56.10, sell_rate: 56.25, is_popular: true },
        { code: 'CHF', name_uk: 'Франк', flag: '🇨🇭', buy_rate: 52.80, sell_rate: 52.95 },
      ]);
      setBranches([
        { id: 1, address: 'вул. Старовокзальна, 23', hours: 'щодня: 9:00-19:00', phone: '(096) 048-88-84', lat: 50.443886, lng: 30.490430 },
        { id: 2, address: 'вул. В. Васильківська, 110', hours: 'щодня: 8:00-20:00', phone: '(096) 048-88-84', lat: 50.423804, lng: 30.518400 },
        { id: 3, address: 'вул. В. Васильківська, 130', hours: 'щодня: 8:00-20:00', phone: '(096) 048-88-84', lat: 50.416770, lng: 30.522873 },
        { id: 4, address: 'вул. Р. Окіпної, 2', hours: 'щодня: 8:00-20:00', phone: '(096) 048-88-84', lat: 50.450606, lng: 30.597410 },
        { id: 5, address: 'вул. Саксаганського, 69', hours: 'щодня: 9:00-20:00', phone: '(096) 048-88-84', lat: 50.4358, lng: 30.50 },
      ]);
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
      // Cross rate
      const pair = `${giveCurrency.code}/${getCurrency.code}`;
      const crossRate = crossRates[pair];

      if (crossRate) {
        setGetAmount(giveAmount * crossRate.buy);
      } else {
        // Fallback dynamic calculation if pair not in common list
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
    // Determine which "Row" triggered this.
    if (currencyModalType === 'sell_currency') {
      setSellCurrency(currency);
      // If we are currently in Sell Mode (give=Foreign), update giveCurrency immediately
      if (giveCurrency.code !== 'UAH') {
        setGiveCurrency(currency);
      }
    } else if (currencyModalType === 'buy_currency') {
      setBuyCurrency(currency);
      // If we are currently in Buy Mode (get=Foreign), update getCurrency immediately
      if (getCurrency.code !== 'UAH') {
        setGetCurrency(currency);
      }
    } else {
      // Fallback for logical handling if used elsewhere
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

      // Always switch to first currency when branch changes
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
      // Reset amount after successful reservation
      setGiveAmount(500);
    } catch (error) {
      console.error('Reservation error:', error);
      throw new Error(error.response?.data?.detail || 'Помилка створення бронювання');
    }
  };

  const handlePresetExchange = (type, currencyCode) => {
    const targetCurrency = currencies.find(c => c.code === currencyCode);
    if (!targetCurrency) return;

    // Find UAH
    const uah = currencies.find(c => c.code === 'UAH') || { code: 'UAH', name_uk: 'Гривня', flag: '🇺🇦', buy_rate: 1, sell_rate: 1 };

    if (type === 'buy') {
      // User Buys Foreign (Give UAH -> Get Foreign)
      setGiveCurrency(uah);
      setGetCurrency(targetCurrency);
      setBuyCurrency(targetCurrency);
    } else {
      // User Sells Foreign (Give Foreign -> Get UAH)
      setGiveCurrency(targetCurrency);
      setGetCurrency(uah);
      setSellCurrency(targetCurrency);
    }

    // Signal HeroSection to fill default amount in the correct input
    setPresetAction({ type, currency: targetCurrency, timestamp: Date.now() });

    // Scroll to calculator
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-primary">
      <Header
        onMenuToggle={() => setMobileMenuOpen(true)}
        onOpenChat={() => setChatOpen(true)}
        settings={settings}
        currencies={currencies}
        services={services}
        onPresetExchange={handlePresetExchange}
      />
      <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} settings={settings} />

      <main>
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
          onOpenChat={() => setChatOpen(true)}
          sellCurrency={sellCurrency}
          buyCurrency={buyCurrency}
          presetAction={presetAction}
        />
        <FeaturesSection settings={settings} />
        <ChatSection settings={settings} />
        <BranchesSection branches={branches} settings={settings} />
        <RatesSection currencies={currencies} crossRates={crossRates} updatedAt={ratesUpdated} />
        <ServicesSection services={services} />
        <FAQSection faqItems={faqItems} />
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

      {/* Chat FAB when chat is closed */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-accent-yellow rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        >
          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}
    </div>
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
        <Route path="/" element={<PublicSite />} />
        <Route path="/rates" element={<RatesPage />} />
        <Route path="/services" element={<AllServicesPage />} />
        <Route path="/services/:slug" element={<ServicePage />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
