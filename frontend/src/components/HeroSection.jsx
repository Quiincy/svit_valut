import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, RefreshCw, Loader2, X, MapPin, User, Phone, Check, ArrowRight, Clock, AlertCircle, MessageSquare } from 'lucide-react';
import SeoTextBlock from './SeoTextBlock';

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
  activeCurrencyInfo,
  activeSeo,
  ratesUpdated,
  isUserInteracted
}) {
  const location = useLocation();
  const [bookingStep, setBookingStep] = useState(null); // null, 'branch', 'name', 'phone'
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [branchBookingOpen, setBranchBookingOpen] = useState(false);

  const [sellInputValue, setSellInputValue] = useState('');
  const [buyInputValue, setBuyInputValue] = useState('');

  const reservationTime = settings?.reservation_time_minutes || 60;
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  // React to header dropdown preset selections
  useEffect(() => {
    if (!presetAction) return;
    
    // Check if user already entered an amount in the input fields
    const currentSell = Number(sellInputValue.replace(/[^\d.]/g, '')) || 0;
    const currentBuy = Number(buyInputValue.replace(/[^\d.]/g, '')) || 0;
    
    // Choose the active amount to preserve, or fallback to 1000
    let targetAmount = 1000;
    if (presetAction.type === 'sell' && currentSell > 0) targetAmount = currentSell;
    else if (presetAction.type === 'buy' && currentBuy > 0) targetAmount = currentBuy;
    else if (giveAmount > 0) {
        // If we only have giveAmount (from UAH side), try to convert it roughly or just use 1000 if too complex
        targetAmount = 1000;
    }

    const defaultAmount = targetAmount.toString();
    
    if (presetAction.type === 'sell') {
      // User wants to SELL foreign currency
      setSellInputValue(defaultAmount);
      setBuyInputValue('');
      setGiveAmount(Number(defaultAmount));
    } else if (presetAction.type === 'buy') {
      // User wants to BUY foreign currency
      setBuyInputValue(defaultAmount);
      setSellInputValue('');
      // Use branch rate if available, else global rate
      const branchCurr = activeBranch ? branchCurrencyMap[activeBranch.id]?.find(c => c.code === presetAction.currency?.code) : null;
      const rate = getEffectiveRate(branchCurr || presetAction.currency, Number(defaultAmount), 'sell');
      setGiveAmount(Number(defaultAmount) * rate);
    }
  }, [presetAction, activeBranch, branchCurrencyMap]);

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
      const currency = currs.find(c => c.code === selectedCode);
      const isAvailable = currency && (currency.buy_rate > 0 || currency.sell_rate > 0);

      if (isAvailable) {
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
        // User is selling foreign currency, so they want the HIGHEST buy_rate from the perspective of the exchange.
        return (bRate.buy_rate || 0) - (aRate.buy_rate || 0);
      } else {
        // User is buying foreign currency, so they want the LOWEST sell_rate from the perspective of the exchange.
        // For ascending order (lowest first):
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

    // --- Enforce 1000 USD/EUR Minimum Limit ---
    const foreignAmount = isSellMode ? currentAmount : buyVal;
    const foreignCurrency = isSellMode ? sellCurrency.code : buyCurrency.code;

    if ((foreignCurrency === 'USD' || foreignCurrency === 'EUR') && foreignAmount < 1000) {
      setError(`Бронювання курсу діє від 1000 ${foreignCurrency}`);
      return;
    }

    // --- Enforce 400,000 UAH Limit ---
    let totalUAH = 0;

    if (isSellMode) {
      // User is SELLING foreign currency, so they GET UAH
      // currentAmount here is the foreign amount
      const rate = getEffectiveRate(sellCurrency, currentAmount, 'buy');
      totalUAH = currentAmount * rate;
    } else {
      // User is BUYING foreign currency, so they GIVE UAH
      // currentAmount here is already the calculated UAH amount from:
      // currentAmount = buyVal * rate; (in the block above) or it's giveAmount
      totalUAH = currentAmount;
    }

    if (totalUAH > 400000) {
      setError('Вибачте, але по закону сума операції не може перевищувати 400 000 грн.');
      return;
    }


    // Pre-select branch: branch with best rate, then activeBranch, then first
    const { available } = getAvailableBranches();
    setSelectedBranch(available[0] || activeBranch || branches[0] || null);
    setBookingStep('name');
  };

  const handleSelectBranch = (branch) => {
    setSelectedBranch(branch);
    if (onBranchChange) {
      onBranchChange(branch);
    }
  };

  const handleNameSubmit = () => {
    if (!customerName.trim()) {
      setError("Введіть ваше ім'я");
      return;
    }
    if (!selectedBranch) {
      setError('Оберіть відділення');
      return;
    }
    setError('');

    // Check if currency is available at the selected branch
    const { available } = getAvailableBranches();
    const isAvailableHere = available.some(b => b.id === selectedBranch.id);

    if (!isAvailableHere) {
      setBookingStep('unavailable_currency');
      return;
    }

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
      let finalGiveAmount = giveAmount;
      let finalGiveCurrency = giveCurrency.code;
      let finalGetCurrency = getCurrency.code;

      let finalGetAmount = 0;
      let usedRate = 0;

      if (!isSellMode) {
        // User is buying foreign currency with UAH.
        // The user gives UAH, gets Foreign Currency.
        finalGiveCurrency = 'UAH';
        finalGetCurrency = buyCurrency.code;

        // Calculate the UAH amount needed USING THE SELECTED BRANCH RATE
        const foreignAmount = Number(buyInputValue.replace(/[^\d.]/g, '')) || 0;
        const branchCurr = selectedBranch ? getBranchRate(selectedBranch.id) : null;
        usedRate = branchCurr ? getEffectiveRate(branchCurr, foreignAmount, 'sell') : getEffectiveRate(buyCurrency, foreignAmount, 'sell');
        finalGiveAmount = foreignAmount * usedRate;
        finalGetAmount = foreignAmount;
      } else {
        // User is selling foreign currency for UAH.
        // The user gives foreign currency, gets UAH.
        const foreignAmount = Number(sellInputValue.replace(/[^\d.]/g, '')) || 0;
        finalGiveAmount = foreignAmount;
        finalGiveCurrency = sellCurrency.code;
        finalGetCurrency = 'UAH';

        const branchCurr = selectedBranch ? getBranchRate(selectedBranch.id) : null;
        usedRate = branchCurr ? getEffectiveRate(branchCurr, foreignAmount, 'buy') : getEffectiveRate(sellCurrency, foreignAmount, 'buy');
        finalGetAmount = foreignAmount * usedRate;
      }

      await onReserve({
        give_amount: finalGiveAmount,
        give_currency: finalGiveCurrency,
        get_currency: finalGetCurrency,
        phone: '+' + phoneDigits,
        customer_name: customerName.trim(),
        branch_id: selectedBranch.id
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
    setBranchBookingOpen(false);
  };

  // Helper to calculate effective rate based on amount and threshold
  const getEffectiveRate = (currency, amount, type) => {
    if (!currency) return 0;

    const defaultRate = type === 'buy' ? (currency.buy_rate || 0) : (currency.sell_rate || 0);
    const threshold1 = currency.wholesale_threshold || 0;
    const threshold2 = currency.wholesale2_threshold || 0;

    let validTiers = [{ t: 0, r: defaultRate }];

    if (threshold1 > 0) {
      const r1 = type === 'buy' ? currency.wholesale_buy_rate : currency.wholesale_sell_rate;
      if (r1 > 0) validTiers.push({ t: threshold1, r: r1 });
    }

    if (threshold2 > 0) {
      const r2 = type === 'buy' ? currency.wholesale2_buy_rate : currency.wholesale2_sell_rate;
      if (r2 > 0) validTiers.push({ t: threshold2, r: r2 });
    }

    validTiers.sort((a, b) => a.t - b.t);

    for (let i = validTiers.length - 1; i >= 0; i--) {
      if (amount >= validTiers[i].t) {
        return validTiers[i].r;
      }
    }

    return defaultRate;
  };

  // Sync initial inputs with global state on first load or URL change
  // Sync initial inputs with global state on first load or URL change
  useEffect(() => {
    // Detect mode mismatch and swap if needed (e.g., initial load race condition where URL sets buy mode after sell mode was assumed)
    if (isSellMode && buyInputValue && !sellInputValue) {
      setSellInputValue(buyInputValue);
      setBuyInputValue('');
    } else if (!isSellMode && sellInputValue && !buyInputValue) {
      setBuyInputValue(sellInputValue);
      setSellInputValue('');
    } else if (!presetAction && giveAmount > 0 && !sellInputValue && !buyInputValue) {
      // Very first initialization when both are empty
      if (isSellMode) {
        setSellInputValue(giveAmount.toString());
      } else {
        setBuyInputValue('1000'); // Default buy amount
      }
    }
  }, [giveAmount, isSellMode, presetAction, buyInputValue, sellInputValue]);

  // Use refs to track previous currency codes to avoid resetting inputs on rate updates
  const prevCurrencyCodes = useRef({
    sell: sellCurrency?.code,
    buy: buyCurrency?.code,
    mode: isSellMode ? 'sell' : 'buy'
  });

  // Sync Global giveAmount with Local Inputs when Currency/Mode Changes
  useEffect(() => {
    // Only recalculate if the actual currency selection changed, not on background rate updates
    const currentMode = isSellMode ? 'sell' : 'buy';
    const currencyChanged = 
      prevCurrencyCodes.current.sell !== sellCurrency?.code ||
      prevCurrencyCodes.current.buy !== buyCurrency?.code ||
      prevCurrencyCodes.current.mode !== currentMode;

    if (!currencyChanged && (sellInputValue || buyInputValue)) {
      // If user typed something and currency hasn't changed, 
      // just let the user's input stand (rates will recalculate dynamically elsewhere)
      
      // Update refs for next render
      prevCurrencyCodes.current = {
        sell: sellCurrency?.code,
        buy: buyCurrency?.code,
        mode: currentMode
      };
      return; 
    }

    // Determine the best rate currency object to use
    // getAvailableBranches sorts them by best rate first!
    const { available } = getAvailableBranches();
    const bestBranch = available.length > 0 ? available[0] : null;
    const bestBranchCurrency = bestBranch ? getBranchRate(bestBranch.id) : null;

    // Fall back to the base currency if no branch has it
    const activeCurrObj = bestBranchCurrency || (isSellMode ? sellCurrency : buyCurrency);

    if (isSellMode) {
      const num = Number(sellInputValue.replace?.(/[^\d.]/g, '') || sellInputValue) || 0;
      setGiveAmount(num);
    } else {
      const num = Number(buyInputValue.replace?.(/[^\d.]/g, '') || buyInputValue) || 0;
      const rate = getEffectiveRate(activeCurrObj, num, 'sell');
      setGiveAmount(num * rate);
    }

    // Update refs
    prevCurrencyCodes.current = {
      sell: sellCurrency?.code,
      buy: buyCurrency?.code,
      mode: currentMode
    };

  // Explicitly ignore branch updates modifying the ref objects unless activeBranch ID changes. 
  // It's safer to just rely on sellCurrency/buyCurrency refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellCurrency, buyCurrency, isSellMode]);




  // Handlers
  const handleSellChange = (val) => {
    // Mark user interaction to prevent geo branch override
    if (isUserInteracted) isUserInteracted.current = true;

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



  const handleBuyChange = (val) => {
    // Mark user interaction to prevent geo branch override
    if (isUserInteracted) isUserInteracted.current = true;

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

  // Chat availability helper — only available 08:00–20:00 Kyiv time
  const isChatAvailable = () => {
    const now = new Date();
    // Get Kyiv time (UTC+2 / UTC+3 depending on DST)
    const kyivTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
    const hours = kyivTime.getHours();
    const minutes = kyivTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    return totalMinutes >= 480 && totalMinutes <= 1200; // 08:00 = 480, 20:00 = 1200
  };

  const chatOnline = isChatAvailable();

  const hasCurrencyInfo = !!activeCurrencyInfo;

  // Resolve texts precisely for heading and images
  const activeH1 = activeCurrencyInfo ? (isSellMode ? activeCurrencyInfo.seo_sell_h1 : activeCurrencyInfo.seo_buy_h1) || activeCurrencyInfo.seo_h1 : null;
  const activeH2 = activeCurrencyInfo ? (isSellMode ? activeCurrencyInfo.seo_sell_h2 : activeCurrencyInfo.seo_buy_h2) || activeCurrencyInfo.seo_h2 : null;
  const activeImage = activeCurrencyInfo ? (isSellMode ? activeCurrencyInfo.seo_sell_image : activeCurrencyInfo.seo_buy_image) || activeCurrencyInfo.seo_image : null;

  // Compute best branch currency for the ExchangeCard
  const { available: heroAvailableBranches } = getAvailableBranches();
  const heroBestBranch = heroAvailableBranches.length > 0 ? heroAvailableBranches[0] : null;
  const heroBestBranchCurrency = heroBestBranch ? getBranchRate(heroBestBranch.id) : null;

  return (
    <section className="pt-16 lg:pt-20">
      {/* Desktop Layout */}
      <div className="hidden lg:block relative overflow-hidden">
        {/* Background image on right half - Removed to show global pattern */}
        {/* Gradient overlay: reduced for pattern visibility */}
        {/* Gradient overlay removed for transparency */}
        {/* <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-transparent"></div> */}
        <div className="relative z-10 max-w-7xl mx-auto px-8 py-16">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left Content — Always homepage content on desktop */}
            <div className="flex flex-col gap-8 min-h-[400px] mt-8 lg:mt-12">
              {/* Hidden semantic h1 for currency SEO pages */}
              {hasCurrencyInfo && (
                <h1
                  aria-hidden="false"
                  style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
                >
                  {activeH1}
                </h1>
              )}

              {/* Default Title — always visible on desktop */}
              <h1 className={`${hasCurrencyInfo ? 'text-[3.5rem]' : 'text-5xl xl:text-7xl'} font-bold leading-tight`} aria-hidden={hasCurrencyInfo}>
                <span className="text-accent-yellow">{activeSeo?.h1 || 'Обмін валют'}</span>
              </h1>

              {/* Banner / Badge */}
              <div className="flex items-center gap-4 bg-white/5 rounded-full pl-2 pr-8 py-2 w-fit backdrop-blur-md border border-white/10">
                <div className="w-10 h-10 rounded-full border border-accent-yellow text-accent-yellow flex items-center justify-center bg-accent-yellow/10">
                  <ArrowRight className="w-5 h-5" />
                </div>
                <span className="text-lg text-gray-300 font-light tracking-wide">Швидко. Безпечно. За вигідним курсом.</span>
              </div>

              {/* Contact / Chat block — always visible on desktop */}
              <div className="mt-8">
                {hasCurrencyInfo ? (
                  <>
                    <p className="text-gray-400 mb-2 text-xl font-light">
                      Маєте питання?
                    </p>
                    <p className="text-gray-300 mb-2 text-xl font-light">— Наявність на відділеннях</p>
                    <p className="text-gray-300 mb-2 text-xl font-light">— Оптовий курс</p>
                    <p className="text-gray-300 mb-8 text-xl font-light">— інше.</p>
                    <p className="text-gray-500 mb-4 text-sm uppercase tracking-wider font-semibold">НАПИШІТЬ НАМ АБО ЗАТЕЛЕФОНУЙТЕ:</p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-400 mb-2 text-xl font-light">
                      Маєте питання?
                    </p>
                    <p className="text-gray-300 mb-8 text-xl font-light">
                      Напишіть нам або зателефонуйте — відповімо за кілька хвилин.
                    </p>
                    <p className="text-gray-500 mb-4 text-sm uppercase tracking-wider font-semibold">НАПИШІТЬ НАМ АБО ЗАТЕЛЕФОНУЙТЕ:</p>
                  </>
                )}
                <div className="flex items-center gap-6">
                  {/* Avatar & Status */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=112&h=112&fit=crop&crop=faces&q=80"
                        alt="Ірина"
                        width="56"
                        height="56"
                        loading="lazy"
                        decoding="async"
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

                  <div className="flex items-center gap-3 relative z-20">
                    {/* Chat Button */}
                    <button
                      onClick={onOpenChat}
                      className="relative z-20 w-14 h-14 bg-accent-yellow rounded-full flex items-center justify-center text-primary hover:bg-yellow-400 hover:shadow-lg hover:shadow-yellow-500/20 transition-all transform hover:-translate-y-0.5"
                    >
                      <MessageSquare className="w-6 h-6" />
                    </button>
                    {/* Phone Button */}
                    {settings?.phone && (
                      <div className="relative group flex items-center justify-center">
                        <div className="absolute inset-0 bg-[#4488FF] rounded-full animate-ping opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                        <a
                          href={`tel:${settings.phone.replace(/[^\d+]/g, '')}`}
                          className="relative flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#4488FF] to-[#2668eb] shadow-lg shadow-[#4488FF]/30 rounded-full text-white font-bold text-lg hover:shadow-[#4488FF]/50 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 overflow-hidden"
                        >
                          <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>
                          <Phone className="w-5 h-5 group-hover:animate-ring" />
                          <span className="relative z-10">{settings.phone}</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                {!chatOnline && (
                  <p className="text-xs text-gray-500 mt-2">Чат працює щодня з 08:00 до 20:00</p>
                )}
              </div>
            </div>

            {/* Right - Exchange Card */}
            <div
              className="flex justify-end p-4 lg:p-12 rounded-[40px] hero-bg-premium shadow-2xl overflow-hidden"
            >
              <div className="hero-glass-card rounded-[32px] p-1 w-full max-w-xl">
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
                  ratesUpdated={ratesUpdated}
                  bestBranchCurrency={heroBestBranchCurrency}
                  isCurrencyRoute={hasCurrencyInfo}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden relative overflow-hidden">
        <div className="relative z-10 pt-2 pb-10 flex flex-col gap-8 px-[10px]">
          <div className="flex flex-col gap-4 text-center items-center">
            {hasCurrencyInfo && (
              <h1
                aria-hidden="false"
                style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
              >
                {activeH1}
              </h1>
            )}
            <h1 className="text-3xl font-bold leading-tight" aria-hidden={hasCurrencyInfo}>
              <span className="text-accent-yellow text-4xl">{activeSeo?.h1 || 'Обмін валют'}</span>
            </h1>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full pl-1 pr-4 py-1 w-fit backdrop-blur-md">
              <div className="w-8 h-8 bg-accent-yellow/20 rounded-full flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-accent-yellow transform -rotate-45" />
              </div>
              <span className="text-xs font-medium text-white/90">Швидко. Безпечно. Вигідно.</span>
            </div>
          </div>

          <div className="p-4 rounded-[32px] overflow-hidden hero-bg-premium shadow-xl">
            <div className="hero-glass-card rounded-[32px]">
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
                ratesUpdated={ratesUpdated}
                bestBranchCurrency={heroBestBranchCurrency}
                isCurrencyRoute={hasCurrencyInfo}
              />
            </div>
          </div>

          {/* Mobile Questions / Chat Section */}
          <div className="mt-6 px-2 lg:hidden">
            <div className="mb-4">
              {hasCurrencyInfo ? (
                <>
                  <p className="text-gray-400 text-sm mb-2">
                    Маєте питання?
                  </p>
                  <p className="text-gray-500 text-sm mb-1">— Наявність на відділеннях</p>
                  <p className="text-gray-500 text-sm mb-1">— Оптовий курс</p>
                  <p className="text-gray-500 text-sm mb-3">— інше.</p>
                  <p className="text-gray-500 text-sm mb-3 uppercase tracking-wider font-semibold">НАПИШІТЬ НАМ АБО ЗАТЕЛЕФОНУЙТЕ:</p>
                </>
              ) : (
                <>
                  <p className="text-gray-400 text-sm mb-2">
                    Маєте питання?
                  </p>
                  <p className="text-gray-500 text-sm mb-4">
                    Напишіть нам або зателефонуйте — відповімо за кілька хвилин.
                  </p>
                  <p className="text-gray-500 text-sm mb-3 uppercase tracking-wider font-semibold">НАПИШІТЬ НАМ АБО ЗАТЕЛЕФОНУЙТЕ:</p>
                </>
              )}


              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=faces&q=80"
                      alt="Ірина"
                      width="40"
                      height="40"
                      loading="lazy"
                      decoding="async"
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
                <div className="flex items-center gap-2 relative z-20">
                  <button
                    onClick={onOpenChat}
                    className="relative z-20 w-10 h-10 bg-accent-yellow rounded-full flex items-center justify-center text-primary hover:shadow-lg transition-all"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </button>
                  {settings?.phone && (
                    <div className="relative group flex items-center justify-center">
                      <div className="absolute inset-0 bg-[#4488FF] rounded-full animate-ping opacity-20"></div>
                      <a
                        href={`tel:${settings.phone.replace(/[^\d+]/g, '')}`}
                        className="relative flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#4488FF] to-[#2668eb] rounded-full text-white font-bold text-sm shadow-lg shadow-[#4488FF]/30 hover:shadow-[#4488FF]/50 transition-all overflow-hidden"
                      >
                        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>
                        <Phone className="w-4 h-4 animate-ring" />
                        <span className="relative z-10">{settings.phone}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
              {!chatOnline && (
                <p className="text-xs text-gray-500 mt-2">Чат працює щодня з 08:00 до 20:00</p>
              )}
            </div>
          </div>
        </div >
      </div >

      {/* Step: Unavailable Currency Notice */}
      {
        bookingStep === 'unavailable_currency' && (() => {
          const { available: availBranches } = getAvailableBranches();
          const selectedCode = isSellMode ? sellCurrency?.code : buyCurrency?.code;
          const selectedFlag = isSellMode ? sellCurrency?.flag : buyCurrency?.flag;

          return (
            <BookingModal onClose={closeModal} step={1} totalSteps={2}>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold mb-2">Вибачте, тимчасово не приймаємо валюту {selectedFlag} на цьому відділенні</h2>
                <p className="text-text-secondary text-sm mb-4">
                  Оберіть інше відділення, де вона доступна
                </p>
              </div>

              {availBranches.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {availBranches.map((branch, index) => {
                    const rate = getBranchRate(branch.id);
                    const isBest = index === 0;
                    return (
                      <button
                        key={branch.id}
                        onClick={() => { handleSelectBranch(branch); setBookingStep('name'); }}
                        className={`w-full p-4 rounded-2xl border transition-all text-left group ${isBest ? 'bg-accent-yellow/5 border-accent-yellow/40 shadow-lg shadow-accent-yellow/5' : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <MapPin className={`w-4 h-4 ${isBest ? 'text-accent-yellow' : 'text-white/50'}`} />
                            <span className="font-bold text-white text-sm">{branch.name || `${branch.address} (№${branch.number})`}</span>
                          </div>
                          {isBest && (
                            <span className="text-[10px] bg-accent-yellow/20 text-accent-yellow px-2.5 py-1 rounded-full font-bold tracking-wide">
                              ★ Найкращий курс
                            </span>
                          )}
                        </div>
                        <div className="pl-6 space-y-1">
                          {branch.name && (
                            <p className="text-xs text-text-secondary">
                              {branch.address} (№{branch.number})
                            </p>
                          )}
                          <div className="flex items-center gap-1 text-xs text-text-secondary">
                            <Clock className="w-3 h-3" />
                            <span>{branch.hours || branch.working_hours}</span>
                          </div>
                          {rate && (
                            <div className="flex flex-col gap-1.5 mt-2">
                              <div className="flex items-center gap-4">
                                <div className="text-xs flex items-center gap-1">
                                  <span className="text-text-secondary">Купівля:</span>
                                  <span className="text-white font-semibold">{rate.buy_rate?.toFixed(2)}</span>
                                </div>
                                <div className="text-xs flex items-center gap-1">
                                  <span className="text-text-secondary">Продаж:</span>
                                  <span className="text-white font-semibold">{rate.sell_rate?.toFixed(2)}</span>
                                </div>
                              </div>
                              {rate.wholesale_threshold > 0 && (rate.wholesale_buy_rate > 0 || rate.wholesale_sell_rate > 0) && (
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] text-accent-yellow bg-accent-yellow/10 px-1.5 py-0.5 rounded">
                                    Опт від {rate.wholesale_threshold} {selectedCode}
                                  </span>
                                  {rate.wholesale_buy_rate > 0 && (
                                    <div className="text-[10px] text-accent-yellow">
                                      <span className="opacity-70">Куп: </span>
                                      <span className="font-semibold">{rate.wholesale_buy_rate.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {rate.wholesale_sell_rate > 0 && (
                                    <div className="text-[10px] text-accent-yellow">
                                      <span className="opacity-70">Прод: </span>
                                      <span className="font-semibold">{rate.wholesale_sell_rate.toFixed(2)}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              {rate.wholesale2_threshold > 0 && (rate.wholesale2_buy_rate > 0 || rate.wholesale2_sell_rate > 0) && (
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">
                                    Опт від {rate.wholesale2_threshold} {selectedCode}
                                  </span>
                                  {rate.wholesale2_buy_rate > 0 && (
                                    <div className="text-[10px] text-orange-400">
                                      <span className="opacity-70">Куп: </span>
                                      <span className="font-semibold">{rate.wholesale2_buy_rate.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {rate.wholesale2_sell_rate > 0 && (
                                    <div className="text-[10px] text-orange-400">
                                      <span className="opacity-70">Прод: </span>
                                      <span className="font-semibold">{rate.wholesale2_sell_rate.toFixed(2)}</span>
                                    </div>
                                  )}
                                </div>
                              )}
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
                  <p className="text-text-secondary font-medium mb-2">На жаль, <span className="text-white">{selectedCode}</span> наразі недоступна у жодному відділенні</p>
                  <p className="text-text-secondary text-sm">Зверніться до нас через чат для уточнення.</p>
                </div>
              )}
            </BookingModal>
          );
        })()
      }

      {/* Step 1: Name + Branch Selection Modal */}
      {
        bookingStep === 'name' && (
          <BookingModal onClose={closeModal} step={1} totalSteps={2}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-accent-yellow/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-accent-yellow" />
              </div>
              <h2 className="text-xl font-bold mb-2">Бронювання</h2>
              <p className="text-text-secondary text-sm">Вкажіть ваше ім'я та оберіть відділення</p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); setError(''); }}
                placeholder="Ваше ім'я"
                aria-label="Ваше ім'я"
                autoFocus
                className="w-full px-4 py-4 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none text-center text-lg"
              />

              {/* Branch Selection Dropdown */}
              <div className="relative">
                {(() => {
                  const { available } = getAvailableBranches();
                  const bestBranchId = available.length > 0 ? available[0].id : null;
                  const isSelectedBest = selectedBranch && selectedBranch.id === bestBranchId;

                  return (
                    <>
                      <button
                        onClick={() => setBranchBookingOpen(!branchBookingOpen)}
                        className={`w-full px-4 py-4 bg-primary rounded-xl border text-left flex items-center justify-between transition-colors ${branchBookingOpen ? 'border-accent-yellow' : 'border-white/10'
                          }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2 truncate">
                            <MapPin className="w-4 h-4 text-accent-yellow flex-shrink-0" />
                            <span className={`${selectedBranch ? 'text-white' : 'text-text-secondary'} truncate`}>
                              {selectedBranch ? (selectedBranch.name || selectedBranch.address) : 'Оберіть  відділення'}
                            </span>
                          </div>
                          {isSelectedBest && (
                            <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full whitespace-nowrap w-max">
                              ★ Найкращий курс
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 mt-1 sm:mt-0">
                          {selectedBranch && (() => {
                            const rate = getBranchRate(selectedBranch.id);
                            const rateValue = rate ? (isSellMode ? rate.buy_rate : rate.sell_rate) : 0;
                            return rateValue > 0 ? (
                              <span className="font-mono text-accent-yellow font-medium">
                                {rateValue.toFixed(2)}
                              </span>
                            ) : null;
                          })()}
                          <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${branchBookingOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {branchBookingOpen && (() => {
                        const selectedCode = isSellMode ? sellCurrency?.code : buyCurrency?.code;
                        return (
                          <div className="absolute z-50 w-full mt-2 bg-[#1A1F2E] border border-white/10 rounded-xl shadow-2xl max-h-[250px] overflow-y-auto ring-1 ring-white/5">
                            {branches.map((branch) => {
                              const rate = getBranchRate(branch.id);
                              const isBest = branch.id === bestBranchId;
                              const rateValue = rate ? (isSellMode ? rate.buy_rate : rate.sell_rate) : 0;
                              const wholesaleRateValue = rate ? (isSellMode ? rate.wholesale_buy_rate : rate.wholesale_sell_rate) : 0;
                              const wholesaleThreshold = rate ? rate.wholesale_threshold : 0;
                              const wholesale2RateValue = rate ? (isSellMode ? rate.wholesale2_buy_rate : rate.wholesale2_sell_rate) : 0;
                              const wholesale2Threshold = rate ? rate.wholesale2_threshold : 0;

                              return (
                                <button
                                  key={branch.id}
                                  onClick={() => {
                                    setSelectedBranch(branch);
                                    setBranchBookingOpen(false);
                                    setError('');
                                  }}
                                  className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center gap-3 ${selectedBranch?.id === branch.id ? 'bg-accent-yellow/10 text-accent-yellow' : 'text-white'
                                    }`}
                                >
                                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-text-secondary mt-1" />
                                  <div className="flex-1 min-w-0 pr-2">
                                    <div className="text-sm font-medium truncate whitespace-normal leading-tight">
                                      {branch.name || `${branch.address} (№${branch.number})`}
                                    </div>
                                    {branch.name && (
                                      <div className="text-xs text-text-secondary truncate mt-0.5">
                                        {branch.address} (№{branch.number})
                                      </div>
                                    )}
                                  </div>
                                  {rateValue > 0 && (
                                    <div className="flex flex-col items-end flex-shrink-0 text-right">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-sm font-mono flex-shrink-0 ${isBest ? 'text-green-400' : 'text-text-secondary'}`}>
                                          {rateValue.toFixed(2)}
                                        </span>
                                      </div>
                                      {isBest && (
                                        <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full whitespace-nowrap mt-0.5">
                                          ★ Найкращий
                                        </span>
                                      )}
                                      {(wholesaleThreshold > 0 && wholesaleRateValue > 0) && (
                                        <span className="text-[10px] text-accent-yellow mt-0.5 whitespace-nowrap">
                                          від {wholesaleThreshold} {selectedCode} — {wholesaleRateValue.toFixed(2)} опт
                                        </span>
                                      )}
                                      {(wholesale2Threshold > 0 && wholesale2RateValue > 0) && (
                                        <span className="text-[10px] text-orange-400 mt-0.5 whitespace-nowrap">
                                          від {wholesale2Threshold} {selectedCode} — {wholesale2RateValue.toFixed(2)} опт
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </>
                  );
                })()}
              </div>

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

      {/* Step 2: Phone Modal */}
      {
        bookingStep === 'phone' && (
          <BookingModal onClose={closeModal} step={2} totalSteps={2}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-xl font-bold mb-2">Ваш номер телефону</h2>
              <p className="text-text-secondary text-sm">Ми зателефонуємо для підтвердження</p>
            </div>

            <div className="space-y-4">
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(formatPhone(e.target.value)); setError(''); }}
                placeholder="+38 (0XX) XXX-XX-XX"
                aria-label="Ваш номер телефону"
                autoFocus
                className="w-full px-4 py-4 bg-primary rounded-xl border border-white/10 focus:border-accent-yellow focus:outline-none text-center text-lg font-mono"
              />

              {/* Summary */}
              <div className="p-4 bg-primary rounded-xl border border-white/10">
                <div className="text-sm text-text-secondary mb-2">Ваше бронювання:</div>
                <div className="flex justify-between mb-1">
                  <span>Сума:</span>
                  <span className="font-bold">
                    {!isSellMode
                      ? (() => {
                        const foreignAmount = Number(buyInputValue.replace(/[^\d.]/g, '')) || 0;
                        const branchCurr = selectedBranch ? getBranchRate(selectedBranch.id) : null;
                        const rateToUse = branchCurr ? getEffectiveRate(branchCurr, foreignAmount, 'sell') : getEffectiveRate(buyCurrency, foreignAmount, 'sell');
                        const uahAmount = foreignAmount * rateToUse;
                        return `${uahAmount.toFixed(2)} UAH → ${foreignAmount} ${buyCurrency?.code || getCurrency.code}`;
                      })()
                      : (() => {
                        const foreignAmount = Number(sellInputValue.replace(/[^\d.]/g, '')) || giveAmount || 0;
                        const branchCurr = selectedBranch ? getBranchRate(selectedBranch.id) : null;
                        const rateToUse = branchCurr ? getEffectiveRate(branchCurr, foreignAmount, 'buy') : getEffectiveRate(sellCurrency || giveCurrency, foreignAmount, 'buy');
                        const uahAmount = foreignAmount * rateToUse;
                        return `${foreignAmount} ${sellCurrency?.code || giveCurrency.code} → ${uahAmount.toFixed(2)} UAH`;
                      })()}
                  </span>
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
                className="w-full py-4 bg-accent-yellow rounded-xl text-primary font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
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
          aria-label="Закрити вікно"
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
  currencyInfoMap = {},
  ratesUpdated,
  bestBranchCurrency,
  isCurrencyRoute
}) {
  const showSellRow = !isCurrencyRoute || isSellMode;
  const showBuyRow = !isCurrencyRoute || !isSellMode;

  // Determine alternate URL for the opposite mode
  const activeCurrObj = isSellMode ? sellCurrency : buyCurrency;
  let oppositeUrl = '/';
  if (activeCurrObj) {
    const info = currencyInfoMap[activeCurrObj.code];
    if (info) {
      oppositeUrl = isSellMode ? (info.buy_url || `/buy-${activeCurrObj.code.toLowerCase()}`) : (info.sell_url || `/sell-${activeCurrObj.code.toLowerCase()}`);
      if (!oppositeUrl.startsWith('/')) oppositeUrl = '/' + oppositeUrl;
    }
  }

  return (
    <div className={`rounded-2xl lg:rounded-3xl border border-white/10 ${isMobile ? 'bg-transparent px-4 py-6 mt-4' : 'backdrop-blur-md bg-primary-card/80 p-6 lg:p-8 max-w-xl w-full'}`}>
      <h2 className={`${isMobile ? 'text-2xl' : 'text-lg lg:text-xl'} font-bold text-center mb-1 text-white`}>Забронювати валюту</h2>
      <p className={`${isMobile ? 'text-sm' : 'text-[10px] lg:text-sm'} text-text-secondary text-center mb-6`}>
        Фіксація курсу на {reservationTime} хвилин
      </p>

      {/* Mode Switcher for Currency Pages */}
      {isCurrencyRoute && (
        <div className="flex bg-white/5 rounded-xl p-1 mb-4 border border-white/10">
          <Link
            to={isSellMode ? oppositeUrl : '#'}
            className={`flex-1 text-center py-2 rounded-lg text-sm font-bold transition-all ${!isSellMode ? 'bg-[#4488FF] text-white shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
            onClick={(e) => {
              if (!isSellMode) e.preventDefault();
            }}
          >
            Купити
          </Link>
          <Link
            to={!isSellMode ? oppositeUrl : '#'}
            className={`flex-1 text-center py-2 rounded-lg text-sm font-bold transition-all ${isSellMode ? 'bg-[#4488FF] text-white shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
            onClick={(e) => {
              if (isSellMode) e.preventDefault();
            }}
          >
            Продати
          </Link>
        </div>
      )}

      {/* Row 1: I SELL */}
      {showSellRow && (
        <div className="mb-3 transition-all rounded-xl border p-1 bg-primary-light border-white/10">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex items-center bg-primary-light/95 rounded-xl border border-white/5">
              <div className="pl-3 pr-2 py-2 w-full">
                <span className="text-[10px] text-text-secondary block">Я продаю</span>
                <input
                  type="text"
                  value={sellInputValue}
                  onChange={(e) => handleSellChange(e.target.value)}
                  onFocus={() => setFocusedInput('sell')}
                  aria-label="Сума продажу"
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
                  value={((Number(sellInputValue.replace(/[^\d.]/g, '')) || 0) * (getEffectiveRate ? getEffectiveRate(bestBranchCurrency || sellCurrency, Number(sellInputValue.replace(/[^\d.]/g, '')) || 0, 'buy') : ((bestBranchCurrency || sellCurrency)?.buy_rate || 0))).toFixed(2)}
                  readOnly
                  aria-label="Сума отримання"
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
      )}



      {/* Row 2: I BUY */}
      {showBuyRow && (
        <div className="mb-3 transition-all rounded-xl border p-1 bg-primary-light border-white/10">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex items-center bg-primary-light/95 rounded-xl border border-white/5">
              <div className="pl-3 pr-2 py-2 w-full">
                <span className="text-[10px] text-text-secondary block">Я купую</span>
                <input
                  type="text"
                  value={buyInputValue}
                  onChange={(e) => handleBuyChange(e.target.value)}
                  onFocus={() => setFocusedInput('buy')}
                  aria-label="Сума купівлі"
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
                  value={((Number(buyInputValue.replace(/[^\d.]/g, '')) || 0) * (getEffectiveRate ? getEffectiveRate(bestBranchCurrency || buyCurrency, Number(buyInputValue.replace(/[^\d.]/g, '')) || 0, 'sell') : ((bestBranchCurrency || buyCurrency)?.sell_rate || 0))).toFixed(2)}
                  readOnly
                  aria-label="Необхідна сума"
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
      )}





      {(() => {
        const showSellRate = focusedInput === 'sell' || (!focusedInput && isSellMode);
        const currency = showSellRate ? sellCurrency : buyCurrency;

        const currentAmountStr = showSellRate ? sellInputValue : buyInputValue;
        const currentAmount = Number(currentAmountStr.replace(/[^\d.]/g, '')) || 0;

        const activeCurrObj = bestBranchCurrency || currency; // Modified to use bestBranchCurrency

        const retailRate = showSellRate ? (activeCurrObj?.buy_rate || 0) : (activeCurrObj?.sell_rate || 0);
        const wholesaleRate = showSellRate ? (activeCurrObj?.wholesale_buy_rate || 0) : (activeCurrObj?.wholesale_sell_rate || 0);

        let hasWholesale1 = activeCurrObj?.wholesale_threshold > 0 && wholesaleRate > 0;
        let threshold1 = activeCurrObj?.wholesale_threshold;
        let rate1 = wholesaleRate;

        // Custom Wholesale 2 logic if any
        const wholesale2Rate = showSellRate ? (activeCurrObj?.wholesale2_buy_rate || 0) : (activeCurrObj?.wholesale2_sell_rate || 0);
        let hasWholesale2 = activeCurrObj?.wholesale2_threshold > 0 && wholesale2Rate > 0;
        let threshold2 = activeCurrObj?.wholesale2_threshold;
        let rate2 = wholesale2Rate;

        const titleText = showSellRate ? 'Курс купівлі' : 'Курс продажу';

        let tiers = [];
        tiers.push({
          label: titleText,
          rateLabel: `1 ${currency?.code || 'USD'} = ${retailRate.toFixed(2)} UAH`,
          threshold: 0,
        });

        if (hasWholesale1) {
          tiers.push({
            label: `Опт від ${threshold1} ${currency?.code || 'USD'}`,
            rateLabel: `1 ${currency?.code || 'USD'} = ${rate1.toFixed(2)} UAH`,
            threshold: threshold1,
          });
        }
        if (hasWholesale2) {
          tiers.push({
            label: `Опт від ${threshold2} ${currency?.code || 'USD'}`,
            rateLabel: `1 ${currency?.code || 'USD'} = ${rate2.toFixed(2)} UAH`,
            threshold: threshold2,
          });
        }

        tiers.sort((a, b) => a.threshold - b.threshold);

        let activeIndex = 0;
        for (let i = tiers.length - 1; i >= 0; i--) {
          if (currentAmount >= tiers[i].threshold) {
            activeIndex = i;
            break;
          }
        }

        // Just to ensure if currentAmount is 0 we default to 0 index (retail)
        if (currentAmount === 0 && tiers.length > 0) activeIndex = 0;

        const activeRate = tiers[activeIndex]?.r || (showSellRate ? getEffectiveRate(activeCurrObj, currentAmount, 'buy') : getEffectiveRate(activeCurrObj, currentAmount, 'sell'));
        const totalUAH = currentAmount * activeRate;

        if (totalUAH > 400000) {
          return (
            <div className="flex flex-col gap-3 mt-4 mb-2">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                <p className="text-red-400 font-medium text-sm">
                  Вибачте, але по закону сума операції не може перевищувати 400 000 грн.
                </p>
              </div>
            </div>
          );
        }

        return (
          <>
            <div className="flex flex-col gap-1.5 mb-3">
              {tiers.map((tier, idx) => {
                const isActive = idx === activeIndex;
                const bgClass = isActive ? 'bg-[#4488FF] shadow-lg text-white' : 'bg-white/5 border border-white/10 text-white/80';
                const rateColor = isActive ? 'text-white' : 'text-accent-yellow';

                return (
                  <div key={idx} className={`flex justify-between items-center py-2 px-3 sm:px-4 rounded-xl transition-colors duration-300 ${bgClass}`}>
                    <span className={`text-xs sm:text-sm ${isActive ? 'font-medium' : ''}`}>{tier.label}</span>
                    <span className={`text-sm sm:text-base font-bold ${rateColor}`}>
                      {tier.rateLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="flex flex-col gap-3 mt-4 mb-3">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                  <p className="text-red-400 font-medium text-sm">
                    {error}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={onReserve}
              className={`w-full ${isMobile ? 'py-3 text-base' : 'py-4 text-lg'} bg-accent-yellow rounded-xl text-primary font-bold`}
            >
              Забронювати
            </button>
          </>
        );
      })()}

      {/* Relevancy Date below button */}
      {ratesUpdated && (
        <p className="text-center text-xs text-white/60 mt-4">
          {(() => {
            const dateObj = new Date(ratesUpdated);
            const formattedDate = dateObj.toLocaleDateString('uk-UA', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
            const pathname = window.location.pathname.replace(/\/$/, '');
            const isHomepage = pathname === '' || pathname === '/';
            const activeCurr = isSellMode ? sellCurrency : buyCurrency;

            // Show generic text only if on the homepage AND the currency is the default USD.
            if (isHomepage && activeCurr?.code === 'USD') {
              return `Актуальний курс валют станом на ${formattedDate}`;
            } else {
              return `Курс ${activeCurr?.code || ''} станом на ${formattedDate}`;
            }
          })()}
        </p>
      )}
    </div>
  );
}
