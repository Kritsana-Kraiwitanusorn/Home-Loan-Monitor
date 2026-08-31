import React, { useState, useEffect } from 'react';
import { LoanContract, ResponsibleShare } from '../types';
import { formatCurrency, getContractResponsibleShares } from '../lib/loanUtils';
import { X, Plus, Trash2, Check, Sparkles, User, AlertCircle, RefreshCw, Landmark } from 'lucide-react';

interface ResponsibleSharesModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: LoanContract | null;
  currentExtraPayment?: number;
  onSave: (contractId: string, shares: ResponsibleShare[]) => Promise<void>;
}

export default function ResponsibleSharesModal({
  isOpen,
  onClose,
  contract,
  currentExtraPayment,
  onSave
}: ResponsibleSharesModalProps) {
  const [shares, setShares] = useState<ResponsibleShare[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Common suggestions
  const nameSuggestions = ['Best', 'Koy', 'ร่วมกัน'];

  const installment = contract?.monthlyInstallment || 0;
  const extra = currentExtraPayment !== undefined
    ? currentExtraPayment
    : (contract?.plannedExtraPayment || 0);
  const totalMonthly = installment + extra;

  useEffect(() => {
    if (contract && isOpen) {
      const initialShares = getContractResponsibleShares(contract, totalMonthly);
      setShares(initialShares);
    }
  }, [contract, isOpen, totalMonthly]);

  if (!isOpen || !contract) return null;

  const totalAllocated = shares.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const diff = totalMonthly - totalAllocated;

  const handleShareChange = (index: number, field: 'name' | 'amount', value: string | number) => {
    setShares((prev) => {
      const updated = [...prev];
      if (field === 'name') {
        updated[index] = { ...updated[index], name: String(value) };
      } else {
        const num = Math.max(0, Number(value) || 0);
        updated[index] = { ...updated[index], amount: num };
      }
      return updated;
    });
  };

  const handleAddPerson = () => {
    // Default name
    const existingNames = shares.map((s) => s.name.toLowerCase());
    let nextName = 'Koy';
    if (!existingNames.includes('best')) nextName = 'Best';
    else if (!existingNames.includes('koy')) nextName = 'Koy';
    else nextName = `ผู้รับผิดชอบ ${shares.length + 1}`;

    const remainingAmt = Math.max(0, diff);
    setShares((prev) => [...prev, { name: nextName, amount: remainingAmt }]);
  };

  const handleRemovePerson = (index: number) => {
    if (shares.length <= 1) return;
    setShares((prev) => prev.filter((_, i) => i !== index));
  };

  // Preset Handlers
  const applyPreset = (type: '50-50' | '100-best' | '100-koy' | '70-30' | '60-40') => {
    if (type === '50-50') {
      const half = Math.round(totalMonthly / 2);
      setShares([
        { name: 'Best', amount: half },
        { name: 'Koy', amount: totalMonthly - half }
      ]);
    } else if (type === '100-best') {
      setShares([{ name: 'Best', amount: totalMonthly }]);
    } else if (type === '100-koy') {
      setShares([{ name: 'Koy', amount: totalMonthly }]);
    } else if (type === '70-30') {
      const bestAmt = Math.round(totalMonthly * 0.7);
      setShares([
        { name: 'Best', amount: bestAmt },
        { name: 'Koy', amount: totalMonthly - bestAmt }
      ]);
    } else if (type === '60-40') {
      const bestAmt = Math.round(totalMonthly * 0.6);
      setShares([
        { name: 'Best', amount: bestAmt },
        { name: 'Koy', amount: totalMonthly - bestAmt }
      ]);
    }
  };

  const handleFillRemainder = (index: number) => {
    const othersSum = shares.reduce((sum, s, i) => (i === index ? sum : sum + (Number(s.amount) || 0)), 0);
    const needed = Math.max(0, totalMonthly - othersSum);
    handleShareChange(index, 'amount', needed);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (shares.length === 0) return;

    // Filter valid shares
    const validShares = shares.map((s) => ({
      name: s.name.trim() || 'ผู้รับผิดชอบ',
      amount: Math.max(0, Number(s.amount) || 0)
    }));

    setIsSaving(true);
    try {
      await onSave(contract.id, validShares);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#fbfbfa] border border-[#c0b298] shadow-2xl rounded-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#c0b298]/70 bg-[#f5f4ed] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#7d6840] text-white">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#4a3e26] font-serif">
                แยกผู้รับผิดชอบและกำหนดยอดจ่าย
              </h2>
              <p className="text-[11px] text-[#70644e] flex items-center gap-1.5 mt-0.5">
                <Landmark className="w-3.5 h-3.5" />
                <span>{contract.nickname} ({contract.bankName})</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#70644e] hover:text-[#4a3e26] hover:bg-[#e8ebe0] rounded-xl transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Monthly Payment Summary Bar */}
          <div className="bg-[#e8ebe0]/60 border border-[#c0b298]/60 p-4 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#70644e] font-medium">ค่างวดปกติตามสัญญา:</span>
              <span className="font-mono font-bold text-[#4a3e26]">{formatCurrency(installment)} บาท</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-teal-800 font-medium">+ ยอดโปะเพิ่มรายเดือน:</span>
              <span className="font-mono font-bold text-teal-800">+{formatCurrency(extra)} บาท</span>
            </div>
            <div className="pt-2 border-t border-[#c0b298]/40 flex justify-between items-center">
              <span className="text-xs font-bold text-[#4a3e26]">ภาระยอดจ่ายรวมที่ต้องจัดสรร:</span>
              <span className="text-base font-black font-mono text-amber-950">
                {formatCurrency(totalMonthly)} <span className="text-xs font-normal">บาท/เดือน</span>
              </span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#70644e] uppercase tracking-wider block">
              สัดส่วนด่วน (Quick Presets):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset('50-50')}
                className="px-2 py-1.5 text-[11px] font-medium bg-white hover:bg-amber-50 border border-[#c0b298] text-[#4a3e26] rounded-lg transition-all text-center cursor-pointer shadow-2xs hover:border-amber-600"
              >
                Best 50 / Koy 50
              </button>
              <button
                type="button"
                onClick={() => applyPreset('70-30')}
                className="px-2 py-1.5 text-[11px] font-medium bg-white hover:bg-amber-50 border border-[#c0b298] text-[#4a3e26] rounded-lg transition-all text-center cursor-pointer shadow-2xs hover:border-amber-600"
              >
                Best 70 / Koy 30
              </button>
              <button
                type="button"
                onClick={() => applyPreset('60-40')}
                className="px-2 py-1.5 text-[11px] font-medium bg-white hover:bg-amber-50 border border-[#c0b298] text-[#4a3e26] rounded-lg transition-all text-center cursor-pointer shadow-2xs hover:border-amber-600"
              >
                Best 60 / Koy 40
              </button>
              <button
                type="button"
                onClick={() => applyPreset('100-best')}
                className="px-2 py-1.5 text-[11px] font-medium bg-white hover:bg-amber-50 border border-[#c0b298] text-[#4a3e26] rounded-lg transition-all text-center cursor-pointer shadow-2xs hover:border-amber-600"
              >
                Best 100%
              </button>
              <button
                type="button"
                onClick={() => applyPreset('100-koy')}
                className="px-2 py-1.5 text-[11px] font-medium bg-white hover:bg-amber-50 border border-[#c0b298] text-[#4a3e26] rounded-lg transition-all text-center cursor-pointer shadow-2xs hover:border-amber-600 col-span-2 sm:col-span-1"
              >
                Koy 100%
              </button>
            </div>
          </div>

          {/* Individual Share Rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#70644e] uppercase tracking-wider">
                รายชื่อผู้รับผิดชอบ และยอดจ่ายของแต่ละคน:
              </label>
              <button
                type="button"
                onClick={handleAddPerson}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#7d6840] hover:text-[#52442a] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มคน</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {shares.map((share, index) => {
                const sharePercent = totalMonthly > 0
                  ? Math.round(((share.amount || 0) / totalMonthly) * 100)
                  : 0;

                return (
                  <div
                    key={index}
                    className="p-3 bg-white border border-[#c0b298] rounded-xl shadow-2xs space-y-2 transition-all hover:border-[#7d6840]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      {/* Name with quick suggestions */}
                      <div className="flex-1">
                        <span className="text-[10px] text-[#70644e] font-semibold block mb-0.5">
                          ชื่อผู้รับผิดชอบ {index + 1}:
                        </span>
                        <input
                          type="text"
                          required
                          value={share.name}
                          onChange={(e) => handleShareChange(index, 'name', e.target.value)}
                          placeholder="เช่น Best, Koy"
                          className="w-full bg-[#fbfbfa] border border-[#c0b298] px-3 py-1.5 text-xs font-bold text-[#4a3e26] rounded-lg outline-none focus:ring-2 focus:ring-amber-600"
                        />
                      </div>

                      {/* Amount Input */}
                      <div className="w-full sm:w-44">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[10px] text-[#70644e] font-semibold">ยอดจ่าย (บาท):</span>
                          <span className="text-[10px] font-mono font-bold text-amber-800">
                            {sharePercent}%
                          </span>
                        </div>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            required
                            min="0"
                            step="100"
                            value={share.amount}
                            onChange={(e) => handleShareChange(index, 'amount', e.target.value)}
                            placeholder="0"
                            className="w-full bg-[#fbfbfa] border border-[#c0b298] pl-2.5 pr-8 py-1.5 text-xs font-mono font-black text-[#4a3e26] text-right rounded-lg outline-none focus:ring-2 focus:ring-amber-600 shadow-2xs"
                          />
                          <span className="absolute right-2.5 text-[11px] text-[#70644e] font-medium pointer-events-none">
                            บ.
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 pt-1 sm:pt-4 justify-end">
                        <button
                          type="button"
                          onClick={() => handleFillRemainder(index)}
                          className="text-[10px] px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md transition-colors cursor-pointer"
                          title="ปรับยอดให้ลงตัวกับส่วนที่เหลือพอดี"
                        >
                          เติมส่วนต่าง
                        </button>
                        <button
                          type="button"
                          disabled={shares.length <= 1}
                          onClick={() => handleRemovePerson(index)}
                          className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-20 transition-colors cursor-pointer"
                          title="ลบแถวนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Name Chips */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-gray-400">เลือกด่วน:</span>
                      {nameSuggestions.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => handleShareChange(index, 'name', n)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                            share.name === n
                              ? 'bg-[#7d6840] text-white border-[#7d6840]'
                              : 'bg-[#f4f3ea] text-[#70644e] border-[#c0b298]/60 hover:bg-[#e8ebe0]'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Allocation Balance Indicator */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
              diff === 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : diff > 0
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {diff === 0 ? (
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <div>
                <div className="font-bold">
                  {diff === 0
                    ? 'ยอดจัดสรรตรงกับภาระรวมพอดี (100%)'
                    : diff > 0
                    ? `ยังขาดการจัดสรรอีก ${formatCurrency(diff)} บาท`
                    : `ยอดรวมที่ระบุเกินภาระ ${formatCurrency(Math.abs(diff))} บาท`}
                </div>
                <div className="text-[11px] opacity-80">
                  รวมยอดที่ระบุ: {formatCurrency(totalAllocated)} บ. / ภาระรวม: {formatCurrency(totalMonthly)} บ.
                </div>
              </div>
            </div>

            {diff > 0 && shares.length > 0 && (
              <button
                type="button"
                onClick={() => handleFillRemainder(shares.length - 1)}
                className="text-[11px] font-bold px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors cursor-pointer shrink-0"
              >
                จัดสรรให้ครบพอดี
              </button>
            )}
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-[#c0b298]/60 flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#c0b298] text-[#70644e] text-xs font-medium rounded-xl hover:bg-[#f4f3ea] transition-colors cursor-pointer text-center"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-[#7d6840] hover:bg-[#685533] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer text-center"
            >
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกสัดส่วนการชำระ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
