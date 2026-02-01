import { Link } from 'react-router-dom';

const defaultServices = [
  { id: 1, title: 'Приймаємо валюту, яка вийшла з обігу', description: 'Миттєво обміняємо старі фунти, франки, марки, та багато інших.', image_url: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400&h=200&fit=crop', link_url: '/services/old-currency' },
  { id: 2, title: 'Приймаємо зношену валюту', description: 'Зручний спосіб позбутися непотрібних купюр.', image_url: 'https://images.unsplash.com/photo-1611324477757-c947df087651?w=400&h=200&fit=crop', link_url: '/services/damaged-currency' },
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
                    src={service.image_url} 
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
              <div className="p-4 lg:p-6">
                <h3 className="font-semibold text-lg mb-2">{service.title}</h3>
                <p className="text-sm text-text-secondary mb-4">{service.description}</p>
                {service.link_url ? (
                  <Link 
                    to={service.link_url}
                    className="px-4 py-2 border border-accent-blue text-accent-blue rounded-lg text-sm font-medium hover:bg-accent-blue/10 transition-colors inline-block"
                  >
                    Детальніше
                  </Link>
                ) : (
                  <button className="px-4 py-2 border border-accent-blue text-accent-blue rounded-lg text-sm font-medium hover:bg-accent-blue/10 transition-colors">
                    Детальніше
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <Link 
          to="/services/all"
          className="block w-full mt-6 py-4 bg-accent-blue rounded-xl text-white font-medium hover:bg-accent-blue/90 transition-colors text-center"
        >
          Відкрити всі →
        </Link>
      </div>
    </section>
  );
}
