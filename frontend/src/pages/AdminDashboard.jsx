import { useState, useEffect, useRef } from 'react';
import { 
  Upload, Download, LogOut, RefreshCw, CheckCircle, 
  XCircle, Clock, DollarSign, TrendingUp, FileSpreadsheet,
  AlertCircle, ChevronDown, Search, Building2, ArrowRightLeft,
  MapPin
} from 'lucide-react';
import { adminService, currencyService } from '../services/api';
import SettingsPage from './SettingsPage';
import * as XLSX from 'xlsx';

const STATUS_CONFIG = {
  pending: { label: 'Очікує', color: 'text-yellow-400 bg-yellow-400/10', icon: Clock },
  confirmed: { label: 'Підтверджено', color: 'text-blue-400 bg-blue-400/10', icon: CheckCircle },
  completed: { label: 'Завершено', color: 'text-green-400 bg-green-400/10', icon: CheckCircle },
  cancelled: { label: 'Скасовано', color: 'text-red-400 bg-red-400/10', icon: XCircle },
  expired: { label: 'Прострочено', color: 'text-gray-400 bg-gray-400/10', icon: XCircle },
};

// Default currencies for template
const DEFAULT_CURRENCIES = [
  { code: 'USD', name: 'Долар США', buy: 42.10, sell: 42.15 },
  { code: 'EUR', name: 'Євро', buy: 49.30, sell: 49.35 },
  { code: 'PLN', name: 'Польський злотий', buy: 11.50, sell: 11.65 },
  { code: 'GBP', name: 'Фунт стерлінгів', buy: 56.10, sell: 56.25 },
  { code: 'CHF', name: 'Швейцарський франк', buy: 52.80, sell: 52.95 },
  { code: 'CAD', name: 'Канадський долар', buy: 31.20, sell: 31.35 },
  { code: 'AUD', name: 'Австралійський долар', buy: 30.40, sell: 30.55 },
  { code: 'CZK', name: 'Чеська крона', buy: 1.85, sell: 1.90 },
  { code: 'TRY', name: 'Турецька ліра', buy: 1.22, sell: 1.28 },
  { code: 'JPY', name: 'Японська єна', buy: 0.28, sell: 0.29 },
];

const DEFAULT_BRANCHES = [
  { id: 1, address: 'вул. Старовокзальна, 23' },
  { id: 2, address: 'вул. В. Васильківська, 110' },
  { id: 3, address: 'вул. В. Васильківська, 130' },
  { id: 4, address: 'вул. Р. Окіпної, 2' },
  { id: 5, address: 'вул. Саксаганського, 69' },
];

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('rates');
  const [ratesSubTab, setRatesSubTab] = useState('base');
  const [dashboard, setDashboard] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [allRates, setAllRates] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, currenciesRes, reservationsRes] = await Promise.all([
        adminService.getDashboard(),
        currencyService.getAll(),
        adminService.getReservations({ limit: 50 }),
      ]);
      setDashboard(dashboardRes.data);
      setCurrencies(currenciesRes.data);
      setReservations(reservationsRes.data.items || []);
      
      try {
        const allRatesRes = await adminService.getAllRates();
        setAllRates(allRatesRes.data);
      } catch (e) {
        console.log('All rates endpoint not available');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set default data for mock mode
      setCurrencies(DEFAULT_CURRENCIES.map(c => ({
        code: c.code,
        name_uk: c.name,
        flag: '🏳️',
        buy_rate: c.buy,
        sell_rate: c.sell,
      })));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      // Try backend first
      const res = await adminService.uploadRates(file);
      setUploadResult(res.data);
      if (res.data.success) {
        fetchData();
      }
    } catch (error) {
      // If backend unavailable, parse locally
      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Update local currencies
        let updatedCount = 0;
        jsonData.forEach(row => {
          const code = row['Код валюти'] || row['code'] || Object.values(row)[0];
          const buy = row['Купівля'] || row['buy'] || Object.values(row)[1];
          const sell = row['Продаж'] || row['sell'] || Object.values(row)[2];
          
          if (code && buy && sell) {
            const existing = currencies.find(c => c.code === code.toString().toUpperCase());
            if (existing) {
              existing.buy_rate = parseFloat(buy);
              existing.sell_rate = parseFloat(sell);
              updatedCount++;
            }
          }
        });
        
        setCurrencies([...currencies]);
        setUploadResult({
          success: true,
          message: `Курси оновлено локально (mock режим)`,
          base_rates_updated: updatedCount,
          branch_rates_updated: 0,
          cross_rates_updated: 0,
        });
      } catch (parseError) {
        setUploadResult({
          success: false,
          message: 'Помилка обробки файлу: ' + parseError.message,
          errors: [],
        });
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadTemplate = () => {
    // Generate Excel template on client side
    const workbook = XLSX.utils.book_new();
    
    // Sheet 1: Base rates
    const currencyData = (currencies.length > 0 ? currencies : DEFAULT_CURRENCIES.map(c => ({
      code: c.code, name_uk: c.name, buy_rate: c.buy, sell_rate: c.sell
    }))).map(c => ({
      'Код валюти': c.code,
      'Назва': c.name_uk || c.name,
      'Купівля': c.buy_rate || c.buy,
      'Продаж': c.sell_rate || c.sell,
    }));
    const ws1 = XLSX.utils.json_to_sheet(currencyData);
    ws1['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, ws1, 'Курси');
    
    // Sheet 2: Branch rates
    const branchData = [];
    DEFAULT_BRANCHES.forEach(branch => {
      ['USD', 'EUR', 'PLN', 'GBP', 'CHF'].forEach(code => {
        const curr = currencies.find(c => c.code === code) || DEFAULT_CURRENCIES.find(c => c.code === code);
        branchData.push({
          'Відділення': branch.id,
          'Адреса': branch.address,
          'Код валюти': code,
          'Купівля': curr?.buy_rate || curr?.buy || 0,
          'Продаж': curr?.sell_rate || curr?.sell || 0,
        });
      });
    });
    const ws2 = XLSX.utils.json_to_sheet(branchData);
    ws2['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, ws2, 'Відділення');
    
    // Sheet 3: Cross rates
    const crossData = [
      { 'Пара': 'EUR/USD', 'Опис': 'Євро до Долара', 'Купівля': 1.170, 'Продаж': 1.172 },
      { 'Пара': 'GBP/USD', 'Опис': 'Фунт до Долара', 'Купівля': 1.332, 'Продаж': 1.335 },
      { 'Пара': 'GBP/EUR', 'Опис': 'Фунт до Євро', 'Купівля': 1.138, 'Продаж': 1.140 },
      { 'Пара': 'CHF/USD', 'Опис': 'Франк до Долара', 'Купівля': 1.254, 'Продаж': 1.257 },
      { 'Пара': 'PLN/EUR', 'Опис': 'Злотий до Євро', 'Купівля': 0.233, 'Продаж': 0.236 },
    ];
    const ws3 = XLSX.utils.json_to_sheet(crossData);
    ws3['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, ws3, 'Крос-курси');
    
    // Download
    XLSX.writeFile(workbook, 'rates_template.xlsx');
  };

  const filteredReservations = statusFilter
    ? reservations.filter(r => r.status === statusFilter)
    : reservations;

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="bg-primary-light border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-accent-yellow rounded-lg flex items-center justify-center font-extrabold text-primary">
              $
            </div>
            <div>
              <h1 className="font-bold text-lg">Адмін-панель</h1>
              <p className="text-xs text-text-secondary">Світ Валют</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-medium text-sm">{user.name}</div>
              <div className="text-xs text-accent-yellow">Адміністратор</div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats Cards */}
        {dashboard && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-primary-light rounded-2xl p-5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-sm text-text-secondary">Всього бронювань</span>
              </div>
              <div className="text-3xl font-bold">{dashboard.total_reservations}</div>
            </div>

            <div className="bg-primary-light rounded-2xl p-5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <span className="text-sm text-text-secondary">Очікують</span>
              </div>
              <div className="text-3xl font-bold text-yellow-400">{dashboard.pending_reservations}</div>
            </div>

            <div className="bg-primary-light rounded-2xl p-5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-sm text-text-secondary">Завершено сьогодні</span>
              </div>
              <div className="text-3xl font-bold text-green-400">{dashboard.completed_today}</div>
            </div>

            <div className="bg-primary-light rounded-2xl p-5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-sm text-text-secondary">Обсяг (UAH)</span>
              </div>
              <div className="text-2xl font-bold">{dashboard.total_volume_uah.toLocaleString()}₴</div>
            </div>
          </div>
        )}

        {/* Main Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab('rates')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'rates'
                ? 'bg-accent-yellow text-primary'
                : 'bg-primary-light text-text-secondary hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 inline mr-2" />
            Курси валют
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'reservations'
                ? 'bg-accent-yellow text-primary'
                : 'bg-primary-light text-text-secondary hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4 inline mr-2" />
            Бронювання
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-accent-yellow text-primary'
                : 'bg-primary-light text-text-secondary hover:text-white'
            }`}
          >
            <AlertCircle className="w-4 h-4 inline mr-2" />
            Налаштування
          </button>
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && <SettingsPage />}

        {/* Rates Tab */}
        {activeTab === 'rates' && (
          <div className="space-y-6">
            {/* Upload Section */}
            <div className="bg-primary-light rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-bold mb-4">Завантаження курсів</h3>
              
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-accent-yellow/50 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                      <p className="text-sm text-text-secondary mb-2">
                        Перетягніть файл або натисніть для вибору
                      </p>
                      <p className="text-xs text-text-secondary">
                        Підтримуються .xlsx та .xls файли
                      </p>
                    </label>
                  </div>

                  {uploading && (
                    <div className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-xl mt-4">
                      <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                      <span className="text-sm text-blue-400">Завантаження...</span>
                    </div>
                  )}

                  {uploadResult && (
                    <div className={`p-4 rounded-xl mt-4 ${
                      uploadResult.success ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      <div className="flex items-center gap-3 mb-2">
                        {uploadResult.success ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                        <span className={`font-medium ${uploadResult.success ? 'text-green-400' : 'text-red-400'}`}>
                          {uploadResult.message}
                        </span>
                      </div>
                      {uploadResult.success && (
                        <div className="text-sm text-text-secondary space-y-1">
                          <p>✓ Базові курси: {uploadResult.base_rates_updated || uploadResult.updated_currencies || 0}</p>
                          {uploadResult.branch_rates_updated > 0 && (
                            <p>✓ Курси по відділеннях: {uploadResult.branch_rates_updated}</p>
                          )}
                          {uploadResult.cross_rates_updated > 0 && (
                            <p>✓ Крос-курси: {uploadResult.cross_rates_updated}</p>
                          )}
                        </div>
                      )}
                      {uploadResult.errors?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-red-400 mb-1">Помилки:</p>
                          {uploadResult.errors.map((err, i) => (
                            <p key={i} className="text-xs text-text-secondary">{err}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleDownloadTemplate}
                    className="w-full mt-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-secondary hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Завантажити шаблон Excel
                  </button>
                </div>

                <div className="p-4 bg-accent-blue/10 rounded-xl">
                  <h4 className="font-medium text-sm mb-3 text-accent-blue">📋 Формат Excel файлу</h4>
                  <div className="space-y-4 text-xs text-text-secondary">
                    <div>
                      <p className="font-medium text-white mb-1">Аркуш "Курси" - базові курси:</p>
                      <code className="text-accent-yellow block bg-black/20 p-2 rounded">
                        Код валюти | Купівля | Продаж
                      </code>
                    </div>
                    <div>
                      <p className="font-medium text-white mb-1">Аркуш "Відділення" - курси по філіях:</p>
                      <code className="text-accent-yellow block bg-black/20 p-2 rounded">
                        Відділення | Код валюти | Купівля | Продаж
                      </code>
                    </div>
                    <div>
                      <p className="font-medium text-white mb-1">Аркуш "Крос-курси":</p>
                      <code className="text-accent-yellow block bg-black/20 p-2 rounded">
                        Пара | Купівля | Продаж<br/>
                        EUR/USD | 1.08 | 1.09
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rates Sub-tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setRatesSubTab('base')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  ratesSubTab === 'base' ? 'bg-white/10 text-white' : 'text-text-secondary hover:text-white'
                }`}
              >
                <DollarSign className="w-4 h-4 inline mr-1" />
                Базові курси
              </button>
              <button
                onClick={() => setRatesSubTab('branches')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  ratesSubTab === 'branches' ? 'bg-white/10 text-white' : 'text-text-secondary hover:text-white'
                }`}
              >
                <MapPin className="w-4 h-4 inline mr-1" />
                По відділеннях
              </button>
              <button
                onClick={() => setRatesSubTab('cross')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  ratesSubTab === 'cross' ? 'bg-white/10 text-white' : 'text-text-secondary hover:text-white'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4 inline mr-1" />
                Крос-курси
              </button>
            </div>

            {/* Base Rates */}
            {ratesSubTab === 'base' && (
              <div className="bg-primary-light rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Базові курси до UAH</h3>
                  <button
                    onClick={fetchData}
                    className="p-2 text-text-secondary hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-text-secondary border-b border-white/10">
                        <th className="pb-3 pr-4">Валюта</th>
                        <th className="pb-3 pr-4">Назва</th>
                        <th className="pb-3 pr-4 text-right">Купівля</th>
                        <th className="pb-3 text-right">Продаж</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currencies.map((currency) => (
                        <tr key={currency.code} className="border-b border-white/5">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{currency.flag}</span>
                              <span className="font-bold">{currency.code}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-text-secondary">{currency.name_uk}</td>
                          <td className="py-3 pr-4 text-right font-medium text-green-400">
                            {currency.buy_rate?.toFixed(2)}
                          </td>
                          <td className="py-3 text-right font-medium text-red-400">
                            {currency.sell_rate?.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Branch Rates */}
            {ratesSubTab === 'branches' && (
              <div className="bg-primary-light rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-bold mb-4">Курси по відділеннях</h3>
                
                {allRates?.branch_rates && Object.keys(allRates.branch_rates).length > 0 ? (
                  <div className="space-y-6">
                    {allRates.branches?.map((branch) => (
                      <div key={branch.id} className="p-4 bg-primary rounded-xl border border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin className="w-4 h-4 text-accent-blue" />
                          <span className="font-medium">{branch.address}</span>
                          <span className="text-xs text-text-secondary">(ID: {branch.id})</span>
                        </div>
                        
                        {allRates.branch_rates[branch.id] ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {Object.entries(allRates.branch_rates[branch.id]).map(([code, rates]) => (
                              <div key={code} className="p-3 bg-white/5 rounded-lg">
                                <div className="font-bold text-sm mb-1">{code}</div>
                                <div className="text-xs">
                                  <span className="text-green-400">{rates.buy?.toFixed(2)}</span>
                                  {' / '}
                                  <span className="text-red-400">{rates.sell?.toFixed(2)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-text-secondary">Використовуються базові курси</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-secondary">
                    <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Індивідуальні курси по відділеннях не встановлені</p>
                    <p className="text-xs mt-1">Завантажте Excel файл з аркушем "Відділення"</p>
                  </div>
                )}
              </div>
            )}

            {/* Cross Rates */}
            {ratesSubTab === 'cross' && (
              <div className="bg-primary-light rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-bold mb-4">Крос-курси</h3>
                
                {allRates?.cross_rates && Object.keys(allRates.cross_rates).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(allRates.cross_rates).map(([pair, rates]) => (
                      <div key={pair} className="p-4 bg-primary rounded-xl border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-lg">{pair}</span>
                          <ArrowRightLeft className="w-4 h-4 text-text-secondary" />
                        </div>
                        <div className="flex justify-between text-sm">
                          <div>
                            <span className="text-text-secondary">Купівля: </span>
                            <span className="text-green-400 font-medium">{rates.buy?.toFixed(4)}</span>
                          </div>
                          <div>
                            <span className="text-text-secondary">Продаж: </span>
                            <span className="text-red-400 font-medium">{rates.sell?.toFixed(4)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-secondary">
                    <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Крос-курси не встановлені</p>
                    <p className="text-xs mt-1">Завантажте Excel файл з аркушем "Крос-курси"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Reservations Tab */}
        {activeTab === 'reservations' && (
          <div className="bg-primary-light rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Всі бронювання</h3>
              
              <div className="flex items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-primary rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                >
                  <option value="">Всі статуси</option>
                  <option value="pending">Очікує</option>
                  <option value="confirmed">Підтверджено</option>
                  <option value="completed">Завершено</option>
                  <option value="cancelled">Скасовано</option>
                </select>
                
                <button
                  onClick={fetchData}
                  className="p-2 text-text-secondary hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {filteredReservations.length === 0 ? (
              <div className="text-center py-12 text-text-secondary">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Немає бронювань</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-text-secondary border-b border-white/10">
                      <th className="pb-3 pr-4">ID</th>
                      <th className="pb-3 pr-4">Телефон</th>
                      <th className="pb-3 pr-4">Сума</th>
                      <th className="pb-3 pr-4">Курс</th>
                      <th className="pb-3 pr-4">Відділення</th>
                      <th className="pb-3 pr-4">Статус</th>
                      <th className="pb-3 pr-4">Створено</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReservations.map((res) => {
                      const statusCfg = STATUS_CONFIG[res.status] || STATUS_CONFIG.pending;
                      const StatusIcon = statusCfg.icon;
                      
                      return (
                        <tr key={res.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-4 pr-4 font-mono text-sm">#{res.id}</td>
                          <td className="py-4 pr-4 text-sm">{res.phone}</td>
                          <td className="py-4 pr-4">
                            <div className="text-sm font-medium">
                              {res.give_amount.toLocaleString()} {res.give_currency}
                            </div>
                            <div className="text-xs text-text-secondary">
                              → {res.get_amount.toLocaleString()} {res.get_currency}
                            </div>
                          </td>
                          <td className="py-4 pr-4 text-sm">{res.rate}</td>
                          <td className="py-4 pr-4 text-sm text-text-secondary">
                            {res.branch_address || '-'}
                          </td>
                          <td className="py-4 pr-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusCfg.label}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-xs text-text-secondary">
                            {new Date(res.created_at).toLocaleString('uk-UA')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
