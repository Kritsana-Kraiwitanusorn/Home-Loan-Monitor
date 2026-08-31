import React, { useState } from 'react';
import { LoanContract, PaymentRecord, ResponsibleShare } from '../types';
import { formatCurrency, generateAmortizationSchedule, getContractResponsibleShares, formatResponsibleSharesSummary } from '../lib/loanUtils';
import { Users, UserCheck, Edit3, DollarSign, ArrowUpRight, Percent, Sparkles, User, SlidersHorizontal, CheckCircle2, ChevronRight } from 'lucide-react';
import ResponsibleSharesModal from './ResponsibleSharesModal';

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

  // Local state for editing extra payment
  const [editingExtra, setEditingExtra] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Modal state for editing detailed responsible breakdown per contract
  const [modalContract, setModalContract] = useState<LoanContract | null>(null);

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

    // Structured shares for this contract
    const shares: ResponsibleShare[] = getContractResponsibleShares(contract, total);

    return {
      contract,
      osBalance,
      payment,
      extraPayment,
      percentExtra,
      total,
      shares
    };
  });

  // Calculate grand totals across all active contracts
  const totalOSBalance = contractRows.reduce((sum, r) => sum + r.osBalance, 0);
  const totalPayment = contractRows.reduce((sum, r) => sum + r.payment, 0);
  const totalExtraPayment = contractRows.reduce((sum, r) => sum + r.extraPayment, 0);
  const grandTotal = totalPayment + totalExtraPayment;
  const overallPercentExtra = totalPayment > 0 ? Math.round((totalExtraPayment / totalPayment) * 100) : 0;

  // Exact individual person summary aggregated across ALL contracts
  const individualSummary: Record<string, { totalAmount: number; contractsBreakdown: { nickname: string; bankName: string; amount: number; percentOfContract: number }[] }> = {};

  contractRows.forEach((row) => {
    row.shares.forEach((share) => {
      const name = share.name.trim() || 'ผู้รับผิดชอบ';
      if (!individualSummary[name]) {
        individualSummary[name] = { totalAmount: 0, contractsBreakdown: [] };
      }
      individualSummary[name].totalAmount += share.amount;
      const pct = row.total > 0 ? Math.round((share.amount / row.total) * 100) : 0;
      individualSummary[name].contractsBreakdown.push({
        nickname: row.contract.nickname,
        bankName: row.contract.bankName,
        amount: share.amount,
        percentOfContract: pct
      });
    });
  });

  const handleSaveExtraPayment = async (contractId: string, newExtra: number) => {
    setSavingId(contractId);
    try {
      const targetContract = activeContracts.find((c) => c.id === contractId);
      if (!targetContract) return;

      const oldTotal = (targetContract.monthlyInstallment || 0) + (targetContract.plannedExtraPayment || 0);
      const newTotal = (targetContract.monthlyInstallment || 0) + newExtra;

      // Adjust existing shares proportionally if they exist
      let updatedShares = targetContract.responsibleShares;
      if (updatedShares && updatedShares.length > 0 && oldTotal > 0) {
        const ratio = newTotal / oldTotal;
        updatedShares = updatedShares.map((s, idx) => {
          if (idx === updatedShares!.length - 1) {
            const othersSum = updatedShares!.slice(0, -1).reduce((sum, item) => sum + Math.round(item.amount * ratio), 0);
            return { name: s.name, amount: Math.max(0, newTotal - othersSum) };
          }
          return { name: s.name, amount: Math.round(s.amount * ratio) };
        });
      }

      await onUpdateContract(contractId, {
        plannedExtraPayment: newExtra,
        ...(updatedShares ? { responsibleShares: updatedShares } : {})
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveModalShares = async (contractId: string, newShares: ResponsibleShare[]) => {
    const summaryStr = formatResponsibleSharesSummary(newShares);
    await onUpdateContract(contractId, {
      responsibleShares: newShares,
      responsiblePerson: summaryStr
    });
  };

  return (
    <div className="bg-[#fbfbfa] border border-[#c0b298] p-4 sm:p-5 md:p-6 shadow-sm rounded-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#c0b298]/50 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
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
            แยกและระบุยอดจ่ายของแต่ละคนได้อย่างอิสระ พร้อมคำนวณสัดส่วนภาระรวมอัตโนมัติ
          </p>
        </div>

        {/* Grand Total Cash Outflow Badge */}
        <div className="flex items-center gap-2 bg-[#f4f3ea] border border-[#c0b298] px-4 py-2 rounded-xl shrink-0 self-start sm:self-auto">
          <div className="text-left sm:text-right">
            <span className="text-[10px] font-bold text-[#70644e] uppercase block">รวมยอดจ่ายต่อเดือนทั้งหมด</span>
            <span className="text-lg font-black text-[#4a3e26] font-mono">
              {formatCurrency(grandTotal)} <span className="text-xs font-normal">บาท/เดือน</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Responsible Table */}
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <table className="w-full text-left border-collapse min-w-[840px]">
          <thead>
            <tr className="border-b border-[#c0b298] text-[11px] font-bold text-[#70644e] uppercase tracking-wider bg-[#f4f3ea]/80">
              <th className="py-3 px-3.5 rounded-l-xl">สัญญา / ธนาคาร</th>
              <th className="py-3 px-3 text-right">OS Balance (คงเหลือ)</th>
              <th className="py-3 px-3 text-right">Payment (ค่างวด)</th>
              <th className="py-3 px-3 text-center min-w-[140px]">Extra Payment (ยอดโปะ)</th>
              <th className="py-3 px-3 text-center">% Extra</th>
              <th className="py-3 px-3 text-right font-black text-[#4a3e26]">Total (รวมจ่าย)</th>
              <th className="py-3 px-3.5 text-left min-w-[280px] rounded-r-xl">Responsible (ผู้รับผิดชอบ & ยอดของแต่ละคน)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c0b298]/30 text-xs">
            {contractRows.map((row) => {
              const currentExtra = editingExtra[row.contract.id] !== undefined
                ? editingExtra[row.contract.id]
                : (row.contract.plannedExtraPayment ?? 0);

              const isSaving = savingId === row.contract.id;

              return (
                <tr key={row.contract.id} className="hover:bg-[#f7f6f0] transition-colors">
                  {/* Contract Name & Bank */}
                  <td className="py-3.5 px-3.5">
                    <div className="font-bold text-[#4a3e26] text-sm">{row.contract.nickname}</div>
                    <div className="text-[10px] text-[#70644e] font-sans flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                      {row.contract.bankName}
                    </div>
                  </td>

                  {/* OS Balance */}
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-[#4a3e26]">
                    {formatCurrency(row.osBalance)} <span className="text-[10px] font-normal text-[#70644e]">บ.</span>
                  </td>

                  {/* Payment */}
                  <td className="py-3.5 px-3 text-right font-mono font-semibold text-[#4a3e26]">
                    {formatCurrency(row.payment)} <span className="text-[10px] font-normal text-[#70644e]">บ.</span>
                  </td>

                  {/* Extra Payment (Editable) */}
                  <td className="py-3.5 px-3">
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
                            handleSaveExtraPayment(row.contract.id, currentExtra);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveExtraPayment(row.contract.id, currentExtra);
                            }
                          }}
                          className="w-full bg-white border border-[#c0b298] px-2.5 py-1 text-right text-xs font-mono font-bold text-teal-800 rounded-lg outline-none focus:ring-2 focus:ring-teal-600 shadow-2xs"
                        />
                        <span className="absolute left-2 top-1 text-[10px] text-teal-600 font-bold">+</span>
                      </div>
                      <span className="text-[10px] font-medium text-[#70644e]">บ.</span>
                    </div>
                    {isSaving && (
                      <div className="text-[9px] text-teal-700 text-center mt-0.5 animate-pulse">กำลังบันทึก...</div>
                    )}
                  </td>

                  {/* % Extra Payment */}
                  <td className="py-3.5 px-3 text-center">
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
                  <td className="py-3.5 px-3 text-right font-mono font-black text-sm text-[#4a3e26]">
                    {formatCurrency(row.total)} <span className="text-[10px] font-normal text-[#70644e]">บ.</span>
                  </td>

                  {/* Responsible Column: Individual Breakdown & Edit button */}
                  <td className="py-3.5 px-3.5">
                    <div className="space-y-2">
                      {/* Individual Payer Badges */}
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {row.shares.map((share, idx) => {
                          const pct = row.total > 0 ? Math.round((share.amount / row.total) * 100) : 0;
                          return (
                            <div
                              key={idx}
                              className="inline-flex items-center gap-1.5 bg-white border border-[#c0b298] px-2.5 py-1 rounded-lg shadow-2xs"
                              title={`${share.name} รับผิดชอบ ${formatCurrency(share.amount)} บาท (${pct}%)`}
                            >
                              <div className="w-4 h-4 rounded-full bg-[#7d6840]/15 text-[#7d6840] flex items-center justify-center font-bold text-[9px]">
                                {share.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold text-[#4a3e26] text-xs">{share.name}:</span>
                              <span className="font-mono font-black text-[#7d6840] text-xs">
                                {formatCurrency(share.amount)}
                              </span>
                              <span className="text-[10px] text-[#70644e] font-mono">
                                ({pct}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Edit Breakdown Button */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setModalContract(row.contract)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7d6840] hover:text-[#4a3e26] bg-[#f4f3ea] hover:bg-[#e8ebe0] border border-[#c0b298] px-2.5 py-1 rounded-md transition-all cursor-pointer shadow-2xs group"
                        >
                          <SlidersHorizontal className="w-3 h-3 text-[#7d6840] group-hover:rotate-45 transition-transform" />
                          <span>แก้ไขยอด / แยกคนจ่าย</span>
                        </button>
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
              <td className="py-3.5 px-3.5 rounded-l-xl">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#7d6840]" />
                  <span>รวมทุกสัญญา ({activeContracts.length} สัญญา)</span>
                </div>
              </td>
              <td className="py-3.5 px-3 text-right font-mono text-sm text-[#4a3e26]">
                {formatCurrency(totalOSBalance)} บ.
              </td>
              <td className="py-3.5 px-3 text-right font-mono text-[#4a3e26]">
                {formatCurrency(totalPayment)} บ.
              </td>
              <td className="py-3.5 px-3 text-center font-mono text-teal-800">
                +{formatCurrency(totalExtraPayment)} บ.
              </td>
              <td className="py-3.5 px-3 text-center font-mono text-teal-800">
                <span className="px-2 py-0.5 rounded-full bg-teal-100 border border-teal-300 text-teal-900">
                  +{overallPercentExtra}%
                </span>
              </td>
              <td className="py-3.5 px-3 text-right font-mono text-base font-black text-amber-900">
                {formatCurrency(grandTotal)} บ.
              </td>
              <td className="py-3.5 px-3.5 text-left text-[11px] text-[#70644e] rounded-r-xl">
                ภาระยอดจ่ายจริงรวมต่อเดือน
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Individual Person Summary Cards Breakdown */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span className="text-xs font-bold text-[#70644e] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            สรุปยอดที่แต่ละคนต้องจ่ายจริงในแต่ละเดือน (Individual Breakdown)
          </span>
          <span className="text-[11px] text-[#8c7b5f]">
            รวม {Object.keys(individualSummary).length} คนรับผิดชอบ
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {Object.entries(individualSummary).map(([person, data]) => {
            const sharePercent = grandTotal > 0 ? Math.round((data.totalAmount / grandTotal) * 100) : 0;
            return (
              <div
                key={person}
                className="bg-white border border-[#c0b298]/80 p-4 rounded-xl shadow-2xs space-y-3 relative overflow-hidden transition-all hover:border-[#7d6840]"
              >
                {/* Person Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#7d6840] text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                      {person.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#4a3e26]">{person}</div>
                      <div className="text-[10px] text-[#70644e]">รับผิดชอบ {data.contractsBreakdown.length} สัญญา</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 inline-block">
                      {sharePercent}%
                    </span>
                    <span className="block text-[9px] text-[#70644e] mt-0.5">ของยอดรวมทั้งหมด</span>
                  </div>
                </div>

                {/* Total Monthly Amount for this Person */}
                <div className="p-2.5 bg-[#f4f3ea]/70 border border-[#c0b298]/40 rounded-lg flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#70644e]">ยอดรวมที่ต้องจ่าย:</span>
                  <span className="font-mono text-base font-black text-amber-950">
                    {formatCurrency(data.totalAmount)} <span className="text-xs font-normal">บ./เดือน</span>
                  </span>
                </div>

                {/* Breakdown per contract */}
                <div className="space-y-1.5 pt-1 text-xs">
                  <span className="text-[10px] font-bold text-[#70644e] uppercase block">
                    รายละเอียดในแต่ละสัญญา:
                  </span>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-0.5">
                    {data.contractsBreakdown.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-[11px] p-1.5 rounded-md bg-[#fbfbfa] border border-[#e6e4d5]"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-medium text-[#4a3e26] truncate block">{item.nickname}</span>
                          <span className="text-[9px] text-[#70644e] block">{item.bankName}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-[#4a3e26] block">{formatCurrency(item.amount)} บ.</span>
                          <span className="text-[9px] text-amber-800 font-mono">({item.percentOfContract}% ของสัญญา)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown Edit Modal */}
      {modalContract && (
        <ResponsibleSharesModal
          isOpen={!!modalContract}
          onClose={() => setModalContract(null)}
          contract={modalContract}
          currentExtraPayment={editingExtra[modalContract.id]}
          onSave={handleSaveModalShares}
        />
      )}
    </div>
  );
}
