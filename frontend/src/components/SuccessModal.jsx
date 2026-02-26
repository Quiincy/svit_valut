import { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

export default function SuccessModal({ isOpen, onClose }) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4"
      onClick={onClose}
    >
      <div
        className="bg-primary-light rounded-3xl p-8 max-w-sm w-full border border-white/10 text-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-lg transition-colors"
         aria-label="Закрити">
          <X className="w-5 h-5 text-text-secondary" />
        </button>

        {/* Success Animation */}
        <div className="w-24 h-24 mx-auto mb-6 relative">
          <div className="absolute inset-0 bg-accent-yellow/20 rounded-full animate-ping" />
          <div className="relative w-full h-full bg-accent-yellow/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-accent-yellow" />
          </div>
        </div>

        <h3 className="text-2xl font-bold mb-3">Курс зафіксовано!</h3>
        <p className="text-text-secondary mb-2">
          Ваше бронювання створено успішно.
        </p>
        <p className="text-text-secondary text-sm">
          Менеджер зв'яжеться з вами найближчим часом для підтвердження.
        </p>

        <div className="mt-6 p-4 bg-primary rounded-xl">
          <p className="text-sm text-text-secondary mb-1">Курс діє протягом</p>
          <p className="text-2xl font-bold text-accent-yellow">60 хвилин</p>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-4 bg-accent-yellow rounded-xl text-primary font-bold hover:opacity-90 transition-opacity"
        >
          Чудово!
        </button>
      </div>
    </div>
  );
}
