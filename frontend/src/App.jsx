import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { getStaticUrl } from './services/api';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, Outlet, useOutletContext } from 'react-router-dom';
// Critical above-fold components — keep eagerly loaded
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import Footer from './components/Footer';
import CurrencyModal from './components/CurrencyModal';
import ScrollToTopButton from './components/ScrollToTopButton';
import SeoTextBlock from './components/SeoTextBlock';
import { updateCanonicalTag, updateSchemaMarkup } from './services/seoUtils';

// Below-fold homepage sections — lazy loaded
const BranchesSection = lazy(() => import('./components/BranchesSection'));
const RatesSection = lazy(() => import('./components/RatesSection'));
const ServicesSection = lazy(() => import('./components/ServicesSection'));
const FAQSection = lazy(() => import('./components/FAQSection'));
const ChatSection = lazy(() => import('./components/ChatSection'));

// Modals & overlays — lazy loaded (only rendered on interaction)
const SuccessModal = lazy(() => import('./components/SuccessModal'));
const MobileNav = lazy(() => import('./components/MobileNav'));
const LiveChat = lazy(() => import('./components/LiveChat'));
const OfflineContactModal = lazy(() => import('./components/OfflineContactModal'));
const TelegramPopup = lazy(() => import('./components/TelegramPopup'));

// Pages — lazy loaded (separate routes)
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const OperatorDashboard = lazy(() => import('./pages/OperatorDashboard'));
const RatesPage = lazy(() => import('./pages/RatesPage'));
const ServicePage = lazy(() => import('./pages/ServicePage'));
const ContactsPage = lazy(() => import('./pages/ContactsPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const SeoPageView = lazy(() => import('./pages/SeoPageView'));

import {
  currencyService, branchService, settingsService, faqService, servicesService,
  reservationService, authService, restoreAuth, clearAuthCredentials, seoService, seoPageService
} from './services/api';

// Minimal loading fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-8 h-8 border-2 border-accent-yellow border-t-transparent rounded-full animate-spin" />
  </div>
);

// Public Layout: Handles State, Data Fetching, Header, Footer
function PublicLayout() {
  const { hash, pathname } = useLocation();
  const navigate = useNavigate();
  // Track previous path to detect navigation events
  const prevPathRef = useRef(pathname);
  const [currencies, setCurrencies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [settings, setSettings] = useState(null);
  const [faqItems, setFaqItems] = useState([]);
  const [services, setServices] = useState([]);
  const [crossRates, setCrossRates] = useState({});
  const [branchCurrencyMap, setBranchCurrencyMap] = useState({});
  const [currencyInfoMap, setCurrencyInfoMap] = useState({});
  const [headerCurrencies, setHeaderCurrencies] = useState([]);
  const [seoList, setSeoList] = useState([]);
  const [seoPages, setSeoPages] = useState([]);
  const [ratesUpdated, setRatesUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const lastProcessedPathname = useRef(null);

  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [currencyModalType, setCurrencyModalType] = useState('give');
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const [giveAmount, setGiveAmount] = useState(1000);
  const [giveCurrency, setGiveCurrency] = useState({ code: 'USD', name_uk: 'Долар', flag: '🇺🇸', buy_rate: 1, sell_rate: 1 });
  const [getCurrency, setGetCurrency] = useState({ code: 'UAH', name_uk: 'Гривня', flag: '🇺🇦' });
  const [getAmount, setGetAmount] = useState(0);
  const [activeBranch, setActiveBranch] = useState(null);

  // Track if user has interacted with form (prevents geo branch override)
  const isUserInteracted = useRef(false);

  // Independent Selection States
  const [sellCurrency, setSellCurrency] = useState({ code: 'USD', name_uk: 'Долар', flag: '🇺🇸', buy_rate: 1, sell_rate: 1 });
  const [buyCurrency, setBuyCurrency] = useState({ code: 'USD', name_uk: 'Долар', flag: '🇺🇸', buy_rate: 1, sell_rate: 1 });

  // Preset action from header dropdowns: { type: 'buy'|'sell', currency, timestamp }
  const [presetAction, setPresetAction] = useState(null);

  // Track previous currency/mode state to detect REAL state changes
  const prevStateRef = useRef({
    give: giveCurrency?.code,
    get: getCurrency?.code,
    mode: (giveCurrency?.code === 'UAH' && getCurrency?.code !== 'UAH') ? 'buy' : 'sell'
  });

  useEffect(() => {
    fetchData();

    // Setup polling every 10 seconds
    const intervalId = setInterval(() => {
      fetchData(true);
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  // Distance Calculation (Haversine)
  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // IP-based Geo Auto-Selection (Avoids browser prompt)
  useEffect(() => {
    // Only run if branches are loaded, no branch selected, and user hasn't interacted yet
    if (branches.length > 0 && !activeBranch && !loading && !isUserInteracted.current) {
      branchService.getMyLocation()
        .then(response => {
          // Double-check user hasn't interacted while request was in flight
          if (isUserInteracted.current) return;

          const { lat, lng } = response.data;
          let nearest = null;
          let minDistance = Infinity;

          branches.forEach(branch => {
            const bLat = Number(branch.lat);
            const bLng = Number(branch.lng);
            if (!isNaN(bLat) && !isNaN(bLng) && bLat !== 0 && bLng !== 0) {
              const distance = getDistance(lat, lng, bLat, bLng);
              if (distance < minDistance) {
                minDistance = distance;
                nearest = branch;
              }
            }
          });

          if (nearest) {
            setActiveBranch(nearest);
            handleBranchChange(nearest);
          }
        })
        .catch(() => {
          // Fallback handled by best rate logic
        });
    }
  }, [branches, activeBranch, loading]);
  // Run when branches defined. ActiveBranch check prevents override.

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
    const decodedPathname = decodeURIComponent(pathname);
    if (decodedPathname !== '/' && !decodedPathname.endsWith('/')) {
      console.log('Redirecting to slashed version:', decodedPathname + '/');
      navigate(decodedPathname + '/', { replace: true });
      return;
    }

    if (!loading && Object.keys(currencyInfoMap).length > 0) {
      if (lastProcessedPathname.current === pathname) {
        return;
      }

      // 1. Root Path - Do not force reset anymore to allow manual currency selection
      if (pathname === '/') {
        lastProcessedPathname.current = pathname;
        return;
      }

      // 2. Handle Specific SEO URLs
      const normalizedPath = decodedPathname.endsWith('/') && decodedPathname.length > 1 ? decodedPathname.slice(0, -1) : decodedPathname;

      const match = normalizedPath.match(/^\/(buy|sell)-([a-zA-Z]{3,})$/i);
      if (match) {
        const routeMode = match[1].toLowerCase();
        const routeCode = match[2].toUpperCase();

        if (currencyInfoMap[routeCode]) {
          lastProcessedPathname.current = pathname;
          if (routeMode === 'buy') {
            if (getCurrency.code === routeCode && giveCurrency.code === 'UAH') return;
            handlePresetExchange('buy', routeCode);
          } else {
            if (giveCurrency.code === routeCode && getCurrency.code === 'UAH') return;
            handlePresetExchange('sell', routeCode);
          }
          return;
        }
      }

      for (const [code, info] of Object.entries(currencyInfoMap)) {
        // Normalize DB URLs for comparison
        const normalize = (u) => {
          if (!u) return null;
          let res = u.trim();
          if (!res.startsWith('/')) res = '/' + res;
          if (res.endsWith('/') && res.length > 1) res = res.slice(0, -1);
          return res;
        };

        const normBuy = normalize(info.buy_url);
        const normSell = normalize(info.sell_url);

        if (normBuy && normalizedPath === normBuy) {
          lastProcessedPathname.current = pathname;
          if (getCurrency.code === code && giveCurrency.code === 'UAH') return;
          handlePresetExchange('buy', code);
          return;
        }
        if (normSell && normalizedPath === normSell) {
          lastProcessedPathname.current = pathname;
          if (giveCurrency.code === code && getCurrency.code === 'UAH') return;
          handlePresetExchange('sell', code);
          return;
        }
      }

      // If we got here and didn't match any currency path, just record it
      lastProcessedPathname.current = pathname;
    }
  }, [pathname, loading, currencyInfoMap, giveCurrency, getCurrency, currencies]);

  // Handle State -> URL & Metadata Sync
  useEffect(() => {
    if (loading || !currencies.length) return;

    // UPDATE CANONICAL & SCHEMA
    updateCanonicalTag(pathname);
    updateSchemaMarkup({ settings, activeBranch, branches, currencies, giveCurrency, getCurrency });

    let targetCode = null;
    let mode = null;

    if (giveCurrency.code === 'UAH' && getCurrency.code !== 'UAH') {
      mode = 'buy';
      targetCode = getCurrency.code;
    } else if (giveCurrency.code !== 'UAH' && getCurrency.code === 'UAH') {
      mode = 'sell';
      targetCode = giveCurrency.code;
    }

    // Check if the current route is known (404)
    const normalizePath = (u) => {
      if (!u) return null;
      try {
        let res = decodeURIComponent(u.trim().toLowerCase());
        if (!res.startsWith('/')) res = '/' + res;
        if (res.endsWith('/') && res.length > 1) res = res.slice(0, -1);
        return res;
      } catch (e) {
        let res = u.trim().toLowerCase();
        if (!res.startsWith('/')) res = '/' + res;
        if (res.endsWith('/') && res.length > 1) res = res.slice(0, -1);
        return res;
      }
    };

    const decodedPathname = decodeURIComponent(pathname);
    const cleanPathname = decodedPathname.endsWith('/') && decodedPathname.length > 1 ? decodedPathname.slice(0, -1) : decodedPathname;

    const isKnownSeoPath = Object.values(currencyInfoMap).some(inf => {
      const bUrl = inf.buy_url ? (inf.buy_url.endsWith('/') ? inf.buy_url : inf.buy_url + '/') : null;
      const sUrl = inf.sell_url ? (inf.sell_url.endsWith('/') ? inf.sell_url : inf.sell_url + '/') : null;
      return normalizePath(bUrl) === decodedPathname || normalizePath(sUrl) === decodedPathname;
    }) || !!decodedPathname.match(/^\/(buy|sell)-[a-zA-Z]{3,}\/$/i);
    const ratesUrl = settings?.rates_url || '/rates';
    const contactsUrl = settings?.contacts_url || '/contact/';
    const faqUrl = settings?.faq_url || '/faq/';
    const isKnownPage = pathname === '/' || pathname.startsWith('/services') || pathname.startsWith(ratesUrl) || pathname.startsWith('/rates') || pathname.startsWith(contactsUrl) || pathname.startsWith('/contact') || pathname.startsWith(faqUrl) || pathname.startsWith('/faq') || pathname.startsWith('/admin') || pathname.startsWith('/panel') || pathname.startsWith('/operator') || pathname.startsWith('/login');

    if (!isKnownPage && !isKnownSeoPath) {
      // It's a 404 path, let React Router handle it without syncing/redirecting (And don't overwrite the 404 title)
      return;
    }

    // 1. UPDATE METADATA (Title & Description) globally based on URL (Only for known pages)
    const activeSeo = seoList.find(s => {
      if (!s.url_path) return false;
      let dbPath = s.url_path.toLowerCase();
      if (!dbPath.startsWith('/')) dbPath = '/' + dbPath;
      if (!dbPath.endsWith('/') && dbPath.length > 1) dbPath = dbPath + '/';
      return dbPath === decodedPathname.toLowerCase();
    });

    if (activeSeo) {
      const metaTitle = activeSeo.title || activeSeo.h1 || 'Світ Валют';
      document.title = metaTitle.includes('Світ Валют') ? metaTitle : `${metaTitle} | Світ Валют`;

      const metaDescText = activeSeo.description || activeSeo.text || '';
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && metaDescText) {
        const plainText = metaDescText.replace(/<[^>]*>?/gm, '').substring(0, 160);
        metaDesc.setAttribute('content', plainText);
      }
    } else {
      document.title = 'Світ Валют | Обмін валют в Києві';
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', 'Обмін валют в Києві. Найкращі курси, безпечно та швидко.');
      }
    }


    if (targetCode && mode && currencyInfoMap[targetCode]) {
      const info = currencyInfoMap[targetCode];

      // Detect if the state actually changed compared to previous render
      const stateChanged =
        prevStateRef.current.give !== giveCurrency.code ||
        prevStateRef.current.get !== getCurrency.code ||
        prevStateRef.current.mode !== mode;

      // Update ref for next render
      prevStateRef.current = { give: giveCurrency.code, get: getCurrency.code, mode };

      // 2. Update URL if needed
      const targetUrl = mode === 'buy' ? (info.buy_url || `buy-${targetCode.toLowerCase()}`) : (info.sell_url || `sell-${targetCode.toLowerCase()}`);

      // Prevent automatic redirect from homepage to the default currency SEO URL (Sell USD) ON MOUNT ONLY
      const isOnDedicatedPage = pathname.startsWith(contactsUrl) || pathname.startsWith('/contact') || pathname.startsWith(faqUrl) || pathname.startsWith('/faq') || pathname.startsWith('/services') || pathname.startsWith('/rates') || pathname.startsWith(ratesUrl);

      // Check if path just changed (navigation event)
      const pathChanged = pathname !== prevPathRef.current;
      prevPathRef.current = pathname;

      if (isOnDedicatedPage) {
        // Don't redirect when on dedicated pages
      } else if (isKnownSeoPath) {
        // If we are on a valid SEO path, we trust the URL and let the URL -> State effect handle the rest.
        // We ONLY redirect if the state has definitively changed to a DIFFERENT mode/currency 
        // AND we are not on one of the valid URL options for that new state.

        const expectedPath = targetUrl.startsWith('/') ? targetUrl : '/' + targetUrl;
        const normalizedExpected = expectedPath.endsWith('/') && expectedPath.length > 1 ? expectedPath.slice(0, -1) : expectedPath;
        const normalizedCurrent = cleanPathname;

        if (normalizedCurrent !== normalizedExpected) {
          // IMPORTANT FIX: Only redirect if the STATE changed (user action)
          // or IF the path changed AND it doesn't match the state (not the case here usually)
          if (stateChanged && !pathChanged) {
            navigate(expectedPath, { replace: true });
          }
        }
      } else if (targetUrl && pathname !== targetUrl && pathname !== '/' + targetUrl) {
        // For non-SEO paths (like home), redirect to formal SEO path IF state changed
        const isDefaultUSDOnRoot = pathname === '/' && mode === 'sell' && targetCode === 'USD';

        if (!isDefaultUSDOnRoot && stateChanged && !pathChanged) {
          const expectedPath = targetUrl.startsWith('/') ? targetUrl : '/' + targetUrl;
          navigate(expectedPath, { replace: true });
        }
      }
    } else {
      // Intentionally DO NOT redirect to '/' here for unknown pages.
      // Doing so prevents the <Route path="*" element={<NotFoundPage />} /> from ever being reached.
      // Let React Router handle the 404 state.
    }
  }, [giveCurrency, getCurrency, loading, currencyInfoMap, pathname, navigate, currencies, seoList]);

  useEffect(() => {
    if (loading) return; // Don't calculate until all data is loaded
    calculateExchange();
  }, [giveAmount, giveCurrency, getCurrency, crossRates, loading]);

  const fetchData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const [currenciesRes, branchesRes, settingsRes, faqRes, servicesRes, crossRatesRes, ratesRes, currInfoRes, seoRes, seoPagesRes] = await Promise.all([
        currencyService.getAll(),
        branchService.getAll(),
        settingsService.get(),
        faqService.getAll(),
        servicesService.getAll(),
        currencyService.getCrossRates(),
        currencyService.getRates(),
        currencyService.getAllCurrencyInfo().catch(() => ({ data: {} })),
        seoService.getPublicAll().catch(() => ({ data: [] })),
        seoPageService.getPublicAll().catch(() => ({ data: [] })),
      ]);

      setCurrencyInfoMap(currInfoRes.data || {});
      setSeoList(seoRes.data || []);
      setSeoPages(seoPagesRes.data || []);

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
          wholesale_buy_rate: meta.wholesale_buy_rate,
          wholesale_sell_rate: meta.wholesale_sell_rate,
          wholesale_threshold: meta.wholesale_threshold,
          is_popular: meta.is_popular || false,
        };
      });

      const uah = { code: 'UAH', name_uk: 'Гривня', flag: '🇺🇦', buy_rate: 1, sell_rate: 1 };
      const finalCurrencies = baseCurrencies.length > 0 ? baseCurrencies : allCurrs;

      let currenciesResolved = false;
      // setCurrencies(finalCurrencies); // MOVED: To prevent zero-rate flash, we wait for branch rates


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

      // MOVED: Initial state setting moved to after branch confirmation to ensure best rates
      /*
      if (finalCurrencies.length > 0) {
        const defaultCurrency = finalCurrencies.find(c => c.code === 'USD') || finalCurrencies[0];
        setGiveCurrency(defaultCurrency);
        setGetCurrency(uah);
        setSellCurrency(defaultCurrency);
        setBuyCurrency(defaultCurrency);
      }
      */

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
              const meta = currencyMeta[c.code] || {}; // Always needed for merging
              const baseRateObj = baseRates[c.code] || {};

              const merged = { ...meta, ...c };

              // Fallback to base rates if branch rates are missing/zero, BUT ONLY if active.
              // If it's explicitly disabled (is_active === false), keep the 0 rates so it shows as unavailable.
              if (merged.is_active !== false) {
                if (!merged.buy_rate && baseRateObj.buy) merged.buy_rate = baseRateObj.buy;
                if (!merged.sell_rate && baseRateObj.sell) merged.sell_rate = baseRateObj.sell;
              }

              // Fallback for wholesale if branch is missing/zero
              if (!merged.wholesale_buy_rate) merged.wholesale_buy_rate = meta.wholesale_buy_rate;
              if (!merged.wholesale_sell_rate) merged.wholesale_sell_rate = meta.wholesale_sell_rate;
              if (!merged.wholesale_threshold) merged.wholesale_threshold = meta.wholesale_threshold;

              if (!currencyMap.has(c.code)) {
                currencyMap.set(c.code, merged);
              } else {
                // If existing entry has 0 rates, but this branch has valid rates, update it
                // This prevents initial load from showing 0.00 if the first branch was bad
                const existing = currencyMap.get(c.code);
                const hasValidRates = (c.buy_rate > 0 || c.sell_rate > 0);
                const existingHasRates = (existing.buy_rate > 0 || existing.sell_rate > 0);

                if (hasValidRates && !existingHasRates) {
                  currencyMap.set(c.code, merged);
                }
              }
            });
          });
        } catch (err) {
          console.error('Failed to load branch currencies:', err);
        }
        setBranchCurrencyMap(branchMap);

        const allBranchCurrencies = Array.from(currencyMap.values());
        if (allBranchCurrencies.length > 0) {
          // Remove UAH (if unwanted) but user asked for "ALL". I'll apply sort order anyway.
          // Priority Currencies: USD, EUR, PLN, GBP, CHF
          const PRIORITY = ['USD', 'EUR', 'PLN', 'GBP', 'CHF'];
          const sorted = [...allBranchCurrencies].sort((a, b) => {
            const idxA = PRIORITY.indexOf(a.code);
            const idxB = PRIORITY.indexOf(b.code);

            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return 0;
          });

          setCurrencies(allBranchCurrencies); // Keep main currencies list raw? Or sorted? User said HEADER dropdowns.
          // Set header currencies to the unique list from all branches (user request)
          setHeaderCurrencies(sorted);
          if (!isBackground) {
            // Determine initial currency based on URL OR fallback to USD
            let initialCode = 'USD';
            let initialMode = 'sell'; // default mode

            const decodedPath = decodeURIComponent(pathname);
            const normalizedPath = (decodedPath.endsWith('/') && decodedPath.length > 1 ? decodedPath.slice(0, -1) : decodedPath).toLowerCase();

            // Check standard patterns (/sell-usd, /buy-eur)
            const match = normalizedPath.match(/^\/(buy|sell)-([a-zA-Z]{3,})$/i);
            if (match) {
              initialMode = match[1].toLowerCase();
              initialCode = match[2].toUpperCase();
            } else {
              // Check SEO map with robust normalization
              const normalize = (u) => {
                if (!u) return null;
                try {
                  let res = decodeURIComponent(u.trim());
                  if (!res.startsWith('/')) res = '/' + res;
                  if (res.endsWith('/') && res.length > 1) res = res.slice(0, -1);
                  return res.toLowerCase();
                } catch (e) {
                  let res = u.trim();
                  if (!res.startsWith('/')) res = '/' + res;
                  if (res.endsWith('/') && res.length > 1) res = res.slice(0, -1);
                  return res.toLowerCase();
                }
              };

              for (const [code, info] of Object.entries(currInfoRes.data || {})) {
                const normBuy = normalize(info.buy_url);
                const normSell = normalize(info.sell_url);

                if (normBuy && normalizedPath === normBuy) {
                  initialCode = code;
                  initialMode = 'buy';
                  break;
                }
                if (normSell && normalizedPath === normSell) {
                  initialCode = code;
                  initialMode = 'sell';
                  break;
                }
              }
            }

            const targetCurrency = allBranchCurrencies.find(c => c.code === initialCode) || allBranchCurrencies.find(c => c.code === 'USD') || allBranchCurrencies[0];

            if (initialMode === 'buy') {
              setGiveCurrency(uah);
              setGetCurrency(targetCurrency);
            } else {
              setGiveCurrency(targetCurrency);
              setGetCurrency(uah);
            }
            setSellCurrency(targetCurrency);
            setBuyCurrency(targetCurrency);
          } else {
            setGiveCurrency(prev => prev?.code !== 'UAH' ? (allBranchCurrencies.find(c => c.code === prev.code) || prev) : prev);
            setGetCurrency(prev => prev?.code !== 'UAH' ? (allBranchCurrencies.find(c => c.code === prev.code) || prev) : prev);
            setSellCurrency(prev => allBranchCurrencies.find(c => c.code === prev?.code) || prev);
            setBuyCurrency(prev => allBranchCurrencies.find(c => c.code === prev?.code) || prev);
          }
          currenciesResolved = true;
        }
      }

      // Fallback if no branches or branch fetching failed
      if (!currenciesResolved) {
        setCurrencies(finalCurrencies);
        if (finalCurrencies.length > 0) {
          if (!isBackground) {
            // Same logic: try to grab from URL
            let initialCode = 'USD';
            let initialMode = 'sell';

            const decodedPath = decodeURIComponent(pathname);
            const normalizedPath = decodedPath.endsWith('/') && decodedPath.length > 1 ? decodedPath.slice(0, -1) : decodedPath;

            const match = normalizedPath.match(/^\/(buy|sell)-([a-zA-Z]{3,})/i);
            if (match) {
              initialMode = match[1].toLowerCase();
              initialCode = match[2].toUpperCase();
            }

            const targetCurrency = finalCurrencies.find(c => c.code === initialCode) || finalCurrencies.find(c => c.code === 'USD') || finalCurrencies[0];

            if (initialMode === 'buy') {
              setGiveCurrency(uah);
              setGetCurrency(targetCurrency);
            } else {
              setGiveCurrency(targetCurrency);
              setGetCurrency(uah);
            }
            setSellCurrency(targetCurrency);
            setBuyCurrency(targetCurrency);
          } else {
            setGiveCurrency(prev => prev?.code !== 'UAH' ? (finalCurrencies.find(c => c.code === prev.code) || prev) : prev);
            setGetCurrency(prev => prev?.code !== 'UAH' ? (finalCurrencies.find(c => c.code === prev.code) || prev) : prev);
            setSellCurrency(prev => finalCurrencies.find(c => c.code === prev?.code) || prev);
            setBuyCurrency(prev => finalCurrencies.find(c => c.code === prev?.code) || prev);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Fallback logic omitted for brevity, keeping same structure
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const calculateExchange = () => {
    if (giveCurrency.code === 'UAH') {
      // User BUYS Foreign Currency (gives UAH)
      // We SELL to user.
      const threshold = getCurrency.wholesale_threshold || 0;
      const isWholesaleEnabled = threshold > 0;
      let rate = getCurrency.sell_rate || 0;

      // Calculate tentative amount
      let amount = rate > 0 ? giveAmount / rate : 0;

      // Check threshold (Amount is in Foreign)
      if (isWholesaleEnabled && amount >= threshold && getCurrency.wholesale_sell_rate > 0) {
        rate = getCurrency.wholesale_sell_rate;
        amount = giveAmount / rate;
      }
      setGetAmount(amount);


    } else if (getCurrency.code === 'UAH') {
      // User SELLS Foreign Currency (gets UAH)
      // We BUY from user.
      const threshold = giveCurrency.wholesale_threshold || 0;
      const isWholesaleEnabled = threshold > 0;
      let rate = giveCurrency.buy_rate || 0;

      // Check threshold (Amount is in Foreign - giveAmount)
      if (isWholesaleEnabled && giveAmount >= threshold && giveCurrency.wholesale_buy_rate > 0) {
        rate = giveCurrency.wholesale_buy_rate;
      }

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
      // Force "Sell" mode when selecting a currency in the "Sell" row
      setGiveCurrency(currency);
      setGetCurrency({ code: 'UAH', name_uk: 'Гривня', flag: '🇺🇦', buy_rate: 1, sell_rate: 1 });
    } else if (currencyModalType === 'buy_currency') {
      setBuyCurrency(currency);
      // Force "Buy" mode when selecting a currency in the "Buy" row
      setGetCurrency(currency);
      setGiveCurrency({ code: 'UAH', name_uk: 'Гривня', flag: '🇺🇦', buy_rate: 1, sell_rate: 1 });
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

  // Auto-Select Branch with Best Rate
  const prevGiveCode = useRef(giveCurrency?.code);
  const prevGetCode = useRef(getCurrency?.code);

  useEffect(() => {
    if (!branches || branches.length === 0 || Object.keys(branchCurrencyMap).length === 0) return;

    const giveChanged = giveCurrency.code !== prevGiveCode.current;
    const getChanged = getCurrency.code !== prevGetCode.current;

    // Update refs
    prevGiveCode.current = giveCurrency.code;
    prevGetCode.current = getCurrency.code;

    // If currency codes haven't changed (e.g. just a rate update due to branch change)
    // AND we already have an active branch,
    // DO NOT invoke auto-branch selection. This allows manual branch selection to stick.
    // Exception: Initial load (when activeBranch is null).
    const isInitialLoad = !activeBranch;

    // FIX: If we already have an active branch, NEVER auto-switch even if currency changes (e.g. Sell -> Buy mode).
    // The user's manual selection should persist unless they explicitly change it or the branch doesn't support the new currency.
    if (!isInitialLoad) {
      return;
    }

    let targetCode = null;
    let type = null; // 'buy' (User gives UAH, Bank Sells) or 'sell' (User gets UAH, Bank Buys)



    if (giveCurrency.code === 'UAH' && getCurrency.code !== 'UAH') {
      targetCode = getCurrency.code;
      type = 'sell'; // Bank Sells Foreign -> Find Min Sell Rate
    } else if (getCurrency.code === 'UAH' && giveCurrency.code !== 'UAH') {
      targetCode = giveCurrency.code;
      type = 'buy'; // Bank Buys Foreign -> Find Max Buy Rate
    } else {
      // Cross-rate or incomplete state, ignore for now
      return;
    }

    if (!targetCode) return;

    let bestBranch = null;
    let bestRateObj = null;

    branches.forEach(branch => {
      const rates = branchCurrencyMap[branch.id];
      if (!rates) return;

      const currency = rates.find(c => c.code === targetCode);
      // STRICT CHECK: If this branch doesn't have the currency, skip it.
      if (!currency) return;

      if (type === 'sell') {
        const rate = currency.sell_rate;
        if (rate <= 0) return;
        // Find LOWEST (Cheapest) Sell Rate
        if (!bestRateObj || rate < bestRateObj.rate) {
          bestRateObj = { rate, branch };
        }
      } else {
        const rate = currency.buy_rate;
        if (rate <= 0) return;
        // Find HIGHEST (Best Return) Buy Rate
        if (!bestRateObj || rate > bestRateObj.rate) {
          bestRateObj = { rate, branch };
        }
      }
    });

    if (bestRateObj) {
      if (!activeBranch || activeBranch.id !== bestRateObj.branch.id) {
        handleBranchChange(bestRateObj.branch);
      }
    } else {
      // No branch supports this currency?
      // We might want to clear activeBranch or show error, but for now let's just do nothing.
    }

  }, [giveCurrency, getCurrency, branches, branchCurrencyMap, activeBranch]); // Added activeBranch to ensure it runs when activeBranch is initially null then becomes populated? No, we want it to run when it IS null.

  const handleBranchChange = async (branch) => {
    setActiveBranch(branch);
    try {
      // Use cached branch rates if available, otherwise fetch
      let branchRatesList = branchCurrencyMap[branch.id];

      if (!branchRatesList) {
        const ratesRes = await currencyService.getBranchRates(branch.id);
        branchRatesList = ratesRes.data.filter(c => c.code !== 'UAH');
      }

      // Merge branch rates with ALL active currencies (headerCurrencies)
      // This ensures we don't lose a currency just because the branch doesn't have a rate for it.
      const mergedCurrencies = headerCurrencies.map(base => {
        const branchRate = branchRatesList?.find(br => br.code === base.code);
        if (branchRate) {
          const isActive = branchRate.is_active !== false;
          // Fallback to base rates if branch rates are zero
          // Also fallback for wholesale if branch rate has them as 0
          return {
            ...branchRate,
            buy_rate: (isActive && branchRate.buy_rate === 0) ? (base.buy_rate || 0) : branchRate.buy_rate,
            sell_rate: (isActive && branchRate.sell_rate === 0) ? (base.sell_rate || 0) : branchRate.sell_rate,
            wholesale_buy_rate: (isActive && branchRate.wholesale_buy_rate === 0) ? (base.wholesale_buy_rate || 0) : branchRate.wholesale_buy_rate,
            wholesale_sell_rate: (isActive && branchRate.wholesale_sell_rate === 0) ? (base.wholesale_sell_rate || 0) : branchRate.wholesale_sell_rate,
            wholesale_threshold: (branchRate.wholesale_threshold > 0) ? branchRate.wholesale_threshold : (base.wholesale_threshold || 1000)
          };
        }
        // Fallback: Return base currency structure but with 0 rates to indicate "On Request"
        // actually if we have base rates, we should use them here too!
        return {
          ...base,
          // If accessing via this path, it means branch doesn't have the currency record at all.
          // We can use base rates as indicative.
          buy_rate: base.buy_rate || 0,
          sell_rate: base.sell_rate || 0,
          wholesale_buy_rate: base.wholesale_buy_rate || 0,
          wholesale_sell_rate: base.wholesale_sell_rate || 0,
          wholesale_threshold: base.wholesale_threshold || 1000
        };
      });

      setCurrencies(mergedCurrencies);

      if (mergedCurrencies.length > 0) {
        // Use functional state updates to prevent stale closures (e.g., from geo location overriding URL state)
        setSellCurrency(prev => mergedCurrencies.find(c => c.code === prev?.code) || mergedCurrencies.find(c => c.code === 'USD') || mergedCurrencies[0]);
        setBuyCurrency(prev => mergedCurrencies.find(c => c.code === prev?.code) || mergedCurrencies.find(c => c.code === 'USD') || mergedCurrencies[0]);

        setGiveCurrency(prev => prev?.code !== 'UAH' ? (mergedCurrencies.find(c => c.code === prev.code) || mergedCurrencies.find(c => c.code === 'USD') || mergedCurrencies[0]) : prev);
        setGetCurrency(prev => prev?.code !== 'UAH' ? (mergedCurrencies.find(c => c.code === prev.code) || mergedCurrencies.find(c => c.code === 'USD') || mergedCurrencies[0]) : prev);
      }
    } catch (error) {
      console.error('Error fetching branch rates:', error);
    }
  };

  const handleReservation = async (data) => {
    try {
      const response = await reservationService.create(data);
      setSuccessModalOpen(true);
      setGiveAmount(1000);
    } catch (error) {
      console.error('Reservation error:', error);
      throw new Error(error.response?.data?.detail || 'Помилка створення бронювання');
    }
  };

  const handlePresetExchange = (type, currencyCode) => {
    const uah = currencies.find(c => c.code === 'UAH') || { code: 'UAH', name_uk: 'Гривня', flag: '🇺🇦', buy_rate: 1, sell_rate: 1 };

    if (type === 'reset') {
      const defaultFx = currencies.find(c => c.code === 'USD') || currencies[0];
      setGiveCurrency(defaultFx);
      setGetCurrency(uah);
      setSellCurrency(defaultFx);
      setBuyCurrency(defaultFx);
      setGiveAmount(1000); // Only reset on explicit 'reset' action
      setPresetAction(null);
      navigate('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const targetCurrency = currencies.find(c => c.code === currencyCode);
    if (!targetCurrency) return;

    if (type === 'buy') {
      setGiveCurrency(uah);
      setGetCurrency(targetCurrency);
    } else {
      setGiveCurrency(targetCurrency);
      setGetCurrency(uah);
    }

    setBuyCurrency(targetCurrency);
    setSellCurrency(targetCurrency);

    // GiveAmount reset removed here so the form maintains its state
    setPresetAction({ type, currency: targetCurrency, timestamp: Date.now() });

    // Check if current path is already the correct SEO URL for this currency/mode
    // If so, do NOT navigate to /
    const decodedPathname = decodeURIComponent(pathname);
    const normalizedPath = decodedPathname.endsWith('/') && decodedPathname.length > 1 ? decodedPathname.slice(0, -1) : decodedPathname;

    let isCorrectUrl = false;
    const info = currencyInfoMap[targetCurrency.code];
    if (info) {
      const buyUrl = info.buy_url ? (info.buy_url.startsWith('/') ? info.buy_url : '/' + info.buy_url) : null;
      const sellUrl = info.sell_url ? (info.sell_url.startsWith('/') ? info.sell_url : '/' + info.sell_url) : null;
      const cleanBuy = buyUrl && buyUrl.endsWith('/') && buyUrl.length > 1 ? buyUrl.slice(0, -1) : buyUrl;
      const cleanSell = sellUrl && sellUrl.endsWith('/') && sellUrl.length > 1 ? sellUrl.slice(0, -1) : sellUrl;

      if (type === 'buy' && normalizedPath === cleanBuy) isCorrectUrl = true;
      if (type === 'sell' && normalizedPath === cleanSell) isCorrectUrl = true;
    }

    // Ensure we are on home page (or the correct SEO page)
    if (pathname !== '/' && !isCorrectUrl) {
      navigate('/');
    }
  };

  // Chat toggle logic based on Kyiv working hours
  const handleOpenChatAction = () => {
    const now = new Date();
    const kyivTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
    const totalMinutes = kyivTime.getHours() * 60 + kyivTime.getMinutes();

    // Working hours: 08:00 to 20:00 (480 to 1200 minutes)
    const isOnline = totalMinutes >= 480 && totalMinutes <= 1200;

    if (isOnline) {
      setChatOpen(true);
    } else {
      setOfflineModalOpen(true);
    }
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
    seoList,
    seoPages,
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
    onOpenChat: handleOpenChatAction,
    loading,
    isUserInteracted
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <Header
        onMenuToggle={() => setMobileMenuOpen(true)}
        onOpenChat={handleOpenChatAction}
        settings={settings}
        currencies={headerCurrencies}
        currencyInfoMap={currencyInfoMap}
        services={services}
        branches={branches}
        onPresetExchange={handlePresetExchange}
      />
      <Suspense fallback={null}>
        <MobileNav
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          settings={settings}
          currencies={headerCurrencies}
          services={services}
          onPresetExchange={handlePresetExchange}
          currencyInfoMap={currencyInfoMap}
        />
      </Suspense>

      <main className="flex-grow flex flex-col">
        <Outlet context={contextValue} />
      </main>

      {/* Global Homepage SEO section — before footer */}
      {pathname === '/' && settings?.homepage_seo_text && (
        <section className="py-12 px-4 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <SeoTextBlock
              html={settings.homepage_seo_text}
              className="text-sm"
              maxLines={5}
              prose
            />
          </div>
        </section>
      )}

      <Footer settings={settings} />

      <CurrencyModal
        isOpen={currencyModalOpen}
        onClose={() => setCurrencyModalOpen(false)}
        currencies={currencies}
        onSelect={handleCurrencySelect}
        type={currencyModalType}
      />

      <Suspense fallback={null}>
        <SuccessModal
          isOpen={successModalOpen}
          onClose={() => setSuccessModalOpen(false)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <LiveChat
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <OfflineContactModal
          isOpen={offlineModalOpen}
          onClose={() => setOfflineModalOpen(false)}
          settings={settings}
        />
      </Suspense>

      {!chatOpen && !offlineModalOpen && (() => {
        const now = new Date();
        const kyivTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
        const totalMinutes = kyivTime.getHours() * 60 + kyivTime.getMinutes();
        const fabOnline = totalMinutes >= 480 && totalMinutes <= 1200;
        return (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
            {/* Phone Button (Mobile Only) */}
            {settings?.phone && (
              <a
                href={`tel:${settings.phone.replace(/[^\d+]/g, '')}`}
                className="md:hidden flex items-center gap-3 bg-[#4488FF] text-white rounded-full h-14 px-5 shadow-lg hover:bg-blue-600 transition-colors"
              >
                <svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <div className="flex flex-col pr-1">
                  <span className="text-sm font-bold leading-tight">{settings.phone}</span>
                  <span className="text-[10px] text-[#0f2c4c] font-medium leading-tight">Щодня з 8:00 до 20:00</span>
                </div>
              </a>
            )}

            {/* Chat Button */}
            <button
              onClick={handleOpenChatAction}
              aria-label="Відкрити чат"
              className="w-14 h-14 bg-accent-yellow rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform relative shrink-0"
            >
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {/* Status dot */}
              <span className={`absolute top-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-primary ${fabOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            </button>
          </div>
        );
      })()}

      <ScrollToTopButton />
    </div>
  );
}

function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
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
    seoList,
    seoPages,
    services,
    faqItems,
    loading,
    isUserInteracted
  } = useOutletContext();

  // Detect current currency SEO info ONLY from URL
  const pathname = decodeURIComponent(location.pathname);
  const normalizedPath = (pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname).toLowerCase();
  const slug = normalizedPath.replace(/^\//, '');

  let urlIsSellMode = false;

  let pathCurrency = Object.values(currencyInfoMap || {}).find(info => {
    const normalize = (u) => {
      if (!u) return null;
      try {
        let res = decodeURIComponent(u.trim().toLowerCase());
        if (!res.startsWith('/')) res = '/' + res;
        if (res.endsWith('/') && res.length > 1) res = res.slice(0, -1);
        return res;
      } catch (e) {
        let res = u.trim().toLowerCase();
        if (!res.startsWith('/')) res = '/' + res;
        if (res.endsWith('/') && res.length > 1) res = res.slice(0, -1);
        return res;
      }
    };
    const normBuy = normalize(info.buy_url);
    const normSell = normalize(info.sell_url);
    if (normSell && normalizedPath === normSell) {
      urlIsSellMode = true;
      return true;
    }
    if (normBuy && normalizedPath === normBuy) {
      urlIsSellMode = false;
      return true;
    }
    return false;
  }) || null;

  let isFallbackCurrencyRoute = false;
  if (!pathCurrency) {
    const match = normalizedPath.match(/^\/(buy|sell)-([a-zA-Z]{3,})$/i);
    if (match) {
      urlIsSellMode = match[1].toLowerCase() === 'sell';
      const code = match[2].toUpperCase();
      if (currencyInfoMap && currencyInfoMap[code]) {
        pathCurrency = currencyInfoMap[code];
      } else {
        // Allow fallback rendering if the currency code simply exists in active branches
        if (currencies?.some(c => c.code === code)) {
          isFallbackCurrencyRoute = true;
        }
      }
    } else {
      // Fallback for missing path currencies but matching old static pattern
      urlIsSellMode = normalizedPath.includes('/продати-') || normalizedPath.startsWith('/sell-') || normalizedPath.includes('/продать-');
    }
  }

  // Dynamic route resolution for custom contacts URL and service link URLs
  const contactsPath = (settings?.contacts_url || '/contact/').replace(/^\//, '').replace(/\/$/, '');
  if (slug && slug === contactsPath) {
    return <ContactsPage />;
  }

  // Check if slug matches custom FAQ URL
  const faqPath = (settings?.faq_url || '/faq/').replace(/^\//, '').replace(/\/$/, '');
  if (slug && slug === faqPath) {
    return <FAQPage />;
  }

  // Check if slug matches custom Rates URL
  const ratesPath = (settings?.rates_url || '/rates/').replace(/^\//, '').replace(/\/$/, '');
  if (slug && slug === ratesPath) {
    return <RatesPage />;
  }

  // Check if slug matches any service link_url
  const matchedService = services?.find(s => {
    if (!s.link_url) return false;
    const svcSlug = s.link_url.replace(/^\//, '');
    return svcSlug === slug;
  });
  if (slug && matchedService) {
    return <ServicePage />;
  }

  // Check if slug matches an SEO page
  const matchedSeoPage = seoPages?.find(p => p.slug === slug);
  if (slug && matchedSeoPage) {
    return <SeoPageView />;
  }

  // White-list dedicated React Router paths so they don't get intercepted by the catch-all /:slug 404
  const dedicatedSPA_Routes = [
    'login', 'admin', 'operator', 'panel',
    'rates', 'services', 'contact', 'faq', 'articles',
    contactsPath, faqPath, ratesPath
  ];

  const cleanPathname = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  const reqPath = cleanPathname.toLowerCase();
  const activeSeo = seoList.find(s => {
    if (!s.url_path) return false;
    const dbPath = s.url_path.toLowerCase();
    return dbPath === reqPath || dbPath === reqPath + '/';
  });

  // If a slug is present but it's not a recognized currency URL, not a dedicated SPA route, and not an SEO page, render the 404 page.
  if (slug && !dedicatedSPA_Routes.includes(slug) && !loading && !pathCurrency && !isFallbackCurrencyRoute && !activeSeo) {
    return <NotFoundPage />;
  }

  // Detect form-based currency info
  const formIsSellMode = giveCurrency?.code !== 'UAH';

  // Final active determine of sell mode
  const isSellMode = slug ? urlIsSellMode : formIsSellMode;

  // STRICT URL-BASED SEO:
  // If we are on a known URL, show its SEO. Otherwise, nothing.
  const activeCurrencyInfo = slug ? pathCurrency : null;

  const activeH1 = activeSeo?.h1 || null;
  const activeH2 = activeSeo?.h2 || null;
  const activeImage = activeSeo?.image_url || null;
  const currencySeoText = activeSeo?.text || null;

  // Global homepage SEO text (ONLY on root path)
  const homepageSeoText = !slug ? settings?.homepage_seo_text : null;

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
        currencySeoText={currencySeoText}
        activeCurrencyInfo={activeCurrencyInfo}
        activeSeo={activeSeo}
        ratesUpdated={ratesUpdated}
        isUserInteracted={isUserInteracted}
      />
      <FeaturesSection settings={settings} />

      {/* Currency SEO section — display image then text, centered, no duplicate headings */}
      {(activeCurrencyInfo || currencySeoText || activeH2) && (
        <section className="py-16 px-4 lg:px-8 relative">
          <div className="max-w-4xl mx-auto flex flex-col gap-8">
            {/* Image (Top) */}
            {activeImage && (
              <div className="w-full max-w-2xl mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent z-10"></div>
                <img
                  src={getStaticUrl(activeImage)}
                  alt={activeH1 || 'SEO Image'}
                  className="w-full aspect-[16/9] object-cover relative z-0"
                />
              </div>
            )}

            {/* Text Content (Bottom) */}
            <div className="w-full text-left">
              {activeH2 && (
                <h2 className="text-3xl font-bold mb-6 text-white">{activeH2}</h2>
              )}
              {currencySeoText && (
                <SeoTextBlock
                  html={currencySeoText}
                  className="text-base"
                  maxLines={8}
                  prose
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* Global Homepage SEO section */}
      {homepageSeoText && (
        <section className="py-12 px-4 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <SeoTextBlock
              html={homepageSeoText}
              className="text-sm"
              maxLines={5}
              prose
            />
          </div>
        </section>
      )}

      <Suspense fallback={<LoadingFallback />}>
        <ChatSection settings={settings} />
        <BranchesSection branches={branches} settings={settings} />
        <RatesSection currencies={currencies} crossRates={crossRates} updatedAt={ratesUpdated} settings={settings} />
        <ServicesSection services={services} />
        <FAQSection faqItems={faqItems} />

        {/* Telegram Promo Popup */}
        <TelegramPopup telegramUrl={settings?.footer_telegram_url} />
      </Suspense>

    </>
  );
}

function ProtectedRoute({ children, user, requiredRole }) {
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/panel" replace />;
  return children;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
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
      <ScrollToTop />
      <Suspense fallback={
        <div className="min-h-screen bg-primary flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-accent-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <Routes>
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="rates" element={<RatesPage />} />
            <Route path="services/:slug" element={<ServicePage />} />
            <Route path="contact" element={<ContactsPage />} />
            <Route path="faq" element={<FAQPage />} />
            <Route path="articles/:id" element={<FAQPage />} />
            <Route path=":slug" element={<HomePage />} />
            <Route path="*" element={<NotFoundPage />} />
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
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
