import { Menu, MessageSquare } from 'lucide-react';

export default function Header({ onMenuToggle }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 -ml-2 text-text-secondary hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo */}
          <a href="#" className="flex items-center gap-2">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-accent-blue rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm lg:text-base">$</span>
            </div>
            <span className="font-bold text-base lg:text-lg text-white">ВАЛЮТ</span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <a href="#rates" className="text-text-secondary hover:text-white text-sm font-medium transition-colors">
              Курс валют
            </a>
            <a href="#branches" className="text-text-secondary hover:text-white text-sm font-medium transition-colors">
              Відділення
            </a>
            <a href="#services" className="text-text-secondary hover:text-white text-sm font-medium transition-colors">
              Послуги
            </a>
            <a href="#faq" className="text-text-secondary hover:text-white text-sm font-medium transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:block text-right text-sm">
              <div className="text-text-secondary">щодня: 8:00-20:00</div>
            </div>
            
            <button className="flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 border border-accent-yellow/50 rounded-full text-accent-yellow text-sm font-medium hover:bg-accent-yellow/10 transition-colors">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Чат</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
