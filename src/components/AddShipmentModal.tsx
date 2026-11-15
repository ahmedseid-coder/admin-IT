import React, { useState } from 'react';
import { InboundShipment, ShipmentStatus, IncotermType } from '../types/shipment';
import { categorizeProduct } from '../utils/csvParser';
import { X, Plus, Package } from 'lucide-react';

interface AddShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddShipment: (shipment: InboundShipment) => void;
  nextRowNo: number;
}

const COMMON_PRODUCTS = [
  'Hiwot Trust and Sensation',
  'Mela One',
  'Safe T Kit',
  'Lemlem  Orange',
  'Sensation Flavored Condoms',
  'Postpill Emergency Contraceptive',
  'IUD Safety Insertion Kit'
];

export const AddShipmentModal: React.FC<AddShipmentModalProps> = ({
  isOpen,
  onClose,
  onAddShipment,
  nextRowNo
}) => {
  const [product, setProduct] = useState('Hiwot Trust and Sensation');
  const [customProduct, setCustomProduct] = useState('');
  const [prNumber, setPrNumber] = useState(`2026/${new Date().getMonth() + 1}/${new Date().getDate()}-DKT-0${nextRowNo}`);
  const [prDate, setPrDate] = useState(new Date().toISOString().split('T')[0]);
  const [prQuantity, setPrQuantity] = useState<number>(1000000);
  const [poNumber, setPoNumber] = useState(`PO-2026-DKT-${nextRowNo.toString().padStart(3, '0')}`);
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [piNumber, setPiNumber] = useState(`PI-2026-DKT-${nextRowNo.toString().padStart(3, '0')}`);
  const [incoterms, setIncoterms] = useState<IncotermType>('CIP Addis Ababa');
  const [expectedDispatchDate, setExpectedDispatchDate] = useState('2026-07-15');
  const [commercialInvoiceNumber, setCommercialInvoiceNumber] = useState('Pending');
  const [status, setStatus] = useState<ShipmentStatus>('In Production / Awaiting Dispatch');
  const [carrierOrVessel, setCarrierOrVessel] = useState('');
  const [containerNumber, setContainerNumber] = useState('');
  const [remark, setRemark] = useState('');

  if (!isOpen) return null;

  const selectedProduct = product === 'CUSTOM' ? (customProduct || 'General Supply') : product;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newShipment: InboundShipment = {
      id: `dkt-shipment-${Date.now()}`,
      rowNo: nextRowNo,
      product: selectedProduct,
      category: categorizeProduct(selectedProduct),
      prNumber,
      prDate,
      prQuantity: Number(prQuantity) || 0,
      poNumber,
      poDate,
      piNumber,
      piDate: prDate,
      piQuantity: Number(prQuantity) || 0,
      incoterms,
      expectedDispatchDate,
      commercialInvoiceNumber: commercialInvoiceNumber || 'Pending',
      commercialInvoiceQuantity: Number(prQuantity) || 0,
      mblReleaseDate: '',
      expectedDjiboutiDate: expectedDispatchDate ? new Date(new Date(expectedDispatchDate).getTime() + 14 * 86400000).toISOString().split('T')[0] : '',
      actualDjiboutiDate: '',
      indiaToDjiboutiDuration: '12-14 days sea transit',
      djiboutiReleaseDate: '',
      djiboutiClearanceDuration: '4 days projected',
      centralStockReachDate: '',
      djiboutiToAddisDuration: '4 days (Galafi Corridor)',
      warehouseArrivalDate: '',
      totalLeadTimeDays: '25 days projected',
      status,
      carrierOrVessel: carrierOrVessel || 'Pending Booking',
      containerNumber: containerNumber || 'Pending Allocation',
      blNumber: 'Pending MBL',
      portOfOrigin: 'Nhava Sheva (JNPT Mumbai), India',
      portOfDischarge: 'Port of Djibouti (Doraleh Container Terminal)',
      finalDestination: 'DKT Central Warehouse, Addis Ababa',
      remark: remark || 'New consignment logged into tracking pipeline.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onAddShipment(newShipment);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-50 text-red-600">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Create Inbound Shipment Order</h3>
              <p className="text-[11px] text-slate-500">DKT Ethiopia Supply Chain Logistics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Product Selection */}
          <div>
            <label className="text-slate-700 font-bold block mb-1">
              Product & Health Commodity *
            </label>
            <select
              value={product}
              onChange={e => setProduct(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
            >
              {COMMON_PRODUCTS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
              <option value="CUSTOM">+ Other Custom Commodity</option>
            </select>
          </div>

          {product === 'CUSTOM' && (
            <div>
              <label className="text-slate-600 block mb-1">Custom Product Name</label>
              <input
                type="text"
                value={customProduct}
                onChange={e => setCustomProduct(e.target.value)}
                placeholder="Enter commodity name"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                required
              />
            </div>
          )}

          {/* Requisition & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-bold block mb-1">
                Order Quantity (Units) *
              </label>
              <input
                type="number"
                value={prQuantity}
                onChange={e => setPrQuantity(Number(e.target.value))}
                min={1}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono tabular-nums focus:outline-none focus:border-red-600 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">
                Incoterms *
              </label>
              <select
                value={incoterms}
                onChange={e => setIncoterms(e.target.value as IncotermType)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
              >
                <option value="CIP Addis Ababa">CIP Addis Ababa</option>
                <option value="CIF Addis Ababa">CIF Addis Ababa</option>
                <option value="CIF Djibouti">CIF Djibouti</option>
                <option value="FOB Mumbai / Nhava Sheva">FOB Mumbai / Nhava Sheva</option>
              </select>
            </div>
          </div>

          {/* PR & PO Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-bold block mb-1">
                Purchase Requisition Number
              </label>
              <input
                type="text"
                value={prNumber}
                onChange={e => setPrNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono focus:outline-none focus:border-red-600 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">
                Purchase Order Number
              </label>
              <input
                type="text"
                value={poNumber}
                onChange={e => setPoNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono focus:outline-none focus:border-red-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Dates & Commercial Invoice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-bold block mb-1">
                Expected Date of Dispatch
              </label>
              <input
                type="date"
                value={expectedDispatchDate}
                onChange={e => setExpectedDispatchDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">
                Commercial Invoice Number
              </label>
              <input
                type="text"
                value={commercialInvoiceNumber}
                onChange={e => setCommercialInvoiceNumber(e.target.value)}
                placeholder="e.g. TNR P69204 or Pending"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono focus:outline-none focus:border-red-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Initial Status */}
          <div>
            <label className="text-slate-700 font-bold block mb-1">
              Initial Pipeline Stage
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as ShipmentStatus)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
            >
              <option value="In Production / Awaiting Dispatch">In Production / Awaiting Dispatch</option>
              <option value="Shipped">Shipped (Sea Transit to Djibouti)</option>
              <option value="Customs Clearance Djibouti">Customs Clearance Djibouti</option>
              <option value="Inland Transit (Djibouti to Addis)">Inland Transit (Djibouti to Addis)</option>
              <option value="Delivered to Central Warehouse">Delivered to Central Warehouse</option>
              <option value="Delayed">Delayed</option>
            </select>
          </div>

          {/* Carrier & Container */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-600 block mb-1">Carrier / Vessel Name</label>
              <input
                type="text"
                value={carrierOrVessel}
                onChange={e => setCarrierOrVessel(e.target.value)}
                placeholder="e.g. MSC Diletta / Maersk Kendal"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
              />
            </div>
            <div>
              <label className="text-slate-600 block mb-1">Container Number</label>
              <input
                type="text"
                value={containerNumber}
                onChange={e => setContainerNumber(e.target.value)}
                placeholder="e.g. MSCU7481924"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono focus:outline-none focus:border-red-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Operational Remark */}
          <div>
            <label className="text-slate-600 block mb-1">Operational Remarks</label>
            <textarea
              rows={2}
              value={remark}
              onChange={e => setRemark(e.target.value)}
              placeholder="Batch details, supplier notes, inspection readiness..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Order</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
