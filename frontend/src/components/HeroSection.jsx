import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, RefreshCw, Loader2, X, MapPin, User, Phone, Check, ArrowRight, Clock } from 'lucide-react';

export default function HeroSection({
  giveAmount,
  setGiveAmount,
  giveCurrency,
  setGiveCurrency,
  getCurrency,
  setGetCurrency,
  getAmount,
  onOpenCurrencyModal,
  onSwapCurrencies,
  onReserve,
  branches = [],
  settings,
  activeBranch,
  onBranchChange,
  sellCurrency,
  buyCurrency,
  presetAction,
  branchCurrencyMap = {},
  currencyInfoMap = {},
  onOpenChat,
}) {
  const location = useLocation();
  const [bookingStep, setBookingStep] = useState(null); // null, 'branch', 'name', 'phone'
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [sellInputValue, setSellInputValue] = useState('');
  const [buyInputValue, setBuyInputValue] = useState('');

  const minAmount = settings?.min_wholesale_amount || 1000;
  const reservationTime = settings?.reservation_time_minutes || 60;
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  // React to header dropdown preset selections
  useEffect(() => {
    if (!presetAction) return;
    const defaultAmount = '100';
    if (presetAction.type === 'sell') {
      // User wants to SELL foreign currency
      setSellInputValue(defaultAmount);
      setBuyInputValue('');
      setGiveAmount(Number(defaultAmount));
    } else if (presetAction.type === 'buy') {
      // User wants to BUY foreign currency
      setBuyInputValue(defaultAmount);
      setSellInputValue('');
      const rate = (presetAction.currency?.sell_rate && presetAction.currency.sell_rate > 0)
        ? presetAction.currency.sell_rate : 42.15;
      setGiveAmount(Number(defaultAmount) * rate);
    }
  }, [presetAction]);

  // Determine Active Mode "Officially" from Global State
  const isSellMode = giveCurrency && giveCurrency.code !== 'UAH';

  const formatPhone = (value) => {
    let digits = value.replace(/\D/g, '');
    if (digits.length > 0 && !digits.startsWith('38')) {
      digits = '38' + digits;
    }
    if (digits.length > 12) digits = digits.slice(0, 12);

    let formatted = '+' + digits;
    if (digits.length > 2) formatted = '+' + digits.slice(0, 2) + ' (' + digits.slice(2);
    if (digits.length > 5) formatted = '+' + digits.slice(0, 2) + ' (' + digits.slice(2, 5) + ') ' + digits.slice(5);
    if (digits.length > 8) formatted = '+' + digits.slice(0, 2) + ' (' + digits.slice(2, 5) + ') ' + digits.slice(5, 8) + '-' + digits.slice(8);
    if (digits.length > 10) formatted = '+' + digits.slice(0, 2) + ' (' + digits.slice(2, 5) + ') ' + digits.slice(5, 8) + '-' + digits.slice(8, 10) + '-' + digits.slice(10);

    return formatted;
  };

  // Filter branches that support the selected currency, sorted by best rate
  const getAvailableBranches = () => {
    const selectedCode = isSellMode ? sellCurrency?.code : buyCurrency?.code;
    if (!selectedCode || Object.keys(branchCurrencyMap).length === 0) {
      return { available: branches, unavailable: [] };
    }

    const available = [];
    const unavailable = [];

    branches.forEach(b => {
      const currs = branchCurrencyMap[b.id];
      if (!currs || currs.length === 0) {
        unavailable.push(b);
        return;
      }
      const hasCurrency = currs.some(c => c.code === selectedCode);
      if (hasCurrency) {
        available.push(b);
      } else {
        unavailable.push(b);
      }
    });

    // Sort available by best rate for the user
    available.sort((a, b) => {
      const aCurrs = branchCurrencyMap[a.id] || [];
      const bCurrs = branchCurrencyMap[b.id] || [];
      const aRate = aCurrs.find(c => c.code === selectedCode);
      const bRate = bCurrs.find(c => c.code === selectedCode);
      if (!aRate || !bRate) return 0;

      if (isSellMode) {
        return (bRate.buy_rate || 0) - (aRate.buy_rate || 0);
      } else {
        return (aRate.sell_rate || 0) - (bRate.sell_rate || 0);
      }
    });

    return { available, unavailable };
  };

  // Get rate for a specific currency at a specific branch
  const getBranchRate = (branchId) => {
    const selectedCode = isSellMode ? sellCurrency?.code : buyCurrency?.code;
    const currs = branchCurrencyMap[branchId];
    if (!currs || !selectedCode) return null;
    return currs.find(c => c.code === selectedCode);
  };

  const handleStartBooking = () => {
    let currentAmount = giveAmount;

    // Detect Mode from Inputs (Reliability Fix)
    const sellVal = Number(sellInputValue.replace(/[^\d.]/g, '')) || 0;
    const buyVal = Number(buyInputValue.replace(/[^\d.]/g, '')) || 0;

    // Priority to non-zero input if currentAmount is 0
    if (currentAmount <= 0) {
      if (buyVal > 0) {
        const rate = (buyCurrency.sell_rate && buyCurrency.sell_rate > 0) ? buyCurrency.sell_rate : 42.15;
        currentAmount = buyVal * rate;
        setGiveAmount(currentAmount);
      } else if (sellVal > 0) {
        currentAmount = sellVal;
        setGiveAmount(currentAmount);
      }
    }

    if (currentAmount <= 0) {
      setError('Введіть суму');
      return;
    }
    setError('');
    // Skip Branch selection if we already have an Active Branch from the calculator
    if (activeBranch) {
      setSelectedBranch(activeBranch);
      setBookingStep('name');
    } else {
      setSelectedBranch(branches[0]);
      setBookingStep('branch');
    }
  };

  const handleSelectBranch = (branch) => {
    setSelectedBranch(branch);
    if (onBranchChange) {
      onBranchChange(branch);
    }
    setBookingStep('name');
  };

  const handleNameSubmit = () => {
    if (!customerName.trim()) {
      setError("Введіть ваше ім'я");
      return;
    }
    setError('');
    setBookingStep('phone');
  };

  const handlePhoneSubmit = async () => {
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 12) {
      setError('Введіть коректний номер телефону');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onReserve({
        give_amount: giveAmount,
        give_currency: giveCurrency.code,
        get_currency: getCurrency.code,
        phone: '+' + phoneDigits,
        customer_name: customerName.trim(),
        branch_id: selectedBranch.id,
      });
      // Reset form
      setPhone('');
      setCustomerName('');
      setSelectedBranch(null);
      setBookingStep(null);
    } catch (err) {
      setError(err.message || 'Помилка бронювання');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setBookingStep(null);
    setError('');
  };

  // Helper to calculate effective rate based on amount and threshold
  const getEffectiveRate = (currency, amount, type) => {
    if (!currency) return 0;
    const threshold = currency.wholesale_threshold || minAmount || 1000;
    const isWholesale = amount >= threshold;

    if (type === 'buy') { // We BUY from user (User SELLS)
      // If wholesale setup exists and amount > threshold
      if (isWholesale && currency.wholesale_buy_rate > 0) {
        return currency.wholesale_buy_rate;
      }
      return currency.buy_rate || 0;
    } else { // We SELL to user (User BUYS)
      if (isWholesale && currency.wholesale_sell_rate > 0) {
        return currency.wholesale_sell_rate;
      }
      return currency.sell_rate || 0;
    }
  };

  // Sync Global giveAmount with Local Inputs when Currency/Mode Changes
  useEffect(() => {
    if (isSellMode) {
      const num = Number(sellInputValue.replace?.(/[^\d.]/g, '') || sellInputValue) || 0;
      setGiveAmount(num);
    } else {
      const num = Number(buyInputValue.replace?.(/[^\d.]/g, '') || buyInputValue) || 0;
      const rate = getEffectiveRate(buyCurrency, num, 'sell');
      setGiveAmount(num * rate);
    }
  }, [sellCurrency, buyCurrency, isSellMode, sellInputValue, buyInputValue, setGiveAmount]);




  // Handlers
  const handleSellChange = (val) => {
    // Sanitize input to allow only digits (no dots)
    const sanitized = val.replace(/[^\d]/g, '');

    setSellInputValue(sanitized);
    setBuyInputValue(''); // Enforce Exclusive Input
    const numVal = Number(sanitized) || 0;

    // Switch to Sell Mode if active
    if (!isSellMode || giveCurrency?.code !== sellCurrency?.code) {
      setGiveCurrency(sellCurrency);
      setGetCurrency({ code: 'UAH', name_uk: 'Гривня', flag: '🇺🇦', buy_rate: 1, sell_rate: 1 });
    }

    // Sell Mode: numVal IS the foreign amount we GIVE.
    // App.jsx will calculate getAmount (UAH).
    setGiveAmount(numVal);
  };


  console.log('Render GiveAmount:', giveAmount);
  const handleBuyChange = (val) => {
    // Sanitize input to allow only digits (no dots)
    const sanitized = val.replace(/[^\d]/g, '');

    setBuyInputValue(sanitized);
    setSellInputValue(''); // Enforce Exclusive Input
    const numVal = Number(sanitized) || 0;

    // Switch to Buy Mode if active
    if (isSellMode || getCurrency?.code !== buyCurrency?.code) {
      setGetCurrency(buyCurrency);
      setGiveCurrency({ code: 'UAH', name_uk: 'Гривня', flag: '🇺🇦', buy_rate: 1, sell_rate: 1 });
    }

    // Calculate Amount in UAH (GiveAmount)
    // User wants to BUY numVal (Foreign).
    // so we SELL to user.
    const rate = getEffectiveRate(buyCurrency, numVal, 'sell');
    setGiveAmount(numVal * rate);
  };

  // Display Rates
  // Should reflect current amount if typed?
  // Or just base rates?
  // Usually base rates, but if wholesale applies, maybe show wholesale?
  // For now let's keep it simple: Show EFFECTIVE rates based on current input.

  const currentSellInput = Number(sellInputValue.replace(/[^\d.]/g, '')) || 0;
  const currentBuyInput = Number(buyInputValue.replace(/[^\d.]/g, '')) || 0;

  const activeCurrency = isSellMode ? (sellCurrency || giveCurrency) : (buyCurrency || getCurrency);

  // Auto-select Branch logic removed - handled in App.jsx


  // Dynamic Rates for display
  const displayBuyRate = getEffectiveRate(activeCurrency, isSellMode ? currentSellInput : 0, 'buy');
  const displaySellRate = getEffectiveRate(activeCurrency, !isSellMode ? currentBuyInput : 0, 'sell');

  // Chat availability helper — only available 7:30–20:30 Kyiv time
  const isChatAvailable = () => {
    const now = new Date();
    // Get Kyiv time (UTC+2 / UTC+3 depending on DST)
    const kyivTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
    const hours = kyivTime.getHours();
    const minutes = kyivTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    return totalMinutes >= 450 && totalMinutes <= 1230; // 7:30 = 450, 20:30 = 1230
  };

  const chatOnline = isChatAvailable();

  // Get current currency info based on selected currency
  const currentCurrencyCode = isSellMode ? sellCurrency?.code : buyCurrency?.code;
  const currencyInfo = currencyInfoMap[currentCurrencyCode] || null;
  // Only show SEO content if we are NOT on the homepage (root path)
  // AND we have actual SEO info to show
  const hasCurrencyInfo = location.pathname !== '/' && currencyInfo && (
    (currencyInfo.seo_h1 || currencyInfo.seo_h2 || currencyInfo.seo_text) ||
    (isSellMode && (currencyInfo.seo_sell_h1 || currencyInfo.seo_sell_h2 || currencyInfo.seo_sell_text)) ||
    (!isSellMode && (currencyInfo.seo_buy_h1 || currencyInfo.seo_buy_h2 || currencyInfo.seo_buy_text))
  );

  return (
    <section className="pt-20 lg:pt-24">
      {/* Desktop Layout */}
      <div className="hidden lg:block relative overflow-hidden">
        {/* Background image on right half - Removed to show global pattern */}
        {/* Gradient overlay: reduced for pattern visibility */}
        {/* Gradient overlay removed for transparency */}
        {/* <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-transparent"></div> */}
        <div className="relative z-10 max-w-7xl mx-auto px-8 py-16">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content — Dynamic Currency Info or Default */}
            <div className="flex flex-col gap-8 min-h-[400px]">
              {hasCurrencyInfo ? (
                <>
                  {/* Dynamic SEO H1 */}
                  <h1 className="text-5xl xl:text-7xl font-bold leading-tight">
                    <span className="text-accent-yellow">
                      {(isSellMode ? currencyInfo.seo_sell_h1 : currencyInfo.seo_buy_h1) || currencyInfo.seo_h1}
                    </span>
                    {((isSellMode ? currencyInfo.seo_sell_h2 : currencyInfo.seo_buy_h2) || currencyInfo.seo_h2) && (
                      <>
                        <br />
                        <span className="text-white font-light text-4xl xl:text-6xl">
                          {(isSellMode ? currencyInfo.seo_sell_h2 : currencyInfo.seo_buy_h2) || currencyInfo.seo_h2}
                        </span>
                      </>
                    )}
                  </h1>

                  {/* SEO Image */}
                  {((isSellMode ? currencyInfo.seo_sell_image : currencyInfo.seo_buy_image) || currencyInfo.seo_image) && (
                    <div className="rounded-2xl overflow-hidden border border-white/10 max-w-md">
                      <img
                        src={(isSellMode ? currencyInfo.seo_sell_image : currencyInfo.seo_buy_image) || currencyInfo.seo_image}
                        alt={(isSellMode ? currencyInfo.seo_sell_h1 : currencyInfo.seo_buy_h1) || currencyInfo.seo_h1}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}

                  {/* SEO Text */}
                  {((isSellMode ? currencyInfo.seo_sell_text : currencyInfo.seo_buy_text) || currencyInfo.seo_text) && (
                    <div className="text-gray-400 text-base leading-relaxed max-w-lg whitespace-pre-line">
                      {(isSellMode ? currencyInfo.seo_sell_text : currencyInfo.seo_buy_text) || currencyInfo.seo_text}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Default Title */}
                  <h1 className="text-5xl xl:text-7xl font-bold leading-tight">
                    <span className="text-accent-yellow">Обмін валют</span>
                    <br />
                    <span className="text-white font-light text-4xl xl:text-6xl">без ризиків та переплат</span>
                  </h1>

                  {/* Banner / Badge */}
                  <div className="flex items-center gap-4 bg-white/5 rounded-full pl-2 pr-8 py-2 w-fit backdrop-blur-md border border-white/10">
                    <div className="w-10 h-10 rounded-full border border-accent-blue text-accent-blue flex items-center justify-center bg-accent-blue/10">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                    <span className="text-lg text-gray-300 font-light tracking-wide">Швидко. Безпечно. За вигідним курсом.</span>
                  </div>
                </>
              )}

              {/* Contact Block — only on default homepage */}
              {!hasCurrencyInfo && (
                <div className="mt-8">
                  <p className="text-gray-400 mb-2 text-xl font-light">
                    Маєте питання?
                  </p>
                  <p className="text-gray-300 mb-8 text-xl font-light">
                    Напишіть нам — відповімо за кілька хвилин.
                  </p>

                  <p className="text-gray-500 mb-4 text-sm uppercase tracking-wider font-semibold">Напишіть нам:</p>
                  <div className="flex items-center gap-6">
                    {/* Avatar & Status */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img
                          src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces"
                          alt="Irina"
                          className="w-14 h-14 rounded-full object-cover border-2 border-white/10"
                        />
                        <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-primary ${chatOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                      </div>
                      <div>
                        <div className="font-bold text-white text-lg">Ірина</div>
                        <div className={`text-sm font-medium ${chatOnline ? 'text-green-400' : 'text-red-400'}`}>
                          {chatOnline ? 'в мережі' : 'не в мережі'}
                        </div>
                      </div>
                    </div>

                    {/* Chat Button */}
                    <button
                      onClick={onOpenChat}
                      className="px-10 py-4 bg-accent-yellow rounded-full text-primary font-bold text-lg hover:bg-yellow-400 hover:shadow-lg hover:shadow-yellow-500/20 transition-all transform hover:-translate-y-0.5"
                    >
                      Відкрити чат
                    </button>
                  </div>
                  {!chatOnline && (
                    <p className="text-xs text-gray-500 mt-2">Чат працює щодня з 7:30 до 20:30</p>
                  )}
                </div>
              )}
            </div>

            {/* Right - Exchange Card */}
            <div
              className="flex justify-end p-12 rounded-3xl"
              style={{
                backgroundImage: "url('/hero-bg.jpg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
              }}
            >
              <ExchangeCard
                giveAmount={giveAmount}
                setGiveAmount={setGiveAmount}
                giveCurrency={giveCurrency}
                setGiveCurrency={setGiveCurrency}
                getCurrency={getCurrency}
                setGetCurrency={setGetCurrency}
                getAmount={getAmount}
                onOpenCurrencyModal={onOpenCurrencyModal}
                onSwapCurrencies={onSwapCurrencies}
                onReserve={handleStartBooking}
                error={error}
                settings={settings}
                branches={branches}
                activeBranch={activeBranch}
                onBranchChange={onBranchChange}
                sellCurrency={sellCurrency}
                buyCurrency={buyCurrency}
                sellInputValue={sellInputValue}
                setSellInputValue={setSellInputValue}
                buyInputValue={buyInputValue}
                setBuyInputValue={setBuyInputValue}
                minAmount={minAmount}
                reservationTime={reservationTime}
                branchDropdownOpen={branchDropdownOpen}
                setBranchDropdownOpen={setBranchDropdownOpen}
                focusedInput={focusedInput}
                setFocusedInput={setFocusedInput}
                isSellMode={isSellMode}
                handleSellChange={handleSellChange}
                handleBuyChange={handleBuyChange}
                buyRate={displayBuyRate}
                sellRate={displaySellRate}
                getEffectiveRate={getEffectiveRate}
                currencyInfoMap={currencyInfoMap}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden relative overflow-hidden">
        {/* Background images removed for transparency */}
        {/* <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/mobile-pattern.png')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-primary/90 via-primary/80 to-primary/90"></div> */}
        <div className="relative z-10 py-10 flex flex-col gap-8 px-[10px]">
          <div
            className="p-0 rounded-3xl overflow-hidden"
            style={{
              backgroundImage: "url('/hero-bg.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.5)'
            }}
          >
            <ExchangeCard
              giveAmount={giveAmount}
              setGiveAmount={setGiveAmount}
              giveCurrency={giveCurrency}
              setGiveCurrency={setGiveCurrency}
              getCurrency={getCurrency}
              setGetCurrency={setGetCurrency}
              getAmount={getAmount}
              onOpenCurrencyModal={onOpenCurrencyModal}
              onSwapCurrencies={onSwapCurrencies}
              onReserve={handleStartBooking}
              error={error}
              settings={settings}
              isMobile
              branches={branches}
              activeBranch={activeBranch}
              onBranchChange={onBranchChange}
              sellCurrency={sellCurrency}
              buyCurrency={buyCurrency}
              sellInputValue={sellInputValue}
              setSellInputValue={setSellInputValue}
              buyInputValue={buyInputValue}
              setBuyInputValue={setBuyInputValue}
              minAmount={minAmount}
              reservationTime={reservationTime}
              branchDropdownOpen={branchDropdownOpen}
              setBranchDropdownOpen={setBranchDropdownOpen}
              focusedInput={focusedInput}
              setFocusedInput={setFocusedInput}
              isSellMode={isSellMode}
              handleSellChange={handleSellChange}
              handleBuyChange={handleBuyChange}
              buyRate={displayBuyRate}
              sellRate={displaySellRate}
              getEffectiveRate={getEffectiveRate}
              currencyInfoMap={currencyInfoMap}
            />
          </div>

          <div className="flex flex-col gap-4 text-center items-center">
            <h1 className="text-3xl font-bold leading-tight">
              <span className="text-accent-yellow text-4xl">Обмін валют</span>
              <br />
              <span className="text-white font-light text-2xl">без ризиків та переплат</span>
            </h1>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full pl-1 pr-4 py-1 w-fit backdrop-blur-md">
              <div className="w-8 h-8 bg-accent-blue/20 rounded-full flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-accent-blue transform -rotate-45" />
              </div>
              <span className="text-xs font-medium text-white/90">Швидко. Безпечно. Вигідно.</span>
            </div>
          </div>

          {/* Mobile Currency Info + Chat (below form) */}
          <div className="mt-6 px-2">
            {hasCurrencyInfo && (
              <div className="mb-6">
                <h2 className="text-3xl font-bold leading-tight">
                  <span className="text-accent-yellow">
                    {(isSellMode ? currencyInfo.seo_sell_h1 : currencyInfo.seo_buy_h1) || currencyInfo.seo_h1}
                  </span>
                  <br />
                  {((isSellMode ? currencyInfo.seo_sell_h2 : currencyInfo.seo_buy_h2) || currencyInfo.seo_h2) && (
                    <span className="text-white font-light text-2xl">
                      {(isSellMode ? currencyInfo.seo_sell_h2 : currencyInfo.seo_buy_h2) || currencyInfo.seo_h2}
                    </span>
                  )}
                </h2>
                {((isSellMode ? currencyInfo.seo_sell_text : currencyInfo.seo_buy_text) || currencyInfo.seo_text) && (
                  <p className="text-gray-400 text-sm mt-3 whitespace-pre-line">
                    {(isSellMode ? currencyInfo.seo_sell_text : currencyInfo.seo_buy_text) || currencyInfo.seo_text}
                  </p>
                )}
                {((isSellMode ? currencyInfo.seo_sell_image : currencyInfo.seo_buy_image) || currencyInfo.seo_image) && (
                  <div className="rounded-xl overflow-hidden border border-white/10 mt-4">
                    <img
                      src={(isSellMode ? currencyInfo.seo_sell_image : currencyInfo.seo_buy_image) || currencyInfo.seo_image}
                      alt={(isSellMode ? currencyInfo.seo_sell_h1 : currencyInfo.seo_buy_h1) || currencyInfo.seo_h1}
                      className="w-full h-40 object-cover"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Questions / Chat Section (mobile) */}
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">
                Маєте питання?
              </p>
              <p className="text-gray-500 text-sm mb-1">— Наявність на відділеннях</p>
              <p className="text-gray-500 text-sm mb-1">— Оптовий курс</p>
              <p className="text-gray-500 text-sm mb-3">— інше.</p>

              <p className="text-gray-500 text-sm mb-3">Напишіть нам:</p>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces"
                      alt="Irina"
                      className="w-10 h-10 rounded-full object-cover border-2 border-white/10"
                    />
                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-primary ${chatOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm">Ірина</div>
                    <div className={`text-xs ${chatOnline ? 'text-green-400' : 'text-red-400'}`}>
                      {chatOnline ? 'в мережі' : 'не в мережі'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={onOpenChat}
                  className="px-6 py-2.5 bg-gradient-to-r from-accent-yellow to-yellow-600 rounded-full text-primary font-bold text-sm hover:shadow-lg transition-all"
                >
                  Відкрити чат
                </button>
              </div>
              {!chatOnline && (
                <p className="text-xs text-gray-500 mt-2">Чат працює щодня з 7:30 до 20:30</p>
              )}
            </div>
          </div>


        </div>
      </div>

      {/* Step 1: Branch Selection Modal */}
      {bookingStep === 'branch' && (() => {
        const { available: availBranches, unavailable: unavailBranches } = getAvailableBranches();
        const selectedCode = isSellMode ? sellCurrency?.code : buyCurrency?.code;
        const selectedFlag = isSellMode ? sellCurrency?.flag : buyCurrency?.flag;
        return (
          <BookingModal onClose={closeModal} step={1} totalSteps={3}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-accent-blue/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-accent-blue" />
              </div>
              <h3 className="text-xl font-bold mb-2">Оберіть відділення</h3>
              <p className="text-text-secondary text-sm">Куди вам зручніше приїхати?</p>
            </div>

            {/* Info banner when currency not available at all branches */}
            {unavailBranches.length > 0 && availBranches.length > 0 && (
              <div className="mb-4 p-3 bg-accent-yellow/10 border border-accent-yellow/30 rounded-xl flex items-start gap-2">
                <span className="text-lg flex-shrink-0 mt-0.5">{selectedFlag}</span>
                <p className="text-sm text-accent-yellow">
                  <span className="font-bold">{selectedCode}</span> доступна у {availBranches.length} з {branches.length} відділень
                </p>
              </div>
            )}

            {availBranches.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {availBranches.map((branch, index) => {
                  const rate = getBranchRate(branch.id);
                  const isBest = index === 0;
                  return (
                    <button
                      key={branch.id}
                      onClick={() => handleSelectBranch(branch)}
                      className={`w-full p-4 rounded-2xl border transition-all text-left group ${isBest ? 'bg-accent-yellow/5 border-accent-yellow/40 shadow-lg shadow-accent-yellow/5' : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MapPin className={`w-4 h-4 ${isBest ? 'text-accent-yellow' : 'text-accent-blue'}`} />
                          <span className="font-bold text-white text-sm">{branch.name || branch.address}</span>
                        </div>
                        {isBest && (
                          <span className="text-[10px] bg-accent-yellow/20 text-accent-yellow px-2.5 py-1 rounded-full font-bold tracking-wide">
                            ★ Найкращий курс
                          </span>
                        )}
                      </div>
                      <div className="pl-6 space-y-1">
                        {branch.name && <p className="text-xs text-text-secondary">{branch.address}</p>}
                        <div className="flex items-center gap-1 text-xs text-text-secondary">
                          <Clock className="w-3 h-3" />
                          <span>{branch.hours || branch.working_hours}</span>
                        </div>
                        {rate && (
                          <div className="flex items-center gap-4 mt-1.5">
                            <div className="text-xs">
                              <span className="text-text-secondary">Купівля: </span>
                              <span className="text-white font-semibold">{rate.buy_rate?.toFixed(2)}</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-text-secondary">Продаж: </span>
                              <span className="text-white font-semibold">{rate.sell_rate?.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">{selectedFlag}</div>
                <p className="text-text-secondary font-medium mb-2">На жаль, <span className="text-white">{selectedCode}</span> наразі недоступна</p>
                <p className="text-text-secondary text-sm">Жодне відділення не працює з цією валютою. Зверніться до нас через чат для уточнення.</p>
              </div>
            )
            }
          </BookingModal >
        );
      })()}

      {/* Step 2: Name Modal */}
      {
        bookingStep === 'name' && (
          <BookingModal onClose={closeModal} step={2} totalSteps={3}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-accent-yellow/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-accent-yellow" />
              </div>
              <h3 className="text-xl font-bold mb-2">Як вас звати?</h3>
              <p className="text-text-secondary text-sm">Щоб оператор міг до вас звернутися</p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); setError(''); }}
                placeholder="Ваше ім'я"
                autoFocus
                className="w-full px-4 py-4 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none text-center text-lg"
              />

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-sm text-red-400 text-center">{error}</p>
                </div>
              )}

              <button
                onClick={handleNameSubmit}
                className="w-full py-4 bg-accent-yellow rounded-xl text-primary font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                Далі
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </BookingModal>
        )
      }

      {/* Step 3: Phone Modal */}
      {
        bookingStep === 'phone' && (
          <BookingModal onClose={closeModal} step={3} totalSteps={3}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Ваш номер телефону</h3>
              <p className="text-text-secondary text-sm">Ми зателефонуємо для підтвердження</p>
            </div>

            <div className="space-y-4">
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(formatPhone(e.target.value)); setError(''); }}
                placeholder="+38 (0XX) XXX-XX-XX"
                autoFocus
                className="w-full px-4 py-4 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none text-center text-lg font-mono"
              />

              {/* Summary */}
              <div className="p-4 bg-primary rounded-xl border border-white/10">
                <div className="text-sm text-text-secondary mb-2">Ваше бронювання:</div>
                <div className="flex justify-between mb-1">
                  <span>Сума:</span>
                  <span className="font-bold">{giveAmount} {giveCurrency.code} → {getAmount.toLocaleString()} {getCurrency.code}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Відділення:</span>
                  <span className="font-medium text-sm">{selectedBranch?.address}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ім'я:</span>
                  <span className="font-medium">{customerName}</span>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-sm text-red-400 text-center">{error}</p>
                </div>
              )}

              <button
                onClick={handlePhoneSubmit}
                disabled={loading}
                className="w-full py-4 bg-gradient-gold rounded-xl text-primary font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Бронювання...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Забронювати
                  </>
                )}
              </button>
            </div>
          </BookingModal>
        )
      }
    </section >
  );
}

// Booking Modal Component
function BookingModal({ children, onClose, step, totalSteps }) {
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div
        className="bg-primary-light rounded-3xl p-6 max-w-md w-full border border-white/10 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-text-secondary" />
        </button>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${s === step ? 'w-8 bg-accent-yellow' : s < step ? 'w-2 bg-accent-yellow/50' : 'w-2 bg-white/20'
                } `}
            />
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}


function ExchangeCard({
  giveAmount,
  setGiveAmount,
  giveCurrency,
  setGiveCurrency,
  getCurrency,
  setGetCurrency,
  getAmount,
  onOpenCurrencyModal,
  onSwapCurrencies,
  onReserve,
  error,
  settings,
  branches = [],
  activeBranch,
  onBranchChange,
  sellCurrency,
  buyCurrency,
  sellInputValue,
  setSellInputValue,
  buyInputValue,
  setBuyInputValue,
  minAmount,
  reservationTime,
  branchDropdownOpen,
  setBranchDropdownOpen,
  focusedInput,
  setFocusedInput,
  isSellMode,
  handleSellChange,
  handleBuyChange,
  buyRate,
  sellRate,
  getEffectiveRate,
  isMobile,
  currencyInfoMap = {}
}) {
  return (
    <div className={`rounded-2xl lg:rounded-3xl border border-white/10 ${isMobile ? 'bg-transparent px-8 py-8' : 'backdrop-blur-md bg-primary-card/80 p-6 lg:p-8 max-w-xl w-full'}`}>
      <h3 className={`${isMobile ? 'text-2xl' : 'text-lg lg:text-xl'} font-bold text-center mb-1 text-white`}>Забронювати валюту</h3>
      <p className={`${isMobile ? 'text-sm' : 'text-[10px] lg:text-sm'} text-text-secondary text-center mb-6`}>
        Фіксація курсу на {reservationTime} хвилин
      </p>

      {/* Row 1: I SELL */}
      <div className="mb-3 transition-all rounded-xl border p-1 bg-primary-light border-white/10">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 flex items-center bg-primary-light/95 rounded-xl border border-white/5">
            <div className="pl-3 pr-2 py-2 w-full">
              <span className="text-[10px] text-text-secondary block">Я продаю</span>
              <input
                type="text"
                value={sellInputValue}
                onChange={(e) => handleSellChange(e.target.value)}
                className={`w-full bg-transparent ${isMobile ? 'text-lg' : 'text-xl'} font-bold outline-none text-white min-w-[80px]`}
              />
            </div>
            <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-2 cursor-pointer hover:bg-white/10 mr-1.5" onClick={() => onOpenCurrencyModal('sell_currency')}>
              <span className="text-lg">{sellCurrency?.flag || '🇺🇸'}</span>
              <span className="font-bold text-sm">{sellCurrency?.code || 'USD'}</span>
              <ChevronDown className="w-3 h-3 text-text-secondary" />
            </div>
          </div>
          <div className="flex-1 border-l border-white/10 md:pl-3 flex items-center bg-primary-light/95 rounded-xl border border-white/5">
            <div className="pl-3 pr-2 py-2 w-full">
              <span className="text-[10px] text-text-secondary block">Я отримаю</span>
              <input
                type="text"
                value={((isSellMode && !buyInputValue && sellInputValue) ? getAmount : ((Number(sellInputValue.replace(/[^\d.]/g, '')) || 0) * (getEffectiveRate ? getEffectiveRate(sellCurrency, Number(sellInputValue.replace(/[^\d.]/g, '')) || 0, 'buy') : (sellCurrency?.buy_rate || 0)))).toFixed(2)}
                readOnly
                onChange={() => { }}
                className={`w-full bg-transparent ${isMobile ? 'text-lg' : 'text-xl'} font-bold outline-none text-left text-green-400`}
              />
            </div>
            <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-2 mr-1.5 pointer-events-none">
              <span className="text-lg">🇺🇦</span>
              <span className="font-bold text-sm">UAH</span>
            </div>
          </div>
        </div>
      </div>



      {/* Row 2: I BUY */}
      <div className="mb-3 transition-all rounded-xl border p-1 bg-primary-light border-white/10">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 flex items-center bg-primary-light/95 rounded-xl border border-white/5">
            <div className="pl-3 pr-2 py-2 w-full">
              <span className="text-[10px] text-text-secondary block">Я купую</span>
              <input
                type="text"
                value={buyInputValue}
                onChange={(e) => handleBuyChange(e.target.value)}
                className={`w-full bg-transparent ${isMobile ? 'text-lg' : 'text-xl'} font-bold outline-none text-white min-w-[80px]`}
              />
            </div>
            <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-2 cursor-pointer hover:bg-white/10 mr-1.5" onClick={() => onOpenCurrencyModal('buy_currency')}>
              <span className="text-lg">{buyCurrency?.flag || '🇺🇸'}</span>
              <span className="font-bold text-sm">{buyCurrency?.code || 'USD'}</span>
              <ChevronDown className="w-3 h-3 text-text-secondary" />
            </div>
          </div>
          <div className="flex-1 border-l border-white/10 md:pl-3 flex items-center bg-primary-light/95 rounded-xl border border-white/5">
            <div className="pl-3 pr-2 py-2 w-full">
              <span className="text-[10px] text-text-secondary block">Мені знадобиться</span>
              <input
                type="text"
                value={((!isSellMode && buyInputValue) ? giveAmount : ((Number(buyInputValue.replace(/[^\d.]/g, '')) || 0) * (getEffectiveRate ? getEffectiveRate(buyCurrency, Number(buyInputValue.replace(/[^\d.]/g, '')) || 0, 'sell') : (buyCurrency?.sell_rate || 0)))).toFixed(2)}
                readOnly
                onChange={() => { }}
                className={`w-full bg-transparent ${isMobile ? 'text-lg' : 'text-xl'} font-bold outline-none text-left text-red-400 placeholder-red-400/50`}
              />
            </div>
            <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-2 mr-1.5 pointer-events-none">
              <span className="text-lg">🇺🇦</span>
              <span className="font-bold text-sm">UAH</span>
            </div>
          </div>
        </div>
      </div>



      {/* Branch Selector */}
      <div className="mb-4 relative px-1">
        <label className="text-xs text-text-secondary mb-1 block pl-2">Відділення:</label>
        <button
          onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between hover:bg-white/10 transition-colors text-left group"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-accent-blue group-hover:text-accent-yellow transition-colors" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-bold text-white leading-tight">
                {activeBranch ? (activeBranch.name || activeBranch.address) : 'Оберіть відділення'}
              </span>
              {activeBranch && <span className="text-[10px] text-text-secondary truncate">{activeBranch.address}</span>}
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${branchDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {branchDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1F2E] border border-white/10 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto ring-1 ring-white/5">
            {branches.map(branch => {
              // Calculate if best? We can reuse the best logic or just list them.
              // For now just list them.
              return (
                <div
                  key={branch.id}
                  onClick={() => {
                    onBranchChange(branch);
                    setBranchDropdownOpen(false);
                  }}
                  className={`p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 transition-colors ${activeBranch?.id === branch.id ? 'bg-accent-yellow/10' : ''}`}
                >
                  <div className="font-bold text-sm text-white mb-0.5">{branch.name || branch.address}</div>
                  <div className="text-xs text-text-secondary">{branch.address}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 px-4 mb-4 bg-white/5 py-3 rounded-xl border border-white/10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
          <span className="text-xs text-text-secondary">Курс:</span>
          <div className="text-right flex flex-col items-end">
            <span className="text-sm sm:text-base font-bold text-accent-yellow leading-tight">
              1 {isSellMode ? sellCurrency?.code : buyCurrency?.code} = {(isSellMode ? (sellCurrency?.buy_rate || 0) : (buyCurrency?.sell_rate || 0)).toFixed(2)} UAH
            </span>
            {((isSellMode ? sellCurrency?.wholesale_threshold : buyCurrency?.wholesale_threshold) > 0) && (
              <span className="text-[10px] text-text-secondary leading-tight mt-0.5">
                (від {(isSellMode ? sellCurrency?.wholesale_threshold : buyCurrency?.wholesale_threshold) || 1000} {isSellMode ? sellCurrency?.code : buyCurrency?.code} — {(isSellMode ? sellCurrency?.wholesale_buy_rate : buyCurrency?.wholesale_sell_rate).toFixed(2)} опт)
              </span>
            )}
          </div>
        </div>
      </div>

      <button onClick={onReserve} className={`w-full ${isMobile ? 'py-3 text-base' : 'py-4 text-lg'} bg-accent-yellow rounded-xl text-primary font-bold`}>
        Забронювати
      </button>

      <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10 text-center">
        <p className="text-sm text-accent-yellow">
          Оптовий курс від 1000$ або в еквіваленті
        </p>
      </div>
    </div>
  );
}
