import React, { useState, useEffect } from 'react';
import { InboundShipment, ShipmentStatus, ProductCategory } from '../types/shipment';
import { AuditLogEntry } from '../types/audit';
import { formatQuantity, formatDate } from '../utils/csvParser';
import { DateFormatOption } from '../utils/dateFormat';
import { formatAuditTimestamp } from '../utils/auditLog';
import {
  X,
  FileText,
  CheckCircle2,
  Clock,
  MapPin,
  Save,
  AlertCircle,
  History,
  ArrowRight
} from 'lucide-react';

interface ShipmentDetailDrawerProps {
  shipment: InboundShipment | null;
  onClose: () => void;
  onUpdateShipment: (updated: InboundShipment) => void;
  auditLogs?: AuditLogEntry[];
  dateFormat?: DateFormatOption;
  isSmt?: boolean;
}

const PRODUCT_OPTIONS = [
  'Male Latex Condoms',
  'Emergency Contraceptive Pills',
  'Combined Oral Contraceptives',
  'Injectable Contraceptives',
  'Hormonal IUDs & Implants'
];

const CATEGORY_OPTIONS: ProductCategory[] = [
  'Condoms & Lubricants',
  'Emergency & Oral Contraceptives',
  'Clinical & Safety Kits',
  'Family Planning & Wellness'
];

export const ShipmentDetailDrawer: React.FC<ShipmentDetailDrawerProps> = ({
  shipment,
  onClose,
  onUpdateShipment,
  auditLogs = [],
  dateFormat,
  isSmt = false
}) => {
  const [product, setProduct] = useState<string>(shipment?.product || '');
  const [category, setCategory] = useState<ProductCategory>(
    shipment?.category || 'Condoms & Lubricants'
  );
  const [prNumber, setPrNumber] = useState<string>(shipment?.prNumber || '');
  const [prQuantity, setPrQuantity] = useState<string>(String(shipment?.prQuantity || 0));
  const [poNumber, setPoNumber] = useState<string>(shipment?.poNumber || '');
  const [piNumber, setPiNumber] = useState<string>(shipment?.piNumber || '');
  const [incoterms, setIncoterms] = useState<string>(shipment?.incoterms || 'CIP Addis Ababa');
  const [status, setStatus] = useState<ShipmentStatus>(
    shipment?.status || 'In Production / Awaiting Dispatch'
  );
  const [remark, setRemark] = useState<string>(shipment?.remark || '');
  const [carrierOrVessel, setCarrierOrVessel] = useState<string>(
    shipment?.carrierOrVessel || ''
  );
  const [containerNumber, setContainerNumber] = useState<string>(
    shipment?.containerNumber || ''
  );
  const [blNumber, setBlNumber] = useState<string>(shipment?.blNumber || '');
  const [commercialInvoiceNumber, setCommercialInvoiceNumber] = useState<string>(
    shipment?.commercialInvoiceNumber || ''
  );
  const [expectedDispatchDate, setExpectedDispatchDate] = useState<string>(
    shipment?.expectedDispatchDate || ''
  );
  const [expectedDjiboutiDate, setExpectedDjiboutiDate] = useState<string>(
    shipment?.expectedDjiboutiDate || ''
  );
  const [actualDjiboutiDate, setActualDjiboutiDate] = useState<string>(
    shipment?.actualDjiboutiDate || ''
  );
  const [djiboutiClearanceDuration, setDjiboutiClearanceDuration] = useState<string>(
    shipment?.djiboutiClearanceDuration || ''
  );
  const [warehouseArrivalDate, setWarehouseArrivalDate] = useState<string>(
    shipment?.warehouseArrivalDate || ''
  );
  const [totalLeadTimeDays, setTotalLeadTimeDays] = useState<string>(
    shipment?.totalLeadTimeDays || ''
  );
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (shipment) {
      setProduct(shipment.product);
      setCategory(shipment.category);
      setPrNumber(shipment.prNumber || '');
      setPrQuantity(String(shipment.prQuantity || 0));
      setPoNumber(shipment.poNumber || '');
      setPiNumber(shipment.piNumber || '');
      setIncoterms(shipment.incoterms || 'CIP Addis Ababa');
      setStatus(shipment.status);
      setRemark(shipment.remark || '');
      setCarrierOrVessel(shipment.carrierOrVessel || '');
      setContainerNumber(shipment.containerNumber || '');
      setBlNumber(shipment.blNumber || '');
      setCommercialInvoiceNumber(shipment.commercialInvoiceNumber || '');
      setExpectedDispatchDate(shipment.expectedDispatchDate || '');
      setExpectedDjiboutiDate(shipment.expectedDjiboutiDate || '');
      setActualDjiboutiDate(shipment.actualDjiboutiDate || '');
      setDjiboutiClearanceDuration(shipment.djiboutiClearanceDuration || '');
      setWarehouseArrivalDate(shipment.warehouseArrivalDate || '');
      setTotalLeadTimeDays(shipment.totalLeadTimeDays || '');
      setIsSaved(false);
    }
  }, [shipment]);

  // Early return strictly AFTER all React hooks
  if (!shipment) return null;

  const handleSave = () => {
    if (isSmt) return;
    const parsedQty = Number(prQuantity) || 0;
    onUpdateShipment({
      ...shipment,
      product: product.trim() || shipment.product,
      category,
      prNumber: prNumber.trim(),
      prQuantity: parsedQty,
      poNumber: poNumber.trim(),
      piNumber: piNumber.trim(),
      incoterms: incoterms.trim(),
      status,
      remark,
      carrierOrVessel,
      containerNumber,
      blNumber,
      commercialInvoiceNumber,
      expectedDispatchDate,
      expectedDjiboutiDate,
      actualDjiboutiDate,
      djiboutiClearanceDuration,
      warehouseArrivalDate,
      totalLeadTimeDays,
      updatedAt: new Date().toISOString()
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const statusOptions: ShipmentStatus[] = [
    'In Production / Awaiting Dispatch',
    'Shipped',
    'Customs Clearance Djibouti',
    'Inland Transit (Djibouti to Addis)',
    'Delivered to Central Warehouse',
    'On Hold / Documentation Pending',
    'Delayed'
  ];

  const isCiIssue =
    commercialInvoiceNumber === 'Not Generated Yet' ||
    commercialInvoiceNumber === 'Pending' ||
    !commercialInvoiceNumber;

  const milestones = [
    {
      title: 'Purchase Requisition (PR)',
      date: formatDate(shipment.prDate),
      ref: prNumber || 'Pending',
      status: 'completed',
      detail: `${formatQuantity(Number(prQuantity) || shipment.prQuantity)} units requisitioned`
    },
    {
      title: 'Purchase Order (PO)',
      date: formatDate(shipment.poDate),
      ref: poNumber || 'Pending',
      status: 'completed',
      detail: 'Contract placed with manufacturer'
    },
    {
      title: 'Proforma Invoice (PI)',
      date: formatDate(shipment.piDate),
      ref: piNumber || 'Pending',
      status: 'completed',
      detail: `Incoterms: ${incoterms}`
    },
    {
      title: 'Commercial Invoice & MBL',
      date: formatDate(expectedDispatchDate),
      ref: commercialInvoiceNumber || 'Pending',
      status: !isCiIssue ? 'completed' : 'pending',
      detail: isCiIssue ? 'Action required: Missing supplier invoice' : 'Verified with shipping line'
    },
    {
      title: 'Ocean Freight (India -> Djibouti)',
      date: expectedDjiboutiDate ? formatDate(expectedDjiboutiDate) : 'Est. ~14 days',
      ref: carrierOrVessel || 'Maersk / MSC Line',
      status: status !== 'In Production / Awaiting Dispatch' ? 'completed' : 'pending',
      detail: 'Arabian Sea corridor to Doraleh Port'
    },
    {
      title: 'Port of Djibouti Customs',
      date: actualDjiboutiDate ? formatDate(actualDjiboutiDate) : 'Pending Port Arrival',
      ref: `Clearance: ${djiboutiClearanceDuration || '4 days'}`,
      status:
        status === 'Customs Clearance Djibouti' ||
        status === 'Inland Transit (Djibouti to Addis)' ||
        status === 'Delivered to Central Warehouse'
          ? 'completed'
          : 'pending',
      detail: 'ESLSE transit manifest & customs release'
    },
    {
      title: 'Central Stock Arrival',
      date: warehouseArrivalDate ? formatDate(warehouseArrivalDate) : 'Addis Ababa Central Hub',
      ref: shipment.finalDestination,
      status: status === 'Delivered to Central Warehouse' ? 'completed' : 'pending',
      detail: `Total lead time: ${totalLeadTimeDays || '—'}`
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold text-slate-500">
                Consignment #{shipment.rowNo}
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="text-xs text-red-600 font-bold">{category}</span>
              {isSmt && (
                <>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <span className="text-[10px] bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded">
                    SMT Read-Only
                  </span>
                </>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">{product}</h2>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span className="font-mono">PR: {prNumber || 'Pending'}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">PO: {poNumber || 'Pending'}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 font-bold">
                {isSmt ? 'Current Logistics Status' : 'Edit Consignment & Corridor Fields'}
              </span>
              <span className="font-mono text-slate-900 font-bold tabular-nums">
                {formatQuantity(Number(prQuantity) || shipment.prQuantity)} units
              </span>
            </div>

            {!isSmt ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium mb-1 block">
                      Product Name
                    </label>
                    <input
                      list="drawer-product-options"
                      type="text"
                      value={product}
                      onChange={e => setProduct(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-600"
                    />
                    <datalist id="drawer-product-options">
                      {PRODUCT_OPTIONS.map(opt => (
                        <option key={opt} value={opt} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 font-medium mb-1 block">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value as ProductCategory)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-600"
                    >
                      {CATEGORY_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium mb-1 block">
                      PR Number
                    </label>
                    <input
                      type="text"
                      value={prNumber}
                      onChange={e => setPrNumber(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-red-600"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium mb-1 block">
                      PO Number
                    </label>
                    <input
                      type="text"
                      value={poNumber}
                      onChange={e => setPoNumber(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-red-600"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium mb-1 block">
                      Quantity (Units)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={prQuantity}
                      onChange={e => setPrQuantity(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-red-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium mb-1 block">
                      PI Number
                    </label>
                    <input
                      type="text"
                      value={piNumber}
                      onChange={e => setPiNumber(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-red-600"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium mb-1 block">
                      Incoterms
                    </label>
                    <select
                      value={incoterms}
                      onChange={e => setIncoterms(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-600"
                    >
                      <option value="CIP Addis Ababa">CIP Addis Ababa</option>
                      <option value="CIF Djibouti">CIF Djibouti</option>
                      <option value="CIF Addis Ababa">CIF Addis Ababa</option>
                      <option value="FOB Mumbai">FOB Mumbai</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium mb-1 block">
                      Shipment Status
                    </label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as ShipmentStatus)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-600"
                    >
                      {statusOptions.map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 font-medium mb-1 block">
                      Expected Dispatch Date
                    </label>
                    <input
                      type="date"
                      value={expectedDispatchDate}
                      onChange={e => setExpectedDispatchDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium mb-1 block">
                      Vessel / Carrier Name
                    </label>
                    <input
                      type="text"
                      value={carrierOrVessel}
                      onChange={e => setCarrierOrVessel(e.target.value)}
                      placeholder="e.g. Maersk Kendal"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 font-medium mb-1 block">
                      Container Number
                    </label>
                    <input
                      type="text"
                      value={containerNumber}
                      onChange={e => setContainerNumber(e.target.value)}
                      placeholder="e.g. TGHU9182340"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-red-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 font-medium mb-1 block">
                      B/L Number
                    </label>
                    <input
                      type="text"
                      value={blNumber}
                      onChange={e => setBlNumber(e.target.value)}
                      placeholder="Bill of Lading"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-red-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 font-medium mb-1 block">
                    Commercial Invoice Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={commercialInvoiceNumber}
                      onChange={e => setCommercialInvoiceNumber(e.target.value)}
                      placeholder="e.g. INV/NPL/111/26-27"
                      className={`w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none ${
                        isCiIssue ? 'border-amber-400' : 'border-slate-300 focus:border-red-600'
                      }`}
                    />
                    {isCiIssue && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        Pending Invoice
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium mb-1 block">
                      Expected Djibouti Date
                    </label>
                    <input
                      type="date"
                      value={expectedDjiboutiDate}
                      onChange={e => setExpectedDjiboutiDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-600"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium mb-1 block">
                      Clearance Duration
                    </label>
                    <input
                      type="text"
                      value={djiboutiClearanceDuration}
                      onChange={e => setDjiboutiClearanceDuration(e.target.value)}
                      placeholder="e.g. 4 days"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-600"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium mb-1 block">
                      Total Lead Time
                    </label>
                    <input
                      type="text"
                      value={totalLeadTimeDays}
                      onChange={e => setTotalLeadTimeDays(e.target.value)}
                      placeholder="e.g. 54 days"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-600"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* SMT Read-Only View */
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Stage
                    </span>
                    <span className="text-xs font-bold text-red-600">{shipment.status}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Expected Dispatch
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {formatDate(shipment.expectedDispatchDate)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Vessel / Convoy
                    </span>
                    <span className="text-xs font-semibold text-slate-800">
                      {shipment.carrierOrVessel || 'Pending Booking'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Commercial Invoice
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-800">
                      {shipment.commercialInvoiceNumber || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Corridor Lifecycle Milestones */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-600" />
              <span>Corridor Lifecycle Milestones</span>
            </h3>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {milestones.map((m, idx) => {
                const isCompleted = m.status === 'completed';

                return (
                  <div key={idx} className="relative">
                    <div
                      className={`absolute -left-6 top-1 w-4 h-4 rounded-full border flex items-center justify-center ${
                        isCompleted
                          ? 'bg-red-50 border-red-600 text-red-600'
                          : 'bg-white border-slate-300 text-slate-400'
                      }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          isCompleted ? 'bg-red-600' : 'bg-slate-300'
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`font-semibold ${
                            isCompleted ? 'text-slate-900' : 'text-slate-500'
                          }`}
                        >
                          {m.title}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">{m.date}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span className="font-mono text-slate-800 font-medium">{m.ref}</span>
                        <span aria-hidden="true">·</span>
                        <span>{m.detail}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trade Terms & Route Metadata */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Logistics &amp; Trade Terms</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block mb-1">Incoterms</span>
                <span className="font-bold text-slate-900">{incoterms}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block mb-1">Port of Origin</span>
                <span className="font-semibold text-slate-800">{shipment.portOfOrigin}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block mb-1">Port of Discharge</span>
                <span className="font-semibold text-slate-800">{shipment.portOfDischarge}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block mb-1">Final Destination</span>
                <span className="font-semibold text-slate-800">{shipment.finalDestination}</span>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              <span>Operational Remarks &amp; Action Notes</span>
            </h3>
            {!isSmt ? (
              <textarea
                rows={3}
                value={remark}
                onChange={e => setRemark(e.target.value)}
                placeholder="Add logistics updates, customs clearance notices, or EFDA inspection notes..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white leading-relaxed"
              />
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed">
                {shipment.remark || 'No operational remarks noted for this consignment.'}
              </div>
            )}
          </div>

          {/* Shipment Status Audit History */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 mb-2.5 flex items-center gap-2">
              <History className="w-4 h-4 text-red-600" />
              <span>Status Change Audit History</span>
              <span className="ml-auto font-mono text-[11px] font-semibold text-slate-500">
                {auditLogs.length} {auditLogs.length === 1 ? 'entry' : 'entries'}
              </span>
            </h3>

            {auditLogs.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
                No audit history recorded for this consignment yet.
              </div>
            ) : (
              <div className="space-y-2">
                {auditLogs.map(entry => {
                  const ts = formatAuditTimestamp(entry.timestamp);
                  return (
                    <div
                      key={entry.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900">
                          {entry.changedByName}{' '}
                          <span className="font-mono font-normal text-slate-500">
                            (@{entry.changedByUsername})
                          </span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0">
                          {ts.date} {ts.time}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-medium text-slate-600">
                          {entry.changedByRole === 'INBOUND_LOGISTICS'
                            ? 'Inbound Logistics'
                            : 'SMT'}
                        </span>
                        {entry.previousStatus && (
                          <>
                            <span className="text-slate-600">{entry.previousStatus}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                          </>
                        )}
                        <span className="font-semibold text-red-700">{entry.newStatus}</span>
                      </div>

                      {entry.note && (
                        <div className="text-slate-600 leading-relaxed">{entry.note}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {isSaved ? (
              <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Changes saved
              </span>
            ) : (
              <span>Last updated: {formatDate(shipment.updatedAt, dateFormat)}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors font-medium"
            >
              Close
            </button>
            {!isSmt && (
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
