import { formatCurrency } from '../lib/loanUtils';
import { Wallet, PiggyBank, Percent, X } from 'lucide-react';

interface AllTimeBreakdownItem {
  contractId: string;
  nickname: string;
  bankName: string;
  status: 'Active' | 'Closed' | 'Refinanced';
  totalPaid: number;
  principalPaid: number;
  interestPaid: number;
}

interface AllTimeOverviewProps {
  isOpen: boolean;
  onClose: () => void;
  allTimeTotalPaid: number;
  allTimePrincipalPaid: number;
  allTimeInterestPaid: number;
  allTimeBreakdown: AllTimeBreakdownItem[];
}

export default function AllTimeOverview({
  isOpen,
  onClose,
  allTimeTotalPaid,
  allTimePrincipalPaid,
  allTimeInterestPaid,
  allTimeBreakdown = []
}: AllTimeOverviewProps) {
  if (!isOpen) return null;
  
  const renderStatusBadge = (status: 'Active' | 'Closed' | 'Refinanced') => {
    switch (status) {
      case 'Closed':
        return (
          <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" title="ปิดบัญชีแล้ว" />
        );
      case 'Refinanced':
        return (
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="รีไฟแนนซ์" />
        );
      default:
        return (
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="ใช้งานปกติ" />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex justify-center p-4 backdrop-blur-xs">
      <div className="relative bg-[#fbfbfa] border border-[#c0b298] w-full max-w-4xl p-6 md:p-8 shadow-xl rounded-sm my-auto">
        
        {/* Retro Corner decorations */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#7d6840]" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#7d6840]" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#7d6840]" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#7d6840]" />

        {/* Modal Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#c0b298]/40 mb-6 gap-4">
          <div className="space-y-1.5 flex-1">
            <h2 className="text-lg font-bold text-[#4a3e26] font-sans">
              สรุปการเงินและการจ่ายสะสมทั้งหมด (ทุกสถานะสัญญา)
            </h2>
            <p className="text-xs text-[#70644e]">
              ภาพรวมจำนวนเงินสะสมที่ได้ชำระไปแล้วสำหรับสินเชื่อทุกบัญชี เพื่อดูค่าใช้จ่ายจริงรวม
            </p>
            {/* Status Legend */}
            <div className="flex flex-wrap items-center gap-3.5 text-[10px] text-[#70644e] pt-1">
              <span className="font-semibold text-[#4a3e26]">คำอธิบายสีจุดสถานะ:</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> ใช้งานปกติ (Active)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> รีไฟแนนซ์ (Refinanced)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> ปิดบัญชีแล้ว (Closed)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm text-[#7d6840] hover:bg-[#e6e4d5] transition-colors cursor-pointer self-start md:self-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          {/* Card 1: Total All-Time Payments */}
          <div className="bg-[#fbfbfa] border border-[#c0b298] border-l-4 border-l-[#9a7e4b] p-4.5 shadow-none rounded-xs flex flex-col justify-between relative transition-all duration-200">
            <div className="flex items-center gap-1.5 text-[#70644e]">
              <Wallet className="w-3.5 h-3.5 text-[#9a7e4b] shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider">ยอดจ่ายรวมทั้งหมด</span>
            </div>
            <div className="mt-2.5">
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl font-black text-[#4a3e26] tracking-tight font-sans">
                  {formatCurrency(allTimeTotalPaid)}
                </span>
                <span className="text-xs font-medium text-[#70644e] ml-1">บาท</span>
              </div>

              {allTimeBreakdown && allTimeBreakdown.length > 0 ? (
                <div className="pt-2.5 border-t border-[#e6e4d5] space-y-2 text-[11px] text-[#70644e]">
                  {allTimeBreakdown.map((p, idx) => (
                    <div key={p.contractId || idx} className="flex items-center justify-between gap-1.5 w-full min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="truncate font-sans font-medium text-[#4a3e26]" title={p.nickname}>
                          {p.nickname}
                        </span>
                        {renderStatusBadge(p.status)}
                      </div>
                      <span className="font-mono font-bold text-[#9a7e4b] shrink-0">
                        {formatCurrency(p.totalPaid)} บ.
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pt-2 border-t border-[#e6e4d5] text-xs text-gray-400 italic text-center py-2">
                  ยังไม่มีการบันทึกยอดชำระ
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Total Principal Paid */}
          <div className="bg-[#fbfbfa] border border-[#c0b298] border-l-4 border-l-emerald-700 p-4.5 shadow-none rounded-xs flex flex-col justify-between relative transition-all duration-200">
            <div className="flex items-center gap-1.5 text-[#70644e]">
              <PiggyBank className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider">ยอดตัดเงินต้นรวม</span>
            </div>
            <div className="mt-2.5">
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl font-black text-[#4a3e26] tracking-tight font-sans">
                  {formatCurrency(allTimePrincipalPaid)}
                </span>
                <span className="text-xs font-medium text-[#70644e] ml-1">บาท</span>
              </div>

              {allTimeBreakdown && allTimeBreakdown.length > 0 ? (
                <div className="pt-2.5 border-t border-[#e6e4d5] space-y-2 text-[11px] text-[#70644e]">
                  {allTimeBreakdown.map((p, idx) => (
                    <div key={p.contractId || idx} className="flex items-center justify-between gap-1.5 w-full min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="truncate font-sans font-medium text-[#4a3e26]" title={p.nickname}>
                          {p.nickname}
                        </span>
                        {renderStatusBadge(p.status)}
                      </div>
                      <span className="font-mono font-bold text-emerald-700 shrink-0">
                        {formatCurrency(p.principalPaid)} บ.
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pt-2 border-t border-[#e6e4d5] text-xs text-gray-400 italic text-center py-2">
                  ยังไม่มีการบันทึกยอดชำระ
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Total Interest Paid */}
          <div className="bg-[#fbfbfa] border border-[#c0b298] border-l-4 border-l-rose-700 p-4.5 shadow-none rounded-xs flex flex-col justify-between relative transition-all duration-200">
            <div className="flex items-center gap-1.5 text-[#70644e]">
              <Percent className="w-3.5 h-3.5 text-rose-700 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider">ยอดดอกเบี้ยจ่ายรวม</span>
            </div>
            <div className="mt-2.5">
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl font-black text-[#4a3e26] tracking-tight font-sans">
                  {formatCurrency(allTimeInterestPaid)}
                </span>
                <span className="text-xs font-medium text-[#70644e] ml-1">บาท</span>
              </div>

              {allTimeBreakdown && allTimeBreakdown.length > 0 ? (
                <div className="pt-2.5 border-t border-[#e6e4d5] space-y-2 text-[11px] text-[#70644e]">
                  {allTimeBreakdown.map((p, idx) => (
                    <div key={p.contractId || idx} className="flex items-center justify-between gap-1.5 w-full min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="truncate font-sans font-medium text-[#4a3e26]" title={p.nickname}>
                          {p.nickname}
                        </span>
                        {renderStatusBadge(p.status)}
                      </div>
                      <span className="font-mono font-bold text-rose-700 shrink-0">
                        {formatCurrency(p.interestPaid)} บ.
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pt-2 border-t border-[#e6e4d5] text-xs text-gray-400 italic text-center py-2">
                  ยังไม่มีการบันทึกยอดชำระ
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-4 border-t border-[#c0b298]/30 mt-6">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-[#c0b298] text-[#7d6840] hover:bg-[#e6e4d5] font-semibold text-xs rounded-sm transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
