import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, MessageSquare } from 'lucide-react';
import { servicesService, settingsService } from '../services/api';

export default function ServicePage() {
  const { slug } = useParams();
  const [service, setService] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [slug]);

  const fetchData = async () => {
    try {
      const [servicesRes, settingsRes] = await Promise.all([
        servicesService.getAll(),
        settingsService.get(),
      ]);
      
      // Find service by slug (from link_url)
      const found = servicesRes.data.find(s => 
        s.link_url?.includes(slug) || s.id.toString() === slug
      );
      setService(found);
      setSettings(settingsRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Послугу не знайдено</h1>
        <Link to="/" className="text-accent-blue hover:underline">← Повернутися на головну</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="bg-primary-light border-b border-white/10 px-4 lg:px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold">Світ Валют</h1>
            <p className="text-xs text-text-secondary">Послуги</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
        {service.image_url && (
          <img 
            src={service.image_url} 
            alt={service.title}
            className="w-full h-64 lg:h-96 object-cover rounded-2xl mb-8"
          />
        )}

        <h1 className="text-3xl lg:text-4xl font-bold mb-4">{service.title}</h1>
        <p className="text-lg text-text-secondary mb-8">{service.description}</p>

        {/* Placeholder content */}
        <div className="prose prose-invert max-w-none">
          <h2 className="text-xl font-bold mb-4">Як це працює?</h2>
          <p className="text-text-secondary mb-4">
            Ми приймаємо валюту будь-якого стану та року випуску. Наші фахівці оцінять ваші банкноти 
            та запропонують найкращий курс обміну.
          </p>
          
          <h2 className="text-xl font-bold mb-4 mt-8">Переваги обміну у нас</h2>
          <ul className="list-disc list-inside text-text-secondary space-y-2 mb-8">
            <li>Приймаємо банкноти будь-якого стану</li>
            <li>Миттєва оцінка та обмін</li>
            <li>Конкурентні курси</li>
            <li>Безпечні умови обміну</li>
            <li>5 відділень у Києві</li>
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-12 p-6 bg-primary-light rounded-2xl border border-white/10">
          <h3 className="text-xl font-bold mb-4">Готові обміняти валюту?</h3>
          <p className="text-text-secondary mb-6">
            Зв'яжіться з нами або відвідайте найближче відділення
          </p>
          
          <div className="flex flex-wrap gap-3">
            <a 
              href={`tel:${settings?.phone?.replace(/[^\d+]/g, '')}`}
              className="flex items-center gap-2 px-6 py-3 bg-accent-yellow rounded-xl text-primary font-bold hover:opacity-90"
            >
              <Phone className="w-5 h-5" />
              {settings?.phone || '(096) 048-88-84'}
            </a>
            
            <a 
              href={settings?.telegram_url || '#'}
              className="flex items-center gap-2 px-6 py-3 bg-[#0088cc] rounded-xl text-white font-medium hover:opacity-90"
            >
              <MessageSquare className="w-5 h-5" />
              Telegram
            </a>

            <Link 
              to="/#branches"
              className="flex items-center gap-2 px-6 py-3 bg-white/10 rounded-xl font-medium hover:bg-white/20"
            >
              Знайти відділення
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-primary-light border-t border-white/10 px-4 py-6 mt-12">
        <div className="max-w-4xl mx-auto text-center text-sm text-text-secondary">
          <p>© 2025 Світ Валют. Всі права захищено.</p>
        </div>
      </footer>
    </div>
  );
}
