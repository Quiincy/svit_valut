import React, { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight } from 'lucide-react';

const BranchRateCard = ({ branchId, currency, branchData, onUpdate, onToggle }) => {
    // Determine if we have an override (and it's active) or falling back to base
    // But we need to know if an override EXISTS, even if inactive?
    // branchData comes from allRates.branch_rates[branch.id][currency.code]

    const isOverride = !!branchData;
    const isActive = isOverride ? branchData.is_active : currency.is_active;

    // Initial values from override OR base
    const initialBuy = isOverride ? branchData.buy : currency.buy_rate;
    const initialSell = isOverride ? branchData.sell : currency.sell_rate;
    const initialWholesaleBuy = isOverride ? (branchData.wholesale_buy || 0) : currency.wholesale_buy_rate;
    const initialWholesaleSell = isOverride ? (branchData.wholesale_sell || 0) : currency.wholesale_sell_rate;
    const initialThreshold = isOverride ? (branchData.wholesale_threshold || 1000) : (currency.wholesale_threshold || 1000);

    const [buy, setBuy] = useState(initialBuy || 0);
    const [sell, setSell] = useState(initialSell || 0);
    const [wholesaleBuy, setWholesaleBuy] = useState(initialWholesaleBuy || 0);
    const [wholesaleSell, setWholesaleSell] = useState(initialWholesaleSell || 0);
    const [threshold, setThreshold] = useState(initialThreshold || 1000);
    const [saving, setSaving] = useState(false);

    // Update local state if props change (e.g. refresh from backend)
    useEffect(() => {
        setBuy(initialBuy || 0);
        setSell(initialSell || 0);
        setWholesaleBuy(initialWholesaleBuy || 0);
        setWholesaleSell(initialWholesaleSell || 0);
        setThreshold(initialThreshold || 1000);
    }, [initialBuy, initialSell, initialWholesaleBuy, initialWholesaleSell, initialThreshold]);

    const handleBlur = async () => {
        // Determine if values changed
        if (buy === initialBuy && sell === initialSell &&
            wholesaleBuy === initialWholesaleBuy && wholesaleSell === initialWholesaleSell &&
            threshold == initialThreshold) return;

        setSaving(true);
        try {
            await onUpdate(branchId, currency.code, {
                buy_rate: parseFloat(buy),
                sell_rate: parseFloat(sell),
                wholesale_buy_rate: parseFloat(wholesaleBuy),
                wholesale_sell_rate: parseFloat(wholesaleSell),
                wholesale_threshold: parseInt(threshold) || 1000,
                is_active: isActive // Keep current active status
            });
        } catch (err) {
            console.error("Failed to update rate", err);
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.target.blur();
        }
    };

    return (
        <div className={`p-3 rounded-lg border relative group transition-all ${isActive === false
            ? 'bg-white/5 opacity-40 border-white/5 grayscale'
            : 'bg-green-500/10 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
            }`}>
            <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-sm flex items-center gap-1">
                    <span>{currency.flag}</span>
                    {currency.code}
                </div>
                <button
                    onClick={() => onToggle(branchId, currency.code, isActive)}
                    className="text-text-secondary hover:text-white transition-colors"
                    title={isActive !== false ? "Вимкнути валюту" : "Увімкнути валюту"}
                >
                    {isActive !== false ?
                        <ToggleRight className="w-5 h-5 text-green-400" /> :
                        <ToggleLeft className="w-5 h-5 text-text-secondary" />
                    }
                </button>
            </div>

            <div className="space-y-2">
                {/* Retail Rates */}
                <div className="flex gap-2 text-xs">
                    <div className="flex-1">
                        <label className="text-[9px] text-text-secondary block mb-0.5">Роздріб</label>
                        <input
                            type="number"
                            step="0.01"
                            value={buy}
                            onChange={(e) => setBuy(e.target.value)}
                            aria-label="Роздріб купівля"
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            disabled={isActive === false}
                            className={`w-full bg-black/20 border border-white/10 rounded px-1 py-1 text-green-400 focus:outline-none focus:border-green-400/50 ${saving ? 'opacity-50' : ''} ${isActive === false ? 'cursor-not-allowed' : ''}`}
                            placeholder="Куп"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-[9px] text-text-secondary block mb-0.5">&nbsp;</label>
                        <input
                            type="number"
                            step="0.01"
                            value={sell}
                            onChange={(e) => setSell(e.target.value)}
                            aria-label="Роздріб продаж"
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            disabled={isActive === false}
                            className={`w-full bg-black/20 border border-white/10 rounded px-1 py-1 text-red-400 focus:outline-none focus:border-red-400/50 ${saving ? 'opacity-50' : ''} ${isActive === false ? 'cursor-not-allowed' : ''}`}
                            placeholder="Прод"
                        />
                    </div>
                </div>

                {/* Wholesale Rates */}
                <div className="flex gap-2 text-xs">
                    <div className="flex-1">
                        <label className="text-[9px] text-accent-yellow/70 block mb-0.5">Опт</label>
                        <input
                            type="number"
                            step="0.01"
                            value={wholesaleBuy}
                            onChange={(e) => setWholesaleBuy(e.target.value)}
                            aria-label="Опт купівля"
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            disabled={isActive === false}
                            className={`w-full bg-black/20 border border-white/10 rounded px-1 py-1 text-accent-yellow focus:outline-none focus:border-accent-yellow/50 ${saving ? 'opacity-50' : ''} ${isActive === false ? 'cursor-not-allowed' : ''}`}
                            placeholder="Опт Куп"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-[9px] text-text-secondary block mb-0.5">&nbsp;</label>
                        <input
                            type="number"
                            step="0.01"
                            value={wholesaleSell}
                            onChange={(e) => setWholesaleSell(e.target.value)}
                            aria-label="Опт продаж"
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            disabled={isActive === false}
                            className={`w-full bg-black/20 border border-white/10 rounded px-1 py-1 text-accent-yellow focus:outline-none focus:border-accent-yellow/50 ${saving ? 'opacity-50' : ''} ${isActive === false ? 'cursor-not-allowed' : ''}`}
                            placeholder="Опт Прод"
                        />
                    </div>
                </div>

                {/* Wholesale Threshold */}
                <div className="text-xs">
                    <label className="text-[9px] text-accent-yellow/70 block mb-0.5">Поріг опту</label>
                    <input
                        type="number"
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                        aria-label="Поріг опту"
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        disabled={isActive === false}
                        className={`w-full bg-black/20 border border-white/10 rounded px-1 py-1 text-white/70 focus:outline-none focus:border-accent-yellow/50 ${saving ? 'opacity-50' : ''} ${isActive === false ? 'cursor-not-allowed' : ''}`}
                        placeholder="1000"
                    />
                </div>
            </div>

            {saving && <div className="text-[9px] text-accent-yellow mt-1 text-right">Зберігаю...</div>}
        </div>
    );
};

export default BranchRateCard;
