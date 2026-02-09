import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { servicesService } from '../services/api';

const defaultServices = [
  { id: 1, title: 'Приймаємо валюту, яка вийшла з обігу', description: 'Миттєво обміняємо старі фунти, франки, марки, та багато інших. Ми приймаємо валюту різних країн, яка вже не знаходиться в обігу, за вигідним курсом.', image_url: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400&h=200&fit=crop', slug: 'old-currency' },
  { id: 2, title: 'Приймаємо зношену валюту', description: 'Зручний спосіб позбутися непотрібних купюр. Приймаємо пошкоджені, зношені та написані банкноти за спеціальним курсом.', image_url: 'https://images.unsplash.com/photo-1605792657660-596af9009e82?w=400&h=200&fit=crop', slug: 'damaged-currency' },
  { id: 3, title: 'Старі франки на нові або USD', description: 'Оновіть франки які вийшли з обігу на нові або долари США. Швидкий та зручний обмін без зайвих документів.', image_url: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=400&h=200&fit=crop', slug: 'old-francs' },
  { id: 4, title: 'Обмін криптовалюти', description: 'Обмін Bitcoin, Ethereum та інших криптовалют на готівку UAH, USD, EUR. Швидко та безпечно.', image_url: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&h=200&fit=crop', slug: 'crypto' },
  { id: 5, title: 'Грошові перекази', description: 'Відправляйте та отримуйте грошові перекази з усього світу. Western Union, MoneyGram та інші системи.', image_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop', slug: 'transfers' },
  { id: 6, title: 'Оптовий обмін', description: 'Спеціальні умови для великих сум. Індивідуальний курс та персональний менеджер для постійних клієнтів.', image_url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&h=200&fit=crop', slug: 'wholesale' },
];

export default function AllServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await servicesService.getAll();
      setServices(res.data.length > 0 ? res.data : defaultServices);
    } catch (error) {
      setServices(defaultServices);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="bg-primary-light border-b border-white/10 px-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent-yellow rounded-xl flex items-center justify-center font-extrabold text-primary text-lg">
              $
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">СВІТ</div>
              <div className="text-[9px] font-medium text-text-secondary tracking-[2px] uppercase">ВАЛЮТ</div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8 lg:py-12">
        <h1 className="text-3xl lg:text-4xl font-bold mb-2">Всі послуги</h1>
        <p className="text-text-secondary mb-8">Оберіть послугу, яка вас цікавить</p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-accent-yellow border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Link
                key={service.id}
                to={`/services/${service.slug || service.id}`}
                className="bg-primary-light rounded-2xl border border-white/10 overflow-hidden hover:border-accent-yellow/30 transition-all group"
              >
                {service.image_url && (
                  <div className="h-40 lg:h-48 overflow-hidden">
                    <img
                      src={service.image_url}
                      alt={service.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-5 lg:p-6">
                  <h3 className="font-bold text-lg mb-2 group-hover:text-accent-yellow transition-colors">{service.title}</h3>
                  <p className="text-sm text-text-secondary mb-4 line-clamp-2">{service.description}</p>
                  <div className="flex items-center gap-2 text-accent-blue text-sm font-medium">
                    <span>Детальніше</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-primary-light border-t border-white/10 py-6 px-4 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto text-center text-sm text-text-secondary">
          © {new Date().getFullYear()} Світ Валют. Всі права захищено.
        </div>
      </footer>
    </div>
  );
}
