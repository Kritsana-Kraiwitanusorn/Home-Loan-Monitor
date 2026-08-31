import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, X, ChevronRight, DollarSign } from 'lucide-react';
import { LoanContract, PaymentRecord } from '../types';
import { formatCurrency, generateAmortizationSchedule } from '../lib/loanUtils';

interface RefinanceAnalysisSectionProps {
  isOpen: boolean;
  onClose: () => void;
  contracts: LoanContract[];
  payments: PaymentRecord[];
}

export default function RefinanceAnalysisSection({
  isOpen,
  onClose,
  contracts,
  payments
}: RefinanceAnalysisSectionProps) {
  const activeContracts = contracts.filter(c => c.status === 'Active');

  const [selectedContractId, setSelectedContractId] = useState<string>(
    activeContracts[0]?.id || ''
  );

  // Retention & Refinance rate settings
  const [retentionRate, setRetentionRate] = useState<number>(3.80);
  const [refinanceRate, setRefinanceRate] = useState<number>(2.90);

  // Refinance fee settings
  const [appraisalFee, setAppraisalFee] = useState<number>(3000);
  const [mortgageRegRate, setMortgageRegRate] = useState<number>(1.0); // 1%
  const [customMortgageFee, setCustomMortgageFee] = useState<number | null>(null);
  const [miscFee, setMiscFee] = useState<number>(1500);

  // Custom balance override per contract
  const [customBalanceMap, setCustomBalanceMap] = useState<Record<string, number>>({});

  if (!isOpen) return null;

  const targetContract = activeContracts.find(c => c.id === selectedContractId) || activeContracts[0];

  // Calculate default current balance for the selected contract
  let calculatedBalance = targetContract ? targetContract.loanAmount : 0;
  if (targetContract) {
    const sched = generateAmortizationSchedule(targetContract, payments);
    const unpaid = sched.find(r => !r.isPaid);
    if (unpaid) calculatedBalance = unpaid.beginningBalance;
  }

  const currentBalance = customBalanceMap[selectedContractId] !== undefined
    ? customBalanceMap[selectedContractId]
    : calculatedBalance;

  // 3-Year Calculations (36 Months)
  // Option 1: Retention
  const retentionMonthlyRate = retentionRate / 100 / 12;
  const retention3YearInterest = Math.round(currentBalance * retentionMonthlyRate * 36);
  const retentionTotalCost = retention3YearInterest; // 0 fee

  // Option 2: Refinance
  const refinanceMonthlyRate = refinanceRate / 100 / 12;
  const refinance3YearInterest = Math.round(currentBalance * refinanceMonthlyRate * 36);
  
  // Auto calculated mortgage fee based on selected rate percentage
  const autoMortgageFee = Math.round(currentBalance * (mortgageRegRate / 100));

  const mortgageRegFee = customMortgageFee !== null ? customMortgageFee : autoMortgageFee;
  const totalRefinanceFees = appraisalFee + mortgageRegFee + miscFee;
  const refinanceTotalCost = refinance3YearInterest + totalRefinanceFees;

  // Comparison outcomes
  const netSavings3Years = retentionTotalCost - refinanceTotalCost;
  const monthlyInterestDiff = Math.max(1, Math.round((currentBalance * (retentionRate - refinanceRate) / 100) / 12));
  const breakEvenMonths = Math.ceil(totalRefinanceFees / monthlyInterestDiff);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex justify-center p-4 backdrop-blur-xs">
      <div className="relative bg-[#fbfbfa] border border-[#c0b298]/80 w-full max-w-4xl p-6 md:p-8 shadow-2xl rounded-2xl my-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#c0b298]/40 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-800">
                <RefreshCw className="w-5 h-5 shrink-0" />
              </div>
              <h2 className="text-lg font-bold text-[#4a3e26] font-sans">
                วิเคราะห์รอบการรีไฟแนนซ์ (Refinance & Retention Analytics)
              </h2>
            </div>
            <p className="text-xs text-[#70644e]">
              เปรียบเทียบความคุ้มค่าระหว่างการขอลดดอกเบี้ยธนาคารเดิม (Retention) กับย้ายธนาคารใหม่ (Refinance) พร้อมหักต้นทุนค่าธรรมเนียมจริง
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7d6840] hover:bg-[#e6e4d5] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contract Selection & Inputs Bar */}
        <div className="bg-[#f5f4ed] p-5 border border-[#dcd7c5] rounded-2xl space-y-5 shadow-xs">
          {/* Section Header & Main Inputs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#c0b298]/40">
            <div className="space-y-1.5 max-w-xs sm:max-w-sm">
              <label className="text-xs font-bold text-[#4a3e26] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-700 inline-block shrink-0" />
                เลือกสัญญาที่ต้องการประเมิน
              </label>
              <select
                value={selectedContractId}
                onChange={(e) => setSelectedContractId(e.target.value)}
                className="w-full bg-white border border-[#c0b298] px-3.5 py-2 text-xs font-semibold text-[#4a3e26] rounded-xl focus:ring-2 focus:ring-amber-600 outline-none shadow-2xs cursor-pointer"
              >
                {activeContracts.map(c => (
                  <option key={c.id} value={c.id}>{c.nickname} - {c.bankName}</option>
                ))}
              </select>
            </div>

            <div className="text-left sm:text-right space-y-1 w-full sm:w-auto">
              <label className="text-xs font-bold text-[#70644e] block">
                ยอดเงินต้นคงเหลือประเมิน (บาท):
              </label>
              <div className="flex items-center gap-1.5 justify-start sm:justify-end">
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={currentBalance}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value));
                    setCustomBalanceMap(prev => ({ ...prev, [selectedContractId]: val }));
                  }}
                  className="text-lg md:text-xl font-black text-[#4a3e26] font-mono bg-white border border-[#c0b298] px-3 py-1 rounded-xl text-left sm:text-right w-full sm:w-44 shadow-2xs focus:ring-2 focus:ring-amber-600 outline-none transition-all"
                />
                <span className="text-xs font-bold text-[#70644e] shrink-0">บาท</span>
              </div>
              {customBalanceMap[selectedContractId] !== undefined && customBalanceMap[selectedContractId] !== calculatedBalance && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomBalanceMap(prev => {
                      const next = { ...prev };
                      delete next[selectedContractId];
                      return next;
                    });
                  }}
                  className="text-[10px] text-amber-800 hover:underline block sm:ml-auto cursor-pointer font-medium"
                >
                  ↺ รีเซ็ตเป็นยอดตามระบบ ({formatCurrency(calculatedBalance)} บ.)
                </button>
              )}
            </div>
          </div>

          {/* Rates & Fee Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Input 1: Retention Rate */}
            <div className="bg-white/80 p-3 rounded-xl border border-[#c0b298]/50 space-y-1.5">
              <label className="block text-[11px] font-bold text-[#7d6840]">
                ดอกเบี้ย Retention (%)
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="0.05"
                  value={retentionRate}
                  onChange={(e) => setRetentionRate(Number(e.target.value))}
                  className="w-full bg-white border border-[#c0b298] pl-3 pr-8 py-1.5 text-xs font-mono font-bold text-[#4a3e26] rounded-lg outline-none focus:ring-2 focus:ring-amber-600"
                />
                <span className="absolute right-2.5 text-xs text-[#70644e] font-mono">%</span>
              </div>
              <span className="text-[10px] text-[#8c7b5f] block">ธนาคารเดิม (ไม่มีค่าธรรมเนียม)</span>
            </div>

            {/* Input 2: Refinance Rate */}
            <div className="bg-teal-50/40 p-3 rounded-xl border border-teal-200/80 space-y-1.5">
              <label className="block text-[11px] font-bold text-teal-900">
                ดอกเบี้ย Refinance (%)
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="0.05"
                  value={refinanceRate}
                  onChange={(e) => setRefinanceRate(Number(e.target.value))}
                  className="w-full bg-white border border-teal-300 pl-3 pr-8 py-1.5 text-xs font-mono font-bold text-teal-950 rounded-lg outline-none focus:ring-2 focus:ring-teal-600"
                />
                <span className="absolute right-2.5 text-xs text-teal-700 font-mono">%</span>
              </div>
              <span className="text-[10px] text-teal-700 block">ธนาคารใหม่ (เฉลี่ย 3 ปี)</span>
            </div>

            {/* Input 3: Appraisal & Misc Fee */}
            <div className="bg-white/80 p-3 rounded-xl border border-[#c0b298]/50 space-y-1.5">
              <label className="block text-[11px] font-bold text-[#70644e]">
                ค่าประเมิน + ค่าธรรมเนียม
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  value={appraisalFee + miscFee}
                  onChange={(e) => {
                    const total = Number(e.target.value);
                    setAppraisalFee(Math.max(0, total - miscFee));
                  }}
                  className="w-full bg-white border border-[#c0b298] pl-3 pr-8 py-1.5 text-xs font-mono text-[#4a3e26] rounded-lg outline-none focus:ring-2 focus:ring-amber-600"
                />
                <span className="absolute right-2.5 text-xs text-[#70644e]">บ.</span>
              </div>
              <span className="text-[10px] text-[#8c7b5f] block">ประเมิน ~3,000 + อื่นๆ</span>
            </div>

            {/* Input 4: Mortgage Registration Fee */}
            <div className="bg-white/80 p-3 rounded-xl border border-[#c0b298]/50 space-y-1.5">
              <label className="block text-[11px] font-bold text-[#70644e]">
                ค่าจดจำนอง (บาท)
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="0"
                  value={mortgageRegFee}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value));
                    setCustomMortgageFee(val);
                  }}
                  className="w-full bg-white border border-[#c0b298] pl-3 pr-8 py-1.5 text-xs font-mono font-bold text-[#4a3e26] rounded-lg outline-none focus:ring-2 focus:ring-amber-600 shadow-2xs"
                />
                <span className="absolute right-2.5 text-xs text-[#70644e]">บ.</span>
              </div>

              {/* Quick Select Buttons below input */}
              <div className="grid grid-cols-3 gap-1 pt-0.5">
                {[
                  { label: '1% ปกติ', rate: 1.0 },
                  { label: '0.01% รัฐ', rate: 0.01 },
                  { label: '0.5% โปร', rate: 0.5 }
                ].map((opt) => {
                  const isSelected = mortgageRegRate === opt.rate && customMortgageFee === null;
                  return (
                    <button
                      key={opt.rate}
                      type="button"
                      onClick={() => {
                        setMortgageRegRate(opt.rate);
                        setCustomMortgageFee(null);
                      }}
                      className={`py-1 px-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer text-center ${
                        isSelected
                          ? 'bg-amber-700 text-white border-amber-800 shadow-2xs'
                          : 'bg-white text-[#4a3e26] border-[#c0b298]/60 hover:bg-amber-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {customMortgageFee !== null && customMortgageFee !== autoMortgageFee && (
                <button
                  type="button"
                  onClick={() => setCustomMortgageFee(null)}
                  className="text-[10px] text-amber-800 hover:underline block cursor-pointer font-medium mt-1"
                >
                  ↺ คำนวณออโต้ตามอัตราส่วน ({formatCurrency(autoMortgageFee)} บ.)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Options Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: Retention */}
          <div className={`p-5 rounded-xl space-y-3 transition-all ${
            netSavings3Years <= 0
              ? 'bg-emerald-50/90 border-2 border-emerald-500 shadow-md ring-1 ring-emerald-500/20'
              : 'bg-white border border-[#c0b298] shadow-xs'
          }`}>
            <div className="flex items-center justify-between border-b border-[#e6e4d5] pb-2">
              <div className="flex items-center gap-1.5">
                {netSavings3Years <= 0 && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                <h3 className={`font-bold text-sm ${netSavings3Years <= 0 ? 'text-emerald-950' : 'text-[#4a3e26]'}`}>
                  Option 1: ขอลดดอกเบี้ย (Retention)
                </h3>
              </div>
              <span className={`text-[10px] px-2.5 py-1 font-semibold rounded-lg ${
                netSavings3Years <= 0
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-[#e8ebe0] text-[#7d6840]'
              }`}>
                {netSavings3Years <= 0 ? '✓ คุ้มค่ากว่า (ธนาคารเดิม)' : 'ธนาคารเดิม'}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className={netSavings3Years <= 0 ? 'text-emerald-800' : 'text-[#70644e]'}>อัตราดอกเบี้ยเฉลี่ย (3 ปี):</span>
                <span className={`font-mono font-bold ${netSavings3Years <= 0 ? 'text-emerald-950' : 'text-[#4a3e26]'}`}>
                  {retentionRate.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className={netSavings3Years <= 0 ? 'text-emerald-800' : 'text-[#70644e]'}>ค่าธรรมเนียมแรกเข้า:</span>
                <span className="font-mono font-bold text-emerald-700">0 บาท</span>
              </div>
              <div className="flex justify-between border-t border-[#e6e4d5] pt-2 text-sm">
                <span className={`font-bold ${netSavings3Years <= 0 ? 'text-emerald-950' : 'text-[#4a3e26]'}`}>
                  ภาระรวม 3 ปี (ไม่มีค่าธรรมเนียม):
                </span>
                <span className={`font-mono font-bold ${netSavings3Years <= 0 ? 'text-emerald-900 text-base' : 'text-[#4a3e26]'}`}>
                  {formatCurrency(retention3YearInterest)} บ.
                </span>
              </div>
            </div>
          </div>

          {/* Option 2: Refinance */}
          <div className={`p-5 rounded-xl space-y-3 transition-all ${
            netSavings3Years > 0
              ? 'bg-emerald-50/90 border-2 border-emerald-500 shadow-md ring-1 ring-emerald-500/20'
              : 'bg-white border border-[#c0b298] shadow-xs'
          }`}>
            <div className="flex items-center justify-between border-b border-[#e6e4d5] pb-2">
              <div className="flex items-center gap-1.5">
                {netSavings3Years > 0 && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                <h3 className={`font-bold text-sm ${netSavings3Years > 0 ? 'text-emerald-950' : 'text-[#4a3e26]'}`}>
                  Option 2: รีไฟแนนซ์ (Refinance)
                </h3>
              </div>
              <span className={`text-[10px] px-2.5 py-1 font-semibold rounded-lg ${
                netSavings3Years > 0
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-[#e8ebe0] text-[#7d6840]'
              }`}>
                {netSavings3Years > 0 ? '✓ คุ้มค่ากว่า (ย้ายธนาคารใหม่)' : 'ย้ายธนาคารใหม่'}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className={netSavings3Years > 0 ? 'text-emerald-800' : 'text-[#70644e]'}>อัตราดอกเบี้ยเฉลี่ย (3 ปี):</span>
                <span className={`font-mono font-bold ${netSavings3Years > 0 ? 'text-emerald-950' : 'text-[#4a3e26]'}`}>
                  {refinanceRate.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className={netSavings3Years > 0 ? 'text-emerald-800' : 'text-[#70644e]'}>รวมค่าธรรมเนียมประเมิน/จดจำนอง:</span>
                <span className="font-mono font-bold text-rose-700">+{formatCurrency(totalRefinanceFees)} บาท</span>
              </div>
              <div className="flex justify-between border-t border-[#e6e4d5] pt-2 text-sm">
                <span className={`font-bold ${netSavings3Years > 0 ? 'text-emerald-950' : 'text-[#4a3e26]'}`}>
                  ภาระรวม 3 ปี (รวมค่าธรรมเนียม):
                </span>
                <span className={`font-mono font-bold ${netSavings3Years > 0 ? 'text-emerald-900 text-base' : 'text-[#4a3e26]'}`}>
                  {formatCurrency(refinanceTotalCost)} บ.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Verdict Box */}
        <div className="p-5 rounded-xl border border-emerald-300 bg-emerald-50/90 text-center space-y-2 shadow-xs">
          {netSavings3Years > 0 ? (
            <>
              <div className="text-base font-black text-emerald-900 font-sans flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>สรุป: การรีไฟแนนซ์ (Refinance) คุ้มค่ากว่า ประหยัดเงินได้สุทธิ {formatCurrency(netSavings3Years)} บาท ใน 3 ปี</span>
              </div>
              <p className="text-xs text-emerald-800">
                ระยะเวลาคุ้มทุน (Break-even Point) อยู่ที่ประมาณ <strong>{breakEvenMonths} เดือน</strong> (หลังจากนี้คือผลกำไรส่วนต่างดอกเบี้ยบริสุทธิ์)
              </p>
            </>
          ) : netSavings3Years < 0 ? (
            <>
              <div className="text-base font-black text-emerald-900 font-sans flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>สรุป: การขอลดดอกเบี้ย (Retention) คุ้มค่ากว่า ประหยัดเงินได้สุทธิ {formatCurrency(Math.abs(netSavings3Years))} บาท ใน 3 ปี</span>
              </div>
              <p className="text-xs text-emerald-800">
                เนื่องจากไม่ต้องเสียค่าธรรมเนียมประเมินและจดจำนองย้ายธนาคารใหม่ (+{formatCurrency(totalRefinanceFees)} บาท)
              </p>
            </>
          ) : (
            <div className="text-base font-black text-emerald-900 font-sans">
              สรุป: ทั้งสองทางเลือกมีภาระรวม 3 ปีเท่ากันที่ {formatCurrency(retentionTotalCost)} บาท
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-[#c0b298]/30">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#fbfbfa] border border-[#c0b298] text-[#7d6840] hover:bg-[#e6e4d5] font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
