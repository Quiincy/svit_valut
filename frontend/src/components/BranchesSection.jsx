import { useState } from 'react';
import { MapPin, Phone, MessageSquare, ChevronDown, Navigation, Clock } from 'lucide-react';

// Kyiv branch coordinates
const BRANCH_COORDS = {
  1: { lat: 50.4401, lng: 30.4876, query: 'вул.+Старовокзальна+23+Київ' },
  2: { lat: 50.4089, lng: 30.5234, query: 'вул.+Васильківська+110+Київ' },
  3: { lat: 50.4056, lng: 30.5201, query: 'вул.+Васильківська+130+Київ' },
  4: { lat: 50.4298, lng: 30.5411, query: 'вул.+Раїси+Окіпної+2+Київ' },
  5: { lat: 50.4367, lng: 30.5012, query: 'вул.+Саксаганського+69+Київ' },
};

export default function BranchesSection({ branches = [], settings }) {
  const [expandedBranch, setExpandedBranch] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 50.4501, lng: 30.5234 });

  const handleShowOnMap = (branch) => {
    const coords = BRANCH_COORDS[branch.id];
    if (coords) {
      setMapCenter(coords);
      // Scroll to map on mobile
      document.getElementById('branches-map')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCall = (branch) => {
    const phone = branch.phone || settings?.phone || '(096) 048-88-84';
    window.location.href = `tel:${phone.replace(/[^\d+]/g, '')}`;
  };

  const handleChat = (branch) => {
    const telegramUrl = settings?.telegram_url || 'https://t.me/svitvalut';
    window.open(telegramUrl, '_blank');
  };

  const handleDirections = (branch) => {
    const coords = BRANCH_COORDS[branch.id];
    if (coords) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`, '_blank');
    }
  };

  // Generate map URL with markers
  const generateMapUrl = () => {
    const markers = branches.map((branch, idx) => {
      const coords = BRANCH_COORDS[branch.id];
      if (!coords) return '';
      return `markers=color:blue%7Clabel:${idx + 1}%7C${coords.lat},${coords.lng}`;
    }).filter(Boolean).join('&');
    
    return `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6cEB-lx_V8WfwZQ&center=${mapCenter.lat},${mapCenter.lng}&zoom=12&maptype=roadmap`;
  };

  // Fallback map with OpenStreetMap
  const osmMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=30.35%2C50.38%2C30.65%2C50.52&layer=mapnik&marker=${mapCenter.lat}%2C${mapCenter.lng}`;

  return (
    <section id="branches" className="py-12 lg:py-20 bg-primary-light px-4 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl lg:text-4xl font-bold mb-8">Відділення в Києві</h2>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Map */}
          <div id="branches-map" className="rounded-2xl overflow-hidden border border-white/10 h-[300px] lg:h-[500px] relative">
            <iframe
              src={osmMapUrl}
              className="w-full h-full grayscale-[50%] contrast-[1.1]"
              style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg)' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            
            {/* Custom overlay markers */}
            <div className="absolute inset-0 pointer-events-none">
              {branches.map((branch, idx) => {
                const coords = BRANCH_COORDS[branch.id];
                if (!coords) return null;
                // Simple positioning based on coords (approximate)
                const left = ((coords.lng - 30.35) / 0.3) * 100;
                const top = ((50.52 - coords.lat) / 0.14) * 100;
                return (
                  <div
                    key={branch.id}
                    className="absolute w-8 h-8 -ml-4 -mt-8 pointer-events-auto cursor-pointer group"
                    style={{ left: `${left}%`, top: `${top}%` }}
                    onClick={() => setExpandedBranch(expandedBranch === idx ? null : idx)}
                  >
                    <div className="w-8 h-8 bg-accent-blue rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:scale-110 transition-transform">
                      {idx + 1}
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-primary-light px-3 py-2 rounded-lg text-xs whitespace-nowrap border border-white/10">
                        {branch.address}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Branch List */}
          <div className="space-y-3">
            <button className="w-full py-3 bg-accent-blue rounded-xl text-white font-medium flex items-center justify-center gap-2 hover:bg-accent-blue/90 transition-colors">
              <Navigation className="w-5 h-5" />
              Знайти найближче відділення
            </button>

            {branches.map((branch, idx) => (
              <div
                key={branch.id}
                className={`bg-primary rounded-xl border transition-all ${
                  expandedBranch === idx ? 'border-accent-blue' : 'border-white/10'
                }`}
              >
                <button
                  onClick={() => setExpandedBranch(expandedBranch === idx ? null : idx)}
                  className="w-full p-4 flex items-center gap-4 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-accent-blue font-bold">{idx + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{branch.address}</div>
                    <div className="text-sm text-text-secondary flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {branch.hours}
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-text-secondary transition-transform ${
                    expandedBranch === idx ? 'rotate-180' : ''
                  }`} />
                </button>

                {expandedBranch === idx && (
                  <div className="px-4 pb-4 pt-0 border-t border-white/10 mt-0">
                    {/* Phone */}
                    <div className="flex items-center gap-2 py-2 text-sm">
                      <Phone className="w-4 h-4 text-text-secondary" />
                      <span>{branch.phone || settings?.phone || '(096) 048-88-84'}</span>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button
                        onClick={() => handleShowOnMap(branch)}
                        className="flex items-center justify-center gap-2 py-2.5 bg-white/5 rounded-lg text-sm hover:bg-white/10 transition-colors"
                      >
                        <MapPin className="w-4 h-4" />
                        На мапі
                      </button>
                      <button
                        onClick={() => handleCall(branch)}
                        className="flex items-center justify-center gap-2 py-2.5 bg-accent-yellow/10 text-accent-yellow rounded-lg text-sm hover:bg-accent-yellow/20 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        Зателефонувати
                      </button>
                      <button
                        onClick={() => handleChat(branch)}
                        className="flex items-center justify-center gap-2 py-2.5 bg-accent-blue/10 text-accent-blue rounded-lg text-sm hover:bg-accent-blue/20 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Чат
                      </button>
                      <button
                        onClick={() => handleDirections(branch)}
                        className="flex items-center justify-center gap-2 py-2.5 bg-white/5 rounded-lg text-sm hover:bg-white/10 transition-colors"
                      >
                        <Navigation className="w-4 h-4" />
                        Маршрут
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
