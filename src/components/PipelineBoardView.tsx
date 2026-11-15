import React, { useMemo, useState } from 'react';
import { InboundShipment, ShipmentStatus } from '../types/shipment';
import { formatQuantity, formatDate } from '../utils/csvParser';
import { DateFormatOption } from '../utils/dateFormat';
import { 
  ChevronRight, 
  ChevronLeft, 
  Ship, 
  Truck, 
  FileCheck, 
  Clock, 
  AlertTriangle,
  Building2,
  Container,
  FileText,
  Eye,
  ShieldAlert,
  Search,
  X
} from 'lucide-react';

interface PipelineBoardViewProps {
  shipments: InboundShipment[];
  onSelectShipment: (shipment: InboundShipment) => void;
  onUpdateStatus: (id: string, newStatus: ShipmentStatus) => void;
  dateFormat?: DateFormatOption;
  isSmt?: boolean;
}

const STAGES: { key: ShipmentStatus; label: string; icon: React.ReactNode; description: string; headerColor: string }[] = [
  {
    key: 'In Production / Awaiting Dispatch',
    label: 'Production & Dispatch',
    icon: <Clock className="w-4 h-4 text-amber-600" />,
    description: 'Factory floor & QA batch release',
    headerColor: 'border-t-2 border-t-amber-500'
  },
  {
    key: 'Shipped',
    label: 'Ocean Transit (India -> Djibouti)',
    icon: <Ship className="w-4 h-4 text-blue-600" />,
    description: 'Vessel underway in Arabian Sea',
    headerColor: 'border-t-2 border-t-blue-500'
  },
  {
    key: 'Customs Clearance Djibouti',
    label: 'Port of Djibouti Customs',
    icon: <FileCheck className="w-4 h-4 text-purple-600" />,
    description: 'Doraleh Port & transit declaration',
    headerColor: 'border-t-2 border-t-purple-500'
  },
  {
    key: 'Inland Transit (Djibouti to Addis)',
    label: 'Inland Convoy (Djibouti -> Addis)',
    icon: <Truck className="w-4 h-4 text-teal-600" />,
    description: 'Galafi corridor overland transit',
    headerColor: 'border-t-2 border-t-teal-500'
  },
  {
    key: 'Delivered to Central Warehouse',
    label: 'Central Stock (Addis Ababa)',
    icon: <Building2 className="w-4 h-4 text-emerald-600" />,
    description: 'DKT Head Office / Warehouse intake',
    headerColor: 'border-t-2 border-t-emerald-500'
  }
];

export const PipelineBoardView: React.FC<PipelineBoardViewProps> = ({
  shipments,
  onSelectShipment,
  onUpdateStatus,
  dateFormat,
  isSmt = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredShipments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return shipments;
    return shipments.filter(s =>
      [
        s.product,
        s.prNumber,
        s.poNumber,
        s.piNumber,
        s.commercialInvoiceNumber,
        s.carrierOrVessel || '',
        s.containerNumber || '',
        s.status,
        s.remark || ''
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [shipments, searchQuery]);

  const getNextStage = (current: ShipmentStatus): ShipmentStatus | null => {
    const order: ShipmentStatus[] = [
      'In Production / Awaiting Dispatch',
      'Shipped',
      'Customs Clearance Djibouti',
      'Inland Transit (Djibouti to Addis)',
      'Delivered to Central Warehouse'
    ];
    const idx = order.indexOf(current);
    if (idx >= 0 && idx < order.length - 1) return order[idx + 1];
    return null;
  };

  const getPrevStage = (current: ShipmentStatus): ShipmentStatus | null => {
    const order: ShipmentStatus[] = [
      'In Production / Awaiting Dispatch',
      'Shipped',
      'Customs Clearance Djibouti',
      'Inland Transit (Djibouti to Addis)',
      'Delivered to Central Warehouse'
    ];
    const idx = order.indexOf(current);
    if (idx > 0) return order[idx - 1];
    return null;
  };

  return (
    <div className="w-full">
      {/* SMT Notice Banner */}
      {isSmt && (
        <div className="mb-4 p-3.5 bg-red-50/80 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm text-red-900">
          <div className="flex items-center gap-2.5">
            <Eye className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-semibold">
              SMT Real-Time Order Status Pipeline
            </span>
            <span className="hidden md:inline text-red-700/90">
              — Monitoring from factory production through Djibouti Port to DKT Central Warehouse.
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-md shrink-0">
            Read &amp; View Only
          </span>
        </div>
      )}

      {/* Board Header Context & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-4 text-sm text-slate-600">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-800">Corridor Progression:</span>
          <span>Indian Manufacturer</span>
          <span aria-hidden="true">-&gt;</span>
          <span>Doraleh Port (Djibouti)</span>
          <span aria-hidden="true">-&gt;</span>
          <span>DKT Central Warehouse</span>
          <span className="text-xs font-mono text-slate-500 ml-1">
            ({filteredShipments.length}/{shipments.length})
          </span>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search pipeline orders, PO, PR, vessel..."
            aria-label="Search pipeline shipments"
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear pipeline search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 items-start">
        {STAGES.map(stage => {
          const stageShipments = filteredShipments.filter(s => s.status === stage.key);
          const stageUnits = stageShipments.reduce((acc, s) => acc + (s.prQuantity || 0), 0);

          return (
            <div
              key={stage.key}
              className={`bg-slate-100/70 rounded-xl border border-slate-200/90 flex flex-col min-h-[480px] ${stage.headerColor}`}
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-slate-200 bg-white rounded-t-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {stage.icon}
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      {stage.label}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {stageShipments.length}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center justify-between gap-2">
                  <span className="truncate">{stage.description}</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-700 shrink-0">
                    {stageUnits > 0 ? `${(stageUnits / 1000000).toFixed(1)}M` : '0'}
                  </span>
                </div>
              </div>

              {/* Cards Container */}
              <div className="p-3 flex-1 flex flex-col gap-3 overflow-y-auto max-h-[680px]">
                {stageShipments.length === 0 ? (
                  <div className="h-28 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-sm text-slate-400 bg-white/40">
                    No active consignments
                  </div>
                ) : (
                  stageShipments.map(shipment => {
                    const isCiMissing =
                      shipment.commercialInvoiceNumber === 'Not Generated Yet' ||
                      shipment.commercialInvoiceNumber === 'Pending' ||
                      !shipment.commercialInvoiceNumber;

                    const nextStage = getNextStage(shipment.status);
                    const prevStage = getPrevStage(shipment.status);

                    return (
                      <div
                        key={shipment.id}
                        className="bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-slate-300 rounded-xl p-3.5 transition-all shadow-xs group"
                      >
                        {/* Top row: Order # & Product */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <button
                            onClick={() => onSelectShipment(shipment)}
                            className="text-left font-bold text-sm text-slate-900 hover:text-red-600 transition-colors leading-snug line-clamp-2"
                          >
                            {shipment.product}
                          </button>
                          <span className="text-xs font-mono font-semibold text-slate-400 shrink-0">
                            #{shipment.rowNo}
                          </span>
                        </div>

                        {/* Product Category & PR Reference */}
                        <div className="text-xs text-slate-500 mb-3 flex items-center gap-1.5 truncate">
                          <span>{shipment.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono font-medium text-slate-700">
                            {shipment.prNumber || 'PR Pending'}
                          </span>
                        </div>

                        {/* Quantity & Incoterms */}
                        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/80 mb-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-slate-600 font-medium">Quantity:</span>
                            <span className="font-mono font-bold tabular-nums text-red-600">
                              {formatQuantity(shipment.prQuantity)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Incoterms:</span>
                            <span className="text-slate-800 font-semibold">{shipment.incoterms}</span>
                          </div>
                        </div>

                        {/* Commercial Invoice indicator */}
                        <div className="flex items-center gap-1.5 text-xs mb-2 text-slate-600">
                          <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span>CI:</span>
                          {isCiMissing ? (
                            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1 font-medium truncate text-xs">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              {shipment.commercialInvoiceNumber || 'Pending'}
                            </span>
                          ) : (
                            <span className="font-mono font-medium text-slate-800 truncate">
                              {shipment.commercialInvoiceNumber}
                            </span>
                          )}
                        </div>

                        {/* Container / Vessel info if available */}
                        {shipment.carrierOrVessel && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2 truncate">
                            <Container className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate font-medium">{shipment.carrierOrVessel}</span>
                          </div>
                        )}

                        {/* Dispatch / ETA date */}
                        <div className="text-xs text-slate-500 mb-3 flex items-center justify-between">
                          <span>Dispatch:</span>
                          <span className="font-mono font-semibold text-slate-800">
                            {formatDate(shipment.expectedDispatchDate, dateFormat)}
                          </span>
                        </div>

                        {/* Card Footer */}
                        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1">
                          <button
                            onClick={() => onSelectShipment(shipment)}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>

                          {!isSmt ? (
                            <div className="flex items-center gap-1">
                              {prevStage && (
                                <button
                                  title={`Move back to ${prevStage}`}
                                  onClick={() => onUpdateStatus(shipment.id, prevStage)}
                                  className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                              )}
                              {nextStage && (
                                <button
                                  title={`Advance to ${nextStage}`}
                                  onClick={() => onUpdateStatus(shipment.id, nextStage)}
                                  className="px-2 py-1 rounded text-slate-700 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center gap-0.5 text-xs font-semibold"
                                >
                                  <span>Advance</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">Live</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
