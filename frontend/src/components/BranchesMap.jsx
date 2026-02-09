import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon path issues with Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Component to handle View updates
function ChangeView({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

export default function BranchesMap({ branches, center, selectedId, expandedId, onMarkerClick }) {
    // Custom Icon factory
    const createCustomIcon = (index, isSelected) => {
        return L.divIcon({
            className: 'custom-leaflet-icon',
            html: `
        <div class="relative group">
           <div class="w-8 h-8 ${isSelected ? 'bg-accent-yellow' : 'bg-accent-blue'} rounded-full flex items-center justify-center text-${isSelected ? 'primary' : 'white'} font-bold text-sm shadow-lg border-2 border-white transition-transform ${isSelected ? 'ring-4 ring-accent-yellow/50 scale-110' : ''}">
             ${index + 1}
           </div>
           <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none whitespace-nowrap z-[1000] !opacity-100">
              <div class="bg-primary/90 text-white px-2 py-1 rounded-md text-[10px] sm:text-xs font-medium shadow-md border border-white/20 backdrop-blur-sm">
                 ${branches[index].address}
              </div>
              <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-primary/90"></div>
           </div>
        </div>
      `,
            iconSize: [32, 32],
            iconAnchor: [16, 32], // Bottom center
            popupAnchor: [0, -32],
        });
    };

    return (
        <MapContainer
            center={[center.lat, center.lng]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
            dragging={true}
            scrollWheelZoom={true}
        >
            {/* Blue tint overlay */}
            <div className="absolute inset-0 pointer-events-none z-[400]"
                style={{
                    mixBlendMode: 'color',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)'
                }}
            />

            {/* Tile Layer */}
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                className="map-tiles-blue"
            />

            <ChangeView center={[center.lat, center.lng]} zoom={selectedId || expandedId ? 15 : 13} />

            {branches.map((branch, idx) => {
                const isSelected = selectedId === branch.id || expandedId === idx;
                const coords = branch.coords;

                if (!coords) return null;

                return (
                    <Marker
                        key={branch.id}
                        position={[coords.lat, coords.lng]}
                        icon={createCustomIcon(idx, isSelected)}
                        eventHandlers={{
                            click: () => onMarkerClick(branch.id),
                        }}
                    />
                );
            })}
        </MapContainer>
    );
}
