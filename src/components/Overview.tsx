import { formatCurrency } from '../lib/loanUtils';
import { DollarSign, PiggyBank, CalendarRange, Percent, Clock, TrendingDown } from 'lucide-react';

interface OverviewProps {
  totalBalance: number;
  monthChangePercent?: number;
  totalExtraPaid: number;
  allTimePrincipalPaid?: number;
  allTimeInterestPaid?: number;
  interestPercentageOfHomeValue?: number;
  remainingYearsMonthsStr?: string;
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
  principalPaidBreakdown?: {
    contractId: string;
    nickname: string;
    bankName: string;
    principalPaid: number;
  }[];
  interestPaidBreakdown?: {
    contractId: string;
    nickname: string;
    bankName: string;
    interestPaid: number;
  }[];
}

export default function Overview({
  totalBalance,
  monthChangePercent = 0,
  totalExtraPaid,
  allTimePrincipalPaid = 0,
  allTimeInterestPaid = 0,
  interestPercentageOfHomeValue = 0,
  remainingYearsMonthsStr = '0 เดือน',
  allNextPayments = [],
  balancesBreakdown = [],
  extraPaidBreakdown = [],
  principalPaidBreakdown = [],
  interestPaidBreakdown = []
}: OverviewProps) {
  const totalNextPaymentAmount = allNextPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4 mb-6">
      {/* Top Grid: 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Remaining Balance */}
        <div className="bg-[#fbfbfa] border border-[#c0b298]/80 border-l-4 border-l-emerald-600 p-4 shadow-sm rounded-xl flex flex-col justify-between relative transition-all duration-200 hover:shadow-md">
          <div>
            <div className="flex items-center justify-between text-[#70644e]">
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider">เงินต้นคงเหลือรวม</span>
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-black text-[#4a3e26] tracking-tight">
                  {formatCurrency(totalBalance)}
                </span>
                <span className="text-xs font-medium text-[#70644e] ml-1">บาท</span>
              </div>
              
              {monthChangePercent > 0 ? (
                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg mb-2">
                  <TrendingDown className="w-3 h-3 shrink-0" />
                  <span>ลดลง {monthChangePercent}% จากเดือนที่แล้ว</span>
                </div>
              ) : (
                <div className="text-[11px] text-[#70644e] mb-2">
                  ผ่อนตรงตามกำหนดชำระ
                </div>
              )}

              {balancesBreakdown && balancesBreakdown.length > 0 && (
                <div className="pt-2 border-t border-[#e6e4d5] space-y-1 text-[10px] text-[#70644e]">
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
        </div>

        {/* Metric 2: Accumulated Principal Paid (รวมยอดชำระปกติและเงินโปะ) */}
        <div className="bg-[#fbfbfa] border border-[#c0b298]/80 border-l-4 border-l-teal-700 p-4 shadow-sm rounded-xl flex flex-col justify-between relative transition-all duration-200 hover:shadow-md">
          <div>
            <div className="flex items-center gap-1.5 text-[#70644e]">
              <PiggyBank className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider">ยอดตัดเงินต้นสะสม (รวมยอดโปะ)</span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-black text-[#4a3e26] tracking-tight">
                  {formatCurrency(allTimePrincipalPaid)}
                </span>
                <span className="text-xs font-medium text-[#70644e] ml-1">บาท</span>
              </div>

              <div className="text-[11px] text-teal-800 font-medium mb-2">
                {totalExtraPaid > 0 ? `(ในนี้เป็นยอดโปะเพิ่ม +${formatCurrency(totalExtraPaid)} บ.)` : 'ตัดเงินต้นออกจากภาระหนี้ทั้งหมด'}
              </div>

              {principalPaidBreakdown && principalPaidBreakdown.length > 0 ? (
                <div className="pt-2 border-t border-[#e6e4d5] space-y-1 text-[10px] text-[#70644e]">
                  {principalPaidBreakdown.map((p, idx) => (
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
                        {formatCurrency(p.principalPaid)} บ.
                      </span>
                    </div>
                  ))}
                </div>
              ) : extraPaidBreakdown && extraPaidBreakdown.length > 0 && (
                <div className="pt-2 border-t border-[#e6e4d5] space-y-1 text-[10px] text-[#70644e]">
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
        </div>

        {/* Metric 3: Accumulated Interest Paid */}
        <div className="bg-[#fbfbfa] border border-[#c0b298]/80 border-l-4 border-l-rose-700 p-4 shadow-sm rounded-xl flex flex-col justify-between relative transition-all duration-200 hover:shadow-md">
          <div>
            <div className="flex items-center gap-1.5 text-[#70644e]">
              <Percent className="w-3.5 h-3.5 text-rose-700 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider">ดอกเบี้ยสะสมที่จ่ายแล้ว</span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-black text-[#4a3e26] tracking-tight">
                  {formatCurrency(allTimeInterestPaid)}
                </span>
                <span className="text-xs font-medium text-[#70644e] ml-1">บาท</span>
              </div>

              {interestPercentageOfHomeValue > 0 ? (
                <div className="inline-block text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-lg mb-2">
                  จ่ายทิ้งสะสม {interestPercentageOfHomeValue}% ของมูลค่าบ้าน
                </div>
              ) : (
                <div className="text-[11px] text-[#70644e] mb-2">
                  ดอกเบี้ยสะสมจ่ายจริง
                </div>
              )}

              {interestPaidBreakdown && interestPaidBreakdown.length > 0 && (
                <div className="pt-2 border-t border-[#e6e4d5] space-y-1 text-[10px] text-[#70644e]">
                  {interestPaidBreakdown.map((p, idx) => (
                    <div key={p.contractId || idx} className="flex items-center justify-between gap-1.5 w-full min-w-0">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <span className="truncate font-sans font-medium text-[#4a3e26]" title={p.nickname}>
                          {p.nickname}
                        </span>
                        <span className="text-gray-400 font-sans text-[9px] shrink-0">
                          ({p.bankName.replace('ธนาคาร', '')})
                        </span>
                      </div>
                      <span className="font-mono font-bold text-rose-700 shrink-0">
                        {formatCurrency(p.interestPaid)} บ.
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Metric 4: Next Installment Due - All Contracts (SWAPPED HERE) */}
        <div className="bg-[#fbfbfa] border border-[#c0b298]/80 border-l-4 border-l-[#b48d56] p-4 shadow-sm rounded-xl flex flex-col justify-between relative transition-all duration-200 hover:shadow-md">
          <div>
            <div className="flex items-center gap-1.5 text-[#70644e]">
              <CalendarRange className="w-3.5 h-3.5 text-[#b48d56] shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider">ยอดจ่ายงวดถัดไป (รวมทุกสัญญา)</span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-black text-[#4a3e26] tracking-tight">
                  {formatCurrency(totalNextPaymentAmount)}
                </span>
                <span className="text-xs font-medium text-[#70644e] ml-1">บาท</span>
              </div>

              {allNextPayments && allNextPayments.length > 0 ? (
                <div className="pt-2 border-t border-[#e6e4d5] space-y-1 text-[10px] text-[#70644e]">
                  {allNextPayments.map((p, idx) => (
                    <div key={p.contractId || idx} className="flex items-center justify-between gap-1.5 w-full min-w-0">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <span className="truncate font-sans font-medium text-[#4a3e26]" title={p.nickname}>
                          {p.nickname}
                        </span>
                        <span className="text-gray-400 font-sans text-[9px] shrink-0">
                          (ดิว {p.dueDate.substring(8, 10)}/{p.dueDate.substring(5, 7)})
                        </span>
                      </div>
                      <span className="font-mono font-bold text-[#4a3e26] shrink-0">
                        {formatCurrency(p.amount)} บ.
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-[#70644e] py-1">
                  ไม่มียอดค้างชำระ / ผ่อนหมดแล้ว
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Remaining Duration Banner (MOVED TO BOTTOM ROW) */}
      <div className="bg-[#fbfbfa] border border-[#c0b298]/80 border-l-4 border-l-amber-700 p-4 shadow-sm rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg text-amber-800 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#70644e] uppercase tracking-wider">
              ระยะเวลาผ่อนคงเหลือ (สัญญานานที่สุด)
            </div>
            <div className="text-xl font-black text-[#4a3e26] font-sans">
              {remainingYearsMonthsStr}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200/80 rounded-lg text-amber-900 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-600" />
            <span>เป้าหมายผ่อนปิดบัญชี: 15-20 ปี</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-200/80 rounded-lg text-teal-900 font-medium">
            <span className="w-2 h-2 rounded-full bg-teal-600" />
            <span>การโปะเพิ่มสม่ำเสมอจะช่วยย่อระยะเวลานี้ลงอย่างมีประสิทธิภาพ</span>
          </div>
        </div>
      </div>
    </div>
  );
}
