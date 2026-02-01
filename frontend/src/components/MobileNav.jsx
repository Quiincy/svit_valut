import { X, MapPin, DollarSign, Briefcase, HelpCircle, Phone } from 'lucide-react';

export default function MobileNav({ isOpen, onClose }) {
  if (!isOpen) return null;

  const navItems = [
    { icon: DollarSign, label: 'Курс валют', href: '#rates' },
    { icon: MapPin, label: 'Відділення', href: '#branches' },
    { icon: Briefcase, label: 'Послуги', href: '#services' },
    { icon: HelpCircle, label: 'FAQ', href: '#faq' },
    { icon: Phone, label: 'Контакти', href: '#footer' },
  ];

  return (
    <div className="fixed inset-0 z-[100] lg:hidden">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Menu Panel */}
      <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-primary-light border-r border-white/10 p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-accent-blue rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">$</span>
            </div>
            <span className="font-bold text-lg">ВАЛЮТ</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="p-4 bg-accent-blue/10 rounded-xl border border-accent-blue/20">
            <div className="text-sm text-text-secondary mb-1">Гаряча лінія</div>
            <a href="tel:0960488884" className="text-lg font-bold text-accent-blue">
              (096) 048-88-84
            </a>
            <div className="text-xs text-text-secondary mt-1">щодня: 8:00-20:00</div>
          </div>
        </div>
      </div>
    </div>
  );
}
