import React, { useState, useEffect } from 'react';
import { X, Send } from 'lucide-react';

export default function TelegramPopup({ telegramUrl }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if the user has already closed the popup
        const popupClosed = localStorage.getItem('telegramPopupClosed');

        // If not closed, show it after 2 seconds
        if (!popupClosed) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        // Mark as closed in localStorage so it never shows again
        localStorage.setItem('telegramPopupClosed', 'true');
    };

    if (!isVisible || !telegramUrl) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-[340px] bg-[#1A1E29] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-500 before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-500/10 before:to-transparent before:pointer-events-none">

                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 w-7 h-7 bg-[#FDE68A] hover:bg-[#F59E0B] rounded-full flex items-center justify-center transition-colors shadow-sm text-black"
                    aria-label="Закрити"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-4 mt-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#2AABEE] to-[#229ED9] rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                        <Send className="w-6 h-6 text-white ml-[-2px] mt-[2px]" />
                    </div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-[#FDE68A] to-[#F59E0B] bg-clip-text text-transparent leading-tight line-clamp-2">
                        Актуальні оптові курси
                    </h3>
                </div>

                {/* Body Text */}
                <p className="text-text-secondary text-base leading-snug mb-5 text-center px-2">
                    Дізнайтесь про вигідні оптові курси в нашому Telegram каналі!
                </p>

                {/* CTA Button */}
                <a
                    href={telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-[#2AABEE] to-[#229ED9] hover:from-[#229ED9] hover:to-[#1c8ec4] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_0_rgba(42,171,238,0.39)] hover:shadow-[0_6px_20px_rgba(42,171,238,0.23)] hover:-translate-y-0.5"
                    onClick={handleClose} // Also close it when they click the button to go to Telegram
                >
                    <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                        <Send className="w-3 h-3 ml-[-1px] mt-[1px]" />
                    </div>
                    Перейти в Telegram
                </a>
            </div>
        </div>
    );
}
