import React, { useState, useEffect } from 'react';
import { LoanContract, InterestRate, InstallmentSchedule } from '../types';
import { X, Plus, Trash2 } from 'lucide-react';

interface AddContractModalProps {
  contract?: LoanContract | null; // If null, we are in Add mode. If specified, we are in Edit mode.
  onClose: () => void;
  onSave: (contractData: Omit<LoanContract, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onDelete?: (contractId: string) => Promise<void>;
}

export default function AddContractModal({ contract, onClose, onSave, onDelete }: AddContractModalProps) {
  const [nickname, setNickname] = useState('');
  const [bankName, setBankName] = useState('ธนาคารกรุงไทย');
  const [loanAmount, setLoanAmount] = useState<number>(2500000);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalMonths, setTotalMonths] = useState<number>(360);
  const [monthlyInstallment, setMonthlyInstallment] = useState<number>(15000);
  const [dueDay, setDueDay] = useState<number>(5);
  const [status, setStatus] = useState<'Active' | 'Closed' | 'Refinanced'>('Active');
  const [interestCalcMethod, setInterestCalcMethod] = useState<'daily_365' | 'daily_actual' | 'monthly' | 'yearly'>('monthly');
  const [responsiblePerson, setResponsiblePerson] = useState('Best & Koy');
  const [plannedExtraPayment, setPlannedExtraPayment] = useState<number>(0);
  
  // Manage interest rate history list
  const [interestRates, setInterestRates] = useState<InterestRate[]>([
    { effectiveDate: '', rate: 3.5 }
  ]);

  // Manage installment schedules history list (e.g. entering Year 3 onwards)
  const [installmentSchedules, setInstallmentSchedules] = useState<InstallmentSchedule[]>([
    { effectiveDate: '', amount: 15000 }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Prefill fields if editing
  useEffect(() => {
    if (contract) {
      setNickname(contract.nickname);
      setBankName(contract.bankName);
      setLoanAmount(contract.loanAmount);
      setStartDate(contract.startDate);
      setTotalMonths(contract.totalMonths);
      setMonthlyInstallment(contract.monthlyInstallment);
      setDueDay(contract.dueDay);
      setStatus(contract.status);
      setInterestCalcMethod(contract.interestCalcMethod || 'monthly');
      setResponsiblePerson(contract.responsiblePerson || 'Best & Koy');
      setPlannedExtraPayment(contract.plannedExtraPayment ?? 0);
      setInterestRates(contract.interestRates && contract.interestRates.length > 0 ? [...contract.interestRates] : [{ effectiveDate: contract.startDate, rate: 3.5 }]);
      setInstallmentSchedules(
        contract.installmentSchedules && contract.installmentSchedules.length > 0
          ? [...contract.installmentSchedules]
          : [{ effectiveDate: contract.startDate, amount: contract.monthlyInstallment }]
      );
    } else {
      // Setup initial rate effective date automatically on mount
      setInterestRates([{ effectiveDate: startDate, rate: 3.5 }]);
      setInstallmentSchedules([{ effectiveDate: startDate, amount: monthlyInstallment }]);
      setResponsiblePerson('Best & Koy');
      setPlannedExtraPayment(0);
    }
  }, [contract]);

  // Sync initial rate & installment's effective date with start date when start date changes (if in ADD mode)
  useEffect(() => {
    if (!contract) {
      if (interestRates.length === 1 && interestRates[0].effectiveDate === '') {
        setInterestRates([{ effectiveDate: startDate, rate: 3.5 }]);
      }
      if (installmentSchedules.length === 1 && installmentSchedules[0].effectiveDate === '') {
        setInstallmentSchedules([{ effectiveDate: startDate, amount: monthlyInstallment }]);
      }
    }
  }, [startDate, contract]);

  // Sync monthlyInstallment change to the first installment schedule row (if in ADD mode and only 1 row)
  useEffect(() => {
    if (!contract && installmentSchedules.length === 1) {
      setInstallmentSchedules([{ effectiveDate: startDate, amount: monthlyInstallment }]);
    }
  }, [monthlyInstallment, contract, startDate]);

  const handleAddRateRow = () => {
    setInterestRates([
      ...interestRates,
      { effectiveDate: new Date().toISOString().split('T')[0], rate: 3.5 }
    ]);
  };

  const handleRemoveRateRow = (index: number) => {
    if (interestRates.length <= 1) return;
    setInterestRates(interestRates.filter((_, i) => i !== index));
  };

  const handleRateRowChange = (index: number, field: keyof InterestRate, value: any) => {
    const updated = [...interestRates];
    updated[index] = {
      ...updated[index],
      [field]: field === 'rate' ? parseFloat(value) || 0 : value
    };
    setInterestRates(updated);
  };

  const handleAddInstallmentRow = () => {
    setInstallmentSchedules([
      ...installmentSchedules,
      { effectiveDate: new Date().toISOString().split('T')[0], amount: monthlyInstallment }
    ]);
  };

  const handleRemoveInstallmentRow = (index: number) => {
    if (installmentSchedules.length <= 1) return;
    setInstallmentSchedules(installmentSchedules.filter((_, i) => i !== index));
  };

  const handleInstallmentRowChange = (index: number, field: keyof InstallmentSchedule, value: any) => {
    const updated = [...installmentSchedules];
    updated[index] = {
      ...updated[index],
      [field]: field === 'amount' ? parseFloat(value) || 0 : value
    };
    setInstallmentSchedules(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!nickname.trim()) {
      setError('กรุณากรอกชื่อสัญญา');
      setLoading(false);
      return;
    }

    if (loanAmount <= 0) {
      setError('ยอดเงินกู้ตั้งต้นต้องมากกว่า 0 บาท');
      setLoading(false);
      return;
    }

    if (totalMonths <= 0) {
      setError('จำนวนงวดผ่อนชำระต้องมากกว่า 0 งวด');
      setLoading(false);
      return;
    }

    if (monthlyInstallment <= 0) {
      setError('ค่างวดปกติที่ต้องชำระต้องมากกว่า 0 บาท');
      setLoading(false);
      return;
    }

    if (dueDay < 1 || dueDay > 31) {
      setError('วันครบกำหนดจ่ายรายเดือนต้องอยู่ระหว่างวันที่ 1 ถึง 31');
      setLoading(false);
      return;
    }

    // Validate interest rate rows
    for (const r of interestRates) {
      if (!r.effectiveDate) {
        setError('กรุณาระบุวันที่มีผลสำหรับทุกแถวของอัตราดอกเบี้ย');
        setLoading(false);
        return;
      }
      if (r.rate < 0 || r.rate > 30) {
        setError('อัตราดอกเบี้ยต้องอยู่ระหว่าง 0% ถึง 30%');
        setLoading(false);
        return;
      }
    }

    // Validate installment schedule rows
    for (const inst of installmentSchedules) {
      if (!inst.effectiveDate) {
        setError('กรุณาระบุวันที่มีผลสำหรับทุกแถวของค่างวด');
        setLoading(false);
        return;
      }
      if (inst.amount <= 0) {
        setError('ค่างวดต้องมากกว่า 0 บาท');
        setLoading(false);
        return;
      }
    }

    try {
      // Sort interest rates and installment schedules before saving
      const sortedRates = [...interestRates].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
      const sortedInstallments = [...installmentSchedules].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
      
      await onSave({
        nickname: nickname.trim(),
        bankName,
        loanAmount,
        startDate,
        totalMonths,
        monthlyInstallment,
        dueDay,
        status,
        interestCalcMethod,
        responsiblePerson: responsiblePerson.trim() || 'Best & Koy',
        plannedExtraPayment: plannedExtraPayment || 0,
        interestRates: sortedRates,
        installmentSchedules: sortedInstallments
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลสัญญา');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!contract || !onDelete) return;
    setLoading(true);
    try {
      await onDelete(contract.id);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการลบสัญญา');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex justify-center p-4 backdrop-blur-xs">
      <div className="relative bg-[#fbfbfa] border border-[#c0b298] w-full max-w-2xl p-6 md:p-8 shadow-xl rounded-sm my-auto">
        
        {/* Retro Corner decorations */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#7d6840]" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#7d6840]" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#7d6840]" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#7d6840]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e6e4d5] mb-6">
          <h2 className="text-xl font-bold text-[#4a3e26] font-serif">
            {contract ? 'แก้ไขสัญญาสินเชื่อบ้าน' : 'เพิ่มสัญญาสินเชื่อใหม่'}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nickname */}
            <div>
              <label className="block text-xs font-semibold text-[#7d6840] uppercase tracking-wider mb-1.5">
                ชื่อเรียกสัญญา / ชื่อเล่นของสัญญา *
              </label>
              <input
                type="text"
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="เช่น สัญญาที่ 1 - ธนาคารกรุงไทย"
                className="w-full bg-white border border-[#c0b298] px-3 py-2 text-sm text-[#4a3e26] rounded-sm focus:outline-none focus:border-[#7d6840]"
              />
            </div>

            {/* Bank name */}
            <div>
              <label className="block text-xs font-semibold text-[#7d6840] uppercase tracking-wider mb-1.5">
                ธนาคารผู้ให้บริการสินเชื่อ
              </label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-white border border-[#c0b298] px-3 py-2 text-sm text-[#4a3e26] rounded-sm focus:outline-none focus:border-[#7d6840]"
              >
                <option value="ธนาคารกรุงไทย">ธนาคารกรุงไทย (KTB)</option>
                <option value="ธนาคารกสิกรไทย">ธนาคารกสิกรไทย (KBANK)</option>
                <option value="ธนาคารไทยพาณิชย์">ธนาคารไทยพาณิชย์ (SCB)</option>
                <option value="ธนาคารออมสิน">ธนาคารออมสิน (GSB)</option>
                <option value="ธนาคารอาคารสงเคราะห์">ธนาคารอาคารสงเคราะห์ (GHB)</option>
                <option value="ธนาคารกรุงเทพ">ธนาคารกรุงเทพ (BBL)</option>
                <option value="ธนาคารกรุงศรีอยุธยา">ธนาคารกรุงศรีอยุธยา (BAY)</option>
                <option value="ธนาคารทหารไทยธนชาต">ธนาคารทหารไทยธนชาต (TTB)</option>
                <option value="ธนาคารแลนด์ แอนด์ เฮ้าส์">ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)</option>
                <option value="ธนาคารยูโอบี">ธนาคารยูโอบี (UOB)</option>
                <option value="ธนาคารเกียรตินาคินภัทร">ธนาคารเกียรตินาคินภัทร (KKP)</option>
                <option value="ธนาคารซีไอเอ็มบี ไทย">ธนาคารซีไอเอ็มบี ไทย (CIMB)</option>
                <option value="ธนาคารทิสโก้">ธนาคารทิสโก้ (TISCO)</option>
                <option value="ธนาคารไทยเครดิต">ธนาคารไทยเครดิต (Thai Credit)</option>
                <option value="ธนาคารไอซีบีซี">ธนาคารไอซีบีซี (ICBC)</option>
              </select>
            </div>

            {/* Loan Amount */}
            <div>
              <label className="block text-xs font-semibold text-[#7d6840] uppercase tracking-wider mb-1.5">
                ยอดเงินกู้ตั้งต้น (บาท) *
              </label>
              <input
                type="number"
                required
                min="1000"
                step="any"
                value={loanAmount}
                onChange={(e) => setLoanAmount(parseFloat(e.target.value) || 0)}
                placeholder="เช่น 2500000"
                className="w-full bg-white border border-[#c0b298] px-3 py-2 text-sm text-[#4a3e26] rounded-sm focus:outline-none focus:border-[#7d6840]"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-semibold text-[#7d6840] uppercase tracking-wider mb-1.5">
                วันที่เริ่มสัญญา / วันรับโอนเงินกู้ *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-[#c0b298] px-3 py-2 text-sm text-[#4a3e26] rounded-sm focus:outline-none focus:border-[#7d6840]"
              />
            </div>

            {/* Total Months */}
            <div>
              <label className="block text-xs font-semibold text-[#7d6840] uppercase tracking-wider mb-1.5">
                จำนวนงวดผ่อนชำระทั้งหมด (เดือน) *
              </label>
              <input
                type="number"
                required
                min="1"
                max="600"
                value={totalMonths}
                onChange={(e) => setTotalMonths(parseInt(e.target.value, 10) || 0)}
                placeholder="เช่น 360"
                className="w-full bg-white border border-[#c0b298] px-3 py-2 text-sm text-[#4a3e26] rounded-sm focus:outline-none focus:border-[#7d6840]"
              />
            </div>

            {/* Monthly Installment */}
            <div>
              <label className="block text-xs font-semibold text-[#7d6840] uppercase tracking-wider mb-1.5">
                ค่างวดปกติที่ต้องชำระรายเดือน (บาท) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={monthlyInstallment}
                onChange={(e) => setMonthlyInstallment(parseFloat(e.target.value) || 0)}
                placeholder="เช่น 15000"
                className="w-full bg-white border border-[#c0b298] px-3 py-2 text-sm text-[#4a3e26] rounded-sm focus:outline-none focus:border-[#7d6840]"
              />
            </div>

            {/* Due Day */}
            <div>
              <label className="block text-xs font-semibold text-[#7d6840] uppercase tracking-wider mb-1.5">
                วันครบกำหนดชำระของทุกเดือน (วันที่) *
              </label>
              <input
                type="number"
                required
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(parseInt(e.target.value, 10) || 0)}
                placeholder="เช่น 5"
                className="w-full bg-white border border-[#c0b298] px-3 py-2 text-sm text-[#4a3e26] rounded-sm focus:outline-none focus:border-[#7d6840]"
              />
            </div>

            {/* Status (Edit mode only) */}
            <div>
              <label className="block text-xs font-semibold text-[#7d6840] uppercase tracking-wider mb-1.5">
                สถานะสัญญา
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-white border border-[#c0b298] px-3 py-2 text-sm text-[#4a3e26] rounded-sm focus:outline-none focus:border-[#7d6840]"
              >
                <option value="Active">เปิดใช้งานปกติ (Active)</option>
                <option value="Closed">ปิดสัญญาแล้ว (Closed)</option>
                <option value="Refinanced">รีไฟแนนซ์แล้ว (Refinanced)</option>
              </select>
            </div>

            {/* Interest Calculation Method */}
            <div>
              <label className="block text-xs font-semibold text-[#7d6840] uppercase tracking-wider mb-1.5">
                วิธีการคำนวณดอกเบี้ย *
              </label>
              <select
                value={interestCalcMethod}
                onChange={(e) => setInterestCalcMethod(e.target.value as any)}
                className="w-full bg-white border border-[#c0b298] px-3 py-2 text-sm text-[#4a3e26] rounded-sm focus:outline-none focus:border-[#7d6840]"
              >
                <option value="monthly">แบบรายเดือน (หาร 12 เท่ากันทุกเดือน)</option>
                <option value="daily_365">แบบรายวัน (ตามจำนวนวันจริง / 365 วัน)</option>
                <option value="daily_actual">แบบรายวันเฉลี่ยปีจริง (365/366 วัน ตามปฏิทิน)</option>
                <option value="yearly">แบบรายปี (หารเฉลี่ยตามปีจริง)</option>
              </select>
            </div>

            {/* Responsible Person */}
            <div>
              <label className="block text-xs font-semibold text-[#7d6840] uppercase tracking-wider mb-1.5">
                ผู้รับผิดชอบการชำระ (Responsible)
              </label>
              <input
                type="text"
                value={responsiblePerson}
                onChange={(e) => setResponsiblePerson(e.target.value)}
                placeholder="เช่น Best, Koy, Best & Koy (50/50)"
                className="w-full bg-white border border-[#c0b298] px-3 py-2 text-sm text-[#4a3e26] rounded-sm focus:outline-none focus:border-[#7d6840]"
              />
            </div>

            {/* Planned Extra Payment */}
            <div>
              <label className="block text-xs font-semibold text-[#7d6840] uppercase tracking-wider mb-1.5">
                ยอดโปะเพิ่มรายเดือนที่วางแผน (Extra Payment)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={plannedExtraPayment}
                onChange={(e) => setPlannedExtraPayment(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="เช่น 5000"
                className="w-full bg-white border border-[#c0b298] px-3 py-2 text-sm text-[#4a3e26] rounded-sm focus:outline-none focus:border-[#7d6840]"
              />
            </div>
          </div>

          {/* Interest Rate History History */}
          <div className="border-t border-[#e6e4d5] pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-[#7d6840] uppercase tracking-wider">
                ประวัติอัตราดอกเบี้ยต่อปี (Interest Rate History)
              </h4>
              <button
                type="button"
                onClick={handleAddRateRow}
                className="flex items-center gap-1.5 text-xs text-[#7d6840] hover:text-[#5d4d2e] font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มช่วงดอกเบี้ย</span>
              </button>
            </div>

            <p className="text-[11px] text-gray-500 mb-4">
              * ระบุอัตราดอกเบี้ยเริ่มต้นตั้งแต่วันเริ่มสัญญา หากมีการปรับดอกเบี้ยในภายหลัง (เช่น ครบกำหนด 3 ปี) สามารถกดเพิ่มแถวระบุวันที่เริ่มมีผล (Effective Date) เพื่อให้ระบบคำนวณเงินงวดถัดไปได้ถูกต้อง
            </p>

            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {interestRates.map((row, index) => (
                <div key={index} className="flex items-center gap-3 bg-[#fbfbfa] p-2 border border-[#e6e4d5] rounded-sm">
                  {/* Effective Date */}
                  <div className="flex-1">
                    <span className="text-[10px] text-gray-400 block mb-0.5">มีผลตั้งแต่วันที่:</span>
                    <input
                      type="date"
                      required
                      value={row.effectiveDate}
                      onChange={(e) => handleRateRowChange(index, 'effectiveDate', e.target.value)}
                      className="w-full bg-white border border-[#c0b298] px-2 py-1 text-xs text-[#4a3e26] rounded-sm focus:outline-none"
                    />
                  </div>

                  {/* Rate % */}
                  <div className="w-32">
                    <span className="text-[10px] text-gray-400 block mb-0.5">อัตราดอกเบี้ย (%) ต่อปี:</span>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        required
                        min="0"
                        max="30"
                        step="0.01"
                        value={row.rate}
                        onChange={(e) => handleRateRowChange(index, 'rate', e.target.value)}
                        placeholder="เช่น 3.5"
                        className="w-full bg-white border border-[#c0b298] pl-2 pr-6 py-1 text-xs text-[#4a3e26] rounded-sm focus:outline-none"
                      />
                      <span className="absolute right-2 text-xs text-gray-400">%</span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <div className="pt-4">
                    <button
                      type="button"
                      disabled={interestRates.length <= 1}
                      onClick={() => handleRemoveRateRow(index)}
                      className="text-gray-400 hover:text-red-600 disabled:opacity-30 p-1.5 transition-colors cursor-pointer"
                      title="ลบแถวนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Installment History */}
          <div className="border-t border-[#e6e4d5] pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-[#7d6840] uppercase tracking-wider">
                ประวัติค่างวดรายเดือน (Monthly Installment History)
              </h4>
              <button
                type="button"
                onClick={handleAddInstallmentRow}
                className="flex items-center gap-1.5 text-xs text-[#7d6840] hover:text-[#5d4d2e] font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มช่วงค่างวดใหม่</span>
              </button>
            </div>

            <p className="text-[11px] text-gray-500 mb-4">
              * ระบุค่างวดชำระเริ่มต้นตั้งแต่วันเริ่มสัญญา หากเข้าปีที่ 3 หรือช่วงที่มีการปรับยอดชำระเพิ่มขึ้น/ลดลง สามารถระบุวันที่มีผล (Effective Date) และจำนวนค่างวดที่ปรับปรุงใหม่เพื่อให้ระบบคำนวณได้อย่างถูกต้อง
            </p>

            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {installmentSchedules.map((row, index) => (
                <div key={index} className="flex items-center gap-3 bg-[#fbfbfa] p-2 border border-[#e6e4d5] rounded-sm">
                  {/* Effective Date */}
                  <div className="flex-1">
                    <span className="text-[10px] text-gray-400 block mb-0.5">มีผลตั้งแต่วันที่:</span>
                    <input
                      type="date"
                      required
                      value={row.effectiveDate}
                      onChange={(e) => handleInstallmentRowChange(index, 'effectiveDate', e.target.value)}
                      className="w-full bg-white border border-[#c0b298] px-2 py-1 text-xs text-[#4a3e26] rounded-sm focus:outline-none"
                    />
                  </div>

                  {/* Amount */}
                  <div className="w-36">
                    <span className="text-[10px] text-gray-400 block mb-0.5">ค่างวดปกติ (บาท):</span>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        required
                        min="100"
                        step="any"
                        value={row.amount}
                        onChange={(e) => handleInstallmentRowChange(index, 'amount', e.target.value)}
                        placeholder="เช่น 18000"
                        className="w-full bg-white border border-[#c0b298] pl-2 pr-10 py-1 text-xs text-[#4a3e26] rounded-sm focus:outline-none"
                      />
                      <span className="absolute right-2 text-xs text-gray-400 font-mono">บาท</span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <div className="pt-4">
                    <button
                      type="button"
                      disabled={installmentSchedules.length <= 1}
                      onClick={() => handleRemoveInstallmentRow(index)}
                      className="text-gray-400 hover:text-red-600 disabled:opacity-30 p-1.5 transition-colors cursor-pointer"
                      title="ลบแถวนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-[#e6e4d5] pt-4 mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {contract ? (
              showConfirmDelete ? (
                <div className="order-last sm:order-first flex items-center gap-2 bg-red-50 p-2 border border-red-200 rounded-sm">
                  <span className="text-xs text-red-700 font-medium">ยืนยันลบสัญญานี้และประวัติทั้งหมดหรือไม่?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xs transition-colors cursor-pointer"
                  >
                    ยืนยัน
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(false)}
                    className="px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-xs transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  disabled={loading}
                  className="order-last sm:order-first px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium rounded-sm border border-red-200 transition-colors cursor-pointer"
                >
                  ลบสัญญานี้
                </button>
              )
            ) : <div />}

            <div className="flex items-center gap-3 ml-auto">
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
                {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
