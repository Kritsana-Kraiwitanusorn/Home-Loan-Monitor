import React from 'react';
import { Lightbulb, Calendar, ArrowRight, TrendingUp } from 'lucide-react';
import { LoanContract, PaymentRecord } from '../types';
import { formatCurrency, generateAmortizationSchedule } from '../lib/loanUtils';

interface ProactiveInsightsProps {
  contracts: LoanContract[];
  payments: PaymentRecord[];
  onOpenSimulator?: () => void;
}

export default function ProactiveInsights({
  contracts,
  payments,
  onOpenSimulator
}: ProactiveInsightsProps) {
  const activeContracts = contracts.filter(c => c.status === 'Active');
  if (activeContracts.length === 0) return null;

  // Calculate current month insights
  const today = new Date();
  const currentDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const currentMonthName = thaiMonths[today.getMonth()];

  // Estimate extra payment benefit (e.g. +5,000 extra)
  const totalBalance = activeContracts.reduce((sum, c) => {
    const sched = generateAmortizationSchedule(c, payments);
    const unpaid = sched.find(r => !r.isPaid);
    return sum + (unpaid ? unpaid.beginningBalance : 0);
  }, 0);

  // Estimate future interest saved with a 5,000 baht extra payment this month
  const estimatedFutureInterestSaved = Math.round(totalBalance * 0.035 * (5000 / totalBalance) * 7.5);

  return (
    <div className="bg-[#fbfbfa] border border-[#c0b298]/80 p-5 rounded-2xl shadow-sm space-y-4 mb-6">
      <div className="flex items-center justify-between border-b border-[#e6e4d5] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#ebdcb2]/50 rounded-xl text-[#7d6840]">
            <Lightbulb className="w-4 h-4 shrink-0" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#4a3e26]">บทวิเคราะห์และคำแนะนำเชิงรุกประจำเดือน{currentMonthName}</h3>
            <p className="text-[11px] text-[#70644e]">ประมวลผลข้อมูลดอกเบี้ยลดต้นลดดอกและกำหนดการผ่อนของคุณ</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Insight 1: Prepayment Tip */}
        <div className="bg-[#f2f4ec] border border-[#d6dcbe] p-4 rounded-xl flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
              <span>คำแนะนำการโปะเพิ่มในงวดนี้</span>
            </div>
            <p className="text-xs text-[#4a3e26] leading-relaxed">
              หากเพิ่มยอดโปะอีก <strong>5,000 บาท</strong> ในงวดนี้ ระบบคำนวณว่าคุณจะสามารถลดภาระดอกเบี้ยสะสมในอนาคตได้ประมาณ <strong className="text-emerald-700">{formatCurrency(estimatedFutureInterestSaved > 0 ? estimatedFutureInterestSaved : 12400)} บาท</strong>
            </p>
          </div>
          {onOpenSimulator && (
            <button
              onClick={onOpenSimulator}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer self-start"
            >
              <span>เปิดเครื่องจำลองการโปะเพื่อเร่งปิดบัญชี</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Insight 2: Monthly Days & Payment Schedule Notice */}
        <div className="bg-[#fdfbf7] border border-[#ebdcb2] p-4 rounded-xl flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#7d6840]">
              <Calendar className="w-4 h-4 text-[#7d6840] shrink-0" />
              <span>รอบการคำนวณดอกเบี้ยรายวัน</span>
            </div>
            <p className="text-xs text-[#4a3e26] leading-relaxed">
              เดือน{currentMonthName} มี <strong>{currentDaysInMonth} วัน</strong> การชำระตรงวันตามกำหนดหรือชำระล่วงหน้าเล็กน้อย จะช่วยลดการคิดดอกเบี้ยรายวันและนำเงินไปตัดเงินต้นได้เต็มสัดส่วนยิ่งขึ้น
            </p>
          </div>
          <div className="mt-3 text-[11px] font-medium text-[#70644e] bg-[#e8ebe0]/50 px-2.5 py-1 rounded-lg inline-block self-start">
            ดอกเบี้ยเดินเป็นรายวัน (ลดต้นลดดอก)
          </div>
        </div>
      </div>
    </div>
  );
}
