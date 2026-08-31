import React, { useState } from 'react';
import { LoanContract, PaymentRecord } from '../types';
import { formatCurrency, generateAmortizationSchedule } from '../lib/loanUtils';
import { Users, UserCheck, Edit3, Check, DollarSign, ArrowUpRight, Percent, PiggyBank, Sparkles } from 'lucide-react';

interface ResponsibleSectionProps {
  contracts: LoanContract[];
  payments: PaymentRecord[];
  onUpdateContract: (contractId: string, updates: Partial<LoanContract>) => Promise<void>;
}

export default function ResponsibleSection({
  contracts,
  payments,
  onUpdateContract
}: ResponsibleSectionProps) {
  // Only show Active contracts as requested
  const activeContracts = contracts.filter((c) => c.status === 'Active' || !c.status);

  // Local state for editing rows to provide snappy feedback
  const [editingExtra, setEditingExtra] = useState<Record<string, number>>({});
  const [editingPerson, setEditingPerson] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Common quick-select payer presets
  const payerPresets = ['Best', 'Koy', 'Best & Koy', 'Best 70% / Koy 30%', 'Best 50% / Koy 50%'];

  if (activeContracts.length === 0) {
    return null;
  }

  // Calculate dynamic OS Balance and payment stats for each active contract
  const contractRows = activeContracts.map((contract) => {
    const schedule = generateAmortizationSchedule(contract, payments);
    const firstUnpaid = schedule.find((r) => !r.isPaid);
    const osBalance = firstUnpaid ? firstUnpaid.beginningBalance : 0;
    
    // Scheduled monthly installment
    const payment = contract.monthlyInstallment || 0;

    // Planned / actual extra payment
    const extraPayment = editingExtra[contract.id] !== undefined
      ? editingExtra[contract.id]
      : (contract.plannedExtraPayment ?? 0);

    // % Extra Payment compared to regular installment
    const percentExtra = payment > 0 ? Math.round((extraPayment / payment) * 100) : 0;

    // Total Payment = Payment + Extra Payment
    const total = payment + extraPayment;

    // Responsible Person
    const responsible = editingPerson[contract.id] !== undefined
      ? editingPerson[contract.id]
      : (contract.responsiblePerson || 'Best & Koy');

    return {
      contract,
      osBalance,
      payment,
      extraPayment,
      percentExtra,
      total,
      responsible
    };
  });

  // Calculate totals across all active contracts
  const totalOSBalance = contractRows.reduce((sum, r) => sum + r.osBalance, 0);
  const totalPayment = contractRows.reduce((sum, r) => sum + r.payment, 0);
  const totalExtraPayment = contractRows.reduce((sum, r) => sum + r.extraPayment, 0);
  const grandTotal = totalPayment + totalExtraPayment;
  const overallPercentExtra = totalPayment > 0 ? Math.round((totalExtraPayment / totalPayment) * 100) : 0;

  // Group summary by responsible person
  const personSummary: Record<string, { totalPayment: number; totalExtra: number; grandTotal: number; count: number }> = {};
  contractRows.forEach((r) => {
    const person = r.responsible.trim() || 'ไม่ได้ระบุ';
    if (!personSummary[person]) {
      personSummary[person] = { totalPayment: 0, totalExtra: 0, grandTotal: 0, count: 0 };
    }
    personSummary[person].totalPayment += r.payment;
    personSummary[person].totalExtra += r.extraPayment;
    personSummary[person].grandTotal += r.total;
    personSummary[person].count += 1;
  });

  const handleSaveContractField = async (contractId: string, extraVal: number, personVal: string) => {
    setSavingId(contractId);
    try {
      await onUpdateContract(contractId, {
        plannedExtraPayment: extraVal,
        responsiblePerson: personVal.trim() || 'Best & Koy'
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="bg-[#fbfbfa] border border-[#c0b298] p-5 md:p-6 shadow-sm rounded-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#c0b298]/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#7d6840]/10 text-[#7d6840] rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-lg md:text-xl font-bold text-[#4a3e26] font-sans">
              ผู้รับผิดชอบการชำระ (Responsible)
            </h2>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              เฉพาะสัญญา Active ({activeContracts.length})
            </span>
          </div>
          <p className="text-xs text-[#70644e] mt-1">
            กำหนดและสรุปข้อมูลสัดส่วนผู้รับผิดชอบค่างวด ยอดโปะเพิ่ม และภาระยอดจ่ายรวมรายเดือน
          </p>
        </div>

        {/* Grand Total Cash Outflow Badge */}
        <div className="flex items-center gap-2 bg-[#f4f3ea] border border-[#c0b298] px-4 py-2 rounded-xl shrink-0">
          <div className="text-right">
            <span className="text-[10px] font-bold text-[#70644e] uppercase block">รวมยอดจ่ายต่อเดือนทั้งหมด</span>
            <span className="text-lg font-black text-[#4a3e26] font-mono">
              {formatCurrency(grandTotal)} <span className="text-xs font-normal">บาท/เดือน</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Responsible Table */}
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b border-[#c0b298] text-[11px] font-bold text-[#70644e] uppercase tracking-wider bg-[#f4f3ea]/80">
              <th className="py-3 px-3.5 rounded-l-xl">สัญญา / ธนาคาร</th>
              <th className="py-3 px-3 text-right">OS Balance (คงเหลือ)</th>
              <th className="py-3 px-3 text-right">Payment (ค่างวด)</th>
              <th className="py-3 px-3 text-center min-w-[150px]">Extra Payment (ยอดโปะ)</th>
              <th className="py-3 px-3 text-center">% Extra</th>
              <th className="py-3 px-3 text-right font-black text-[#4a3e26]">Total (รวมจ่าย)</th>
              <th className="py-3 px-3.5 text-left min-w-[190px] rounded-r-xl">Responsible (ผู้รับผิดชอบ)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c0b298]/30 text-xs">
            {contractRows.map((row) => {
              const currentExtra = editingExtra[row.contract.id] !== undefined
                ? editingExtra[row.contract.id]
                : (row.contract.plannedExtraPayment ?? 0);

              const currentPerson = editingPerson[row.contract.id] !== undefined
                ? editingPerson[row.contract.id]
                : (row.contract.responsiblePerson || 'Best & Koy');

              const isSaving = savingId === row.contract.id;

              return (
                <tr key={row.contract.id} className="hover:bg-[#f7f6f0] transition-colors">
                  {/* Contract Name & Bank */}
                  <td className="py-3 px-3.5">
                    <div className="font-bold text-[#4a3e26]">{row.contract.nickname}</div>
                    <div className="text-[10px] text-[#70644e] font-sans flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                      {row.contract.bankName}
                    </div>
                  </td>

                  {/* OS Balance */}
                  <td className="py-3 px-3 text-right font-mono font-bold text-[#4a3e26]">
                    {formatCurrency(row.osBalance)} <span className="text-[10px] font-normal text-[#70644e]">บ.</span>
                  </td>

                  {/* Payment */}
                  <td className="py-3 px-3 text-right font-mono font-semibold text-[#4a3e26]">
                    {formatCurrency(row.payment)} <span className="text-[10px] font-normal text-[#70644e]">บ.</span>
                  </td>

                  {/* Extra Payment (Editable) */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5 justify-center">
                      <div className="relative w-28">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={currentExtra}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value));
                            setEditingExtra((prev) => ({ ...prev, [row.contract.id]: val }));
                          }}
                          onBlur={() => {
                            handleSaveContractField(row.contract.id, currentExtra, currentPerson);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveContractField(row.contract.id, currentExtra, currentPerson);
                            }
                          }}
                          className="w-full bg-white border border-[#c0b298] px-2.5 py-1 text-right text-xs font-mono font-bold text-teal-800 rounded-lg outline-none focus:ring-2 focus:ring-teal-600 shadow-2xs"
                        />
                        <span className="absolute left-2 top-1 text-[10px] text-teal-600 font-bold">+</span>
                      </div>
                      <span className="text-[10px] font-medium text-[#70644e]">บ.</span>
                    </div>
                  </td>

                  {/* % Extra Payment */}
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                        row.percentExtra > 50
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : row.percentExtra > 0
                          ? 'bg-teal-50 text-teal-800 border border-teal-200'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {row.percentExtra > 0 ? `+${row.percentExtra}%` : '0%'}
                    </span>
                  </td>

                  {/* Total Payment */}
                  <td className="py-3 px-3 text-right font-mono font-black text-sm text-[#4a3e26]">
                    {formatCurrency(row.total)} <span className="text-[10px] font-normal text-[#70644e]">บ.</span>
                  </td>

                  {/* Responsible Person (Editable & Presets) */}
                  <td className="py-3 px-3.5">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={currentPerson}
                          onChange={(e) => {
                            setEditingPerson((prev) => ({ ...prev, [row.contract.id]: e.target.value }));
                          }}
                          onBlur={() => {
                            handleSaveContractField(row.contract.id, currentExtra, currentPerson);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveContractField(row.contract.id, currentExtra, currentPerson);
                            }
                          }}
                          placeholder="เช่น Best, Koy"
                          className="w-full bg-white border border-[#c0b298] px-2.5 py-1 text-xs font-medium text-[#4a3e26] rounded-lg outline-none focus:ring-2 focus:ring-amber-600 shadow-2xs"
                        />
                        {isSaving && (
                          <span className="text-[10px] text-amber-700 animate-pulse shrink-0">บันทึก...</span>
                        )}
                      </div>

                      {/* Quick Payer Select Pills */}
                      <div className="flex flex-wrap gap-1">
                        {payerPresets.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setEditingPerson((prev) => ({ ...prev, [row.contract.id]: preset }));
                              handleSaveContractField(row.contract.id, currentExtra, preset);
                            }}
                            className={`text-[9px] px-1.5 py-0.5 rounded-md border transition-all cursor-pointer ${
                              currentPerson === preset
                                ? 'bg-[#7d6840] text-white border-[#7d6840]'
                                : 'bg-[#f4f3ea] text-[#70644e] border-[#c0b298]/60 hover:bg-[#e8ebe0]'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Table Footer Summary Row */}
          <tfoot>
            <tr className="border-t-2 border-[#7d6840] bg-[#f4f3ea] font-bold text-xs text-[#4a3e26]">
              <td className="py-3 px-3.5 rounded-l-xl">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#7d6840]" />
                  <span>รวมทุกสัญญา ({activeContracts.length} สัญญา)</span>
                </div>
              </td>
              <td className="py-3 px-3 text-right font-mono text-sm text-[#4a3e26]">
                {formatCurrency(totalOSBalance)} บ.
              </td>
              <td className="py-3 px-3 text-right font-mono text-[#4a3e26]">
                {formatCurrency(totalPayment)} บ.
              </td>
              <td className="py-3 px-3 text-center font-mono text-teal-800">
                +{formatCurrency(totalExtraPayment)} บ.
              </td>
              <td className="py-3 px-3 text-center font-mono text-teal-800">
                <span className="px-2 py-0.5 rounded-full bg-teal-100 border border-teal-300 text-teal-900">
                  +{overallPercentExtra}%
                </span>
              </td>
              <td className="py-3 px-3 text-right font-mono text-base font-black text-amber-900">
                {formatCurrency(grandTotal)} บ.
              </td>
              <td className="py-3 px-3.5 text-left text-[11px] text-[#70644e] rounded-r-xl">
                ภาระยอดจ่ายจริงรวมต่อเดือน
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payer Summary Cards Breakdown */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#70644e] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            สรุปยอดรับผิดชอบแบ่งตามรายชื่อ / สัดส่วน
          </span>
          <span className="text-[11px] text-[#8c7b5f]">
            รวม {Object.keys(personSummary).length} กลุ่มผู้รับผิดชอบ
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {Object.entries(personSummary).map(([person, data]) => {
            const sharePercent = grandTotal > 0 ? Math.round((data.grandTotal / grandTotal) * 100) : 0;
            return (
              <div
                key={person}
                className="bg-white border border-[#c0b298]/70 p-4 rounded-xl shadow-2xs space-y-2.5 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#7d6840]/15 text-[#7d6840] flex items-center justify-center font-bold text-xs">
                      {person.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#4a3e26]">{person}</div>
                      <div className="text-[10px] text-[#70644e]">{data.count} สัญญาที่รับผิดชอบ</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900">
                    {sharePercent}%
                  </span>
                </div>

                <div className="space-y-1 pt-2 border-t border-[#c0b298]/30 text-xs">
                  <div className="flex justify-between text-[#70644e]">
                    <span>ค่างวดปกติ:</span>
                    <span className="font-mono">{formatCurrency(data.totalPayment)} บ.</span>
                  </div>
                  <div className="flex justify-between text-teal-800">
                    <span>ยอดโปะเพิ่ม:</span>
                    <span className="font-mono font-bold">+{formatCurrency(data.totalExtra)} บ.</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#4a3e26] pt-1 border-t border-[#c0b298]/20">
                    <span>ยอดจ่ายรวม:</span>
                    <span className="font-mono text-sm text-amber-950 font-black">{formatCurrency(data.grandTotal)} บ.</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
