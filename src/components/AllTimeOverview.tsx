import React from 'react';
import { formatCurrency } from '../lib/loanUtils';
import { Wallet, PiggyBank, Percent, X } from 'lucide-react';
import DoughnutComparisonChart, { ContractDoughnutItem } from './DoughnutComparisonChart';

interface AllTimeBreakdownItem {
  contractId: string;
  nickname: string;
  bankName: string;
  status: 'Active' | 'Closed' | 'Refinanced';
  totalPaid: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance?: number;
}

interface AllTimeOverviewProps {
  isOpen: boolean;
  onClose: () => void;
  allTimeTotalPaid: number;
  allTimePrincipalPaid: number;
  allTimeInterestPaid: number;
  totalRemainingBalance?: number;
  allTimeBreakdown: AllTimeBreakdownItem[];
}

export default function AllTimeOverview({
  isOpen,
  onClose,
  allTimeTotalPaid,
  allTimePrincipalPaid,
  allTimeInterestPaid,
  totalRemainingBalance = 0,
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

  // Prepare per-contract doughnut items
  const contractDoughnutItems: ContractDoughnutItem[] = allTimeBreakdown.map(item => ({
    contractId: item.contractId,
    nickname: item.nickname,
    bankName: item.bankName,
    status: item.status,
    principalPaid: item.principalPaid,
    interestPaid: item.interestPaid,
    remainingBalance: item.remainingBalance || 0
  }));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex justify-center p-4 backdrop-blur-xs">
      <div className="relative bg-[#fbfbfa] border border-[#c0b298]/80 w-full max-w-4xl p-6 md:p-8 shadow-2xl rounded-2xl my-auto space-y-6">
        
        {/* Modal Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#c0b298]/40 gap-4">
          <div className="space-y-1.5 flex-1">
            <h2 className="text-xl font-bold text-[#4a3e26] font-sans">
              สรุปการเงินและการจ่ายสะสมทั้งหมด (ทุกสถานะสัญญา)
            </h2>
            <p className="text-xs text-[#70644e]">
              ภาพรวมจำนวนเงินสะสมที่ได้ชำระไปแล้วสำหรับสินเชื่อทุกบัญชี พร้อมกราฟวิเคราะห์สัดส่วนเงินต้น vs ดอกเบี้ย
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
            className="p-1.5 rounded-xl text-[#7d6840] hover:bg-[#e6e4d5] transition-colors cursor-pointer self-start md:self-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - Top Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Total All-Time Payments */}
          <div className="bg-[#fbfbfa] border border-[#c0b298]/80 border-l-4 border-l-[#9a7e4b] p-4 shadow-sm rounded-xl flex flex-col justify-between relative transition-all duration-200">
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
          <div className="bg-[#fbfbfa] border border-[#c0b298]/80 border-l-4 border-l-emerald-700 p-4 shadow-sm rounded-xl flex flex-col justify-between relative transition-all duration-200">
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
          <div className="bg-[#fbfbfa] border border-[#c0b298]/80 border-l-4 border-l-rose-700 p-4 shadow-sm rounded-xl flex flex-col justify-between relative transition-all duration-200">
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

        {/* Requirement #4: Integrated Doughnut Comparison Chart for Overall + Every Single Contract */}
        <DoughnutComparisonChart
          totalPrincipalPaid={allTimePrincipalPaid}
          totalInterestPaid={allTimeInterestPaid}
          totalRemainingBalance={totalRemainingBalance}
          title="เปรียบเทียบสัดส่วนเงินต้น vs ดอกเบี้ยสะสม"
          subtitle="วิเคราะห์สัดส่วนเงินต้นตัดแล้วและดอกเบี้ยจ่ายจริงรวมทุกสัญญา และเปรียบเทียบรายสัญญา"
          contractItems={contractDoughnutItems}
        />

        {/* Modal Footer */}
        <div className="flex justify-end pt-4 border-t border-[#c0b298]/30">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#7d6840] hover:bg-[#685533] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
