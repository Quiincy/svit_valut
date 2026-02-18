import { useState } from 'react';
import { MapPin, Phone, MessageSquare, ChevronDown, Navigation, Clock, Locate } from 'lucide-react';
import BranchesMap from './BranchesMap';



// Calculate distance between two points using Haversine formula
const getDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function BranchesSection({ branches = [], settings }) {
  const [expandedBranch, setExpandedBranch] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 50.4501, lng: 30.5234 });
  const [findingNearest, setFindingNearest] = useState(false);
  const [nearestBranch, setNearestBranch] = useState(null);

  const [geoError, setGeoError] = useState('');
  const [geoSource, setGeoSource] = useState(null); // 'GPS' or 'IP'
  const [userLocation, setUserLocation] = useState(null);

  const findNearestFromCoords = (lat, lng, source = 'Unknown') => {
    let nearest = null;
    let minDistance = Infinity;

    // Set user location for sorting
    setUserLocation({ lat: Number(lat), lng: Number(lng) });

    branches.forEach((branch, idx) => {
      // Robust conversion and check
      const bLat = Number(branch.lat);
      const bLng = Number(branch.lng);

      if (!isNaN(bLat) && !isNaN(bLng) && bLat !== 0 && bLng !== 0) {
        const distance = getDistance(Number(lat), Number(lng), bLat, bLng);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = { branch, idx, distance, coords: { lat: bLat, lng: bLng } };
        }
      }
    });

    if (nearest) {
      setNearestBranch(nearest);
      setExpandedBranch(nearest.branch.id);
      setMapCenter(nearest.coords);

      // Auto-scroll to map so user sees the result immediately
      document.getElementById('branches-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setGeoError('Не вдалося знайти найближче відділення (перевірте координати)');
    }
    if (Number(lat) === 0 && Number(lng) === 0) {
      setGeoError('Неможливо визначити точну локацію (Null Island).');
      setFindingNearest(false);
      return;
    }

    setGeoSource(source);
    setFindingNearest(false);
  };

  const handleFindNearest = () => {
    setFindingNearest(true);
    setGeoError('');

    const tryIpGeo = () => {
      fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(data => {
          if (data.latitude && data.longitude) {
            findNearestFromCoords(data.latitude, data.longitude, 'IP');
          } else {
            throw new Error('IP Geo failed');
          }
        })
        .catch(err => {
          console.error("IP Geo Error:", err);
          setGeoError('Не вдалося визначити ваше місцезнаходження.');
          setFindingNearest(false);
        });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          findNearestFromCoords(position.coords.latitude, position.coords.longitude, 'GPS');
        },
        (error) => {
          console.warn("GPS Error:", error);
          // Fallback to IP if GPS fails
          tryIpGeo();
        },
        { timeout: 8000, enableHighAccuracy: true, maximumAge: 0 }
      );
    } else {
      tryIpGeo();
    }
  };

  const handleSetKyivLocation = () => {
    findNearestFromCoords(50.4501, 30.5234, 'Manual');
  };

  // ... (unchanged)



  const handleShowOnMap = (branch) => {
    if (branch.lat && branch.lng) {
      setMapCenter({ lat: branch.lat, lng: branch.lng });
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
    if (branch.address) {
      // Use address for better Google Maps routing
      const address = encodeURIComponent(branch.address + ', Київ, Україна');
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}&travelmode=driving`, '_blank');
    }
  };

  // Prepare branches with coords and distance
  const mapBranches = branches.map(b => ({
    ...b,
    coords: { lat: b.lat, lng: b.lng, address: b.address }
  })).filter(b => b.coords && b.coords.lat && b.coords.lng);

  // Sorted branches
  const displayBranches = [...branches].map((b, idx) => {
    let distance = Infinity;
    const bLat = Number(b.lat);
    const bLng = Number(b.lng);

    if (userLocation && !isNaN(bLat) && !isNaN(bLng) && bLat !== 0 && bLng !== 0) {
      distance = getDistance(userLocation.lat, userLocation.lng, bLat, bLng);
    }
    return { ...b, distance, originalIdx: idx };
  }).sort((a, b) => a.distance - b.distance);

  // Sorted branches for display
  const sortedBranches = [...branches].map((b, idx) => {
    let distance = Infinity;
    if (nearestBranch && nearestBranch.coords) { // If search was performed
      // Use stored nearest logic or recalculate? 
      // Actually, findNearestFromCoords sets nearestBranch (singular).
      // We need the USER location to calculate distance for ALL.
      // But we don't store User Location in state yet.
      // Let's rely on 'nearestBranch' having the calculated distance, but others don't?
      // Wait. 'nearestBranch' is just one object.
      // I need to store USER LOCATION to calculate distances for the list.
      return { ...b, distance: null, originalIdx: idx };
    }
    return { ...b, distance: null, originalIdx: idx };
  });

  // Since I didn't store User Location in state, I will do it now.
  // Wait, I can't change state definition in this Replacement easily without breaking component structure?
  // I will just use 'nearestBranch' to highlight, and restore the List as is.
  // The user requirement "find nearest" might be satisfied by re-enabling fallback.
  // I will stick to re-enabling fallback and fixing the error loop first.

  // Actually, I can Calculate distances if I have the user data.
  // But refactoring standard list sorting requires changing State.
  // I will revert to "Re-enable Fallback" and rely on the UI "Approximate" label.

  return (
    <section id="branches" className="py-12 lg:py-20 bg-primary-light rounded-2xl border border-white/10 px-4 lg:px-8 mb-12">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl lg:text-4xl font-bold mb-8">Відділення в Києві</h2>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Map */}
          <div id="branches-map" className="rounded-2xl overflow-hidden border border-white/10 h-[300px] lg:h-[500px] relative z-0">
            <BranchesMap
              branches={mapBranches}
              center={mapCenter}
              selectedId={nearestBranch?.branch?.id}
              expandedId={expandedBranch}
              onMarkerClick={(id) => setExpandedBranch(expandedId === id ? null : id)}
            />
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

            {geoError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400 text-center">
                {geoError}
              </div>
            )}

            {nearestBranch && (
              <div className="p-3 bg-accent-yellow/10 border border-accent-yellow/30 rounded-xl text-sm">
                <span className="text-accent-yellow font-medium">Найближче до вас:</span>{' '}
                {nearestBranch.branch.address}
                {nearestBranch.distance > 100 ? (
                  <span className="text-red-300 ml-1">
                    ({nearestBranch.distance.toFixed(0)} км — ви далеко від Києва)
                    <button
                      onClick={handleSetKyivLocation}
                      className="ml-2 underline text-accent-yellow hover:text-white transition-colors cursor-pointer"
                    >
                      Це помилка? Я в Києві
                    </button>
                  </span>
                ) : (
                  <span> ({nearestBranch.distance.toFixed(1)} км)</span>
                )}
                {geoSource === 'IP' && (
                  <div className="text-[10px] text-accent-yellow/90 mt-1 font-medium italic">
                    ⚠️ Локація приблизна (за IP-адресою). Дозвольте GPS для точності.
                  </div>
                )}
                {geoSource === 'GPS' && (
                  <div className="text-[10px] text-green-400/90 mt-1 font-bold">
                    ✅ Точна локація (GPS)
                  </div>
                )}
                {geoSource === 'Manual' && (
                  <div className="text-[10px] text-blue-400/90 mt-1 font-bold">
                    📍 Локація: Київ (Центр)
                  </div>
                )}
                {userLocation && (
                  <div className="text-[10px] text-text-secondary mt-1">
                    Ваші координати: {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
                  </div>
                )}
              </div>
            )}

            {displayBranches.map((branch) => {
              const isNearest = nearestBranch?.branch?.id === branch.id;
              const isExpanded = expandedBranch === branch.id;

              return (
                <div
                  key={branch.id}
                  className={`bg-primary rounded-xl border-2 transition-all ${isNearest
                    ? 'border-accent-yellow shadow-[0_0_25px_rgba(250,204,21,0.4)] animate-pulse ring-2 ring-accent-yellow/30'
                    : isExpanded
                      ? 'border-accent-blue shadow-lg'
                      : 'border-white/10 hover:border-white/20'
                    }`}
                >
                  <button
                    onClick={() => setExpandedBranch(isExpanded ? null : branch.id)}
                    className="w-full p-4 flex items-center gap-4 text-left"
                  >
                    <div className={`w-12 h-12 rounded-full ${isNearest ? 'bg-accent-yellow text-primary' : 'bg-accent-blue/20 text-accent-blue'} flex items-center justify-center flex-shrink-0 font-bold text-lg`}>
                      {branch.originalIdx + 1}
                    </div>
                    <div className="flex-1">
                      <div className={`font-bold ${isNearest ? 'text-accent-yellow' : ''}`}>
                        {isNearest && <span className="text-xs bg-accent-yellow/20 text-accent-yellow px-2 py-0.5 rounded mr-2">Найближче</span>}
                        {branch.address}
                      </div>
                      <div className="text-sm text-text-secondary flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3" />
                        {branch.hours}
                        {branch.distance !== Infinity && (
                          <span
                            title={branch.distance > 100 ? "Ви знаходитесь далеко від Києва" : ""}
                            className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${branch.distance > 100 ? 'bg-red-500/20 text-red-300' :
                              isNearest ? 'bg-accent-yellow/20 text-accent-yellow' : 'bg-white/10 text-white/70'
                              }`}
                          >
                            {branch.distance.toFixed(branch.distance > 100 ? 0 : 1)} км
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {expandedBranch === branch.id && (
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
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
