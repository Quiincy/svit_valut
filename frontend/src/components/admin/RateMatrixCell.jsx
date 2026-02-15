import React, { useState, useEffect } from 'react';
import { Check, X, RotateCcw, Power } from 'lucide-react';

export default function RateMatrixCell({ branchId, currency, rateData, onUpdate, onToggle }) {
    const [data, setData] = useState({
        buy_rate: '',
        sell_rate: '',
        wholesale_buy_rate: '',
        wholesale_sell_rate: '',
        is_active: true
    });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (rateData) {
            setData({
                buy_rate: rateData.buy,
                sell_rate: rateData.sell,
                wholesale_buy_rate: rateData.wholesale_buy || '',
                wholesale_sell_rate: rateData.wholesale_sell || '',
                is_active: rateData.is_active !== false
            });
        } else {
            // Default empty state
            setData({ buy_rate: '', sell_rate: '', wholesale_buy_rate: '', wholesale_sell_rate: '', is_active: true });
        }
    }, [rateData]);

    const handleSave = () => {
        onUpdate(branchId, currency.code, {
            buy_rate: parseFloat(data.buy_rate),
            sell_rate: parseFloat(data.sell_rate),
            wholesale_buy_rate: data.wholesale_buy_rate ? parseFloat(data.wholesale_buy_rate) : 0,
            wholesale_sell_rate: data.wholesale_sell_rate ? parseFloat(data.wholesale_sell_rate) : 0,
            is_active: data.is_active
        });
        setIsEditing(false);
    };

    const handleCancel = () => {
        if (rateData) {
            setData({
                buy_rate: rateData.buy,
                sell_rate: rateData.sell,
                wholesale_buy_rate: rateData.wholesale_buy || '',
                wholesale_sell_rate: rateData.wholesale_sell || '',
                is_active: rateData.is_active !== false
            });
        } else {
            setData({ buy_rate: '', sell_rate: '', wholesale_buy_rate: '', wholesale_sell_rate: '', is_active: true });
        }
        setIsEditing(false);
    };

    const toggleActive = (e) => {
        e.stopPropagation();
        const newState = !data.is_active;
        // Optimistic update
        setData({ ...data, is_active: newState });
        onToggle(branchId, currency.code, newState);
    };

    const isActive = rateData?.is_active !== false;
    const hasData = !!rateData;

    if (isEditing) {
        return (
            <div className="flex flex-col gap-2 p-2 bg-white/5 rounded min-w-[140px] z-20 relative">
                <div className="text-xxs text-text-secondary text-center mb-1">Роздріб</div>
                <div className="grid grid-cols-2 gap-2">
                    <input
                        type="number"
                        step="0.01"
                        value={data.buy_rate}
                        onChange={e => setData({ ...data, buy_rate: e.target.value })}
                        className="w-full bg-black/30 text-green-400 text-xs px-1 py-1 rounded text-center focus:outline-none focus:ring-1 focus:ring-green-500 border border-white/10"
                        placeholder="Buy"
                    />
                    <input
                        type="number"
                        step="0.01"
                        value={data.sell_rate}
                        onChange={e => setData({ ...data, sell_rate: e.target.value })}
                        className="w-full bg-black/30 text-red-400 text-xs px-1 py-1 rounded text-center focus:outline-none focus:ring-1 focus:ring-red-500 border border-white/10"
                        placeholder="Sell"
                    />
                </div>

                <div className="text-xxs text-text-secondary text-center mb-1 mt-1">Опт</div>
                <div className="grid grid-cols-2 gap-2">
                    <input
                        type="number"
                        step="0.01"
                        value={data.wholesale_buy_rate}
                        onChange={e => setData({ ...data, wholesale_buy_rate: e.target.value })}
                        className="w-full bg-black/30 text-accent-yellow/80 text-xs px-1 py-1 rounded text-center focus:outline-none focus:ring-1 focus:ring-green-500 border border-white/10"
                        placeholder="W.Buy"
                    />
                    <input
                        type="number"
                        step="0.01"
                        value={data.wholesale_sell_rate}
                        onChange={e => setData({ ...data, wholesale_sell_rate: e.target.value })}
                        className="w-full bg-black/30 text-accent-yellow/80 text-xs px-1 py-1 rounded text-center focus:outline-none focus:ring-1 focus:ring-red-500 border border-white/10"
                        placeholder="W.Sell"
                    />
                </div>

                <div className="flex justify-center gap-2 mt-1">
                    <button onClick={handleSave} className="p-1 hover:bg-green-500/20 rounded text-green-400"><Check className="w-3 h-3" /></button>
                    <button onClick={handleCancel} className="p-1 hover:bg-red-500/20 rounded text-red-400"><X className="w-3 h-3" /></button>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className={`relative group cursor-pointer p-2 rounded-lg border transition-all min-w-[140px] h-[70px] flex flex-col justify-center items-center gap-1
            ${isActive && hasData ? 'bg-white/5 border-white/10 hover:border-accent-yellow/50' : 'bg-red-500/5 border-red-500/20 opacity-70 hover:opacity-100'}
        `}
        >
            {!hasData ? (
                <span className="text-xs text-text-secondary italic">Не встановлено</span>
            ) : (
                <div className="flex flex-col w-full gap-1">
                    <div className="flex w-full justify-between items-center text-sm font-bold border-b border-white/5 pb-1">
                        <span className="text-green-400">{rateData.buy?.toFixed(2)}</span>
                        <span className="text-red-400">{rateData.sell?.toFixed(2)}</span>
                    </div>
                    {(rateData.wholesale_buy > 0 || rateData.wholesale_sell > 0) && (
                        <div className="flex w-full justify-between items-center text-xs font-medium text-accent-yellow/80">
                            <span>{rateData.wholesale_buy > 0 ? rateData.wholesale_buy?.toFixed(2) : '-'}</span>
                            <span>{rateData.wholesale_sell > 0 ? rateData.wholesale_sell?.toFixed(2) : '-'}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Toggle Button (Hidden until hover) */}
            <button
                onClick={toggleActive}
                className={`absolute -top-2 -right-2 p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10
                ${isActive ? 'bg-green-500 text-black' : 'bg-red-500 text-white'}
            `}
                title={isActive ? "Активний" : "Неактивний"}
            >
                <Power className="w-3 h-3" />
            </button>
        </div>
    );
}
