import React, { useState, useEffect } from 'react';
import { LoanContract, PaymentRecord } from '../types';
import { X, Calendar, DollarSign, PiggyBank, Bookmark } from 'lucide-react';

interface RecordPaymentModalProps {
  contracts: LoanContract[];
  selectedContractId?: string; // Pre-selected contract if opened from details
  nextInstallmentIndex?: number; // Pre-selected index
  onClose: () => void;
  onSave: (paymentData: Omit<PaymentRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, paymentId?: string) => Promise<void>;
  editingPayment?: PaymentRecord | null;
}

export default function RecordPaymentModal({
  contracts,
  selectedContractId = '',
  nextInstallmentIndex = 1,
  onClose,
  onSave,
  editingPayment = null
}: RecordPaymentModalProps) {
  const [contractId, setContractId] = useState('');
  const [installmentIndex, setInstallmentIndex] = useState(1);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduledAmount, setScheduledAmount] = useState<number>(0);
  const [extraAmount, setExtraAmount] = useState<number>(0);
  const [note, setNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set initial contract
  useEffect(() => {
    if (editingPayment) {
      setContractId(editingPayment.contractId);
      setInstallmentIndex(editingPayment.installmentIndex);
      setPaymentDate(editingPayment.paymentDate);
      setScheduledAmount(editingPayment.scheduledAmount);
      setExtraAmount(editingPayment.extraAmount);
      setNote(editingPayment.note || '');
    } else if (selectedContractId) {
      setContractId(selectedContractId);
    } else if (contracts.length > 0) {
      setContractId(contracts[0].id);
    }
  }, [selectedContractId, contracts, editingPayment]);

  // Set installment index when contract changes
  useEffect(() => {
    if (editingPayment) return;
    if (selectedContractId === contractId) {
      setInstallmentIndex(nextInstallmentIndex);
    } else {
      // Find next installment from parent side if possible, otherwise default to 1
      setInstallmentIndex(1);
    }
  }, [contractId, selectedContractId, nextInstallmentIndex, editingPayment]);

  // Set scheduled amount based on contract and paymentDate
  useEffect(() => {
    if (editingPayment) return;
    const selected = contracts.find(c => c.id === contractId);
    if (selected) {
      let activeInstallment = selected.monthlyInstallment;
      if (selected.installmentSchedules && selected.installmentSchedules.length > 0) {
        const sortedInstallments = [...selected.installmentSchedules].sort(
          (a, b) => a.effectiveDate.localeCompare(b.effectiveDate)
        );
        for (const inst of sortedInstallments) {
          if (paymentDate >= inst.effectiveDate) {
            activeInstallment = inst.amount;
          } else {
            break;
          }
        }
      }
      setScheduledAmount(activeInstallment);
    }
  }, [contractId, paymentDate, contracts, editingPayment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!contractId) {
      setError('กรุณาเลือกสัญญาสินเชื่อ');
      setLoading(false);
      return;
    }

    if (installmentIndex <= 0) {
      setError('งวดที่บันทึกต้องมากกว่า 0');
      setLoading(false);
      return;
    }

    if (scheduledAmount < 0) {
      setError('ยอดตามงวดปกติห้ามติดลบ');
      setLoading(false);
      return;
    }

    if (extraAmount < 0) {
      setError('ยอดเงินโปะเพิ่มห้ามติดลบ');
      setLoading(false);
      return;
    }

    const totalPaid = scheduledAmount + extraAmount;
    if (totalPaid <= 0) {
      setError('ยอดเงินชำระรวมทั้งหมดต้องมากกว่า 0 บาท');
      setLoading(false);
      return;
    }

    try {
      await onSave({
        contractId,
        installmentIndex,
        paymentDate,
        scheduledAmount,
        extraAmount,
        totalPaid,
        note: note.trim() || ''
      }, editingPayment?.id);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลการจ่ายเงิน');
    } finally {
      setLoading(false);
    }
  };

  const selectedContract = contracts.find(c => c.id === contractId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex justify-center p-4 backdrop-blur-xs">
      <div className="relative bg-[#fbfbfa] border border-[#c0b298] w-full max-w-lg p-6 md:p-8 shadow-xl rounded-sm my-auto">
        
        {/* Retro Corner decorations */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#7d6840]" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#7d6840]" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#7d6840]" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#7d6840]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e6e4d5] mb-6">
          <h2 className="text-xl font-bold text-[#4a3e26] font-serif">
            {editingPayment ? 'แก้ไขการบันทึกชำระเงิน' : 'บันทึกการจ่ายเงิน / โปะเพิ่ม'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Select Contract */}
          <div>
            <label className="block text-xs font-semibold text-[#7d6840] uppercase tracking-wider mb-1.5">
              เลือกสัญญาสินเชื่อบ้าน *
            </label>
            <select
              disabled={!!selectedContractId}
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              className="w-full bg-white border border-[#c0b298] px-3 py-2 text-sm text-[#4a3e26] rounded-sm focus:outline-none focus:border-[#7d6840] disabled:opacity-75 disabled:bg-gray-50"
            >
              <option value="">-- กรุณาเลือกสัญญา --</option>
              {contracts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nickname} ({c.bankName})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Installment Index */}
            <div>
              <label className="block text-xs font-semibold text-[#7d6840] uppercase tracking-wider mb-1.5">
                งวดที่ชำระ (Installment) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={installmentIndex}
                onChange={(e) => setInstallmentIndex(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-white border border-[#c0b298] px-3 py-2 text-sm text-[#4a3e26] rounded-sm focus:outline-none focus:border-[#7d6840]"
              />
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-xs font-semibold text-[#7d6840] uppercase tracking-wider mb-1.5">
                วันที่จ่ายจริง *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-white border border-[#c0b298] px-3 py-2 text-sm text-[#4a3e26] rounded-sm focus:outline-none focus:border-[#7d6840]"
              />
            </div>
          </div>

          {/* Scheduled Amount */}
          <div>
            <label className="block text-xs font-semibold text-[#7d6840] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-[#7d6840]" />
              <span>ยอดจ่ายงวดปกติ (บาท) *</span>
            </label>
            <input
              type="number"
              required
              min="0"
              step="any"
              value={scheduledAmount}
              onChange={(e) => setScheduledAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-white border border-[#c0b298] px-3 py-2 text-sm text-[#4a3e26] rounded-sm focus:outline-none focus:border-[#7d6840]"
            />
            {selectedContract && (
              <span className="text-[10px] text-gray-500 mt-1 block">
                * ค่างวดสำหรับวันที่จ่ายนี้คือ <strong className="text-[#7d6840]">{scheduledAmount.toLocaleString()} บาท/เดือน</strong> (ค่างวดเริ่มต้นคือ {selectedContract.monthlyInstallment.toLocaleString()} บาท/เดือน)
              </span>
            )}
          </div>

          {/* Extra / Top-up Amount */}
          <div>
            <label className="block text-xs font-semibold text-[#7d6840] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <PiggyBank className="w-3 h-3 text-[#7d6840]" />
              <span>ยอดจ่ายโปะเพิ่ม (บาท)</span>
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={extraAmount}
              onChange={(e) => setExtraAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-white border border-[#c0b298] px-3 py-2 text-sm text-[#4a3e26] rounded-sm font-bold text-emerald-800 bg-emerald-50/20 focus:outline-none focus:border-[#7d6840]"
              placeholder="0"
            />
            <span className="text-[10px] text-gray-400 mt-1 block">
              * ยอดนี้จะนำไปหักลดเงินต้นทันทีและคำนวณตารางใหม่ ช่วยร่นระยะเวลาผ่อนและประหยัดดอกเบี้ย
            </span>
          </div>

          {/* Sum Summary Indicator */}
          <div className="bg-[#f4f3ea] border border-[#e6e4d5] p-3 text-center rounded-sm">
            <span className="text-xs text-[#70644e] block mb-1">ยอดชำระเงินรวมทั้งหมด</span>
            <span className="text-xl font-bold text-[#4a3e26]">
              {(scheduledAmount + extraAmount).toLocaleString()} บาท
            </span>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#7d6840] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Bookmark className="w-3 h-3 text-[#7d6840]" />
              <span>หมายเหตุเพิ่มเติม (Optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น โปะเพิ่มช่วงกลางปี, จ่ายผ่านแอปธนาคาร"
              className="w-full bg-white border border-[#c0b298] px-3 py-2 text-sm text-[#4a3e26] rounded-sm focus:outline-none focus:border-[#7d6840]"
            />
          </div>

          {/* Action buttons */}
          <div className="border-t border-[#e6e4d5] pt-4 mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-[#c0b298] text-[#70644e] text-sm font-medium rounded-sm hover:bg-[#f4f3ea] transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[#7d6840] hover:bg-[#685533] text-white text-sm font-medium rounded-sm shadow-sm transition-colors cursor-pointer"
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกการจ่ายจริง'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
