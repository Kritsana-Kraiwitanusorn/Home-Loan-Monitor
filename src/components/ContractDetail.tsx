import React, { useState, useRef } from 'react';
import { LoanContract, PaymentRecord, AmortizationRow } from '../types';
import {
  formatCurrency,
  formatThaiDate,
  exportAmortizationToCSV,
  exportPaymentsToCSV,
  generateAmortizationSchedule
} from '../lib/loanUtils';
import {
  ArrowLeft,
  Settings,
  Plus,
  Download,
  Upload,
  Calendar,
  Landmark,
  BadgePercent,
  TrendingDown,
  Trash2,
  Edit3,
  CircleAlert,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

interface ContractDetailProps {
  contract: LoanContract;
  payments: PaymentRecord[];
  onBack: () => void;
  onEditContract: () => void;
  onRecordPayment: (installmentIndex?: number) => void;
  onEditPayment: (payment: PaymentRecord) => void;
  onDeletePayment: (paymentId: string) => Promise<void>;
  onImportPayments: (paymentsData: Array<Omit<PaymentRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
}

export default function ContractDetail({
  contract,
  payments,
  onBack,
  onEditContract,
  onRecordPayment,
  onEditPayment,
  onDeletePayment,
  onImportPayments
}: ContractDetailProps) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'payments' | 'chart' | 'rates' | 'import'>('schedule');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [schedulePage, setSchedulePage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate full schedule dynamically
  const schedule = generateAmortizationSchedule(contract, payments);

  // Find payments specifically for this contract
  const contractPayments = payments
    .filter(p => p.contractId === contract.id)
    .sort((a, b) => a.installmentIndex - b.installmentIndex);

  const ITEMS_PER_PAGE = 12;

  // Paginate schedule
  const totalSchedulePages = Math.ceil(schedule.length / ITEMS_PER_PAGE);
  const paginatedSchedule = schedule.slice(
    (schedulePage - 1) * ITEMS_PER_PAGE,
    schedulePage * ITEMS_PER_PAGE
  );

  // Paginate payments
  const totalPaymentsPages = Math.ceil(contractPayments.length / ITEMS_PER_PAGE);
  const paginatedPayments = contractPayments.slice(
    (paymentsPage - 1) * ITEMS_PER_PAGE,
    paymentsPage * ITEMS_PER_PAGE
  );

  // Reusable pagination control renderer
  const renderPagination = (
    currentPage: number,
    totalPages: number,
    onPageChange: (p: number) => void
  ) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#e6e4d5] mt-4 text-xs text-[#70644e]">
        <div>
          แสดงหน้า <strong>{currentPage}</strong> จาก <strong>{totalPages}</strong> (หน้าละ {ITEMS_PER_PAGE} รายการ)
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-1.5 bg-white border border-[#c0b298] hover:bg-[#f4f3ea] disabled:opacity-40 disabled:hover:bg-white rounded-sm transition-colors cursor-pointer"
            title="หน้าแรก"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 bg-white border border-[#c0b298] hover:bg-[#f4f3ea] disabled:opacity-40 disabled:hover:bg-white rounded-sm transition-colors cursor-pointer"
            title="หน้าก่อนหน้า"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <select
            value={currentPage}
            onChange={(e) => onPageChange(Number(e.target.value))}
            className="bg-white border border-[#c0b298] px-2 py-1 rounded-sm focus:outline-hidden font-mono cursor-pointer"
          >
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <option key={p} value={p}>
                หน้า {p}
              </option>
            ))}
          </select>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 bg-white border border-[#c0b298] hover:bg-[#f4f3ea] disabled:opacity-40 disabled:hover:bg-white rounded-sm transition-colors cursor-pointer"
            title="หน้าถัดไป"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 bg-white border border-[#c0b298] hover:bg-[#f4f3ea] disabled:opacity-40 disabled:hover:bg-white rounded-sm transition-colors cursor-pointer"
            title="หน้าสุดท้าย"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  // Metrics specifically for this contract
  const firstUnpaid = schedule.find(row => !row.isPaid);
  const remainingBalance = firstUnpaid ? firstUnpaid.beginningBalance : 0;
  const originalAmount = contract.loanAmount;
  const totalPaidAmount = schedule.filter(row => row.isPaid).reduce((sum, row) => sum + row.scheduledAmount + row.extraAmount, 0);
  const totalExtraPaidAmount = contractPayments.reduce((sum, p) => sum + p.extraAmount, 0);
  const totalInterestPaidAmount = schedule.filter(row => row.isPaid).reduce((sum, row) => sum + row.interestPortion, 0);
  const totalPrincipalPaidAmount = schedule.filter(row => row.isPaid).reduce((sum, row) => sum + row.principalPortion, 0);
  const percentPaid = Math.min(100, Math.round(((originalAmount - remainingBalance) / originalAmount) * 100));

  // Amortization Schedule CSV download
  const handleDownloadSchedule = () => {
    const csvContent = exportAmortizationToCSV(schedule, contract.nickname);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ตารางผ่อนชำระ_${contract.nickname}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Payments History CSV download
  const handleDownloadPayments = () => {
    const csvContent = exportPaymentsToCSV(contractPayments, [contract]);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ประวัติการจ่ายเงิน_${contract.nickname}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Import handling
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) throw new Error('ไม่สามารถอ่านข้อมูลในไฟล์ได้');

        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length <= 1) throw new Error('ไฟล์ว่างเปล่าหรือไม่มีข้อมูลคอลัมน์');

        // Check if the file is the header row
        // Basic parser for simple CSV
        const parsedPayments: Array<Omit<PaymentRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> = [];
        
        // Skip header lines
        let headerIndex = 0;
        // Search for line containing standard headers or start from 0 if not found
        for (let i = 0; i < Math.min(5, lines.length); i++) {
          if (lines[i].includes('งวดที่') || lines[i].includes('paymentDate') || lines[i].includes('installment') || lines[i].includes('วันที่จ่ายจริง')) {
            headerIndex = i;
            break;
          }
        }

        for (let i = headerIndex + 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => {
            // strip double quotes
            return c.replace(/^["']|["']$/g, '').trim();
          });

          if (cols.length < 3) continue;

          // Expect mapping based on columns:
          // Format 1 (our exported payments): ContractName, InstallmentIndex, PaymentDate, ScheduledPaid, ExtraPaid, TotalPaid, Note
          // Format 2: InstallmentIndex, PaymentDate, ScheduledPaid, ExtraPaid, Note
          
          let instIdx = 1;
          let payDate = new Date().toISOString().split('T')[0];
          let schedPaid = contract.monthlyInstallment;
          let extraPaid = 0;
          let noteStr = '';

          if (lines[headerIndex].includes('สัญญา') || cols.length >= 6) {
            // Our standard export format: Contract, Installment, Date, Scheduled, Extra, Total, Note
            instIdx = parseInt(cols[1], 10);
            payDate = cols[2];
            schedPaid = parseFloat(cols[3]);
            extraPaid = parseFloat(cols[4]);
            noteStr = cols[6] || '';
          } else {
            // Simplified format: Installment, Date, Scheduled, Extra, Note
            instIdx = parseInt(cols[0], 10);
            payDate = cols[1];
            schedPaid = parseFloat(cols[2]);
            extraPaid = parseFloat(cols[3]);
            noteStr = cols[4] || '';
          }

          if (isNaN(instIdx) || isNaN(schedPaid) || isNaN(extraPaid) || !payDate) {
            continue; // skip malformed row
          }

          parsedPayments.push({
            contractId: contract.id,
            installmentIndex: instIdx,
            paymentDate: payDate,
            scheduledAmount: schedPaid,
            extraAmount: extraPaid,
            totalPaid: schedPaid + extraPaid,
            note: noteStr || ''
          });
        }

        if (parsedPayments.length === 0) {
          throw new Error('ไม่พบรายการจ่ายเงินที่ถูกต้องในไฟล์ CSV');
        }

        await onImportPayments(parsedPayments);
        setImportSuccess(`นำเข้าข้อมูลการจ่ายเงินเรียบร้อยแล้ว จำนวน ${parsedPayments.length} รายการ`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: any) {
        console.error(err);
        setImportError(err.message || 'เกิดข้อผิดพลาดในการนำเข้าไฟล์ CSV กรุณาตรวจสอบรูปแบบหัวตารางและข้อมูล');
      }
    };
    reader.readAsText(file);
  };

  // Prepare downsampled balance data for custom SVG line chart
  const getChartPoints = (targetSchedule: AmortizationRow[]) => {
    // We downsample to maximum 40 points to draw a beautiful neat curve
    const list = [
      { label: 'เริ่มต้น', val: contract.loanAmount, index: 0 },
      ...targetSchedule.map((row) => ({
        label: `งวด ${row.installmentIndex}`,
        val: row.endingBalance,
        index: row.installmentIndex
      }))
    ];

    const maxPoints = 40;
    if (list.length <= maxPoints) return list;

    const sampled: typeof list = [];
    const step = Math.floor(list.length / maxPoints);
    for (let i = 0; i < list.length; i += step) {
      sampled.push(list[i]);
    }
    // ensure last is included
    if (sampled[sampled.length - 1].index !== list[list.length - 1].index) {
      sampled.push(list[list.length - 1]);
    }
    return sampled;
  };

  const normalSchedule = generateAmortizationSchedule(contract, []);
  const chartPointsNormal = getChartPoints(normalSchedule);
  const chartPointsActual = getChartPoints(schedule);
  const maxBalance = contract.loanAmount;
  const maxInstallmentIndex = Math.max(normalSchedule.length, schedule.length) || 1;

  // Render beautiful line graph using inline SVG
  const renderSVGChart = () => {
    const width = 650;
    const height = 280;
    const paddingLeft = 88; // Increased from 70 to provide plenty of space for Y-axis labels and make it look perfectly balanced
    const paddingRight = 35; // Adjusted slightly for balance
    const paddingTop = 30;
    const paddingBottom = 45;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    // Map point to coordinates
    const coordsNormal = chartPointsNormal.map((pt) => {
      const x = paddingLeft + (pt.index / maxInstallmentIndex) * chartW;
      const y = paddingTop + chartH - (pt.val / maxBalance) * chartH;
      return { x, y, ...pt };
    });

    const coordsActual = chartPointsActual.map((pt) => {
      const x = paddingLeft + (pt.index / maxInstallmentIndex) * chartW;
      const y = paddingTop + chartH - (pt.val / maxBalance) * chartH;
      return { x, y, ...pt };
    });

    // Create SVG path string
    let pathNormalD = '';
    if (coordsNormal.length > 0) {
      pathNormalD = `M ${coordsNormal[0].x} ${coordsNormal[0].y} ` + coordsNormal.slice(1).map(c => `L ${c.x} ${c.y}`).join(' ');
    }

    let pathActualD = '';
    let fillActualD = '';
    if (coordsActual.length > 0) {
      pathActualD = `M ${coordsActual[0].x} ${coordsActual[0].y} ` + coordsActual.slice(1).map(c => `L ${c.x} ${c.y}`).join(' ');
      fillActualD = `${pathActualD} L ${coordsActual[coordsActual.length - 1].x} ${paddingTop + chartH} L ${coordsActual[0].x} ${paddingTop + chartH} Z`;
    }

    // Y Axis labels (e.g. 100%, 75%, 50%, 25%, 0%)
    const yTicks = [1, 0.75, 0.5, 0.25, 0];

    // Dynamic X Axis ticks with rounded year/installment steps for balanced spacing
    const getXTicks = (maxIdx: number) => {
      let step = 12; // default is 1 year (12 installments)
      if (maxIdx <= 12) {
        step = 2; // every 2 months
      } else if (maxIdx <= 24) {
        step = 4; // every 4 months
      } else if (maxIdx <= 60) {
        step = 12; // every 12 months (1 year)
      } else if (maxIdx <= 120) {
        step = 24; // every 24 months (2 years)
      } else if (maxIdx <= 240) {
        step = 48; // every 48 months (4 years)
      } else {
        step = 60; // every 60 months (5 years)
      }

      const ticks: number[] = [];
      for (let i = 0; i < maxIdx; i += step) {
        ticks.push(i);
      }
      
      if (ticks.length > 0) {
        const last = ticks[ticks.length - 1];
        if (maxIdx - last >= step / 2) {
          ticks.push(maxIdx);
        } else {
          ticks[ticks.length - 1] = maxIdx;
        }
      } else {
        ticks.push(0);
        ticks.push(maxIdx);
      }
      return ticks;
    };

    const xTicks = getXTicks(maxInstallmentIndex);

    return (
      <div className="w-full bg-[#fbfbfa] border border-[#c0b298] p-5 rounded-sm">
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[550px] h-auto">
            {/* Gradients definitions */}
            <defs>
              <linearGradient id="actualGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7d6840" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#7d6840" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {yTicks.map((pct, idx) => {
              const y = paddingTop + chartH - pct * chartH;
              const valueLabel = formatCurrency(Math.round(pct * maxBalance));
              return (
                <g key={`y-${idx}`} className="opacity-35">
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="#c0b298"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={paddingLeft - 10}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[9px] fill-[#70644e] font-mono font-medium"
                  >
                    {valueLabel} บ.
                  </text>
                </g>
              );
            })}

            {/* Vertical Grid lines & X Axis Labels */}
            {xTicks.map((val, idx) => {
              const x = paddingLeft + (val / maxInstallmentIndex) * chartW;
              return (
                <g key={`x-${idx}`} className="opacity-30">
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={paddingTop + chartH}
                    stroke="#c0b298"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <text
                    x={x}
                    y={paddingTop + chartH + 16}
                    textAnchor="middle"
                    className="text-[9px] fill-[#70644e] font-sans font-semibold"
                  >
                    {val === 0 ? 'เริ่มต้น' : `งวดที่ ${val}`}
                  </text>
                </g>
              );
            })}

            {/* Chart Fill for Actual (Area underneath actual line) */}
            {fillActualD && (
              <path
                d={fillActualD}
                fill="url(#actualGrad)"
              />
            )}

            {/* Normal/Theoretical Plan Line (Dashed) */}
            {pathNormalD && (
              <path
                d={pathNormalD}
                fill="none"
                stroke="#9ca3af"
                strokeWidth="1.75"
                strokeDasharray="4 4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Actual Chart Line */}
            {pathActualD && (
              <path
                d={pathActualD}
                fill="none"
                stroke="#7d6840"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Interactive Dot details for Actual with Clean Paint Order Outlines */}
            {coordsActual.map((c, i) => {
              // Plot only some points to not overcrowd (e.g., start, end, and quarterly points)
              const shouldLabel = i === 0 || i === coordsActual.length - 1 || i === Math.floor(coordsActual.length / 2) || i === Math.floor(coordsActual.length / 4) || i === Math.floor(3 * coordsActual.length / 4);
              if (!shouldLabel) return null;
              return (
                <g key={`dot-${i}`} className="group cursor-pointer">
                  {/* Outer glow aura on hover */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="8"
                    className="fill-[#7d6840]/10 stroke-none group-hover:scale-125 transition-transform"
                  />
                  {/* Core dot */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="4.5"
                    className="fill-[#7d6840] stroke-white stroke-2 hover:fill-[#4a3e26]"
                  />
                  {/* Balance label above dot with halo outline to be perfectly legible */}
                  <text
                    x={c.x}
                    y={c.y - 10}
                    textAnchor="middle"
                    className="text-[10px] fill-[#4a3e26] font-bold font-mono"
                    stroke="#fbfbfa"
                    strokeWidth="3.5"
                    paintOrder="stroke"
                  >
                    {formatCurrency(c.val)}
                  </text>
                  {/* Exact month tag above the balance with same halo trick */}
                  <text
                    x={c.x}
                    y={c.y - 22}
                    textAnchor="middle"
                    className="text-[8px] fill-[#7d6840] font-sans font-medium uppercase tracking-wide"
                    stroke="#fbfbfa"
                    strokeWidth="3"
                    paintOrder="stroke"
                  >
                    {c.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Beautiful, responsive, and clear legend section in HTML */}
        <div className="mt-4 pt-4 border-t border-[#e6e4d5] flex flex-col md:flex-row items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-7 h-0 border-t border-dashed border-[#9ca3af] border-[2px] shrink-0" />
            <span className="text-gray-500 font-medium font-sans">
              แผนผ่อนชำระธนาคารปกติ (ตามขั้นต่ำของสัญญาหลัก)
            </span>
          </div>
          <div className="hidden md:block text-[#c0b298] font-bold">·</div>
          <div className="flex items-center gap-2">
            <span className="w-7 h-0.5 bg-[#7d6840] shrink-0" />
            <span className="text-[#4a3e26] font-bold font-sans">
              ยอดชำระสะสมจริง + คาดการณ์ในอนาคต (รวมยอดที่โปะเพิ่มแล้ว)
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Detail Header Action Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#7d6840] hover:text-[#5d4d2e] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปหน้าแรก</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onRecordPayment(firstUnpaid?.installmentIndex || 1)}
            className="flex items-center gap-1.5 bg-[#7d6840] hover:bg-[#685533] text-white text-xs font-semibold px-4 py-2 shadow-xs rounded-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>บันทึกการชำระเงินงวดใหม่</span>
          </button>
          
          <button
            onClick={onEditContract}
            className="flex items-center gap-1.5 border border-[#c0b298] text-[#70644e] hover:bg-[#e8ebe0] text-xs font-semibold px-4 py-2 rounded-sm transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>แก้ไขสัญญา</span>
          </button>
        </div>
      </div>

      {/* Contract Core Info Cards Box */}
      <div className="relative bg-[#fbfbfa] border border-[#c0b298] p-5 md:p-6 shadow-sm rounded-sm">
        {/* Retro style corners */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-[#7d6840]" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-[#7d6840]" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-[#7d6840]" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-[#7d6840]" />

        {/* Retro Ink Stamp [%ผ่อนแล้ว] overlapping the top-right corner */}
        <div className="absolute -top-4 -right-4 w-[76px] h-[76px] rounded-full border-2 border-dashed border-[#7d6840] bg-[#fbfbfa] shadow-md flex flex-col items-center justify-center -rotate-12 z-10 transition-transform hover:scale-105">
          <div className="absolute inset-0.5 rounded-full border border-double border-[#7d6840]/35" />
          <div className="text-center">
            <div className="text-[17px] font-mono font-black text-[#7d6840] tracking-tighter leading-none">
              {percentPaid}%
            </div>
            <div className="text-[8px] text-[#7d6840] font-sans font-extrabold uppercase tracking-wider mt-0.5 leading-none">
              ผ่อนแล้ว
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 justify-between lg:items-center">
          <div className="space-y-1.5 pr-8">
            <div className="flex items-center gap-2 text-[#7d6840] text-xs font-medium">
              <Landmark className="w-4 h-4" />
              <span>{contract.bankName}</span>
              <span className="text-gray-300">|</span>
              <span>เริ่มผ่อน {formatThaiDate(contract.startDate)}</span>
              <span className="text-gray-300">|</span>
              <span className="bg-[#ebdcb2]/30 px-1.5 py-0.5 rounded-sm">
                {contract.interestCalcMethod === 'daily_365' 
                  ? 'คำนวณรายวัน (365 วัน)' 
                  : contract.interestCalcMethod === 'daily_actual'
                    ? 'คำนวณรายวัน (ปีจริง 365/366)'
                    : contract.interestCalcMethod === 'yearly'
                      ? 'คำนวณรายปี'
                      : 'คำนวณรายเดือน (1/12)'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl md:text-2xl font-bold text-[#4a3e26] font-sans">
                {contract.nickname}
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${
                contract.status === 'Closed' 
                  ? 'bg-gray-100 text-gray-700 border-gray-300' 
                  : contract.status === 'Refinanced' 
                    ? 'bg-[#FBF9EC] text-[#8c7a52] border-[#e4dcba]' 
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {contract.status === 'Closed' ? 'ปิดบัญชีแล้ว' : contract.status === 'Refinanced' ? 'รีไฟแนนซ์แล้ว (Refinanced)' : 'ใช้งานปกติ (Active)'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              ID สัญญา: <span className="font-mono">{contract.id}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#e8ebe0] p-4 border border-[#e6e4d5] rounded-sm flex-1 max-w-2xl">
            <div>
              <span className="text-[10px] text-[#7d6840] block uppercase font-medium">ยอดคงเหลือปัจจุบัน</span>
              <span className="text-sm font-bold text-[#4a3e26]">{formatCurrency(remainingBalance)} บาท</span>
            </div>
            <div>
              <span className="text-[10px] text-[#7d6840] block uppercase font-medium">ค่างวดปกติต่อเดือน</span>
              <span className="text-sm font-bold text-[#4a3e26]">{formatCurrency(contract.monthlyInstallment)} บาท</span>
            </div>
            <div>
              <span className="text-[10px] text-[#7d6840] block uppercase font-medium">ยอดโปะเพิ่มสะสม</span>
              <span className="text-sm font-bold text-emerald-800">{formatCurrency(totalExtraPaidAmount)} บาท</span>
            </div>
            <div>
              <span className="text-[10px] text-[#7d6840] block uppercase font-medium">เปอร์เซ็นต์ผ่อนแล้ว</span>
              <span className="text-sm font-bold text-[#4a3e26]">{percentPaid}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Detailed Statistics Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#fbfbfa] border border-[#c0b298] p-4 rounded-sm text-center">
          <span className="text-xs text-[#70644e] block">ยอดจ่ายรวมทั้งหมดไปแล้ว</span>
          <span className="text-lg font-bold text-[#4a3e26] font-mono mt-1 block">
            {formatCurrency(totalPaidAmount)} บาท
          </span>
        </div>
        <div className="bg-[#fbfbfa] border border-[#c0b298] p-4 rounded-sm text-center">
          <span className="text-xs text-[#70644e] block">เงินต้นที่ชำระไปแล้ว (Principal)</span>
          <span className="text-lg font-bold text-emerald-700 font-mono mt-1 block">
            {formatCurrency(totalPrincipalPaidAmount)} บาท
          </span>
        </div>
        <div className="bg-[#fbfbfa] border border-[#c0b298] p-4 rounded-sm text-center">
          <span className="text-xs text-[#70644e] block">ดอกเบี้ยที่สะสมไปแล้ว (Interest)</span>
          <span className="text-lg font-bold text-red-700 font-mono mt-1 block">
            {formatCurrency(totalInterestPaidAmount)} บาท
          </span>
        </div>
      </div>

      {/* Interactive Tabs */}
      <div className="border-b border-[#c0b298] overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'schedule'
                ? 'border-[#7d6840] text-[#7d6840]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            ตารางผ่อนชำระเต็มรูปแบบ ({schedule.length} งวด)
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'payments'
                ? 'border-[#7d6840] text-[#7d6840]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            ประวัติการชำระ ({contractPayments.length} รายการ)
          </button>
          <button
            onClick={() => setActiveTab('chart')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'chart'
                ? 'border-[#7d6840] text-[#7d6840]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            กราฟแนวโน้ม
          </button>
          <button
            onClick={() => setActiveTab('rates')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'rates'
                ? 'border-[#7d6840] text-[#7d6840]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            ประวัติดอกเบี้ย/ค่างวด ({contract.interestRates.length}/{contract.installmentSchedules?.length || 1})
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'border-[#7d6840] text-[#7d6840]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            นำเข้า / ส่งออก
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#4a3e26] uppercase tracking-wider">
              รายการแสดงงวดและสถานะคำนวณรายงวด
            </h3>
            <button
              onClick={handleDownloadSchedule}
              className="flex items-center gap-1 text-xs text-[#7d6840] hover:text-[#5d4d2e] font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ดาวน์โหลดตารางผ่อน (CSV)</span>
            </button>
          </div>

          {/* Schedule Table */}
          <div className="w-full overflow-x-auto bg-[#fbfbfa] border border-[#c0b298] rounded-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f4f3ea] border-b border-[#c0b298] text-[#7d6840] font-sans font-semibold">
                  <th className="p-3 border-r border-[#e6e4d5] text-center w-14">งวดที่</th>
                  <th className="p-3 border-r border-[#e6e4d5]">กำหนดชำระ</th>
                  <th className="p-3 border-r border-[#e6e4d5] text-center">ดบ. (%)</th>
                  <th className="p-3 border-r border-[#e6e4d5] text-right">ยอดเงินต้นคงเหลือยกมา</th>
                  <th className="p-3 border-r border-[#e6e4d5] text-right">ยอดค่างวดปกติ</th>
                  <th className="p-3 border-r border-[#e6e4d5] text-right text-emerald-800 bg-emerald-50/20">ยอดโปะเพิ่ม</th>
                  <th className="p-3 border-r border-[#e6e4d5] text-right">ตัดดอกเบี้ย</th>
                  <th className="p-3 border-r border-[#e6e4d5] text-right">ตัดเงินต้น</th>
                  <th className="p-3 border-r border-[#e6e4d5] text-right bg-amber-50/10 font-bold">ยอดเงินกู้คงเหลือ</th>
                  <th className="p-3 border-r border-[#e6e4d5] text-center w-24">สถานะ</th>
                  <th className="p-3 text-center w-24">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e4d5] text-[#4a3e26] font-mono">
                {paginatedSchedule.map((row) => {
                  let statusColor = 'text-gray-400 bg-gray-50 border border-gray-200';
                  let statusText = 'ยังไม่ถึง';

                  if (row.status === 'Paid') {
                    statusColor = 'text-emerald-700 bg-emerald-50 border border-emerald-100';
                    statusText = 'จ่ายแล้ว';
                  } else if (row.status === 'Overdue') {
                    statusColor = 'text-red-700 bg-red-50 border border-red-100 font-bold';
                    statusText = 'ค้างชำระ';
                  }

                  return (
                    <tr
                      key={row.installmentIndex}
                      className={`hover:bg-[#e1ebdb]/40 transition-colors ${
                        row.status === 'Paid' ? 'bg-emerald-50/5' : ''
                      }`}
                    >
                      <td className="p-2.5 border-r border-[#e6e4d5] text-center font-bold">
                        {row.installmentIndex}
                      </td>
                      <td className="p-2.5 border-r border-[#e6e4d5] font-sans">
                        {formatThaiDate(row.dueDate)}
                      </td>
                      <td className="p-2.5 border-r border-[#e6e4d5] text-center">
                        {row.interestRate.toFixed(2)}%
                      </td>
                      <td className="p-2.5 border-r border-[#e6e4d5] text-right">
                        {formatCurrency(row.beginningBalance)}
                      </td>
                      <td className="p-2.5 border-r border-[#e6e4d5] text-right">
                        {formatCurrency(row.scheduledAmount)}
                      </td>
                      <td className="p-2.5 border-r border-[#e6e4d5] text-right text-emerald-800 bg-emerald-50/10">
                        {row.extraAmount > 0 ? `+${formatCurrency(row.extraAmount)}` : '-'}
                      </td>
                      <td className="p-2.5 border-r border-[#e6e4d5] text-right text-red-700/80">
                        {formatCurrency(row.interestPortion)}
                      </td>
                      <td className="p-2.5 border-r border-[#e6e4d5] text-right text-emerald-700">
                        {formatCurrency(row.principalPortion)}
                      </td>
                      <td className="p-2.5 border-r border-[#e6e4d5] text-right bg-amber-50/10 font-bold font-sans">
                        {formatCurrency(row.endingBalance)}
                      </td>
                      <td className="p-2.5 border-r border-[#e6e4d5] text-center font-sans">
                        <span className={`px-1.5 py-0.5 rounded-sm text-[10px] ${statusColor}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="p-2 text-center font-sans">
                        {row.isPaid ? (
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Find associated payment record ID to delete */}
                            {(() => {
                              const pRec = contractPayments.find(p => p.installmentIndex === row.installmentIndex);
                              if (pRec) {
                                if (deletingPaymentId === pRec.id) {
                                  return (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={async () => {
                                          await onDeletePayment(pRec.id);
                                          setDeletingPaymentId(null);
                                        }}
                                        className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded-xs cursor-pointer hover:bg-red-700 transition-colors"
                                      >
                                        ยืนยัน
                                      </button>
                                      <button
                                        onClick={() => setDeletingPaymentId(null)}
                                        className="px-1.5 py-0.5 bg-gray-200 text-gray-700 text-[9px] font-bold rounded-xs cursor-pointer hover:bg-gray-300 transition-colors"
                                      >
                                        ยกเลิก
                                      </button>
                                    </div>
                                  );
                                }
                                return (
                                  <button
                                    onClick={() => {
                                      setDeletingPaymentId(pRec.id);
                                    }}
                                    className="text-gray-400 hover:text-red-600 p-1 rounded-sm hover:bg-red-50 transition-colors cursor-pointer"
                                    title="ลบบันทึก"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        ) : (
                          <button
                            onClick={() => onRecordPayment(row.installmentIndex)}
                            className="text-xs text-[#7d6840] hover:text-[#5d4d2e] underline font-medium cursor-pointer"
                          >
                            จ่าย
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {renderPagination(schedulePage, totalSchedulePages, setSchedulePage)}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#4a3e26] uppercase tracking-wider">
              ประวัติการชำระเงินจริงที่บันทึกแล้วของสัญญานี้
            </h3>
            <button
              onClick={() => onRecordPayment()}
              className="flex items-center gap-1.5 bg-[#7d6840] hover:bg-[#685533] text-white text-xs font-semibold px-3 py-1.5 shadow-xs rounded-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>บันทึกการชำระเงินงวดใหม่</span>
            </button>
          </div>

          <div className="relative bg-[#fbfbfa] border border-[#c0b298] p-5 shadow-sm rounded-sm">
            {contractPayments.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400 bg-gray-50 border border-dashed border-[#e6e4d5] rounded-sm">
                ยังไม่มีการบันทึกชำระเงินสำหรับสัญญานี้ กดปุ่ม บันทึกการชำระเงินงวดใหม่ เพื่อเริ่มบันทึก
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#e6e4d5] text-[#70644e] font-sans font-semibold">
                      <th className="py-2">งวดที่</th>
                      <th className="py-2">วันที่จ่ายจริง</th>
                      <th className="py-2 text-right">ยอดปกติที่จ่าย</th>
                      <th className="py-2 text-right text-emerald-800">ยอดโปะเพิ่ม</th>
                      <th className="py-2 text-right font-bold">ยอดจ่ายรวมทั้งหมด</th>
                      <th className="py-2 pl-4">หมายเหตุ</th>
                      <th className="py-2 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e6e4d5] text-[#4a3e26] font-mono">
                    {paginatedPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50">
                        <td className="py-2.5 font-bold">งวดที่ {p.installmentIndex}</td>
                        <td className="py-2.5 font-sans">{formatThaiDate(p.paymentDate)}</td>
                        <td className="py-2.5 text-right">{formatCurrency(p.scheduledAmount)} บาท</td>
                        <td className="py-2.5 text-right text-emerald-800 font-bold">
                          {p.extraAmount > 0 ? `+${formatCurrency(p.extraAmount)}` : '-'}
                        </td>
                        <td className="py-2.5 text-right font-bold font-sans">{formatCurrency(p.totalPaid)} บาท</td>
                        <td className="py-2.5 pl-4 font-sans text-gray-500 max-w-[180px] truncate" title={p.note}>
                          {p.note || '-'}
                        </td>
                        <td className="py-2 text-center">
                          {deletingPaymentId === p.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={async () => {
                                  await onDeletePayment(p.id);
                                  setDeletingPaymentId(null);
                                }}
                                className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-xs cursor-pointer hover:bg-red-700 transition-colors"
                              >
                                ยืนยัน
                              </button>
                              <button
                                onClick={() => setDeletingPaymentId(null)}
                                className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-bold rounded-xs cursor-pointer hover:bg-gray-300 transition-colors"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => onEditPayment(p)}
                                className="text-gray-400 hover:text-amber-700 p-1 rounded-sm hover:bg-amber-50 transition-colors cursor-pointer"
                                title="แก้ไขบันทึก"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setDeletingPaymentId(p.id);
                                }}
                                className="text-gray-400 hover:text-red-600 p-1 rounded-sm hover:bg-red-50 transition-colors cursor-pointer"
                                title="ลบบันทึก"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {renderPagination(paymentsPage, totalPaymentsPages, setPaymentsPage)}
          </div>
        </div>
      )}

      {activeTab === 'chart' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-[#7d6840]" />
            <h3 className="text-sm font-bold text-[#4a3e26] uppercase tracking-wider">
              แนวโน้มและประมาณการลดลงของเงินต้น
            </h3>
          </div>
          <p className="text-xs text-gray-500">
            * กราฟแสดงยอดเงินกู้คงเหลือในแต่ละช่วงปี (หรือเทียบเท่าทุกๆ 10-12 งวด) โดยจุดแสดงความชันของการตัดชำระจริง หากผู้ใช้ทำการชำระโปะยอดเพิ่มอย่างสม่ำเสมอ เส้นกราฟจะชันลงอย่างรวดเร็วและผ่อนหมดได้เร็วขึ้นกว่าตารางปกติของธนาคาร
          </p>

          {renderSVGChart()}
        </div>
      )}

      {activeTab === 'rates' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Interest Rates Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BadgePercent className="w-5 h-5 text-[#7d6840]" />
                <h3 className="text-sm font-bold text-[#4a3e26] uppercase tracking-wider">
                  ประวัติความเคลื่อนไหวของดอกเบี้ยต่อปี
                </h3>
              </div>
              <div className="bg-[#fbfbfa] border border-[#c0b298] p-4 rounded-sm min-h-[160px]">
                <div className="space-y-2">
                  {contract.interestRates.map((rateRow, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between border-b border-[#e6e4d5] last:border-0 pb-2 last:pb-0 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="font-sans">
                          มีผลตั้งแต่วันที่ <strong>{formatThaiDate(rateRow.effectiveDate)}</strong>
                        </span>
                      </div>
                      <div className="font-mono font-bold text-[#4a3e26]">
                        {rateRow.rate.toFixed(2)}% ต่อปี
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Installment Schedules Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#7d6840]" />
                <h3 className="text-sm font-bold text-[#4a3e26] uppercase tracking-wider">
                  ประวัติการปรับปรุงยอดค่างวดปกติรายเดือน
                </h3>
              </div>
              <div className="bg-[#fbfbfa] border border-[#c0b298] p-4 rounded-sm min-h-[160px]">
                <div className="space-y-2">
                  {contract.installmentSchedules && contract.installmentSchedules.length > 0 ? (
                    contract.installmentSchedules.map((instRow, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between border-b border-[#e6e4d5] last:border-0 pb-2 last:pb-0 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-sans">
                            มีผลตั้งแต่วันที่ <strong>{formatThaiDate(instRow.effectiveDate)}</strong>
                          </span>
                        </div>
                        <div className="font-mono font-bold text-[#4a3e26]">
                          {formatCurrency(instRow.amount)} บาท / เดือน
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-between border-b border-transparent pb-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="font-sans">
                          มีผลตั้งแต่วันเริ่มสัญญา <strong>{formatThaiDate(contract.startDate)}</strong>
                        </span>
                      </div>
                      <div className="font-mono font-bold text-[#4a3e26]">
                        {formatCurrency(contract.monthlyInstallment)} บาท / เดือน
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-[#e1ebdb] border border-[#e6e4d5] text-[11px] text-[#70644e] flex items-start gap-2 rounded-sm">
            <Info className="w-4 h-4 shrink-0 text-[#7d6840]" />
            <span>
              กรณีเข้าสู่ปีที่ 3 หรือระยะเวลาที่ยอดผ่อนชำระต่อเดือน/อัตราดอกเบี้ย MLR/MRR ปรับเพิ่มขึ้น สามารถระบุประวัติการเปลี่ยนยอดเหล่านี้ได้สะดวกรวดเร็วโดยการคลิกปุ่ม <strong>แก้ไขสัญญา</strong> ด้านบน เพื่อให้ตารางผ่อนชำระคำนวณและตัดลดเงินต้นได้อย่างเที่ยงตรงตามจริง
            </span>
          </div>
        </div>
      )}

      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Import Box */}
            <div className="bg-[#fbfbfa] border border-[#c0b298] p-6 rounded-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Upload className="w-5 h-5 text-[#7d6840]" />
                  <h4 className="text-sm font-bold text-[#4a3e26] uppercase tracking-wider">
                    นำเข้าประวัติการจ่ายเงิน (CSV)
                  </h4>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  นำเข้าไฟล์ประวัติการชำระเงินที่บันทึกไว้ภายนอก หรือนำเข้าเพื่อย้ายเครื่อง โดยใช้รูปแบบคอลัมน์มาตรฐาน:
                  <code className="block bg-gray-50 p-2 border border-gray-200 mt-2 rounded-xs font-mono text-[10px]">
                    งวดที่, วันที่จ่ายจริง(YYYY-MM-DD), ยอดงวดปกติ, ยอดโปะเพิ่ม, หมายเหตุ
                  </code>
                </p>

                {importError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-600 text-xs rounded-sm mb-3">
                    {importError}
                  </div>
                )}
                {importSuccess && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-sm mb-3">
                    {importSuccess}
                  </div>
                )}
              </div>

              <div>
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 bg-white border border-dashed border-[#c0b298] hover:border-[#7d6840] text-xs font-bold text-[#70644e] rounded-sm text-center transition-all cursor-pointer"
                >
                  เลือกไฟล์สำรองข้อมูล CSV เพื่อนำเข้า...
                </button>
              </div>
            </div>

            {/* Export Box */}
            <div className="bg-[#fbfbfa] border border-[#c0b298] p-6 rounded-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Download className="w-5 h-5 text-[#7d6840]" />
                  <h4 className="text-sm font-bold text-[#4a3e26] uppercase tracking-wider">
                    ส่งออกข้อมูลสัญญา (Export)
                  </h4>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  ดาวน์โหลดข้อมูลสัญญา ประวัติตาราง และข้อมูลการชำระเงินจริงของคุณทั้งหมดออกมาเป็นไฟล์ CSV เพื่อเก็บสำรองข้อมูล หรือใช้นำไปวิเคราะห์ต่อใน Microsoft Excel หรือ Google Sheets
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleDownloadSchedule}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-[#c0b298] hover:bg-[#e8ebe0] text-xs font-semibold text-[#70644e] rounded-sm transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>ส่งออกตารางผ่อนชำระ (Amortization Schedule)</span>
                </button>
                <button
                  onClick={handleDownloadPayments}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-[#c0b298] hover:bg-[#e8ebe0] text-xs font-semibold text-[#70644e] rounded-sm transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>ส่งออกประวัติจ่ายเงิน (Payment History)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
