import { Link } from 'react-router-dom';
import { getStaticUrl } from '../services/api';

const defaultServices = [
  { id: 1, title: 'Приймаємо валюту, яка вийшла з обігу', description: 'Миттєво обміняємо старі фунти, франки, марки, та багато інших.', image_url: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400&h=200&fit=crop', link_url: '/services/old-currency' },
  { id: 2, title: 'Приймаємо зношену валюту', description: 'Зручний спосіб позбутися непотрібних купюр.', image_url: 'https://images.unsplash.com/photo-1605792657660-596af9009e82?w=400&h=200&fit=crop', link_url: '/services/damaged-currency' },
  { id: 3, title: 'Старі франки на нові або USD', description: 'Оновіть франки які вийшли з обігу на нові або долари США.', image_url: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=400&h=200&fit=crop', link_url: '/services/old-francs' },
];

export default function ServicesSection({ services }) {
  const items = services?.length > 0 ? services : defaultServices;

  return (
    <section id="services" className="py-12 lg:py-20 bg-primary-light px-4 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl lg:text-4xl font-bold mb-8">Додаткові послуги</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {items.map((service) => (
            <div
              key={service.id}
              className="bg-primary rounded-2xl border border-white/10 overflow-hidden hover:border-accent-yellow/30 transition-colors group"
            >
              {service.image_url && (
                <div className="h-32 lg:h-40 overflow-hidden">
                  <img
                    src={getStaticUrl(service.image_url)}
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
              <div className="p-4 lg:p-6">
                <h3 className="font-semibold text-lg mb-2">{service.title}</h3>
                <p className="text-sm text-text-secondary mb-4 line-clamp-3">
                  {service.short_description || (service.description ? service.description.replace(/<[^>]*>?/gm, '') : '')}
                </p>
                {service.link_url ? (
                  <Link
                    to={service.link_url}
                    className="px-4 py-2 border border-accent-yellow text-accent-yellow rounded-lg text-sm font-medium hover:bg-accent-yellow/10 transition-colors inline-block"
                  >
                    Детальніше
                  </Link>
                ) : (
                  <button className="px-4 py-2 border border-accent-yellow text-accent-yellow rounded-lg text-sm font-medium hover:bg-accent-yellow/10 transition-colors">
                    Детальніше
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
