import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InboundShipment } from '../types/shipment';
import { User, ROLE_PERMISSIONS } from '../types/auth';
import { DateFormatOption, formatDateWithPreference } from './dateFormat';
import { formatQuantity } from './csvParser';
import { isDelayedOrCriticalShipment } from '../components/MetricsCards';

interface GenerateSummaryPdfParams {
  shipments: InboundShipment[];
  viewTitle: string;
  filterSummary?: string;
  currentUser: User;
  dateFormat: DateFormatOption;
}

export function generateShipmentSummaryPdf({
  shipments,
  viewTitle,
  filterSummary,
  currentUser,
  dateFormat
}: GenerateSummaryPdfParams): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const todayIso = new Date().toISOString().split('T')[0];
  const generatedDate = formatDateWithPreference(todayIso, dateFormat);
  const generatedTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  // Top Brand Header Bar
  doc.setFillColor(220, 38, 38); // DKT Crimson #dc2626
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('DKT ETHIOPIA — INBOUND SHIPMENT STATUS SUMMARY REPORT', 14, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `View: ${viewTitle}${filterSummary ? ` (${filterSummary})` : ''}   |   Generated: ${generatedDate} ${generatedTime}`,
    14,
    17
  );

  doc.text(
    `Prepared for Stakeholders by: ${currentUser.name} (${ROLE_PERMISSIONS[currentUser.role].shortLabel})`,
    pageWidth - 14,
    17,
    { align: 'right' }
  );

  // Executive KPI Summary Strip
  const totalUnits = shipments.reduce((sum, s) => sum + (s.prQuantity || 0), 0);
  const inProduction = shipments.filter(
    s => s.status === 'In Production / Awaiting Dispatch'
  ).length;
  const shipped = shipments.filter(s => s.status === 'Shipped').length;
  const customs = shipments.filter(
    s => s.status === 'Customs Clearance Djibouti'
  ).length;
  const inland = shipments.filter(
    s => s.status === 'Inland Transit (Djibouti to Addis)'
  ).length;
  const delivered = shipments.filter(
    s => s.status === 'Delivered to Central Warehouse'
  ).length;
  const criticalOrDelayed = shipments.filter(isDelayedOrCriticalShipment).length;
  const pendingCi = shipments.filter(
    s =>
      s.commercialInvoiceNumber === 'Not Generated Yet' ||
      s.commercialInvoiceNumber === 'Pending' ||
      !s.commercialInvoiceNumber
  ).length;

  autoTable(doc, {
    startY: 27,
    head: [
      [
        'Active Orders',
        'Total Inbound Units',
        'In Production',
        'Ocean Transit',
        'Djibouti Customs',
        'Inland Transit',
        'Central Warehouse',
        'Missing CI Docs',
        'Delayed / Critical LT'
      ]
    ],
    body: [
      [
        String(shipments.length),
        formatQuantity(totalUnits),
        String(inProduction),
        String(shipped),
        String(customs),
        String(inland),
        String(delivered),
        String(pendingCi),
        String(criticalOrDelayed)
      ]
    ],
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      halign: 'center',
      textColor: [15, 23, 42]
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: 'bold',
      fontSize: 8
    },
    columnStyles: {
      8: {
        textColor: criticalOrDelayed > 0 ? [185, 28, 28] : [15, 23, 42],
        fontStyle: 'bold'
      }
    },
    margin: { left: 14, right: 14 }
  });

  const afterSummaryY =
    ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 45) + 6;

  // Shipments Table for Current View
  const tableRows = shipments.map(s => [
    `#${s.rowNo}`,
    s.product,
    `${s.prNumber || '—'}\nPO: ${s.poNumber || '—'}`,
    formatQuantity(s.prQuantity),
    s.incoterms || '—',
    s.commercialInvoiceNumber || 'Pending',
    formatDateWithPreference(s.expectedDispatchDate, dateFormat),
    s.totalLeadTimeDays || '—',
    s.status,
    (s.remark || '—').slice(0, 95) + ((s.remark || '').length > 95 ? '...' : '')
  ]);

  autoTable(doc, {
    startY: afterSummaryY,
    head: [
      [
        'No.',
        'Product',
        'PR / PO Number',
        'Quantity',
        'Incoterms',
        'Commercial Inv.',
        'Dispatch Date',
        'Lead Time',
        'Shipment Status',
        'Operational Remark'
      ]
    ],
    body:
      tableRows.length > 0
        ? tableRows
        : [['—', 'No shipments in current filtered view', '—', '0', '—', '—', '—', '—', '—', '—']],
    theme: 'striped',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.4,
      valign: 'top',
      textColor: [30, 41, 59],
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5
    },
    columnStyles: {
      0: { cellWidth: 11, halign: 'center' },
      1: { cellWidth: 34, fontStyle: 'bold' },
      2: { cellWidth: 34 },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 22 },
      5: { cellWidth: 27 },
      6: { cellWidth: 23 },
      7: { cellWidth: 17, halign: 'center' },
      8: { cellWidth: 33, fontStyle: 'bold' },
      9: { cellWidth: 'auto' }
    },
    didParseCell: data => {
      if (data.section === 'body' && data.column.index === 8) {
        const val = String(data.cell.raw || '');
        if (val.toLowerCase().includes('delayed')) {
          data.cell.styles.textColor = [185, 28, 28];
        } else if (val.includes('Delivered')) {
          data.cell.styles.textColor = [21, 128, 61];
        } else if (val.includes('Inland')) {
          data.cell.styles.textColor = [15, 118, 110];
        } else if (val.includes('Shipped')) {
          data.cell.styles.textColor = [29, 78, 216];
        }
      }
    },
    margin: { left: 14, right: 14 },
    didDrawPage: data => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `DKT Ethiopia Supply Chain Portal · Date Format: ${dateFormat}`,
        14,
        doc.internal.pageSize.getHeight() - 7
      );
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth - 14,
        doc.internal.pageSize.getHeight() - 7,
        { align: 'right' }
      );
    }
  });

  doc.save(`DKT_Ethiopia_Shipment_Summary_${todayIso}.pdf`);
}
