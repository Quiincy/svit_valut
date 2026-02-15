import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import {
  Upload, Download, LogOut, RefreshCw, CheckCircle,
  XCircle, Clock, DollarSign, TrendingUp, FileSpreadsheet,
  AlertCircle, ChevronDown, Search, Building2, ArrowRightLeft,
  MapPin, Bell, Send, Phone, Pencil, Plus, ToggleLeft, ToggleRight, X, Globe, Save
} from 'lucide-react';
import BranchRateCard from '../components/admin/BranchRateCard';

import { adminService, currencyService } from '../services/api';
import SettingsPage from './SettingsPage';
import * as XLSX from 'xlsx';

const STATUS_CONFIG = {
  pending_admin: { label: 'Очікує адміна', color: 'text-orange-400 bg-orange-400/10', icon: AlertCircle },
  pending: { label: 'Очікує оператора', color: 'text-yellow-400 bg-yellow-400/10', icon: Clock },
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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [newReservationAlert, setNewReservationAlert] = useState(false);

  const [lastReservationCount, setLastReservationCount] = useState(0);
  const fileInputRef = useRef(null);

  const [branches, setBranches] = useState([]);

  // Reservation edit state
  const [editingReservation, setEditingReservation] = useState(null);
  const [resForm, setResForm] = useState({ give_amount: '', get_amount: '', rate: '', branch_id: '' });
  const [resSaving, setResSaving] = useState(false);

  // Rate management state
  const [rateModal, setRateModal] = useState({ open: false, branchId: null, currency: null });
  const [rateForm, setRateForm] = useState({ currency: 'USD', buy: '', sell: '', is_active: true });

  // SEO editing state
  const [seoEditing, setSeoEditing] = useState(null); // currency code being edited
  const [seoForm, setSeoForm] = useState({ seo_h1: '', seo_h2: '', seo_text: '', seo_image: '', buy_url: '', sell_url: '' });
  const [seoSaving, setSeoSaving] = useState(false);


  const fetchData = useCallback(async () => {
    try {
      const [dashboardRes, currenciesRes, reservationsRes] = await Promise.all([
        adminService.getDashboard(),
        adminService.getCurrencies(),
        adminService.getReservations({
          limit: 50,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined
        }),
      ]);
      setDashboard(dashboardRes.data);
      setCurrencies(currenciesRes.data);
      const items = reservationsRes.data.items || [];

      // Check for new reservations
      if (items.length > lastReservationCount && lastReservationCount > 0) {
        setNewReservationAlert(true);
        setTimeout(() => setNewReservationAlert(false), 5000);
      }
      setLastReservationCount(items.length);
      setReservations(items);

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
  }, [lastReservationCount, dateFrom, dateTo]);

  // Initial fetch and auto-refresh every 15 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

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
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error('Upload Error:', error);
      alert('Upload Failed: ' + errorMsg);
      setUploadResult({
        success: false,
        message: 'Помилка: ' + errorMsg,
        errors: []
      });
      return;


    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await adminService.downloadTemplate();

      // Axios with responseType: 'blob' returns a Blob in data
      const blob = response.data;

      // Create object URL directly from the blob
      const fileURL = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = fileURL;
      link.setAttribute('download', 'rates_template.xlsx');
      document.body.appendChild(link);
      link.click();

      // Cleanup
      link.remove();
      setTimeout(() => URL.revokeObjectURL(fileURL), 100);

    } catch (error) {
      console.error('Download error:', error);
      alert('Помилка завантаження шаблону: ' + (error.response?.status || error.message));
    }
  };



  // Reservation handlers
  const openResModal = async (res) => {
    // Fetch branches if not loaded
    if (branches.length === 0) {
      try {
        const branchesRes = await adminService.getBranches();
        setBranches(branchesRes.data);
      } catch (e) {
        console.error('Error fetching branches:', e);
      }
    }
    setEditingReservation(res);
    setResForm({
      give_amount: res.give_amount,
      get_amount: res.get_amount,
      rate: res.rate,
      branch_id: res.branch_id || '',
    });
  };

  const handleResSave = async () => {
    setResSaving(true);
    try {
      await adminService.updateReservation(editingReservation.id, {
        give_amount: parseFloat(resForm.give_amount),
        get_amount: parseFloat(resForm.get_amount),
        rate: parseFloat(resForm.rate),
        branch_id: resForm.branch_id || null,
      });
      setEditingReservation(null);
      fetchData();
    } catch (error) {
      console.error('Error saving reservation:', error);
      alert(error.response?.data?.detail || 'Помилка збереження');
    } finally {
      setResSaving(false);
    }
  };

  const handleAssign = async (resId) => {
    try {
      await adminService.assignReservation(resId);
      fetchData();
    } catch (error) {
      console.error('Error assigning reservation:', error);
      alert(error.response?.data?.detail || 'Помилка призначення');
    }
  };

  const handleToggleRate = async (branchId, currency, isActive) => {
    try {
      // Toggle active status
      // Backend logic: ON (active=True) for minor -> Deletes override -> Reverts to Base
      // Backend logic: OFF (active=False) -> Creates override
      await adminService.updateBranchRate(branchId, currency, { is_active: !isActive });
      fetchData();
    } catch (error) {
      console.error('Error toggling rate:', error);
    }
  };

  const handleUpdateRate = async (branchId, code, data) => {
    try {
      await adminService.updateBranchRate(branchId, code, data);
      fetchData();
    } catch (error) {
      console.error('Error updating rate:', error);
      alert('Помилка оновлення курсу');
    }
  };

  const openAddRateModal = (branchId) => {
    setRateModal({ open: true, branchId, currency: null });
    setRateForm({
      currency: 'USD',
      buy: '',
      sell: '',
      wholesale_buy: '',
      wholesale_sell: '',
      is_active: true
    });
  };

  const saveRate = async () => {
    try {
      const { branchId } = rateModal;
      await adminService.updateBranchRate(branchId, rateForm.currency, {
        buy_rate: parseFloat(rateForm.buy),
        sell_rate: parseFloat(rateForm.sell),
        wholesale_buy_rate: rateForm.wholesale_buy ? parseFloat(rateForm.wholesale_buy) : 0,
        wholesale_sell_rate: rateForm.wholesale_sell ? parseFloat(rateForm.wholesale_sell) : 0,
        is_active: rateForm.is_active
      });
      setRateModal({ ...rateModal, open: false });
      fetchData();
    } catch (error) {
      console.error('Error saving rate:', error);
      alert('Помилка збереження');
    }
  };

  const handleSeoEdit = (currency) => {
    if (seoEditing === currency.code) {
      setSeoEditing(null);
      return;
    }
    setSeoEditing(currency.code);
    setSeoForm({
      seo_h1: currency.seo_h1 || '',
      seo_h2: currency.seo_h2 || '',
      seo_text: currency.seo_text || '',
      seo_image: currency.seo_image || '',
      buy_url: currency.buy_url || '',
      sell_url: currency.sell_url || '',
    });
  };

  const handleSeoSave = async () => {
    setSeoSaving(true);
    try {
      await adminService.updateCurrency(seoEditing, seoForm);
      setSeoEditing(null);
      fetchData();
    } catch (error) {
      console.error('Error saving SEO info:', error);
      alert('Помилка збереження SEO інформації');
    } finally {
      setSeoSaving(false);
    }
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
            {newReservationAlert && (
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg animate-pulse">
                <Bell className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-400 font-medium">Нове бронювання!</span>
              </div>
            )}
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
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
                <span className="text-sm text-text-secondary">Обсяг за сьогодні (UAH)</span>
              </div>
              <div className="text-2xl font-bold">{dashboard.total_volume_uah.toLocaleString()}₴</div>
            </div>

            <div className="bg-primary-light rounded-2xl p-5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-sm text-text-secondary">Обсяг за місяць (UAH)</span>
              </div>
              <div className="text-2xl font-bold">{dashboard.total_volume_uah_month?.toLocaleString()}₴</div>
            </div>
          </div>
        )}

        {/* Main Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab('rates')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'rates'
              ? 'bg-accent-yellow text-primary'
              : 'bg-primary-light text-text-secondary hover:text-white'
              }`}
          >
            <FileSpreadsheet className="w-4 h-4 inline mr-2" />
            Курси валют
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'reservations'
              ? 'bg-accent-yellow text-primary'
              : 'bg-primary-light text-text-secondary hover:text-white'
              }`}
          >
            <Building2 className="w-4 h-4 inline mr-2" />
            Бронювання
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'settings'
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
                    <div className={`p-4 rounded-xl mt-4 ${uploadResult.success ? 'bg-green-500/10' : 'bg-red-500/10'
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
                  <h4 className="font-medium text-sm mb-3 text-accent-blue">📋 Формат Excel файлу (Шаблон)</h4>
                  <div className="text-xs text-text-secondary overflow-x-auto">
                    <p className="mb-2">Ліва частина - індивідуальні курси відділень (Матриця):</p>
                    <table className="w-full border-collapse border border-white/20 mb-4 text-[10px] text-center">
                      <thead>
                        <tr className="bg-white/5">
                          <th className="border border-white/10 p-1">Каса</th>
                          <th className="border border-white/10 p-1 text-green-400">$</th>
                          <th className="border border-white/10 p-1 text-red-400">$</th>
                          <th className="border border-white/10 p-1 text-green-400">€</th>
                          <th className="border border-white/10 p-1 text-red-400">€</th>
                          <th className="border border-white/10 p-1">...</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-white/10 p-1 text-left">Вул. Городоцька</td>
                          <td className="border border-white/10 p-1">41.50</td>
                          <td className="border border-white/10 p-1">42.00</td>
                          <td className="border border-white/10 p-1">45.10</td>
                          <td className="border border-white/10 p-1">45.80</td>
                          <td className="border border-white/10 p-1">...</td>
                        </tr>
                      </tbody>
                    </table>

                    <p className="mb-2">Права частина - базові курси (вертикально):</p>
                    <table className="w-full border-collapse border border-white/20 text-[10px] text-center">
                      <thead>
                        <tr className="bg-white/5">
                          <th className="border border-white/10 p-1">Прапор</th>
                          <th className="border border-white/10 p-1">Назва</th>
                          <th className="border border-white/10 p-1 text-green-400">Куп</th>
                          <th className="border border-white/10 p-1 text-red-400">Прод</th>
                          <th className="border border-white/10 p-1">Код</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-white/10 p-1">🇨🇦</td>
                          <td className="border border-white/10 p-1">Канадський долар</td>
                          <td className="border border-white/10 p-1">30.50</td>
                          <td className="border border-white/10 p-1">31.20</td>
                          <td className="border border-white/10 p-1">CAD</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Rates Sub-tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setRatesSubTab('base')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${ratesSubTab === 'base' ? 'bg-white/10 text-white' : 'text-text-secondary hover:text-white'
                  }`}
              >
                <DollarSign className="w-4 h-4 inline mr-1" />
                Базові курси
              </button>
              <button
                onClick={() => setRatesSubTab('branches')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${ratesSubTab === 'branches' ? 'bg-white/10 text-white' : 'text-text-secondary hover:text-white'
                  }`}
              >
                <MapPin className="w-4 h-4 inline mr-1" />
                По відділеннях
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
                        <th className="pb-3 pr-4 text-right">Продаж</th>
                        <th className="pb-3 pr-4 text-right text-accent-yellow/80">Опт Куп</th>
                        <th className="pb-3 text-right text-accent-yellow/80">Опт Прод</th>
                        <th className="pb-3 pl-4 text-center">SEO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currencies.map((currency) => (
                        <Fragment key={currency.code}>
                          <tr className="border-b border-white/5">
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
                            <td className="py-3 pr-4 text-right font-medium text-red-400">
                              {currency.sell_rate?.toFixed(2)}
                            </td>
                            <td className="py-3 pr-4 text-right font-medium text-accent-yellow">
                              {currency.wholesale_buy_rate > 0 ? currency.wholesale_buy_rate?.toFixed(2) : '-'}
                            </td>
                            <td className="py-3 text-right font-medium text-accent-yellow">
                              {currency.wholesale_sell_rate > 0 ? currency.wholesale_sell_rate?.toFixed(2) : '-'}
                            </td>
                            <td className="py-3 pl-4">
                              <button
                                onClick={() => handleSeoEdit(currency)}
                                className={`p-1.5 rounded-lg transition-colors ${seoEditing === currency.code ? 'bg-accent-yellow/20 text-accent-yellow' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
                                title="SEO інформація"
                              >
                                <Globe className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                          {/* SEO Editing Form Row */}
                          {seoEditing === currency.code && (
                            <tr key={`${currency.code}-seo`}>
                              <td colSpan="5" className="p-4 bg-primary/50 border-b border-white/5">
                                <div className="p-5 bg-primary rounded-xl border border-accent-yellow/30">
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-accent-yellow flex items-center gap-2">
                                      <Globe className="w-4 h-4" />
                                      SEO для {seoEditing}
                                    </h4>
                                    <button onClick={() => setSeoEditing(null)} className="text-text-secondary hover:text-white">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-xs text-text-secondary block mb-1">H1 Заголовок</label>
                                      <input
                                        type="text"
                                        value={seoForm.seo_h1}
                                        onChange={(e) => setSeoForm({ ...seoForm, seo_h1: e.target.value })}
                                        placeholder="Наприклад: Обмін долара в Києві"
                                        className="w-full px-3 py-2 bg-primary-light rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-text-secondary block mb-1">H2 Підзаголовок</label>
                                      <input
                                        type="text"
                                        value={seoForm.seo_h2}
                                        onChange={(e) => setSeoForm({ ...seoForm, seo_h2: e.target.value })}
                                        placeholder="Наприклад: вигідний курс без комісій"
                                        className="w-full px-3 py-2 bg-primary-light rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-text-secondary block mb-1">URL зображення</label>
                                      <input
                                        type="text"
                                        value={seoForm.seo_image}
                                        onChange={(e) => setSeoForm({ ...seoForm, seo_image: e.target.value })}
                                        placeholder="https://..."
                                        className="w-full px-3 py-2 bg-primary-light rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                                      />
                                    </div>
                                    <div className="row-span-2">
                                      <label className="text-xs text-text-secondary block mb-1">SEO текст (опис)</label>
                                      <textarea
                                        value={seoForm.seo_text}
                                        onChange={(e) => setSeoForm({ ...seoForm, seo_text: e.target.value })}
                                        placeholder="Описовий текст для сторінки валюти..."
                                        rows={4}
                                        className="w-full px-3 py-2 bg-primary-light rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow resize-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-text-secondary block mb-1">URL купівлі</label>
                                      <input
                                        type="text"
                                        value={seoForm.buy_url}
                                        onChange={(e) => setSeoForm({ ...seoForm, buy_url: e.target.value })}
                                        placeholder="/buy-usd"
                                        className="w-full px-3 py-2 bg-primary-light rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-text-secondary block mb-1">URL продажу</label>
                                      <input
                                        type="text"
                                        value={seoForm.sell_url}
                                        onChange={(e) => setSeoForm({ ...seoForm, sell_url: e.target.value })}
                                        placeholder="/sell-usd"
                                        className="w-full px-3 py-2 bg-primary-light rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-end mt-4 gap-3">
                                    <button
                                      onClick={() => setSeoEditing(null)}
                                      className="px-4 py-2 text-sm text-text-secondary hover:text-white transition-colors"
                                    >
                                      Скасувати
                                    </button>
                                    <button
                                      onClick={handleSeoSave}
                                      disabled={seoSaving}
                                      className="px-6 py-2 bg-accent-yellow text-primary text-sm font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                                    >
                                      {seoSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                      Зберегти
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {ratesSubTab === 'branches' && (
              <div className="bg-primary-light rounded-2xl p-6 border border-white/10">
                <h3 className="text-lg font-bold mb-4">Курси по відділеннях</h3>

                {allRates?.branch_rates && Object.keys(allRates.branch_rates).length > 0 ? (
                  <div className="space-y-6">
                    {allRates.branches?.map((branch) => (
                      <div key={branch.id} className="p-4 bg-primary rounded-xl border border-white/5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-accent-blue" />
                            <span className="font-medium">{branch.address}</span>
                            <span className="text-xs text-text-secondary">(ID: {branch.id})</span>
                          </div>
                          <button
                            onClick={() => openAddRateModal(branch.id)}
                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-green-400 transition-colors"
                            title="Додати валюту"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Iterate ALL currencies to show merged view */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                          {currencies.map((currency) => (
                            <BranchRateCard
                              key={currency.code}
                              branchId={branch.id}
                              currency={currency}
                              branchData={allRates.branch_rates?.[branch.id]?.[currency.code]}
                              onUpdate={handleUpdateRate}
                              onToggle={handleToggleRate}
                            />
                          ))}
                        </div>
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
          </div>
        )}

        {/* Reservations Tab */}
        {activeTab === 'reservations' && (
          <div className="bg-primary-light rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Всі бронювання</h3>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 mr-2">
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setDateFrom(today);
                      setDateTo(today);
                    }}
                    className="px-3 py-2 bg-primary rounded-lg border border-white/10 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Сьогодні
                  </button>
                  <button
                    onClick={() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      const yStr = yesterday.toISOString().split('T')[0];
                      setDateFrom(yStr);
                      setDateTo(yStr);
                    }}
                    className="px-3 py-2 bg-primary rounded-lg border border-white/10 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Вчора
                  </button>
                  <div className="w-px h-8 bg-white/10 mx-1"></div>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-3 py-2 bg-primary rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow text-white [color-scheme:dark]"
                  />
                  <span className="text-text-secondary">—</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-3 py-2 bg-primary rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow text-white [color-scheme:dark]"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-primary rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                >
                  <option value="">Всі статуси</option>
                  <option value="pending_admin">Очікує адміна</option>
                  <option value="pending">Очікує оператора</option>
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
                      <th className="pb-3 pr-4">Клієнт</th>
                      <th className="pb-3 pr-4">Сума</th>
                      <th className="pb-3 pr-4">Курс</th>
                      <th className="pb-3 pr-4">Відділення</th>
                      <th className="pb-3 pr-4">Статус</th>
                      <th className="pb-3 pr-4">Створено</th>
                      <th className="pb-3">Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReservations.map((res) => {
                      const statusCfg = STATUS_CONFIG[res.status] || STATUS_CONFIG.pending;
                      const StatusIcon = statusCfg.icon;

                      return (
                        <tr key={res.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-4 pr-4 font-mono text-sm">#{res.id}</td>
                          <td className="py-4 pr-4">
                            <div className="text-sm font-medium">{res.customer_name || '—'}</div>
                            <div className="flex items-center gap-1 mt-1 text-xs text-text-secondary">
                              <Phone className="w-3 h-3" />
                              <a href={`tel:${res.phone}`} className="hover:text-white hover:underline transition-colors">
                                {res.phone}
                              </a>
                            </div>
                          </td>
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
                            {res.branch_address || '—'}
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
                          <td className="py-4">
                            <div className="flex gap-2">
                              {res.status === 'pending_admin' && (
                                <>
                                  <button
                                    onClick={() => openResModal(res)}
                                    className="p-2 text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                    title="Редагувати"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleAssign(res.id)}
                                    className="p-2 text-text-secondary hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                                    title="Надіслати оператору"
                                  >
                                    <Send className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
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

        {/* Add/Edit Rate Modal */}
        {rateModal.open && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-primary-light rounded-2xl p-6 w-full max-w-sm border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Додати/Редагувати курс</h3>
                <button onClick={() => setRateModal({ ...rateModal, open: false })}><X className="w-5 h-5 text-text-secondary" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Валюта</label>
                  <select
                    className="w-full bg-primary border border-white/10 rounded-lg p-2.5 text-white"
                    value={rateForm.currency}
                    onChange={(e) => setRateForm({ ...rateForm, currency: e.target.value })}
                  >
                    {currencies.map(c => (
                      <option key={c.code} value={c.code}>{c.code} - {c.name_uk}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Купівля</label>
                    <input
                      type="number" step="0.01"
                      className="w-full bg-primary border border-white/10 rounded-lg p-2.5 text-white"
                      value={rateForm.buy}
                      onChange={(e) => setRateForm({ ...rateForm, buy: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Продаж</label>
                    <input
                      type="number" step="0.01"
                      className="w-full bg-primary border border-white/10 rounded-lg p-2.5 text-white"
                      value={rateForm.sell}
                      onChange={(e) => setRateForm({ ...rateForm, sell: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-accent-yellow/80 mb-1">Опт Купівля</label>
                    <input
                      type="number" step="0.01"
                      className="w-full bg-primary border border-white/10 rounded-lg p-2.5 text-white"
                      value={rateForm.wholesale_buy}
                      onChange={(e) => setRateForm({ ...rateForm, wholesale_buy: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-accent-yellow/80 mb-1">Опт Продаж</label>
                    <input
                      type="number" step="0.01"
                      className="w-full bg-primary border border-white/10 rounded-lg p-2.5 text-white"
                      value={rateForm.wholesale_sell}
                      onChange={(e) => setRateForm({ ...rateForm, wholesale_sell: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rateActive"
                    checked={rateForm.is_active}
                    onChange={(e) => setRateForm({ ...rateForm, is_active: e.target.checked })}
                    className="rounded bg-primary border-white/10"
                  />
                  <label htmlFor="rateActive" className="text-sm">Активний курс</label>
                </div>

                <button
                  onClick={saveRate}
                  className="w-full bg-accent-yellow text-primary font-bold py-3 rounded-xl mt-2 hover:bg-yellow-400 transition-colors"
                >
                  Зберегти
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reservation Edit Modal */}
        {editingReservation && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-primary-light rounded-2xl p-6 w-full max-w-md border border-white/10">
              <h3 className="text-lg font-bold mb-4">Редагувати бронювання #{editingReservation.id}</h3>

              <div className="space-y-4">
                <div className="p-3 bg-primary rounded-xl">
                  <div className="text-sm text-text-secondary">Клієнт</div>
                  <div className="font-medium">{editingReservation.customer_name || '—'}</div>
                  <div className="text-sm text-text-secondary">{editingReservation.phone}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      Віддає ({editingReservation.give_currency})
                    </label>
                    <input
                      type="number"
                      value={resForm.give_amount}
                      onChange={(e) => setResForm({ ...resForm, give_amount: e.target.value })}
                      className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      Отримує ({editingReservation.get_currency})
                    </label>
                    <input
                      type="number"
                      value={resForm.get_amount}
                      onChange={(e) => setResForm({ ...resForm, get_amount: e.target.value })}
                      className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-1">Курс</label>
                  <input
                    type="number"
                    step="0.01"
                    value={resForm.rate}
                    onChange={(e) => setResForm({ ...resForm, rate: e.target.value })}
                    className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow"
                  />
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-1">Відділення</label>
                  <select
                    value={resForm.branch_id}
                    onChange={(e) => setResForm({ ...resForm, branch_id: e.target.value ? parseInt(e.target.value) : '' })}
                    className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow"
                  >
                    <option value="">— Оберіть відділення —</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.address}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingReservation(null)}
                  className="flex-1 py-3 bg-white/5 rounded-xl text-text-secondary hover:text-white hover:bg-white/10 transition-all"
                >
                  Скасувати
                </button>
                <button
                  onClick={handleResSave}
                  disabled={resSaving}
                  className="flex-1 py-3 bg-accent-yellow text-primary rounded-xl font-medium hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {resSaving ? 'Збереження...' : 'Зберегти'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div >
  );
}
