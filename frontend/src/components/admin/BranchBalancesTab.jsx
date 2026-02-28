import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Euro, TrendingUp, RefreshCw, Save, AlertCircle } from 'lucide-react';
import { branchService, currencyService } from '../../services/api';

const USD_CATEGORIES = [
    { key: 'blue', label: 'синій' },
    { key: '01-06', label: '01-06' },
    { key: '96-99', label: '96-99' },
    { key: 'small', label: 'Дрібні <50' },
    { key: 'damaged', label: 'Зношені' },
];

const OLD_CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'CAD'];

export default function BranchBalancesTab({ branchId, readOnly = false }) {
    const [balances, setBalances] = useState([]);
    const [branchRates, setBranchRates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const fetchData = useCallback(async () => {
        if (!branchId) return;
        setLoading(true);
        try {
            const [balancesRes, ratesRes] = await Promise.all([
                branchService.getBalances(branchId),
                currencyService.getAll(branchId),
            ]);
            setBalances(Array.isArray(balancesRes.data) ? balancesRes.data : []);
            setBranchRates(Array.isArray(ratesRes.data) ? ratesRes.data : []);
        } catch (error) {
            console.error('Error fetching balance data:', error);
            setMessage({ type: 'error', text: 'Помилка завантаження даних' });
        } finally {
            setLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getAmount = (currency, category) => {
        if (!balances || balances.length === 0) return '';
        const item = balances.find(b => b.currency_code === currency && b.category === category);
        return item ? item.amount : '';
    };

    const handleInputChange = (currency, category, value) => {
        const amount = value === '' ? 0 : parseFloat(value);
        setBalances(prev => {
            const filtered = prev.filter(b => !(b.currency_code === currency && b.category === category));
            return [...filtered, { currency_code: currency, category, amount }];
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await branchService.updateBalances(branchId, balances);
            setMessage({ type: 'success', text: 'Залишки успішно збережені' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Помилка збереження' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <RefreshCw className="w-8 h-8 text-accent-yellow animate-spin" />
            </div>
        );
    }

    const usdTotal = USD_CATEGORIES.reduce((sum, cat) => sum + (parseFloat(getAmount('USD', cat.key)) || 0), 0);
    const eurTotal = parseFloat(getAmount('EUR', 'amount')) || 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-accent-yellow" />
                    Управління залишками
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchData}
                        disabled={loading || saving}
                        className="p-2 bg-white/5 text-text-secondary rounded-xl hover:text-white transition-colors"
                        title="Оновити дані"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    {!readOnly && (
                        <button
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="flex items-center gap-2 px-6 py-2 bg-accent-yellow text-primary rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Зберегти всі зміни
                        </button>
                    )}
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                    <AlertCircle className="w-5 h-5" />
                    <span>{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* USD Breakdown */}
                <div className="bg-primary-light border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                    <div className="bg-green-600 p-4 flex justify-between items-center">
                        <span className="font-bold text-lg">Залишок по $</span>
                        <span className="font-bold text-xl">{usdTotal.toLocaleString()}</span>
                    </div>
                    <div className="p-4 space-y-3">
                        {USD_CATEGORIES.map(cat => (
                            <div key={cat.key} className="flex items-center justify-between gap-4 py-1 border-b border-white/5 last:border-0">
                                <span className="text-sm font-medium text-text-secondary">{cat.label}</span>
                                <input
                                    type="number"
                                    value={getAmount('USD', cat.key)}
                                    onChange={(e) => handleInputChange('USD', cat.key, e.target.value)}
                                    disabled={readOnly}
                                    className={`w-24 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-right font-mono text-white focus:outline-none focus:border-accent-yellow transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* EUR Breakdown */}
                <div className="bg-primary-light border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                    <div className="bg-green-600 p-4 flex justify-between items-center">
                        <span className="font-bold text-lg">Залишок по €</span>
                        <span className="font-bold text-xl">{eurTotal.toLocaleString()}</span>
                    </div>
                    <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-4 py-1">
                            <span className="text-sm font-medium text-text-secondary">Загальна сума</span>
                            <input
                                type="number"
                                value={getAmount('EUR', 'amount')}
                                onChange={(e) => handleInputChange('EUR', 'amount', e.target.value)}
                                disabled={readOnly}
                                className={`w-24 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-right font-mono text-white focus:outline-none focus:border-accent-yellow transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                            />
                        </div>
                    </div>
                </div>

                {/* Branch Info (Third Screen) */}
                <div className="bg-primary-light border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                    <div className="bg-cyan-500 p-4 text-center">
                        <div className="font-bold text-sm opacity-80 uppercase tracking-wider mb-1">Поточні курси</div>
                        <div className="font-bold text-lg truncate">
                            {branchRates.find(r => r.id === branchId)?.address || 'Курси відділення'}
                        </div>
                    </div>
                    <div className="p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/10 text-text-secondary">
                                    <th className="px-4 py-2 text-left font-medium">{new Date().toLocaleDateString('uk-UA')}</th>
                                    <th className="px-4 py-2 text-center font-medium">куп</th>
                                    <th className="px-4 py-2 text-center font-medium">прод</th>
                                </tr>
                            </thead>
                            <tbody>
                                {branchRates.filter(r => ['USD', 'EUR', 'PLN', 'GBP', 'CHF'].includes(r.code)).map(rate => (
                                    <tr key={rate.code} className="border-b border-white/5 last:border-0">
                                        <td className="px-4 py-3 font-bold">{rate.code}</td>
                                        <td className="px-4 py-3 text-center text-green-400 font-mono">{rate.buy_rate}</td>
                                        <td className="px-4 py-3 text-center text-red-500 font-mono">{rate.sell_rate}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Old Currencies Table */}
            <div className="bg-primary-light border border-white/10 rounded-2xl overflow-hidden shadow-xl mt-8">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h4 className="font-bold text-lg uppercase tracking-wider">СТАРІ</h4>
                    <span className="text-xs text-text-secondary italic">середній курс купівлі</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white/5 text-text-secondary text-sm">
                                <th className="px-6 py-4 text-left font-medium">Валюта</th>
                                <th className="px-6 py-4 text-right font-medium">Кількість</th>
                                <th className="px-6 py-4 text-right font-medium">Середній курс</th>
                            </tr>
                        </thead>
                        <tbody>
                            {OLD_CURRENCIES.map(code => (
                                <tr key={code} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 font-bold text-lg">{code}</td>
                                    <td className="px-6 py-4 text-right">
                                        <input
                                            type="number"
                                            value={getAmount(code, 'old_amount')}
                                            onChange={(e) => handleInputChange(code, 'old_amount', e.target.value)}
                                            disabled={readOnly}
                                            className={`w-32 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-right font-mono text-white focus:outline-none focus:border-accent-yellow transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={getAmount(code, 'average_rate')}
                                            onChange={(e) => handleInputChange(code, 'average_rate', e.target.value)}
                                            disabled={readOnly}
                                            className={`w-32 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-right font-mono text-accent-yellow focus:outline-none focus:border-accent-yellow transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            placeholder="0.00"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
