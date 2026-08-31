import React, { useEffect } from 'react';
import { LoanContract, PaymentRecord } from '../types';
import ResponsibleSection from './ResponsibleSection';
import { X, Users, Sparkles } from 'lucide-react';

interface ResponsibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  contracts: LoanContract[];
  payments: PaymentRecord[];
  onUpdateContract: (contractId: string, updates: Partial<LoanContract>) => Promise<void>;
}

export default function ResponsibleModal({
  isOpen,
  onClose,
  contracts,
  payments,
  onUpdateContract
}: ResponsibleModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#fbfbfa] border border-[#c0b298] shadow-2xl rounded-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#c0b298]/70 bg-[#f5f4ed] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#7d6840] text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#4a3e26] font-serif">
                ผู้รับผิดชอบการชำระ (Responsible)
              </h2>
              <p className="text-[11px] text-[#70644e]">
                ตารางวิเคราะห์สัดส่วนภาระค่างวด ยอดโปะเพิ่ม และยอดชำระรวมแยกตามผู้รับผิดชอบ
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

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#e8ebe0]/30">
          <ResponsibleSection
            contracts={contracts}
            payments={payments}
            onUpdateContract={onUpdateContract}
          />
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-[#f5f4ed] border-t border-[#c0b298]/70 flex items-center justify-between text-xs text-[#70644e] shrink-0">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            บันทึกการเปลี่ยนแปลงทันทีแบบเรียลไทม์
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#7d6840] hover:bg-[#655230] text-white font-medium rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
