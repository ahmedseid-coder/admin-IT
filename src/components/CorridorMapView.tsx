import React, { useState } from 'react';
import { InboundShipment } from '../types/shipment';
import { formatQuantity } from '../utils/csvParser';
import { 
  Ship, 
  Truck, 
  Building2, 
  Anchor, 
  Factory, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Navigation,
  Info,
  Eye
} from 'lucide-react';

interface CorridorMapViewProps {
  shipments: InboundShipment[];
  onSelectShipment: (shipment: InboundShipment) => void;
  isSmt?: boolean;
}

interface Waypoint {
  id: string;
  name: string;
  location: string;
  type: 'factory' | 'port_origin' | 'ocean' | 'port_discharge' | 'border' | 'warehouse';
  icon: React.ReactNode;
  stageMatch: string[];
  description: string;
  leadTime: string;
}

export const CorridorMapView: React.FC<CorridorMapViewProps> = ({
  shipments,
  onSelectShipment,
  isSmt = false
}) => {
  const [selectedWaypointId, setSelectedWaypointId] = useState<string>('doraleh');

  const WAYPOINTS: Waypoint[] = [
    {
      id: 'india_plant',
      name: 'Manufacturing & QC Testing',
      location: 'Mumbai & Gujarat, India',
      type: 'factory',
      icon: <Factory className="w-5 h-5 text-amber-600" />,
      stageMatch: ['In Production / Awaiting Dispatch', 'Requisition & PO'],
      description: 'Pharmaceutical formulation, condom pinhole electronic testing, batch packaging, and pre-shipment inspection.',
      leadTime: 'PO to Dispatch: 30-45 days'
    },
    {
      id: 'ocean_freight',
      name: 'Ocean Sea Freight Transit',
      location: 'Arabian Sea → Gulf of Aden',
      type: 'ocean',
      icon: <Ship className="w-5 h-5 text-blue-600" />,
      stageMatch: ['Shipped'],
      description: 'Container vessels (Maersk, MSC, CMA CGM) crossing ~2,200 nautical miles through Bab el-Mandeb strait.',
      leadTime: 'Transit duration: ~12-14 days'
    },
    {
      id: 'doraleh',
      name: 'Port of Djibouti (Doraleh)',
      location: 'Doraleh Container Terminal (DCT)',
      type: 'port_discharge',
      icon: <Anchor className="w-5 h-5 text-purple-600" />,
      stageMatch: ['Customs Clearance Djibouti'],
      description: 'Container discharge, port terminal handling, ESLSE transit declaration, and Ethiopian customs clearance bond.',
      leadTime: 'Port Dwell & Clearance: 3-5 days'
    },
    {
      id: 'inland_corridor',
      name: 'Djibouti-Addis Overland Corridor',
      location: 'Galafi Border → Awash → Mojo Dry Port',
      type: 'border',
      icon: <Truck className="w-5 h-5 text-teal-600" />,
      stageMatch: ['Inland Transit (Djibouti to Addis)'],
      description: 'ESLSE multimodal road convoy traveling ~910 km through Galafi customs checkpoint to central dry ports.',
      leadTime: 'Corridor Trucking: ~3-4 days'
    },
    {
      id: 'central_stock',
      name: 'DKT Central Warehouse & Stock',
      location: 'Kirkos/Kality, Addis Ababa',
      type: 'warehouse',
      icon: <Building2 className="w-5 h-5 text-emerald-600" />,
      stageMatch: ['Delivered to Central Warehouse'],
      description: 'DKT Head Office central receiving, batch quarantine, EFDA regulatory release, and distribution staging.',
      leadTime: 'Total Lead Time: ~60-90 days'
    }
  ];

  const currentWaypoint = WAYPOINTS.find(w => w.id === selectedWaypointId) || WAYPOINTS[2];
  
  // Consignments at current waypoint
  const activeShipmentsAtWaypoint = shipments.filter(s => 
    currentWaypoint.stageMatch.includes(s.status)
  );

  return (
    <div className="space-y-5">
      {/* Corridor Overview Banner */}
      <div className="p-5 sm:p-6 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-red-600" />
              <span>DKT Ethiopia Strategic Inbound Supply Corridor</span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Multi-modal sea and overland freight route connecting Indian manufacturing to DKT Central Warehouse.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-slate-400">Total Route:</span>
              <span className="font-bold text-slate-900">~4,600 km</span>
            </div>
            <span aria-hidden="true" className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-slate-400">Critical Port:</span>
              <span className="text-red-600 font-bold">Port of Djibouti</span>
            </div>
          </div>
        </div>

        {/* Visual Route Nodes Bar */}
        <div className="mt-6 relative">
          <div className="hidden sm:block absolute top-1/2 left-8 right-8 -translate-y-1/2 h-1 bg-gradient-to-r from-amber-400 via-blue-400 to-emerald-400 -z-0 opacity-40 rounded" />

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative z-10">
            {WAYPOINTS.map((wp, index) => {
              const count = shipments.filter(s => wp.stageMatch.includes(s.status)).length;
              const isSelected = selectedWaypointId === wp.id;

              return (
                <button
                  key={wp.id}
                  onClick={() => setSelectedWaypointId(wp.id)}
                  className={`text-left p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-red-50/70 border-red-500 shadow-sm ring-1 ring-red-500/30'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      {wp.icon}
                    </div>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        count > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {count} {count === 1 ? 'order' : 'orders'}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-slate-900 line-clamp-1">
                    {index + 1}. {wp.name.split(' ')[0]}
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">{wp.location}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Waypoint Detail & Active Consignments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                {currentWaypoint.icon}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{currentWaypoint.name}</h3>
                <div className="text-sm text-red-600 font-medium">{currentWaypoint.location}</div>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              {currentWaypoint.description}
            </p>

            <div className="space-y-2.5 text-sm bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Standard Duration:</span>
                <span className="text-slate-800 font-mono font-semibold">
                  {currentWaypoint.leadTime}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Cargo Stationed Here:</span>
                <span className="text-slate-900 font-mono font-bold">
                  {activeShipmentsAtWaypoint.length} consignments
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total Units:</span>
                <span className="text-red-600 font-mono font-bold tabular-nums">
                  {formatQuantity(
                    activeShipmentsAtWaypoint.reduce((acc, s) => acc + (s.prQuantity || 0), 0)
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Select any route waypoint above to audit cargo stationed in that leg.</span>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <h4 className="text-base font-bold text-slate-900">
              Consignments at {currentWaypoint.name} ({activeShipmentsAtWaypoint.length})
            </h4>
            <span className="text-xs text-slate-500">Click order to inspect dossier</span>
          </div>

          {activeShipmentsAtWaypoint.length === 0 ? (
            <div className="h-48 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-sm text-slate-400 gap-2 bg-slate-50/50">
              <CheckCircle2 className="w-6 h-6 text-slate-300" />
              <span>No consignments currently held at this waypoint</span>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {activeShipmentsAtWaypoint.map(s => (
                <div
                  key={s.id}
                  onClick={() => onSelectShipment(s)}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-slate-300 rounded-xl cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-sm font-mono font-bold text-slate-500 pt-0.5">
                      #{s.rowNo}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                        {s.product}
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                        <span className="font-mono">PR: {s.prNumber || 'N/A'}</span>
                        <span aria-hidden="true">·</span>
                        <span>{s.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-700 font-medium">{s.incoterms}</span>
                      </div>
                      {s.carrierOrVessel && (
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                          <Ship className="w-3.5 h-3.5 text-slate-400" />
                          <span>{s.carrierOrVessel}</span>
                          {s.containerNumber && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono text-slate-700">{s.containerNumber}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <div className="text-sm font-bold font-mono text-slate-900 tabular-nums">
                      {formatQuantity(s.prQuantity)} units
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Dispatch: {s.expectedDispatchDate || '—'}
                    </div>
                    <div className="text-xs font-mono text-slate-600 mt-0.5">
                      CI: {s.commercialInvoiceNumber}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
