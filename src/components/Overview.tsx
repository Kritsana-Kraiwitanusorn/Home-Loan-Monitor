import { formatCurrency } from '../lib/loanUtils';
import { DollarSign, PiggyBank, CalendarRange } from 'lucide-react';

interface OverviewProps {
  totalBalance: number;
  totalExtraPaid: number;
  nextInstallmentText: string;
  nextInstallmentDateStr: string;
  nextInstallmentAmount: number;
  allNextPayments?: {
    contractId: string;
    nickname: string;
    bankName: string;
    dueDate: string;
    amount: number;
  }[];
  balancesBreakdown?: {
    contractId: string;
    nickname: string;
    bankName: string;
    balance: number;
  }[];
  extraPaidBreakdown?: {
    contractId: string;
    nickname: string;
    bankName: string;
    extraAmount: number;
  }[];
}

export default function Overview({
  totalBalance,
  totalExtraPaid,
  allNextPayments = [],
  balancesBreakdown = [],
  extraPaidBreakdown = []
}: OverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Metric 1: Total Remaining Balance */}
      <div className="bg-[#fbfbfa] border border-[#c0b298] border-l-4 border-l-emerald-600 p-4 shadow-none rounded-xs flex flex-col justify-between relative transition-all duration-200">
        <div className="flex items-center gap-1.5 text-[#70644e]">
          <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider">ยอดคงเหลือรวมทุกสัญญา</span>
        </div>
        <div className="mt-2.5">
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-2xl font-black text-[#4a3e26] tracking-tight">
              {formatCurrency(totalBalance)}
            </span>
            <span className="text-xs font-medium text-[#70644e] ml-1">บาท</span>
          </div>

          {balancesBreakdown && balancesBreakdown.length > 0 && (
            <div className="pt-1.5 border-t border-[#e6e4d5] space-y-1 text-[10px] text-[#70644e]">
              {balancesBreakdown.map((p, idx) => (
                <div key={p.contractId || idx} className="flex items-center justify-between gap-1.5 w-full min-w-0">
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <span className="truncate font-sans font-medium text-[#4a3e26]" title={p.nickname}>
                      {p.nickname}
                    </span>
                    <span className="text-gray-400 font-sans text-[9px] shrink-0">
                      ({p.bankName.replace('ธนาคาร', '')})
                    </span>
                  </div>
                  <span className="font-mono font-bold text-[#4a3e26] shrink-0">
                    {formatCurrency(p.balance)} บ.
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metric 2: Accumulated Extra Payment */}
      <div className="bg-[#fbfbfa] border border-[#c0b298] border-l-4 border-l-teal-700 p-4 shadow-none rounded-xs flex flex-col justify-between relative transition-all duration-200">
        <div className="flex items-center gap-1.5 text-[#70644e]">
          <PiggyBank className="w-3.5 h-3.5 text-teal-700 shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider">ยอดโปะเพิ่มสะสม</span>
        </div>
        <div className="mt-2.5">
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-2xl font-black text-[#4a3e26] tracking-tight">
              {formatCurrency(totalExtraPaid)}
            </span>
            <span className="text-xs font-medium text-[#70644e] ml-1">บาท</span>
          </div>

          {extraPaidBreakdown && extraPaidBreakdown.length > 0 && (
            <div className="pt-1.5 border-t border-[#e6e4d5] space-y-1 text-[10px] text-[#70644e]">
              {extraPaidBreakdown.map((p, idx) => (
                <div key={p.contractId || idx} className="flex items-center justify-between gap-1.5 w-full min-w-0">
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <span className="truncate font-sans font-medium text-[#4a3e26]" title={p.nickname}>
                      {p.nickname}
                    </span>
                    <span className="text-gray-400 font-sans text-[9px] shrink-0">
                      ({p.bankName.replace('ธนาคาร', '')})
                    </span>
                  </div>
                  <span className="font-mono font-bold text-teal-700 shrink-0">
                    {p.extraAmount > 0 ? `+${formatCurrency(p.extraAmount)} บ.` : '0 บ.'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metric 3: Next Due Installment (All Contracts) */}
      <div className="bg-[#fbfbfa] border border-[#c0b298] border-l-4 border-l-[#b48d56] p-4 shadow-none rounded-xs flex flex-col justify-between relative transition-all duration-200">
        <div className="flex items-center gap-1.5 text-[#70644e]">
          <CalendarRange className="w-3.5 h-3.5 text-[#b48d56] shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider">ยอดจ่ายงวดถัดไป (รวมทุกสัญญา)</span>
        </div>
        <div className="mt-2.5">
          {allNextPayments && allNextPayments.length > 0 ? (
            <div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-black text-[#4a3e26] tracking-tight">
                  {formatCurrency(allNextPayments.reduce((sum, p) => sum + p.amount, 0))}
                </span>
                <span className="text-xs font-medium text-[#70644e] ml-1">บาท</span>
              </div>
              <div className="pt-1.5 border-t border-[#e6e4d5] space-y-1 text-[10px] text-[#70644e]">
                {allNextPayments.map((p, idx) => (
                  <div key={p.contractId || idx} className="flex items-center justify-between gap-1.5 w-full min-w-0">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <span className="truncate font-sans font-medium text-[#4a3e26]" title={p.nickname}>
                        {p.nickname}
                      </span>
                      <span className="text-gray-400 font-sans text-[9px] shrink-0">
                        ({p.bankName.replace('ธนาคาร', '')})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-[9px] text-[#70644e]">
                        ดิว {p.dueDate.substring(8, 10)}/{p.dueDate.substring(5, 7)}
                      </span>
                      <span className="font-mono font-bold text-[#4a3e26]">
                        {formatCurrency(p.amount)} บ.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <span className="text-[11px] font-semibold text-[#70644e] block py-1.5">
              ไม่มีค้างชำระ / ผ่อนหมดแล้วทุกสัญญา
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
