import React, { useEffect } from 'react';
import { Zap, Calculator, BarChart3, HelpCircle, X, Sparkles, ChevronRight, ShieldCheck, Landmark, Users } from 'lucide-react';

interface ToolsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenResponsible: () => void;
  onOpenSimulator: () => void;
  onOpenRefinance: () => void;
  onOpenAllTime: () => void;
  onPreseedDemo: () => void;
  contractsCount: number;
}

export default function ToolsSidebar({
  isOpen,
  onClose,
  onOpenResponsible,
  onOpenSimulator,
  onOpenRefinance,
  onOpenAllTime,
  onPreseedDemo,
  contractsCount
}: ToolsSidebarProps) {
  // Close on Escape key
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
    <div className="fixed inset-0 z-50 overflow-hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-sm bg-[#fbfbfa] border-r border-[#c0b298] shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-300">
        
        {/* Top Header */}
        <div className="p-5 border-b border-[#c0b298]/70 bg-[#f5f4ed]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#7d6840] text-white">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#4a3e26] font-serif">เมนูเครื่องมือคำนวณ</h3>
                <span className="text-[11px] text-[#70644e]">เครื่องมือวิเคราะห์และการเงิน</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-[#70644e] hover:text-[#4a3e26] hover:bg-[#e8ebe0] rounded-xl transition-colors cursor-pointer"
              title="ปิดเมนู"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Tool Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-[11px] font-bold text-[#70644e] uppercase tracking-wider px-2 pt-1">
            เครื่องมือวิเคราะห์และการจัดการ
          </div>

          {/* 1. Responsible Section */}
          <button
            onClick={() => {
              onClose();
              onOpenResponsible();
            }}
            className="w-full text-left p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/90 transition-all group flex items-start gap-3 shadow-2xs cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-indigo-700 text-white shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-indigo-950">ผู้รับผิดชอบการชำระ (Responsible)</span>
                <ChevronRight className="w-4 h-4 text-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-indigo-900/90 mt-0.5 leading-relaxed">
                ดูและปรับสัดส่วนผู้รับผิดชอบค่างวด ยอดโปะเพิ่ม และสรุปภาระการจ่ายของแต่ละคน
              </p>
            </div>
          </button>

          {/* 2. Prepayment Simulator */}
          <button
            onClick={() => {
              onClose();
              onOpenSimulator();
            }}
            className="w-full text-left p-3.5 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100/80 transition-all group flex items-start gap-3 shadow-2xs cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-teal-600 text-white shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-teal-950">จำลองการโปะบ้าน (Simulator)</span>
                <ChevronRight className="w-4 h-4 text-teal-700 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-teal-800/90 mt-0.5 leading-relaxed">
                ทดลองปรับยอดโปะเพิ่มรายเดือน เพื่อดูจำนวนปีที่ปลดหนี้เร็วขึ้นและดอกเบี้ยที่ประหยัดได้
              </p>
            </div>
          </button>

          {/* 3. Refinance Analysis */}
          <button
            onClick={() => {
              onClose();
              onOpenRefinance();
            }}
            className="w-full text-left p-3.5 rounded-xl border border-amber-300 bg-amber-50/70 hover:bg-amber-100/90 transition-all group flex items-start gap-3 shadow-2xs cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-amber-700 text-white shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
              <Calculator className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-amber-950">วิเคราะห์รีไฟแนนซ์ (Refinance)</span>
                <ChevronRight className="w-4 h-4 text-amber-700 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-amber-900/90 mt-0.5 leading-relaxed">
                เปรียบเทียบขอลดดอกเบี้ย (Retention) กับย้ายธนาคาร (Refinance) พร้อมคำนวณค่าจดจำนองและจุดคุ้มทุน
              </p>
            </div>
          </button>

          {/* 4. All-Time Overview */}
          {contractsCount > 0 && (
            <button
              onClick={() => {
                onClose();
                onOpenAllTime();
              }}
              className="w-full text-left p-3.5 rounded-xl border border-[#c0b298] bg-[#f5f4ed] hover:bg-[#eae8dc] transition-all group flex items-start gap-3 shadow-2xs cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-[#7d6840] text-white shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#4a3e26]">ยอดชำระสะสมทั้งหมด (All-Time)</span>
                  <ChevronRight className="w-4 h-4 text-[#7d6840] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[11px] text-[#70644e] mt-0.5 leading-relaxed">
                  ดูสรุปสถิติจ่ายรวมสะสมทั้งหมดของทุกบัญชีสัญญา (เงินต้น ดอกเบี้ย และยอดจ่ายรวมตลอดอายุสัญญา)
                </p>
              </div>
            </button>
          )}

          <div className="pt-3 border-t border-[#c0b298]/40">
            <div className="text-[11px] font-bold text-[#70644e] uppercase tracking-wider px-2 mb-2">
              จัดการข้อมูลและระบบ
            </div>

            {/* Pre-seed Demo Data */}
            <button
              onClick={() => {
                onClose();
                onPreseedDemo();
              }}
              className="w-full text-left p-3 rounded-xl border border-dashed border-[#c0b298] hover:border-[#7d6840] bg-white hover:bg-[#f5f4ed] transition-all group flex items-center gap-3 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-emerald-700 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-xs text-[#4a3e26]">สร้างข้อมูลสัญญาทดลอง (Demo)</div>
                <div className="text-[10px] text-[#70644e]">โหลดตัวอย่างสัญญา 3 ธนาคารพร้อมประวัติผ่อน</div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#f5f4ed] border-t border-[#c0b298]/70 text-[11px] text-[#70644e] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>ซิงค์อัตโนมัติผ่าน Cloud Firestore</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-[#7d6840] hover:underline cursor-pointer"
          >
            ปิดเมนู
          </button>
        </div>
      </div>
    </div>
  );
}
