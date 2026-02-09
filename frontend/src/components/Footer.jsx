import { Link } from 'react-router-dom';
import { Send, Phone } from 'lucide-react';

export default function Footer({ settings }) {
  const phone = settings?.phone || '(096) 048-88-84';
  const phoneClean = phone.replace(/[^\d+]/g, '');
  const workingHours = settings?.working_hours || 'щодня: 8:00-20:00';

  return (
    <footer id="footer" className="bg-primary-light border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-8 lg:py-12">
          {/* Article Preview - Mobile */}
          <div className="lg:hidden mb-8 p-4 bg-primary rounded-xl border border-white/10">
            <p className="text-sm text-text-secondary mb-3 line-clamp-4">
              Інтерес жителів нашої країни до іноземної валюти дуже високий, тому обмін різних видів грошей у Києві є доволі затребуваною послугою. Коли цифри на табло в обмінниках починають зростати, багато людей хвилюються, адже навіть незначні заощадження можуть різко знецінитися...
            </p>
            <a href="#" className="text-accent-blue text-sm font-medium">ЧИТАТИ ДАЛІ</a>
          </div>

          {/* Quick Links - Mobile */}
          <div className="space-y-4 lg:hidden">
            <Link to="/#branches" className="block py-3 text-center border-b border-white/10 hover:text-accent-yellow transition-colors">
              Адреси відділень
            </Link>
            <Link to="/rates" className="block py-3 text-center border-b border-white/10 hover:text-accent-yellow transition-colors">
              Курс валют
            </Link>
            <Link to="/services/damaged-currency" className="block py-3 text-center border-b border-white/10 hover:text-accent-yellow transition-colors">
              Зношена валюта
            </Link>
          </div>

          {/* Desktop Footer Grid */}
          <div className="hidden lg:grid grid-cols-4 gap-8">
            <div>
              <Link to="/" className="flex items-center gap-2 mb-4">
                {/* Styled Logo matching screenshot */}
                <div className="relative flex items-center justify-center">
                  <span className="text-3xl font-bold text-[#4488FF] font-sans">$</span>
                </div>
                <div className="text-left flex flex-col justify-center h-full pt-1">
                  <div className="font-bold text-lg leading-none tracking-wide text-white">СВІТ</div>
                  <div className="text-[10px] font-medium text-text-secondary tracking-[2px] uppercase leading-none mt-0.5">ВАЛЮТ</div>
                </div>
              </Link>
              <p className="text-sm text-text-secondary">
                Надійний обмін валют у Києві з 2015 року
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Навігація</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><Link to="/rates" className="hover:text-accent-yellow transition-colors">Курс валют</Link></li>
                <li><a href="#branches" className="hover:text-accent-yellow transition-colors">Відділення</a></li>
                <li><a href="#services" className="hover:text-accent-yellow transition-colors">Послуги</a></li>
                <li><a href="#faq" className="hover:text-accent-yellow transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Контакти</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>
                  <a href={`tel:${phoneClean}`} className="text-accent-yellow font-semibold text-lg hover:opacity-80 transition-opacity">
                    {phone}
                  </a>
                </li>
                <li>{workingHours}</li>
                {settings?.email && <li>{settings.email}</li>}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Слідкуйте за нами</h4>
              <div className="flex gap-3">
                {settings?.telegram_url && (
                  <a
                    href={settings.telegram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-[#0088cc] rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
                  >
                    <Send className="w-5 h-5" />
                  </a>
                )}
                {settings?.instagram_url && (
                  <a
                    href={settings.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                )}
                {settings?.facebook_url && (
                  <a
                    href={settings.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-[#1877f2] rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Bar - Mobile */}
        <div className="lg:hidden py-6 border-t border-white/10 text-center">
          <a href={`tel:${phoneClean}`} className="flex items-center justify-center gap-2 text-xl font-bold text-accent-yellow">
            <Phone className="w-5 h-5" />
            {phone}
          </a>
          <p className="text-sm text-text-secondary mt-1">{workingHours}</p>
        </div>

        {/* CTA Buttons - Mobile */}
        <div className="lg:hidden space-y-3 pb-6">
          <a href="#" className="block w-full py-4 bg-gradient-gold rounded-xl text-primary font-bold text-center hover:opacity-90 transition-opacity">
            Забронювати валюту
          </a>
          {settings?.telegram_url && (
            <a
              href={settings.telegram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-primary border border-white/20 rounded-xl text-white font-medium hover:bg-white/10 transition-colors"
            >
              <Send className="w-5 h-5" />
              Підписатись на телеграм
            </a>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="py-4 border-t border-white/10 text-center text-sm text-text-secondary">
          <p>Політика конфіденційності</p>
          <p className="mt-2">© {new Date().getFullYear()} {settings?.company_name || 'Світ Валют'}. Всі права захищено.</p>
        </div>
      </div>
    </footer>
  );
}
