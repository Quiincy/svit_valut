import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import {
  Upload, Download, LogOut, RefreshCw, CheckCircle,
  XCircle, Clock, DollarSign, TrendingUp, FileSpreadsheet,
  AlertCircle, ChevronDown, Search, Building2, ArrowRightLeft,
  MapPin, Bell, Send, Phone, Pencil, Plus, ToggleLeft, ToggleRight, X, Globe, Save, MessageCircle, MessageSquare, Trash2,
  Volume2, VolumeX
} from 'lucide-react';
import BranchRateCard from '../components/admin/BranchRateCard';
import BranchBalancesTab from '../components/admin/BranchBalancesTab';
import SeoEditRow from '../components/admin/SeoEditRow';

import { adminService, currencyService, chatService } from '../services/api';
import SettingsPage from './SettingsPage';
import { useAudioNotification } from '../hooks/useAudioNotification';
import { getStaticUrl } from '../services/api';
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
  const [balancesBranchId, setBalancesBranchId] = useState(null);
  const [ratesSubTab, setRatesSubTab] = useState('base');
  const [dashboard, setDashboard] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [allRates, setAllRates] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewNoteModal, setViewNoteModal] = useState(null);
  const [newReservationAlert, setNewReservationAlert] = useState(false);
  const { playNotification, volume, setVolume } = useAudioNotification();

  const [lastReservationTime, setLastReservationTime] = useState(null);
  const prevReservationsRef = useRef([]);
  const fileInputRef = useRef(null);

  const [branches, setBranches] = useState([]);

  // Reservation edit state
  const [editingReservation, setEditingReservation] = useState(null);
  const [resForm, setResForm] = useState({ give_amount: '', get_amount: '', rate: '', branch_id: '', customer_name: '', phone: '' });
  const [resSaving, setResSaving] = useState(false);

  // Create Reservation state
  const [createResModalOpen, setCreateResModalOpen] = useState(false);
  const [createResForm, setCreateResForm] = useState({
    direction: 'buy', // 'buy' means user gives UAH, 'sell' means user gets UAH
    currency: 'USD',
    give_amount: '',
    get_amount: '',
    rate: '',
    branch_id: '',
    customer_name: '',
    phone: '+380',
    operator_note: ''
  });

  // Rate management state
  const [rateModal, setRateModal] = useState({ open: false, branchId: null, currency: null });
  const [rateForm, setRateForm] = useState({ currency: 'USD', buy: '', sell: '', is_active: true });

  // SEO
  const [expandedSeoIds, setExpandedSeoIds] = useState([]); // List of currency codes being edited

  // Cross-rates state
  const [crossRatePairs, setCrossRatePairs] = useState([]);
  const [crossRateModal, setCrossRateModal] = useState(false);
  const [editingCrossRate, setEditingCrossRate] = useState(null);
  const [crossRateForm, setCrossRateForm] = useState({ base_currency: '', quote_currency: '', buy_rate: '', sell_rate: '' });

  // Branch currency search
  const [branchCurrencySearch, setBranchCurrencySearch] = useState('');

  // Chat state
  const [chatSessions, setChatSessions] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [editingChatMsgId, setEditingChatMsgId] = useState(null);
  const [editingChatMsgContent, setEditingChatMsgContent] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const chatMessagesEndRef = useRef(null);
  const chatFileInputRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [dashboardRes, currenciesRes, reservationsRes, branchesRes] = await Promise.all([
        adminService.getDashboard(),
        adminService.getCurrencies(),
        adminService.getReservations({
          limit: 50,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          branch_id: branchFilter || undefined
        }),
        adminService.getBranches(),
      ]);
      setDashboard(dashboardRes.data);
      setCurrencies(currenciesRes.data);
      setBranches(branchesRes.data || []);
      const items = reservationsRes.data.items || [];

      // Check for new or modified reservations
      if (items.length > 0) {
        const currentLatestTime = new Date(items[0].created_at).getTime();

        // 1. Check for completely new reservations (existing logic)
        const hasNew = lastReservationTime && currentLatestTime > lastReservationTime;

        // 2. Check for modifications in existing reservations
        let hasModified = false;
        if (prevReservationsRef.current.length > 0) {
          items.forEach(newItem => {
            const prevItem = prevReservationsRef.current.find(p => p.id === newItem.id);
            if (prevItem) {
              // Compare status or note
              const statusChanged = newItem.status !== prevItem.status;
              const noteChanged = newItem.operator_note !== prevItem.operator_note;

              // "Returns from operator" -> status changed to completed/cancelled OR note added
              if (statusChanged && ['completed', 'cancelled'].includes(newItem.status)) {
                hasModified = true;
              } else if (noteChanged) {
                hasModified = true;
              }
            }
          });
        }

        if (hasNew || hasModified) {
          setNewReservationAlert(true);
          playNotification();
          setTimeout(() => setNewReservationAlert(false), 5000);
        }

        setLastReservationTime(currentLatestTime);
      }
      setReservations(items);
      prevReservationsRef.current = items;

      try {
        const [allRatesRes, crossRatesRes] = await Promise.all([
          adminService.getAllRates(),
          adminService.getAdminCrossRates()
        ]);
        setAllRates(allRatesRes.data);
        setCrossRatePairs(crossRatesRes.data || []);
      } catch (e) {
        // All rates endpoint not available
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
  }, [lastReservationTime, dateFrom, dateTo, branchFilter]);

  // Initial fetch and auto-refresh every 15 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Extract customer name from the first auto-message
  const getCustomerName = (sessionList, id) => {
    const session = sessionList.find(s => s.session_id === id);
    if (!session) return '';
    const welcomeMsg = session.messages?.find(m => m.sender === 'user' && m.content.includes('Мене звати'));
    const nameMatch = welcomeMsg?.content.match(/Мене звати (.*?)\./);
    return nameMatch ? nameMatch[1] : '';
  };


  // Chat polling
  const prevUnreadRef = useRef(0);
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await adminService.getChatSessions();
        if (res?.data) {
          const sessions = res.data;
          setChatSessions(sessions);

          let totalUnread = 0;
          sessions.forEach(s => {
            totalUnread += s.messages?.filter(m => m.sender === 'user' && !m.is_read).length || 0;
          });

          if (totalUnread > prevUnreadRef.current) {
            playNotification();
          }
          prevUnreadRef.current = totalUnread;
        }
      } catch (err) { }
    };
    fetchChats();
    const chatInterval = setInterval(fetchChats, 3000);
    return () => clearInterval(chatInterval);
  }, [playNotification]);

  useEffect(() => {
    if (activeChatId) {
      const fetchMsgs = async () => {
        try {
          const res = await adminService.getChatMessages(activeChatId);
          if (res?.data) {
            setChatMessages(res.data);
            adminService.markChatRead(activeChatId).catch(() => { });
          }
        } catch (err) { }
      };
      fetchMsgs();
      const msgInterval = setInterval(fetchMsgs, 3000);
      return () => clearInterval(msgInterval);
    }
  }, [activeChatId]);

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeChatId]);

  const handleEditChatMsgSave = async (msgId) => {
    if (!editingChatMsgContent.trim()) return;
    try {
      const res = await adminService.editChatMessage(msgId, { content: editingChatMsgContent.trim() });
      setChatMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: res.data.content } : m));
      setEditingChatMsgId(null);
      setEditingChatMsgContent('');
    } catch (e) {
      console.error('Error editing message:', e);
      alert('Помилка редагування: ' + (e.response?.data?.detail || e.message));
    }
  };

  const handleDeleteChatMsg = async (msgId) => {
    if (!window.confirm("Дійсно видалити це повідомлення?")) return;
    try {
      await adminService.deleteChatMessage(msgId);
      setChatMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (e) {
      console.error('Error deleting message:', e);
      alert('Помилка видалення: ' + (e.response?.data?.detail || e.message));
    }
  };

  const handleSendAdminMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !activeChatId) return;

    const content = chatInput.trim();
    setChatInput('');

    const optimisticMessage = {
      id: Date.now(),
      sender: 'admin',
      content,
      created_at: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, optimisticMessage]);

    try {
      setChatLoading(true);
      await adminService.sendChatMessage(activeChatId, { sender: 'admin', content });
    } catch (err) { } finally {
      setChatLoading(false);
    }
  };

  const handleAdminImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChatId) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Файл занадто великий (максимум 5 МБ)');
      return;
    }

    setIsUploadingImage(true);
    try {
      await chatService.adminUploadImage(activeChatId, file);
      const msgs = await adminService.getChatMessages(activeChatId);
      setChatMessages(msgs.data);
      setTimeout(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Failed to upload image:', err);
      alert('Помилка завантаження зображення');
    } finally {
      setIsUploadingImage(false);
      if (chatFileInputRef.current) chatFileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
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

  const handleDownloadTemplate = () => {
    const token = localStorage.getItem('authToken');
    const apiBase = import.meta.env.VITE_API_URL || '';
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${apiBase}/api/admin/rates/template`, true);
    xhr.setRequestHeader('Authorization', `Basic ${token}`);
    xhr.responseType = 'arraybuffer';

    xhr.onload = function () {
      if (xhr.status === 200) {
        const blob = new Blob([xhr.response], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        // Safari-compatible download
        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
          window.navigator.msSaveOrOpenBlob(blob, 'rates_template.xlsx');
        } else {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'rates_template.xlsx';
          // Required for Firefox
          document.body.appendChild(a);
          setTimeout(() => {
            a.click();
            setTimeout(() => {
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }, 250);
          }, 66);
        }
      } else {
        alert('Помилка завантаження шаблону: HTTP ' + xhr.status);
      }
    };

    xhr.onerror = function () {
      alert('Помилка мережі при завантаженні шаблону');
    };

    xhr.send();
  };



  // Reservation handlers
  const openResModal = async (res) => {
    setEditingReservation(res);
    setResForm({
      give_amount: res.give_amount,
      get_amount: res.get_amount,
      rate: res.rate,
      branch_id: res.branch_id || '',
      customer_name: res.customer_name || '',
      phone: res.phone || '',
      status: res.status || 'pending_admin',
      operator_note: res.operator_note || '',
    });
  };

  // Auto-recalculate: when give_amount or rate changes, recalculate get_amount
  const handleResFormChange = (field, value) => {
    const updated = { ...resForm, [field]: value };

    if (editingReservation && (field === 'give_amount' || field === 'rate')) {
      const amount = parseFloat(field === 'give_amount' ? value : updated.give_amount);
      const rate = parseFloat(field === 'rate' ? value : updated.rate);
      if (!isNaN(amount) && !isNaN(rate) && rate > 0) {
        if (editingReservation.give_currency === 'UAH') {
          updated.get_amount = (amount / rate).toFixed(2);
        } else {
          updated.get_amount = (amount * rate).toFixed(2);
        }
      }
    }

    setResForm(updated);
  };

  // Direction helper
  const getDirection = (res) => {
    if (res.give_currency === 'UAH') {
      return { label: 'Купля', color: 'text-green-400 bg-green-400/10' };
    }
    return { label: 'Продажа', color: 'text-blue-400 bg-blue-400/10' };
  };

  const handleResSave = async () => {
    setResSaving(true);
    try {
      await adminService.updateReservation(editingReservation.id, {
        give_amount: parseFloat(resForm.give_amount),
        get_amount: parseFloat(resForm.get_amount),
        rate: parseFloat(resForm.rate),
        branch_id: resForm.branch_id || null,
        customer_name: resForm.customer_name || null,
        phone: resForm.phone || null,
        status: resForm.status || null,
        operator_note: resForm.operator_note || null,
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

  const handleCreateResFormChange = (field, value) => {
    const updated = { ...createResForm, [field]: value };

    // Auto-fill rate based on branch, direction, and currency
    if (['branch_id', 'direction', 'currency'].includes(field)) {
      const bId = field === 'branch_id' ? value : updated.branch_id;
      const cur = field === 'currency' ? value : updated.currency;
      const dir = field === 'direction' ? value : updated.direction;

      if (bId && cur && allRates?.branch_rates?.[bId]?.[cur]) {
        const rateData = allRates.branch_rates[bId][cur];
        // User "buy": gives UAH to buy foreign -> we sell foreign
        // User "sell": gives foreign to get UAH -> we buy foreign
        const newRate = dir === 'buy' ? rateData.sell : rateData.buy;
        if (newRate) {
          updated.rate = newRate.toString();
        }
      }
    }

    // Auto calculate amount when rate/amount changes
    if (['give_amount', 'get_amount', 'rate', 'direction', 'currency', 'branch_id'].includes(field)) {
      const rate = parseFloat(updated.rate);
      const direction = field === 'direction' ? value : updated.direction;

      if (!isNaN(rate) && rate > 0) {
        if (field === 'get_amount') {
          // User typed get_amount -> calculate give_amount
          const getAmt = parseFloat(value);
          if (!isNaN(getAmt)) {
            if (direction === 'buy') {
              updated.give_amount = (getAmt * rate).toFixed(2);
            } else {
              updated.give_amount = (getAmt / rate).toFixed(2);
            }
          } else {
            updated.give_amount = '';
          }
        } else {
          // User typed give_amount or changed rate/branch -> calculate get_amount
          const giveAmt = parseFloat(updated.give_amount);
          if (!isNaN(giveAmt)) {
            if (direction === 'buy') {
              updated.get_amount = (giveAmt / rate).toFixed(2);
            } else {
              updated.get_amount = (giveAmt * rate).toFixed(2);
            }
          } else {
            updated.get_amount = '';
          }
        }
      }
    }

    setCreateResForm(updated);
  };

  const handleCreateResSave = async (e) => {
    e.preventDefault();
    if (!createResForm.give_amount || !createResForm.get_amount || !createResForm.rate || !createResForm.branch_id || !createResForm.phone) {
      alert("Заповніть всі обов'язкові поля!");
      return;
    }
    setResSaving(true);
    try {
      const payload = {
        give_amount: parseFloat(createResForm.give_amount),
        give_currency: createResForm.direction === 'buy' ? 'UAH' : createResForm.currency,
        get_amount: parseFloat(createResForm.get_amount),
        get_currency: createResForm.direction === 'buy' ? createResForm.currency : 'UAH',
        rate: parseFloat(createResForm.rate),
        branch_id: parseInt(createResForm.branch_id),
        customer_name: createResForm.customer_name || null,
        phone: createResForm.phone,
        operator_note: createResForm.operator_note || null,
      };

      await adminService.createReservation(payload);
      setCreateResModalOpen(false);
      setCreateResForm({
        direction: 'buy', currency: 'USD', give_amount: '', get_amount: '',
        rate: '', branch_id: '', customer_name: '', phone: '+380', operator_note: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error creating reservation:', error);
      alert(error.response?.data?.detail || 'Помилка створення');
    } finally {
      setResSaving(false);
    }
  };

  const handleRestoreReservation = async (resId) => {
    try {
      await adminService.updateReservation(resId, { status: 'pending' });
      fetchData();
    } catch (error) {
      console.error('Error restoring reservation:', error);
      alert(error.response?.data?.detail || 'Помилка відновлення');
    }
  };

  const handleDeleteReservation = async (resId) => {
    if (!confirm('Видалити цю заявку? Вона зникне з списку.')) return;
    try {
      await adminService.updateReservation(resId, { status: 'deleted' });
      fetchData();
    } catch (error) {
      console.error('Error deleting reservation:', error);
      alert(error.response?.data?.detail || 'Помилка видалення');
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
    setExpandedSeoIds(prev =>
      prev.includes(currency.code)
        ? prev.filter(c => c !== currency.code)
        : [...prev, currency.code]
    );
  };

  const handleSeoSave = async (code, data) => {
    try {
      await adminService.updateCurrency(code, data);
      await fetchData();
      setExpandedSeoIds(prev => prev.filter(c => c !== code)); // Close on save
    } catch (error) {
      console.error('Error saving SEO info:', error);
      alert('Помилка збереження SEO інформації');
      throw error;
    }
  };

  const handleSeoCancel = (code) => {
    setExpandedSeoIds(prev => prev.filter(c => c !== code));
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
            <div className="flex items-center gap-2 bg-primary-light/50 rounded-lg px-3 py-1.5 border border-white/10">
              <button
                onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
                className="p-1 text-text-secondary hover:text-accent-yellow transition-colors"
                title={volume === 0 ? 'Увімкнути звук' : 'Вимкнути звук'}
              >
                {volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-accent-yellow" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 h-1 accent-accent-yellow cursor-pointer"
                title={`Гучність: ${Math.round(volume * 100)}%`}
              />
              <button
                onClick={playNotification}
                className="p-1 text-text-secondary hover:text-accent-yellow transition-colors"
                title="Перевірити звук"
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>
            <div className="text-right">
              <div className="font-medium text-sm">{user.name}</div>
              <div className="text-xs text-accent-yellow">Адміністратор</div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              aria-label="Вийти"
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
            className={`px-5 py-2.5 rounded-xl font-medium transition-all relative ${activeTab === 'reservations'
              ? 'bg-accent-yellow text-primary'
              : dashboard?.pending_reservations > 0
                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 animate-pulse'
                : 'bg-primary-light text-text-secondary hover:text-white'
              }`}
          >
            <Building2 className="w-4 h-4 inline mr-2" />
            Бронювання
            {dashboard?.pending_reservations > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('chats')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all relative ${activeTab === 'chats'
              ? 'bg-accent-yellow text-primary'
              : chatSessions.some(c => c.messages?.some(m => m.sender === 'user' && !m.is_read))
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 animate-pulse'
                : 'bg-primary-light text-text-secondary hover:text-white'
              }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" />
            Чати
            {chatSessions.some(c => c.messages?.some(m => m.sender === 'user' && !m.is_read)) && (
              <Fragment>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </Fragment>
            )}
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
          <button
            onClick={() => setActiveTab('balances')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'balances'
              ? 'bg-accent-yellow text-primary'
              : 'bg-primary-light text-text-secondary hover:text-white'
              }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Залишки
          </button>

        </div>



        {activeTab === 'balances' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-primary-light p-6 rounded-2xl border border-white/10 mb-6 shadow-xl">
              <label className="block text-sm font-medium text-text-secondary mb-3">Виберіть відділення для перегляду залишків:</label>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <select
                  value={balancesBranchId || ''}
                  onChange={(e) => setBalancesBranchId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full sm:w-80 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-accent-yellow transition-all shadow-inner"
                >
                  <option value="">-- Оберіть відділення --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.address} (№{b.number})</option>
                  ))}
                </select>
                {balancesBranchId && (
                  <span className="text-xs text-accent-yellow font-medium bg-accent-yellow/10 px-3 py-1.5 rounded-full border border-accent-yellow/20">
                    Вибрано ID: {balancesBranchId}
                  </span>
                )}
              </div>
            </div>

            {balancesBranchId ? (
              <BranchBalancesTab branchId={balancesBranchId} readOnly={true} />
            ) : (
              <div className="bg-primary-light rounded-3xl p-20 border border-dashed border-white/10 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-2">
                  <Building2 className="w-10 h-10 text-text-secondary opacity-30" />
                </div>
                <h4 className="text-xl font-bold text-white/50">Відділення не вибрано</h4>
                <p className="text-text-secondary max-w-sm">Будь ласка, оберіть відділення зі списку вище, щоб переглянути та редагувати поточні залишки валют.</p>
              </div>
            )}
          </div>
        )}

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
                      aria-label="Завантажити файл"
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

                <div className="p-4 bg-accent-yellow/10 rounded-xl">
                  <h4 className="font-medium text-sm mb-3 text-accent-yellow">📋 Формат Excel файлу (Матриця 34 валюти)</h4>
                  <div className="text-xs text-text-secondary overflow-x-auto">
                    <p className="mb-2 italic">Файл повинен містити основний аркуш (наприклад "Відділення"), де в рядках - всі 34 валюти, а в стовпцях - дані по кожному відділенню.</p>
                    <table className="w-full border-collapse border border-white/20 mb-4 text-[10px] text-center bg-primary/40">
                      <thead>
                        <tr className="bg-white/10 text-white">
                          <th className="border border-white/10 p-2">Код</th>
                          <th className="border border-white/10 p-2">Прапор</th>
                          <th className="border border-white/10 p-2">Валюта</th>
                          <th className="border-x-2 border-white/30 p-2 bg-accent-yellow/5" colSpan="4">1 вул. Старовокзальна, 23</th>
                          <th className="border-x-2 border-white/30 p-2 bg-accent-yellow/5" colSpan="4">2 вул. Під Дубом, 2А</th>
                          <th className="border border-white/10 p-2">...</th>
                        </tr>
                        <tr className="bg-white/5 text-[9px]">
                          <th className="border border-white/10 p-1"></th>
                          <th className="border border-white/10 p-1"></th>
                          <th className="border border-white/10 p-1"></th>
                          <th className="border border-white/10 p-1 text-green-400">Куп</th>
                          <th className="border border-white/10 p-1 text-red-400">Прод</th>
                          <th className="border border-white/10 p-1 text-accent-yellow">Опт К.</th>
                          <th className="border border-white/10 p-1 text-accent-yellow">Опт П.</th>
                          <th className="border border-white/10 p-1 text-green-400">Куп</th>
                          <th className="border border-white/10 p-1 text-red-400">Прод</th>
                          <th className="border border-white/10 p-1 text-accent-yellow">Опт К.</th>
                          <th className="border border-white/10 p-1 text-accent-yellow">Опт П.</th>
                          <th className="border border-white/10 p-1">...</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-white/10 p-1 font-bold">USD</td>
                          <td className="border border-white/10 p-1">🇺🇸</td>
                          <td className="border border-white/10 p-1 text-left">Долар США</td>
                          <td className="border border-white/10 p-1">41.50</td>
                          <td className="border border-white/10 p-1">42.00</td>
                          <td className="border border-white/10 p-1">41.80</td>
                          <td className="border border-white/10 p-1">41.95</td>
                          <td className="border border-white/10 p-1">41.55</td>
                          <td className="border border-white/10 p-1">42.05</td>
                          <td className="border border-white/10 p-1">41.85</td>
                          <td className="border border-white/10 p-1">42.00</td>
                          <td className="border border-white/10 p-1">...</td>
                        </tr>
                        <tr>
                          <td className="border border-white/10 p-1 font-bold">EUR</td>
                          <td className="border border-white/10 p-1">🇪🇺</td>
                          <td className="border border-white/10 p-1 text-left">Євро</td>
                          <td className="border border-white/10 p-1">45.20</td>
                          <td className="border border-white/10 p-1">45.90</td>
                          <td className="border border-white/10 p-1">45.50</td>
                          <td className="border border-white/10 p-1">45.75</td>
                          <td className="border border-white/10 p-1">45.25</td>
                          <td className="border border-white/10 p-1">45.95</td>
                          <td className="border border-white/10 p-1">45.55</td>
                          <td className="border border-white/10 p-1">45.80</td>
                          <td className="border border-white/10 p-1">...</td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="text-[10px] text-accent-yellow/80 mt-2">
                      💡 При завантаженні система оновить всі 34 валюти. Якщо ціна 0 або порожня - будуть використані базові курси.
                    </p>
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
                    aria-label="Оновити курси"
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
                      {currencies.map((currency) => {
                        // Compute min/max rates across branches
                        let minBuy = Infinity, maxBuy = -Infinity, minSell = Infinity, maxSell = -Infinity;
                        let hasBranchRates = false;
                        if (allRates?.branch_rates) {
                          Object.values(allRates.branch_rates).forEach(branchCurrs => {
                            const r = branchCurrs?.[currency.code];
                            if (r) {
                              if (r.buy > 0) { minBuy = Math.min(minBuy, r.buy); maxBuy = Math.max(maxBuy, r.buy); hasBranchRates = true; }
                              if (r.sell > 0) { minSell = Math.min(minSell, r.sell); maxSell = Math.max(maxSell, r.sell); hasBranchRates = true; }
                            }
                          });
                        }
                        if (minBuy === Infinity) minBuy = 0;
                        if (maxBuy === -Infinity) maxBuy = 0;
                        if (minSell === Infinity) minSell = 0;
                        if (maxSell === -Infinity) maxSell = 0;

                        return (
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
                                {hasBranchRates && minBuy > 0 && (
                                  <div className="text-[10px] text-text-secondary font-normal">
                                    {minBuy === maxBuy ? minBuy.toFixed(2) : `${minBuy.toFixed(2)}–${maxBuy.toFixed(2)}`}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 pr-4 text-right font-medium text-red-400">
                                {currency.sell_rate?.toFixed(2)}
                                {hasBranchRates && minSell > 0 && (
                                  <div className="text-[10px] text-text-secondary font-normal">
                                    {minSell === maxSell ? minSell.toFixed(2) : `${minSell.toFixed(2)}–${maxSell.toFixed(2)}`}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 pr-4 text-right font-medium text-accent-yellow">
                                {currency.wholesale_buy_rate > 0 ? currency.wholesale_buy_rate?.toFixed(2) : '-'}
                              </td>
                              <td className="py-3 text-right font-medium text-accent-yellow">
                                {currency.wholesale_sell_rate > 0 ? currency.wholesale_sell_rate?.toFixed(2) : '-'}
                              </td>
                              <td className="py-3 pl-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleSeoEdit(currency)}
                                    className={`p-1.5 rounded-lg transition-colors ${expandedSeoIds.includes(currency.code) ? 'bg-accent-yellow/20 text-accent-yellow' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
                                    title="SEO інформація"
                                  >
                                    <Globe className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {/* SEO Editing Form Row */}
                            {/* SEO Editing Form Row */}
                            {expandedSeoIds.includes(currency.code) && (
                              <SeoEditRow
                                key={`${currency.code}-seo`}
                                currency={currency}
                                onSave={handleSeoSave}
                                onCancel={() => handleSeoCancel(currency.code)}
                              />
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {ratesSubTab === 'branches' && (
              <div className="bg-primary-light rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Курси по відділеннях</h3>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                      type="text"
                      value={branchCurrencySearch}
                      onChange={(e) => setBranchCurrencySearch(e.target.value.toUpperCase())}
                      placeholder="Фільтр валюти... (USD, EUR)"
                      aria-label="Фільтр валюти"
                      className="pl-9 pr-4 py-2 bg-primary border border-white/10 rounded-xl text-sm focus:outline-none focus:border-accent-yellow w-52"
                    />
                    {branchCurrencySearch && (
                      <button
                        onClick={() => setBranchCurrencySearch('')}
                        aria-label="Очистити пошук"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {allRates?.branch_rates && Object.keys(allRates.branch_rates).length > 0 ? (
                  <div className="space-y-6">
                    {allRates.branches?.map((branch) => {
                      const filteredCurrencies = branchCurrencySearch
                        ? currencies.filter(c =>
                          c.code.includes(branchCurrencySearch) ||
                          (c.name_uk || '').toUpperCase().includes(branchCurrencySearch)
                        )
                        : currencies;
                      return (
                        <div key={branch.id} className="p-4 bg-primary rounded-xl border border-white/5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-accent-yellow" />
                              <span className="font-medium">{branch.address}</span>
                              <span className="text-xs text-text-secondary">(№ {branch.number || branch.id})</span>
                            </div>
                            <button
                              onClick={() => openAddRateModal(branch.id)}
                              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-green-400 transition-colors"
                              title="Додати валюту"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Iterate filtered currencies */}
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {filteredCurrencies.map((currency) => (
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
                      );
                    })}
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

        {/* Cross-Rates Section inside rates tab */}
        {activeTab === 'rates' && (
          <div className="bg-primary-light rounded-2xl p-6 border border-white/10 mt-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Крос-курси (валютні пари)</h3>
              <button
                onClick={() => {
                  setEditingCrossRate(null);
                  setCrossRateForm({ base_currency: '', quote_currency: '', buy_rate: '', sell_rate: '' });
                  setCrossRateModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-accent-yellow text-primary font-bold rounded-xl hover:opacity-90 transition-all text-sm"
              >
                <Plus className="w-4 h-4" /> Додати пару
              </button>
            </div>

            {crossRatePairs.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <p>Крос-курсів немає. Додайте першу пару.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-text-secondary border-b border-white/10">
                      <th className="pb-3">Пара</th>
                      <th className="pb-3 text-right">Купівля</th>
                      <th className="pb-3 text-right">Продаж</th>
                      <th className="pb-3 text-right">Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crossRatePairs.map((cr) => (
                      <tr key={cr.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 font-semibold">{cr.base_currency}/{cr.quote_currency}</td>
                        <td className="py-3 text-right text-green-400 font-mono">{cr.buy_rate?.toFixed(4)}</td>
                        <td className="py-3 text-right text-red-400 font-mono">{cr.sell_rate?.toFixed(4)}</td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingCrossRate(cr);
                                setCrossRateForm({
                                  base_currency: cr.base_currency,
                                  quote_currency: cr.quote_currency,
                                  buy_rate: cr.buy_rate,
                                  sell_rate: cr.sell_rate
                                });
                                setCrossRateModal(true);
                              }}
                              className="p-2 text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                              title="Редагувати"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm('Видалити цю пару?')) return;
                                try {
                                  await adminService.deleteCrossRate(cr.id);
                                  setCrossRatePairs(prev => prev.filter(p => p.id !== cr.id));
                                } catch (e) {
                                  alert('Помилка видалення');
                                }
                              }}
                              className="p-2 text-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Видалити"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Cross-Rate Add/Edit Modal */}
        {crossRateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-primary-light rounded-2xl p-6 w-full max-w-sm border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">{editingCrossRate ? 'Редагувати пару' : 'Додати крос-курс'}</h3>
                <button onClick={() => setCrossRateModal(false)} aria-label="Закрити"><X className="w-5 h-5 text-text-secondary" /></button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="field_1" className="block text-sm text-text-secondary mb-1">Базова</label>
                    <input id="field_1"
                      type="text"
                      placeholder="EUR"
                      value={crossRateForm.base_currency}
                      onChange={(e) => setCrossRateForm({ ...crossRateForm, base_currency: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow uppercase"
                      maxLength={3}
                    />
                  </div>
                  <div>
                    <label htmlFor="field_2" className="block text-sm text-text-secondary mb-1">Котирувальна</label>
                    <input id="field_2"
                      type="text"
                      placeholder="USD"
                      value={crossRateForm.quote_currency}
                      onChange={(e) => setCrossRateForm({ ...crossRateForm, quote_currency: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow uppercase"
                      maxLength={3}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="field_3" className="block text-sm text-text-secondary mb-1">Купівля</label>
                    <input id="field_3"
                      type="number"
                      step="0.0001"
                      value={crossRateForm.buy_rate}
                      onChange={(e) => setCrossRateForm({ ...crossRateForm, buy_rate: e.target.value })}
                      className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow"
                    />
                  </div>
                  <div>
                    <label htmlFor="field_4" className="block text-sm text-text-secondary mb-1">Продаж</label>
                    <input id="field_4"
                      type="number"
                      step="0.0001"
                      value={crossRateForm.sell_rate}
                      onChange={(e) => setCrossRateForm({ ...crossRateForm, sell_rate: e.target.value })}
                      className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setCrossRateModal(false)}
                    className="flex-1 py-3 bg-white/5 rounded-xl text-text-secondary hover:text-white hover:bg-white/10 transition-all"
                  >
                    Скасувати
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const payload = {
                          base_currency: crossRateForm.base_currency,
                          quote_currency: crossRateForm.quote_currency,
                          buy_rate: parseFloat(crossRateForm.buy_rate) || 0,
                          sell_rate: parseFloat(crossRateForm.sell_rate) || 0
                        };
                        if (editingCrossRate) {
                          const res = await adminService.updateCrossRate(editingCrossRate.id, payload);
                          setCrossRatePairs(prev => prev.map(p => p.id === editingCrossRate.id ? res.data : p));
                        } else {
                          const res = await adminService.createCrossRate(payload);
                          setCrossRatePairs(prev => [...prev, res.data]);
                        }
                        setCrossRateModal(false);
                      } catch (e) {
                        alert('Помилка збереження: ' + (e.response?.data?.detail || e.message));
                      }
                    }}
                    className="flex-1 py-3 bg-accent-yellow text-primary font-bold rounded-xl hover:opacity-90 transition-all"
                  >
                    {editingCrossRate ? 'Зберегти' : 'Додати'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reservations Tab */}
        {activeTab === 'reservations' && (
          <div className="bg-primary-light rounded-2xl p-6 border border-white/10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div className="flex items-center justify-between lg:justify-start w-full lg:w-auto gap-4">
                <h3 className="text-lg font-bold">Всі бронювання</h3>
                <button
                  onClick={() => setCreateResModalOpen(true)}
                  className="px-4 py-2 bg-accent-yellow text-primary font-bold rounded-lg hover:opacity-90 transition-opacity text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Створити
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        setDateFrom(today);
                        setDateTo(today);
                      }}
                      className="px-3 py-2 bg-primary rounded-lg border border-white/10 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
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
                      className="px-3 py-2 bg-primary rounded-lg border border-white/10 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
                    >
                      Вчора
                    </button>
                  </div>
                  <div className="hidden sm:block w-px h-8 bg-white/10 mx-1"></div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      aria-label="Початкова дата"
                      className="px-3 py-2 bg-primary rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow text-white [color-scheme:dark] w-[130px] sm:w-auto"
                    />
                    <span className="text-text-secondary">—</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      aria-label="Кінцева дата"
                      className="px-3 py-2 bg-primary rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow text-white [color-scheme:dark] w-[130px] sm:w-auto"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-primary rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                  >
                    <option value="">Всі відділення</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.address} (№{b.number})</option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-primary rounded-lg border border-white/10 text-sm focus:outline-none focus:border-accent-yellow"
                  >
                    <option value="">Всі статуси</option>
                    <option value="pending_admin">Очікує адміна</option>
                    <option value="pending">Очікує оператора</option>
                    <option value="confirmed">Підтверджено</option>
                    <option value="cancelled">Скасовано</option>
                    <option value="expired">Прострочено</option>
                  </select>

                  <button
                    onClick={fetchData}
                    className="p-2 text-text-secondary hover:text-white rounded-lg hover:bg-white/5 transition-colors flex-shrink-0"
                    aria-label="Оновити бронювання"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {filteredReservations.length === 0 ? (
              <div className="text-center py-12 text-text-secondary">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Немає бронювань</p>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="grid gap-4 lg:hidden">
                  {filteredReservations.map((res) => {
                    const statusCfg = STATUS_CONFIG[res.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusCfg.icon;

                    return (
                      <div
                        key={res.id}
                        className={`p-4 rounded-xl border border-white/10 transition-colors ${(res.status === 'pending_admin' || res.status === 'cancelled')
                          ? 'bg-accent-yellow/10 animate-pulse outline outline-1 outline-accent-yellow/30'
                          : 'bg-white/5'
                          }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-[10px] text-text-secondary tracking-wider">#{res.id}</span>
                            <div className="text-xs text-text-secondary">
                              {new Date(res.created_at).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusCfg.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusCfg.label}
                          </span>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <div className="text-base font-bold text-white mb-0.5">{res.customer_name || '—'}</div>
                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                              <Phone className="w-3.5 h-3.5" />
                              <a href={`tel:${res.phone}`} className="hover:text-accent-yellow transition-colors underline decoration-white/20 underline-offset-4">
                                {res.phone}
                              </a>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 py-3 border-y border-white/10">
                            <div>
                              <div className="text-[9px] uppercase text-text-secondary font-bold mb-1 tracking-wider">Віддає</div>
                              <div className="text-sm font-bold text-white">{res.give_amount.toLocaleString()} {res.give_currency}</div>
                            </div>
                            <div>
                              <div className="text-[9px] uppercase text-text-secondary font-bold mb-1 tracking-wider">Отримує</div>
                              <div className="text-sm font-bold text-white">{res.get_amount.toLocaleString()} {res.get_currency}</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                              <div className="text-[9px] uppercase text-text-secondary font-bold tracking-wider">Курс</div>
                              <div className="text-sm font-bold text-accent-yellow">{res.rate}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[9px] uppercase text-text-secondary font-bold tracking-wider mb-0.5">Тип</div>
                              {(() => {
                                const dir = getDirection(res);
                                return (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${dir.color}`}>
                                    {dir.label}
                                  </span>
                                );
                              })()}
                            </div>
                            <div className="text-right">
                              <div className="text-[9px] uppercase text-text-secondary font-bold tracking-wider mb-0.5">Відділення</div>
                              <div className="text-xs text-text-secondary max-w-[150px] truncate">{res.branch_address || '—'}{res.branch_number != null ? ` (№${res.branch_number})` : ''}</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                            <button
                              onClick={() => openResModal(res)}
                              className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-xs font-medium"
                            >
                              <Pencil className="w-3.5 h-3.5 text-text-secondary" />
                              <span>Редагувати</span>
                            </button>

                            <button
                              onClick={() => setViewNoteModal(res.operator_note || 'Нотаток в оператора немає')}
                              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors relative"
                            >
                              <MessageSquare className="w-4 h-4 text-text-secondary" />
                              {res.operator_note && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-primary-light pulse"></span>
                              )}
                            </button>

                            {res.status === 'pending_admin' && (
                              <button
                                onClick={() => handleAssign(res.id)}
                                className="p-2.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}

                            {(res.status === 'cancelled' || res.status === 'expired') && (
                              <button
                                onClick={() => handleRestoreReservation(res.id)}
                                className="p-2.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-text-secondary border-b border-white/10">
                        <th className="pb-3 pr-4">ID</th>
                        <th className="pb-3 pr-4">Клієнт</th>
                        <th className="pb-3 pr-4">Тип</th>
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
                          <tr
                            key={res.id}
                            className={`border-b border-white/5 transition-colors ${(res.status === 'pending_admin' || res.status === 'cancelled')
                              ? 'bg-accent-yellow/10 animate-pulse hover:bg-accent-yellow/20'
                              : 'hover:bg-white/5'
                              }`}
                          >
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
                              {(() => {
                                const dir = getDirection(res);
                                return (
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${dir.color}`}>
                                    {dir.label}
                                  </span>
                                );
                              })()}
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
                              {res.branch_address || '—'}{res.branch_number != null ? ` (№${res.branch_number})` : ''}
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
                                {/* Edit button always visible */}
                                <button
                                  onClick={() => openResModal(res)}
                                  className="p-2 text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                  title="Редагувати"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => setViewNoteModal(res.operator_note || 'Нотаток в оператора немає')}
                                  className="p-2 text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors relative"
                                  title="Нотатка оператора"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                  {res.operator_note && (
                                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                                  )}
                                </button>

                                {/* Assign to operator – for pending_admin */}
                                {res.status === 'pending_admin' && (
                                  <button
                                    onClick={() => handleAssign(res.id)}
                                    className="p-2 text-text-secondary hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                                    title="Надіслати оператору"
                                  >
                                    <Send className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Restore button – for cancelled / expired */}
                                {(res.status === 'cancelled' || res.status === 'expired') && (
                                  <button
                                    onClick={() => handleRestoreReservation(res.id)}
                                    className="p-2 text-text-secondary hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                                    title="Відновити"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Add/Edit Rate Modal */}
        {rateModal.open && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-primary-light rounded-2xl p-6 w-full max-w-sm border border-white/10 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Додати/Редагувати курс</h3>
                <button onClick={() => setRateModal({ ...rateModal, open: false })} aria-label="Закрити"><X className="w-5 h-5 text-text-secondary" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="field_5" className="block text-sm text-text-secondary mb-1">Валюта</label>
                  <select id="field_5"
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
                    <label htmlFor="field_6" className="block text-sm text-text-secondary mb-1">Купівля</label>
                    <input id="field_6"
                      type="number" step="0.01"
                      className="w-full bg-primary border border-white/10 rounded-lg p-2.5 text-white"
                      value={rateForm.buy}
                      onChange={(e) => setRateForm({ ...rateForm, buy: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="field_7" className="block text-sm text-text-secondary mb-1">Продаж</label>
                    <input id="field_7"
                      type="number" step="0.01"
                      className="w-full bg-primary border border-white/10 rounded-lg p-2.5 text-white"
                      value={rateForm.sell}
                      onChange={(e) => setRateForm({ ...rateForm, sell: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="field_8" className="block text-sm text-accent-yellow/80 mb-1">Опт Купівля</label>
                    <input id="field_8"
                      type="number" step="0.01"
                      className="w-full bg-primary border border-white/10 rounded-lg p-2.5 text-white"
                      value={rateForm.wholesale_buy}
                      onChange={(e) => setRateForm({ ...rateForm, wholesale_buy: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="field_9" className="block text-sm text-accent-yellow/80 mb-1">Опт Продаж</label>
                    <input id="field_9"
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

        {/* Chats Tab */}
        {activeTab === 'chats' && (
          <div className="flex gap-6 h-[600px] mt-4">
            {/* Chat List */}
            <div className="w-1/3 bg-primary-light border border-white/10 rounded-2xl flex flex-col overflow-hidden">
              <div className="p-4 border-b border-white/10 bg-white/5 font-bold flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-accent-yellow" />
                Активні чати
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {chatSessions.length === 0 ? (
                  <div className="text-center text-text-secondary py-8 text-sm">Немає активних чатів</div>
                ) : (
                  chatSessions.map(session => {
                    const unread = session.messages?.filter(m => m.sender === 'user' && !m.is_read).length || 0;
                    const cName = getCustomerName(chatSessions, session.session_id);
                    return (
                      <button
                        key={session.session_id}
                        onClick={() => setActiveChatId(session.session_id)}
                        className={`w-full text-left p-4 rounded-xl transition-all border ${activeChatId === session.session_id ? 'bg-primary border-accent-yellow' : 'bg-primary/50 border-white/5 hover:bg-primary border-transparent'}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-sm text-white">Чат {session.session_id.substring(0, 8)} {cName && <span className="text-text-secondary font-normal">({cName})</span>}</span>
                          {unread > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unread} нових</span>}
                        </div>
                        <div className="text-xs text-text-secondary truncate">
                          {session.messages?.[session.messages.length - 1]?.content || 'Немає повідомлень'}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat View */}
            <div className="w-2/3 bg-primary-light border border-white/10 rounded-2xl flex flex-col overflow-hidden">
              {!activeChatId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-text-secondary opacity-50">
                  <MessageSquare className="w-12 h-12 mb-4" />
                  <p>Оберіть чат зі списку зліва</p>
                </div>
              ) : (
                <>
                  <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                    <div className="font-bold text-white flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-accent-yellow" />
                      Чат {activeChatId.substring(0, 8)} {getCustomerName(chatSessions, activeChatId) && <span className="text-text-secondary font-normal">({getCustomerName(chatSessions, activeChatId)})</span>}
                    </div>
                    <button
                      onClick={async () => {
                        if (window.confirm('Закрити цей чат?')) {
                          await adminService.closeChatSession(activeChatId);
                          setActiveChatId(null);
                          // refresh list
                          const res = await adminService.getChatSessions();
                          if (res?.data) setChatSessions(res.data);
                        }
                      }}
                      className="text-xs text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Закрити чат
                    </button>
                  </div>

                  <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-primary/30">
                    {chatMessages.length === 0 ? (
                      <div className="text-center text-text-secondary py-8">Немає повідомлень</div>
                    ) : (
                      chatMessages.map(msg => {
                        const isAdmin = msg.sender === 'admin';
                        return (
                          <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} group w-full`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2 relative ${isAdmin ? 'bg-accent-yellow text-primary rounded-br-none' : 'bg-white/10 text-white rounded-bl-none'}`}>
                              {editingChatMsgId === msg.id ? (
                                <div className="flex flex-col gap-2 min-w-[200px]">
                                  <textarea
                                    className="w-full bg-primary/20 text-primary p-2 border border-primary/20 rounded resize-none"
                                    value={editingChatMsgContent}
                                    onChange={(e) => setEditingChatMsgContent(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleEditChatMsgSave(msg.id);
                                      } else if (e.key === 'Escape') {
                                        setEditingChatMsgId(null);
                                      }
                                    }}
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingChatMsgId(null)} className="text-[10px] font-bold px-2 py-1 bg-white/30 rounded">Скасувати</button>
                                    <button onClick={() => handleEditChatMsgSave(msg.id)} className="text-[10px] font-bold px-2 py-1 bg-primary text-white rounded">Зберегти</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2 group">
                                  {msg.image_url ? (
                                    <div className="mb-1 rounded-md overflow-hidden bg-black/10 self-start max-w-full">
                                      <img
                                        src={getStaticUrl(msg.image_url)}
                                        alt="Отримане фото"
                                        className="max-w-full h-auto max-h-[250px] object-contain rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => window.open(getStaticUrl(msg.image_url), '_blank')}
                                      />
                                    </div>
                                  ) : null}
                                  {msg.content && <p className="whitespace-pre-wrap text-sm break-words">{msg.content}</p>}
                                  {isAdmin && (
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 absolute -left-8 top-0">
                                      <button
                                        onClick={() => {
                                          setEditingChatMsgId(msg.id);
                                          setEditingChatMsgContent(msg.content || '');
                                        }}
                                        className="p-1 hover:bg-black/10 rounded text-text-secondary"
                                        title="Редагувати"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteChatMsg(msg.id)}
                                        className="p-1 hover:bg-red-500/20 rounded text-red-500/70 hover:text-red-500"
                                        title="Видалити"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] text-text-secondary mt-1 px-1 flex items-center gap-1">
                              {new Date(msg.created_at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                              {isAdmin && (
                                <span className={msg.is_read ? "text-blue-400" : "text-gray-500"}>
                                  {msg.is_read ? '✓✓' : '✓'}
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatMessagesEndRef} />
                  </div>

                  <div className="p-4 border-t border-white/10 bg-white/5">
                    <form onSubmit={(e) => { e.preventDefault(); handleSendAdminMessage(); }} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        placeholder="Введіть відповідь..."
                        disabled={chatLoading}
                        className="flex-1 px-4 py-3 bg-primary border border-white/10 rounded-xl focus:border-accent-yellow focus:outline-none text-sm text-white disabled:opacity-50"
                      />

                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={chatFileInputRef}
                        onChange={handleAdminImageUpload}
                      />

                      <button
                        type="button"
                        onClick={() => chatFileInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="p-3 text-text-secondary hover:text-accent-yellow transition-colors disabled:opacity-50 shrink-0"
                        title="Прикріпити фото"
                      >
                        {isUploadingImage ? <RefreshCw className="w-5 h-5 animate-spin" /> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>}
                      </button>

                      <button
                        type="submit"
                        disabled={(!chatInput.trim() && !isUploadingImage) || chatLoading}
                        className="px-6 py-3 bg-accent-yellow text-primary font-bold rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                      >
                        <Send className="w-4 h-4" />
                        Відправити
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        )}


        {/* Reservation Edit Modal */}
        {editingReservation && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-primary-light rounded-2xl p-6 w-full max-w-md border border-white/10 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Редагувати бронювання #{editingReservation.id}</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="field_10" className="block text-sm text-text-secondary mb-1">Ім'я клієнта</label>
                    <input id="field_10"
                      type="text"
                      value={resForm.customer_name}
                      onChange={(e) => setResForm({ ...resForm, customer_name: e.target.value })}
                      className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow"
                      placeholder="Іван"
                    />
                  </div>
                  <div>
                    <label htmlFor="field_11" className="block text-sm text-text-secondary mb-1">Телефон</label>
                    <input id="field_11"
                      type="text"
                      value={resForm.phone}
                      onChange={(e) => setResForm({ ...resForm, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow"
                      placeholder="+380..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="editingreservation_give_currency_12" className="block text-sm text-text-secondary mb-1">
                      Віддає ({editingReservation.give_currency})
                    </label>
                    <input id="editingreservation_give_currency_12"
                      type="number"
                      value={resForm.give_amount}
                      onChange={(e) => handleResFormChange('give_amount', e.target.value)}
                      className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow"
                    />
                  </div>
                  <div>
                    <label htmlFor="editingreservation_get_currency_13" className="block text-sm text-text-secondary mb-1">
                      Отримує ({editingReservation.get_currency})
                    </label>
                    <input id="editingreservation_get_currency_13"
                      type="number"
                      value={resForm.get_amount}
                      onChange={(e) => handleResFormChange('get_amount', e.target.value)}
                      className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="field_14" className="block text-sm text-text-secondary mb-1">Курс</label>
                  <input id="field_14"
                    type="number"
                    step="0.01"
                    value={resForm.rate}
                    onChange={(e) => handleResFormChange('rate', e.target.value)}
                    className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow"
                  />
                </div>

                <div>
                  <label htmlFor="field_15" className="block text-sm text-text-secondary mb-1">Відділення</label>
                  <select id="field_15"
                    value={resForm.branch_id}
                    onChange={(e) => setResForm({ ...resForm, branch_id: e.target.value ? parseInt(e.target.value) : '' })}
                    className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow"
                  >
                    <option value="">— Оберіть відділення —</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.address} (№{b.number})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="field_16" className="block text-sm text-text-secondary mb-1">Статус</label>
                  <select id="field_16"
                    value={resForm.status || editingReservation?.status || ''}
                    onChange={(e) => setResForm({ ...resForm, status: e.target.value })}
                    className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow"
                  >
                    <option value="pending_admin">🟡 Очікує адміна</option>
                    <option value="pending">🟠 Очікує оператора</option>
                    <option value="confirmed">🔵 Підтверджено</option>
                    <option value="completed">🟢 Завершено</option>
                    <option value="cancelled">🔴 Скасовано</option>
                    <option value="expired">⚫ Прострочено</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="field_17" className="block text-sm text-text-secondary mb-1">Нотатка оператора</label>
                  <textarea id="field_17"
                    value={resForm.operator_note || ''}
                    onChange={(e) => setResForm({ ...resForm, operator_note: e.target.value })}
                    placeholder="Нотатка до бронювання..."
                    rows={2}
                    className="w-full px-4 py-3 bg-primary rounded-xl border border-white/10 focus:outline-none focus:border-accent-yellow resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                {/* Restore Button - only for cancelled or expired */}
                {(editingReservation.status === 'cancelled' || editingReservation.status === 'expired') && (
                  <button
                    onClick={() => { handleRestoreReservation(editingReservation.id); setEditingReservation(null); }}
                    className="flex-1 py-3 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/30 transition-all"
                  >
                    Відновити
                  </button>
                )}
                {/* Delete Button */}
                <button
                  onClick={() => { handleDeleteReservation(editingReservation.id); setEditingReservation(null); }}
                  className="py-3 px-4 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-all"
                >
                  Видалити
                </button>
              </div>
              <div className="flex gap-3 mt-2">
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

        {/* Create Reservation Modal */}
        {createResModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm shadow-2xl flex justify-center z-[60] overflow-y-auto" onClick={() => setCreateResModalOpen(false)}>
            <div
              className="bg-primary-light m-auto w-full max-w-lg mb-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 border-b border-white/10 flex justify-between items-center sticky top-0 bg-primary-light z-10 shadow-sm">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-accent-yellow/10 rounded-lg text-accent-yellow">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  Створити бронювання
                </h3>
                <button onClick={() => setCreateResModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg text-text-secondary hover:text-white transition-colors" aria-label="Закрити">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="p-4 bg-primary/50 border border-white/5 rounded-xl space-y-4">

                  {/* Direction */}
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1.5 block uppercase tracking-wider">Тип операції</label>
                    <select
                      className="w-full bg-primary border-white/10"
                      value={createResForm.direction}
                      onChange={(e) => handleCreateResFormChange('direction', e.target.value)}
                    >
                      <option value="buy">Клієнт купує валюту (Віддає UAH)</option>
                      <option value="sell">Клієнт здає валюту (Отримує UAH)</option>
                    </select>
                  </div>

                  {/* Currency */}
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1.5 block uppercase tracking-wider">Валюта</label>
                    <select
                      className="w-full bg-primary border-white/10"
                      value={createResForm.currency}
                      onChange={(e) => handleCreateResFormChange('currency', e.target.value)}
                    >
                      {currencies.map(c => (
                        <option key={c.code} value={c.code}>{c.code} - {c.name_uk}</option>
                      ))}
                    </select>
                  </div>

                  {/* Branch */}
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1.5 block uppercase tracking-wider">Відділення</label>
                    <select
                      className="w-full bg-primary border-white/10"
                      value={createResForm.branch_id}
                      onChange={(e) => handleCreateResFormChange('branch_id', e.target.value)}
                      required
                    >
                      <option value="">Оберіть відділення...</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.address}{b.number ? ` (№${b.number})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1.5 block uppercase tracking-wider">
                      Віддає ({createResForm.direction === 'buy' ? 'UAH' : createResForm.currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full bg-primary/50 border-white/10"
                      value={createResForm.give_amount}
                      onChange={(e) => handleCreateResFormChange('give_amount', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1.5 block uppercase tracking-wider">
                      Отримує ({createResForm.direction === 'buy' ? createResForm.currency : 'UAH'})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full bg-primary/50 border-white/10"
                      value={createResForm.get_amount}
                      onChange={(e) => handleCreateResFormChange('get_amount', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1.5 block uppercase tracking-wider">Курс</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full bg-primary/50 border-white/10"
                    value={createResForm.rate}
                    onChange={(e) => handleCreateResFormChange('rate', e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1.5 block uppercase tracking-wider">Ім'я</label>
                    <input
                      className="w-full bg-primary/50 border-white/10"
                      value={createResForm.customer_name}
                      onChange={(e) => handleCreateResFormChange('customer_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1.5 block uppercase tracking-wider">Телефон</label>
                    <input
                      className="w-full bg-primary/50 border-white/10"
                      value={createResForm.phone}
                      onChange={(e) => handleCreateResFormChange('phone', e.target.value)}
                      required
                      placeholder="+380..."
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1.5 block uppercase tracking-wider">Нотатка</label>
                  <textarea
                    rows={2}
                    className="w-full bg-primary/50 border-white/10"
                    value={createResForm.operator_note}
                    onChange={(e) => handleCreateResFormChange('operator_note', e.target.value)}
                  />
                </div>
              </div>

              <div className="p-5 border-t border-white/10 bg-primary flex gap-3 sticky bottom-0 z-10">
                <button
                  onClick={() => setCreateResModalOpen(false)}
                  className="flex-1 py-3 bg-white/5 rounded-xl text-text-secondary hover:text-white hover:bg-white/10 transition-all font-medium"
                >
                  Скасувати
                </button>
                <button
                  onClick={handleCreateResSave}
                  disabled={resSaving}
                  className="flex-1 py-3 bg-accent-yellow text-primary rounded-xl font-bold hover:brightness-110 transition-all shadow-[0_0_15px_rgba(234,179,8,0.3)] disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {resSaving ? 'Створення...' : 'Створити'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Note Modal */}
        {viewNoteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewNoteModal(null)}>
            <div
              className="bg-primary-light rounded-2xl p-6 w-full max-w-sm border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-red-400">
                  <Pencil className="w-5 h-5 flex-shrink-0" />
                  Нотатка
                </h3>
                <button onClick={() => setViewNoteModal(null)} className="p-1 hover:bg-white/10 rounded-lg text-text-secondary hover:text-white transition-colors" aria-label="Закрити">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-primary/50 p-4 rounded-xl border border-white/5">
                <p className="text-sm whitespace-pre-wrap leading-relaxed break-words overflow-hidden">
                  {viewNoteModal}
                </p>
              </div>
              <button
                onClick={() => setViewNoteModal(null)}
                className="w-full mt-6 py-3 bg-white/5 rounded-xl text-white hover:bg-white/10 transition-colors font-medium"
              >
                Закрити
              </button>
            </div>
          </div>
        )}
      </div>
    </div >
  );
}
