import { useState } from 'react';
import { MapPin, Phone, MessageSquare, ChevronDown, Navigation, Clock, Locate } from 'lucide-react';

// Kyiv branch coordinates
const BRANCH_COORDS = {
  1: { lat: 50.4401, lng: 30.4876, address: 'вул. Старовокзальна, 23' },
  2: { lat: 50.4168, lng: 30.5087, address: 'вул. В. Васильківська, 110' },
  3: { lat: 50.4098, lng: 30.5067, address: 'вул. В. Васильківська, 130' },
  4: { lat: 50.4358, lng: 30.5598, address: 'вул. Р. Окіпної, 2' },
  5: { lat: 50.4378, lng: 30.5028, address: 'вул. Саксаганського, 69' },
};

// Calculate distance between two points using Haversine formula
const getDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default function BranchesSection({ branches = [], settings }) {
  const [expandedBranch, setExpandedBranch] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 50.4501, lng: 30.5234 });
  const [findingNearest, setFindingNearest] = useState(false);
  const [nearestBranch, setNearestBranch] = useState(null);

  const handleFindNearest = () => {
    setFindingNearest(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          
          // Find nearest branch
          let nearest = null;
          let minDistance = Infinity;
          
          branches.forEach((branch, idx) => {
            const coords = BRANCH_COORDS[branch.id];
            if (coords) {
              const distance = getDistance(userLat, userLng, coords.lat, coords.lng);
              if (distance < minDistance) {
                minDistance = distance;
                nearest = { branch, idx, distance };
              }
            }
          });
          
          if (nearest) {
            setNearestBranch(nearest);
            setExpandedBranch(nearest.idx);
            setMapCenter(BRANCH_COORDS[nearest.branch.id]);
            document.getElementById('branches-map')?.scrollIntoView({ behavior: 'smooth' });
          }
          
          setFindingNearest(false);
        },
        (error) => {
          alert('Не вдалося визначити вашу геолокацію. Дозвольте доступ до місцезнаходження.');
          setFindingNearest(false);
        }
      );
    } else {
      alert('Геолокація не підтримується вашим браузером');
      setFindingNearest(false);
    }
  };

  const handleShowOnMap = (branch) => {
    const coords = BRANCH_COORDS[branch.id];
    if (coords) {
      setMapCenter(coords);
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
      // Use address for better Google Maps routing
      const address = encodeURIComponent(coords.address + ', Київ, Україна');
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}&travelmode=driving`, '_blank');
    }
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
                const left = ((coords.lng - 30.35) / 0.3) * 100;
                const top = ((50.52 - coords.lat) / 0.14) * 100;
                const isNearest = nearestBranch?.idx === idx;
                return (
                  <div
                    key={branch.id}
                    className="absolute w-8 h-8 -ml-4 -mt-8 pointer-events-auto cursor-pointer group"
                    style={{ left: `${left}%`, top: `${top}%` }}
                    onClick={() => setExpandedBranch(expandedBranch === idx ? null : idx)}
                  >
                    <div className={`w-8 h-8 ${isNearest ? 'bg-accent-yellow' : 'bg-accent-blue'} rounded-full flex items-center justify-center text-${isNearest ? 'primary' : 'white'} font-bold text-sm shadow-lg group-hover:scale-110 transition-transform ${isNearest ? 'ring-4 ring-accent-yellow/50' : ''}`}>
                      {idx + 1}
                    </div>
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
            <button 
              onClick={handleFindNearest}
              disabled={findingNearest}
              className="w-full py-3 bg-accent-blue rounded-xl text-white font-medium flex items-center justify-center gap-2 hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
            >
              {findingNearest ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Визначення...
                </>
              ) : (
                <>
                  <Locate className="w-5 h-5" />
                  Знайти найближче відділення
                </>
              )}
            </button>

            {nearestBranch && (
              <div className="p-3 bg-accent-yellow/10 border border-accent-yellow/30 rounded-xl text-sm">
                <span className="text-accent-yellow font-medium">Найближче до вас:</span>{' '}
                {nearestBranch.branch.address} ({nearestBranch.distance.toFixed(1)} км)
              </div>
            )}

            {branches.map((branch, idx) => (
              <div
                key={branch.id}
                className={`bg-primary rounded-xl border transition-all ${
                  expandedBranch === idx ? 'border-accent-blue' : nearestBranch?.idx === idx ? 'border-accent-yellow' : 'border-white/10'
                }`}
              >
                <button
                  onClick={() => setExpandedBranch(expandedBranch === idx ? null : idx)}
                  className="w-full p-4 flex items-center gap-4 text-left"
                >
                  <div className={`w-10 h-10 rounded-full ${nearestBranch?.idx === idx ? 'bg-accent-yellow/20' : 'bg-accent-blue/20'} flex items-center justify-center flex-shrink-0`}>
                    <span className={nearestBranch?.idx === idx ? 'text-accent-yellow' : 'text-accent-blue'} style={{ fontWeight: 'bold' }}>{idx + 1}</span>
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
                    <div className="flex items-center gap-2 py-2 text-sm">
                      <Phone className="w-4 h-4 text-text-secondary" />
                      <span>{branch.phone || settings?.phone || '(096) 048-88-84'}</span>
                    </div>
                    
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
                        className="flex items-center justify-center gap-2 py-2.5 bg-green-500/10 text-green-400 rounded-lg text-sm hover:bg-green-500/20 transition-colors"
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
