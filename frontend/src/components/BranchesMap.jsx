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
    const createCustomIcon = (index, branch, isSelected) => {
        const displayNumber = branch.number || index + 1;
        const isCoLocated = branch._overlapCount > 1;

        // Build overlap badge (small orange circle with count)
        const overlapBadge = isCoLocated
            ? '<div style="position:absolute;top:-2px;right:-2px;width:14px;height:14px;background:#f97316;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;color:white;font-weight:bold;border:1px solid white;box-shadow:0 1px 2px rgba(0,0,0,0.3)">' + branch._overlapCount + '</div>'
            : '';

        // Build tooltip extra text
        const tooltipExtra = isCoLocated
            ? ' <span style="color:#fdba74">(' + branch._overlapCount + ' відд.)</span>'
            : '';

        return L.divIcon({
            className: 'custom-leaflet-icon',
            html: '<div class="relative group" style="z-index: ' + (isSelected ? 10000 : index) + '; position: relative;">'
                + '<div class="w-8 h-8 ' + (isSelected ? 'bg-accent-yellow' : 'bg-accent-blue') + ' rounded-full flex items-center justify-center text-' + (isSelected ? 'primary' : 'white') + ' font-bold text-sm shadow-lg border-2 ' + (isSelected ? 'border-accent-yellow shadow-[0_0_20px_rgba(250,204,21,0.8)]' : 'border-white') + ' transition-all ' + (isSelected ? 'scale-125 z-50' : 'hover:scale-110') + '">'
                + displayNumber
                + '</div>'
                + overlapBadge
                + '<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none whitespace-nowrap z-[1000] !opacity-100 ' + (isSelected ? 'scale-110' : '') + ' transition-transform">'
                + '<div class="bg-primary/90 text-white px-2 py-1 rounded-md text-[10px] sm:text-xs font-medium shadow-md border border-white/20 backdrop-blur-sm">'
                + '№' + displayNumber + ' · ' + branch.address + tooltipExtra
                + '</div>'
                + '<div class="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-primary/90"></div>'
                + '</div>'
                + '</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
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
                const isSelected = selectedId === branch.id || expandedId === branch.id;
                const coords = branch.coords;

                if (!coords) return null;

                return (
                    <Marker
                        key={branch.id}
                        position={[coords.lat, coords.lng]}
                        icon={createCustomIcon(idx, branch, isSelected)}
                        zIndexOffset={isSelected ? 1000 : 0}
                        eventHandlers={{
                            click: () => onMarkerClick(branch.id),
                        }}
                    />
                );
            })}
        </MapContainer>
    );
}
