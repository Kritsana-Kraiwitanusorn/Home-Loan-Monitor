import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { PieChart } from 'lucide-react';
import { formatCurrency } from '../lib/loanUtils';

ChartJS.register(ArcElement, Tooltip, Legend);

export interface ContractDoughnutItem {
  contractId: string;
  nickname: string;
  bankName: string;
  status: 'Active' | 'Closed' | 'Refinanced';
  principalPaid: number;
  interestPaid: number;
  remainingBalance?: number;
}

interface DoughnutComparisonChartProps {
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  totalRemainingBalance: number;
  title?: string;
  subtitle?: string;
  contractItems?: ContractDoughnutItem[];
}

export default function DoughnutComparisonChart({
  totalPrincipalPaid,
  totalInterestPaid,
  totalRemainingBalance,
  title = 'สัดส่วนเงินต้นตัดแล้ว vs ดอกเบี้ยจ่ายรวม vs ยอดหนี้คงเหลือ',
  subtitle = 'วิเคราะห์โครงสร้างเงินกู้ทั้งหมดเพื่อติดตามการคืนทุน',
  contractItems = []
}: DoughnutComparisonChartProps) {
  const [statusFilter, setStatusFilter] = React.useState<'Active' | 'ALL' | 'Closed' | 'Refinanced'>('Active');

  // Filter contract items by status
  const filteredContractItems = contractItems.filter(c => {
    if (statusFilter === 'ALL') return true;
    return c.status === statusFilter;
  });

  // Calculate dynamic totals based on filter if contract items exist
  const displayPrincipalPaid = contractItems.length > 0
    ? filteredContractItems.reduce((sum, item) => sum + item.principalPaid, 0)
    : totalPrincipalPaid;

  const displayInterestPaid = contractItems.length > 0
    ? filteredContractItems.reduce((sum, item) => sum + item.interestPaid, 0)
    : totalInterestPaid;

  const displayRemainingBalance = contractItems.length > 0
    ? filteredContractItems.reduce((sum, item) => sum + (item.remainingBalance || 0), 0)
    : totalRemainingBalance;

  const grandTotal = displayPrincipalPaid + displayInterestPaid + displayRemainingBalance;

  const principalPercent = grandTotal > 0 ? Math.round((displayPrincipalPaid / grandTotal) * 100 * 10) / 10 : 0;
  const interestPercent = grandTotal > 0 ? Math.round((displayInterestPaid / grandTotal) * 100 * 10) / 10 : 0;
  const balancePercent = grandTotal > 0 ? Math.round((displayRemainingBalance / grandTotal) * 100 * 10) / 10 : 0;

  const data = {
    labels: ['เงินต้นที่ตัดไปแล้ว', 'ดอกเบี้ยสะสมจ่ายทิ้ง', 'เงินต้นคงเหลือ'],
    datasets: [
      {
        data: [displayPrincipalPaid, displayInterestPaid, displayRemainingBalance],
        backgroundColor: [
          '#10b981', // Emerald for principal paid
          '#be123c', // Rose/Burgundy for interest
          '#7d6840', // Earthy brown for remaining balance
        ],
        borderColor: '#fbfbfa',
        borderWidth: 2,
        hoverOffset: 6
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const val = context.raw || 0;
            const pct = grandTotal > 0 ? ((val / grandTotal) * 100).toFixed(1) : '0';
            return ` ${context.label}: ${formatCurrency(val)} บาท (${pct}%)`;
          }
        }
      }
    },
    cutout: '70%'
  };

  return (
    <div className="bg-[#fbfbfa] border border-[#c0b298]/80 p-6 rounded-2xl shadow-sm space-y-6">
      {/* Header with Status Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#e6e4d5] pb-3 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#ebdcb2]/50 rounded-xl text-[#7d6840]">
            <PieChart className="w-4 h-4 shrink-0" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#4a3e26]">{title}</h3>
            <p className="text-[11px] text-[#70644e]">{subtitle}</p>
          </div>
        </div>

        {/* Status Filter Pill Buttons */}
        {contractItems && contractItems.length > 0 && (
          <div className="flex items-center gap-1 bg-[#f4f3ea] p-1 border border-[#dcd7c5] rounded-xl text-xs font-semibold shrink-0">
            <button
              onClick={() => setStatusFilter('Active')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'Active'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-[#70644e] hover:text-[#4a3e26]'
              }`}
            >
              🟢 สัญญาปกติ ({contractItems.filter(c => c.status === 'Active').length})
            </button>

            <button
              onClick={() => setStatusFilter('Refinanced')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'Refinanced'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'text-[#70644e] hover:text-[#4a3e26]'
              }`}
            >
              🟡 รีไฟแนนซ์ ({contractItems.filter(c => c.status === 'Refinanced').length})
            </button>

            <button
              onClick={() => setStatusFilter('Closed')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'Closed'
                  ? 'bg-gray-700 text-white shadow-xs'
                  : 'text-[#70644e] hover:text-[#4a3e26]'
              }`}
            >
              ⚪ ปิดแล้ว ({contractItems.filter(c => c.status === 'Closed').length})
            </button>

            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-[#7d6840] text-white shadow-xs'
                  : 'text-[#70644e] hover:text-[#4a3e26]'
              }`}
            >
              🔵 ทั้งหมด ({contractItems.length})
            </button>
          </div>
        )}
      </div>

      {/* Main Overall Doughnut */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Doughnut Chart Canvas */}
        <div className="relative h-56 flex items-center justify-center">
          <Doughnut data={data} options={options} />
          {/* Centered Total Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[10px] text-[#70644e] uppercase font-semibold">รวมสัญญากลุ่มนี้</span>
            <span className="text-sm font-black text-[#4a3e26] font-mono">
              {formatCurrency(grandTotal)}
            </span>
            <span className="text-[10px] text-gray-500">บาท</span>
          </div>
        </div>

        {/* Structured Legend & Percentage Progress */}
        <div className="space-y-3 text-xs">
          {/* Item 1: Principal Paid */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block shrink-0" />
                <span className="font-semibold text-emerald-950">ยอดตัดเงินต้นรวม</span>
              </div>
              <span className="font-mono font-bold text-emerald-900">{formatCurrency(displayPrincipalPaid)} บ. ({principalPercent}%)</span>
            </div>
            <div className="w-full bg-emerald-200/60 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-600 h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, principalPercent)}%` }} />
            </div>
          </div>

          {/* Item 2: Interest Paid */}
          <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-700 inline-block shrink-0" />
                <span className="font-semibold text-rose-950">ยอดดอกเบี้ยจ่ายรวม</span>
              </div>
              <span className="font-mono font-bold text-rose-900">{formatCurrency(displayInterestPaid)} บ. ({interestPercent}%)</span>
            </div>
            <div className="w-full bg-rose-200/60 h-2 rounded-full overflow-hidden">
              <div className="bg-rose-700 h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, interestPercent)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Per-Contract Doughnut Breakdown Grid */}
      {filteredContractItems && filteredContractItems.length > 0 ? (
        <div className="pt-4 border-t border-[#e6e4d5] space-y-3">
          <h4 className="text-xs font-bold text-[#4a3e26] uppercase tracking-wider">
            สัดส่วนการชำระแยกตามสัญญา - สถานะ {statusFilter === 'Active' ? 'ใช้งานปกติ' : statusFilter === 'Refinanced' ? 'รีไฟแนนซ์' : statusFilter === 'Closed' ? 'ปิดบัญชี' : 'ทั้งหมด'} ({filteredContractItems.length} สัญญา)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredContractItems.map((c) => {
              const cPaidTotal = c.principalPaid + c.interestPaid + (c.remainingBalance || 0);
              const cPrinPct = cPaidTotal > 0 ? Math.round((c.principalPaid / cPaidTotal) * 100 * 10) / 10 : 0;
              const cIntPct = cPaidTotal > 0 ? Math.round((c.interestPaid / cPaidTotal) * 100 * 10) / 10 : 0;
              const cBalPct = cPaidTotal > 0 ? Math.round(((c.remainingBalance || 0) / cPaidTotal) * 100 * 10) / 10 : 0;

              const cData = {
                labels: ['ตัดเงินต้น', 'ดอกเบี้ยสะสม', 'เงินต้นคงเหลือ'],
                datasets: [
                  {
                    data: [c.principalPaid, c.interestPaid, c.remainingBalance || 0],
                    backgroundColor: ['#10b981', '#be123c', '#7d6840'],
                    borderColor: '#ffffff',
                    borderWidth: 2
                  }
                ]
              };

              const cOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: true } },
                cutout: '65%'
              };

              return (
                <div key={c.contractId} className="p-3.5 bg-white border border-[#e6e4d5] rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-[#f0eee4] pb-2">
                    <div>
                      <div className="font-bold text-xs text-[#4a3e26]">{c.nickname}</div>
                      <div className="text-[10px] text-gray-500">{c.bankName}</div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      c.status === 'Active' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      c.status === 'Closed' ? 'bg-gray-100 text-gray-600 border border-gray-200' :
                      'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {c.status === 'Active' ? 'ใช้งานปกติ' : c.status === 'Closed' ? 'ปิดบัญชี' : 'รีไฟแนนซ์'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 relative shrink-0">
                      <Doughnut data={cData} options={cOptions} />
                    </div>
                    <div className="flex-1 space-y-1.5 text-[11px]">
                      <div className="flex justify-between items-center text-emerald-800">
                        <span>เงินต้นที่ตัดแล้ว:</span>
                        <span className="font-mono font-bold">{formatCurrency(c.principalPaid)} ({cPrinPct}%)</span>
                      </div>
                      <div className="flex justify-between items-center text-rose-800">
                        <span>ดอกเบี้ยสะสม:</span>
                        <span className="font-mono font-bold">{formatCurrency(c.interestPaid)} ({cIntPct}%)</span>
                      </div>
                      {(c.remainingBalance || 0) > 0 && (
                        <div className="flex justify-between items-center text-[#7d6840]">
                          <span>เงินต้นคงเหลือ:</span>
                          <span className="font-mono font-bold">{formatCurrency(c.remainingBalance || 0)} ({cBalPct}%)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : contractItems && contractItems.length > 0 ? (
        <div className="pt-4 border-t border-[#e6e4d5] text-center py-6 text-xs text-[#70644e]">
          ไม่พบสัญญาที่มีสถานะ "{statusFilter === 'Active' ? 'ใช้งานปกติ' : statusFilter === 'Refinanced' ? 'รีไฟแนนซ์' : 'ปิดบัญชี'}" ในระบบ
        </div>
      ) : null}
    </div>
  );
}
