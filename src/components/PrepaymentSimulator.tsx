import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Zap, TrendingDown, PiggyBank, X, CheckCircle2 } from 'lucide-react';
import { LoanContract, PaymentRecord } from '../types';
import { formatCurrency, simulatePrepayment } from '../lib/loanUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PrepaymentSimulatorProps {
  isOpen?: boolean;
  onClose?: () => void;
  contracts: LoanContract[];
  payments: PaymentRecord[];
}

export default function PrepaymentSimulator({
  isOpen = true,
  onClose,
  contracts,
  payments
}: PrepaymentSimulatorProps) {
  const [extraAmount, setExtraAmount] = useState<number>(5000);
  const [selectedContractId, setSelectedContractId] = useState<string>('ALL');

  if (isOpen === false) return null;

  const activeContracts = contracts.filter(c => c.status === 'Active');
  
  // Filter contracts if user chose a specific contract
  const targetContracts = selectedContractId === 'ALL'
    ? activeContracts
    : activeContracts.filter(c => c.id === selectedContractId);

  // Run simulation calculation
  const simResult = simulatePrepayment(targetContracts, payments, extraAmount);

  // Prepare line chart data
  const labels = simResult.curveData.map(d => d.yearLabel);
  const normalSeries = simResult.curveData.map(d => d.normalBalance);
  const simSeries = simResult.curveData.map(d => d.simulatedBalance);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'ผ่อนปกติ (ไม่มีการโปะ)',
        data: normalSeries,
        borderColor: '#a39682',
        backgroundColor: 'rgba(163, 150, 130, 0.15)',
        fill: true,
        borderDash: [5, 5],
        pointRadius: 3,
        tension: 0.3
      },
      {
        label: `แผนการโปะเพิ่ม (+${formatCurrency(extraAmount)} บ./เดือน)`,
        data: simSeries,
        borderColor: '#0f766e', // Teal color
        backgroundColor: 'rgba(15, 118, 110, 0.15)',
        fill: true,
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: '#0f766e',
        tension: 0.3
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { family: 'Sarabun, sans-serif', size: 11 },
          color: '#4a3e26'
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${formatCurrency(context.raw)} บาท`
        }
      }
    },
    scales: {
      y: {
        ticks: {
          font: { family: 'Sarabun, sans-serif', size: 10 },
          callback: (value: any) => {
            if (value >= 1000000) {
              return `${(value / 1000000).toFixed(1)}M บ.`;
            } else if (value >= 1000) {
              return `${(value / 1000).toFixed(0)}k บ.`;
            }
            return `${value} บ.`;
          }
        },
        grid: { color: 'rgba(192, 178, 152, 0.2)' }
      },
      x: {
        ticks: { font: { family: 'Sarabun, sans-serif', size: 10 } },
        grid: { display: false }
      }
    }
  };

  const content = (
    <div className="bg-[#fbfbfa] border border-[#c0b298]/80 p-6 rounded-2xl shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e6e4d5] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-teal-50 border border-teal-200/80 rounded-xl text-teal-800">
            <Zap className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#4a3e26]">เครื่องจำลองการโปะเพื่อเร่งปิดบัญชี (Prepayment Simulator)</h3>
            <p className="text-xs text-[#70644e]">ทดลองปรับยอดโปะเพิ่มรายเดือนเพื่อดูจำนวนเงินดอกเบี้ยประหยัดและปีที่ปิดบัญชีเร็วขึ้น</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7d6840] hover:bg-[#e6e4d5] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Simulator Control Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#f4f3ea] p-4 rounded-xl border border-[#dcd7c5]">
        {/* Input 1: Extra Amount Button Selection & Custom Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#4a3e26]">
              ระบุยอดโปะเพิ่มต่อเดือน (บาท):
            </label>
            <div className="flex items-center gap-1 bg-white border border-[#c0b298] px-2 py-0.5 rounded-lg shadow-xs">
              <span className="text-[10px] text-[#70644e]">กำหนดเอง:</span>
              <input
                type="number"
                min="0"
                step="500"
                value={extraAmount}
                onChange={(e) => setExtraAmount(Math.max(0, Number(e.target.value)))}
                className="w-20 text-right font-mono font-bold text-xs text-teal-800 outline-none"
              />
              <span className="text-[10px] text-[#70644e]">บ.</span>
            </div>
          </div>

          {/* Quick Choice Buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            {[0, 2000, 5000, 10000, 15000, 20000, 30000, 50000].map((amt) => {
              const isSelected = extraAmount === amt;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setExtraAmount(amt)}
                  className={`py-1.5 px-2 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-700 text-white border-teal-800 shadow-xs scale-[1.02]'
                      : 'bg-white text-[#4a3e26] border-[#c0b298]/70 hover:bg-teal-50 hover:border-teal-300'
                  }`}
                >
                  {amt === 0 ? 'ไม่โปะ' : `+${formatCurrency(amt)}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input 2: Contract Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#4a3e26]">เลือกสัญญาที่ต้องการนำมาโปะ:</label>
          <select
            value={selectedContractId}
            onChange={(e) => setSelectedContractId(e.target.value)}
            className="w-full bg-white border border-[#c0b298] text-[#4a3e26] text-xs rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-teal-600 outline-none"
          >
            <option value="ALL">รวมทุกสัญญาในระบบ ({activeContracts.length} สัญญา)</option>
            {activeContracts.map(c => (
              <option key={c.id} value={c.id}>
                {c.nickname} ({c.bankName})
              </option>
            ))}
          </select>
          <p className="text-[10px] text-[#70644e]">
            *ระบบจะนำเงินโปะไปตัดสัญญาที่มีอัตราดอกเบี้ยสูงสุดก่อนโดยอัตโนมัติ
          </p>
        </div>
      </div>

      {/* Key Results KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* KPI 1: Interest Saved */}
        <div className="bg-teal-50/80 border border-teal-200 p-3.5 rounded-xl text-teal-950 flex flex-col justify-between shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800">
            <PiggyBank className="w-4 h-4 shrink-0 text-teal-700" />
            <span>ประหยัดดอกเบี้ยสุทธิรวม</span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black font-mono text-teal-900">
              {formatCurrency(simResult.interestSaved || 0)} บาท
            </div>
            <p className="text-[10px] text-teal-700 mt-0.5">
              คำนวณจากดอกเบี้ยแบบลดต้นลดดอกตลอดสัญญา
            </p>
          </div>
        </div>

        {/* KPI 2: Years Saved */}
        <div className="bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-xl text-emerald-950 flex flex-col justify-between shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
            <TrendingDown className="w-4 h-4 shrink-0 text-emerald-700" />
            <span>ผ่อนหมดเร็วขึ้น</span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black font-mono text-emerald-900">
              {simResult.yearsSavedStr || '0 เดือน'}
            </div>
            <p className="text-[10px] text-emerald-700 mt-0.5">
              ลดระยะเวลาผ่อนลงได้จริงจากกำหนดเดิม
            </p>
          </div>
        </div>

        {/* KPI 3: New Finish Year */}
        <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-xl text-amber-950 flex flex-col justify-between shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-700" />
            <span>คาดการณ์ปีที่ปลดหนี้หมด</span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black font-mono text-amber-900">
              พ.ศ. {(simResult.simulatedFinishYear || new Date().getFullYear()) + 543}
            </div>
            <p className="text-[10px] text-amber-800 mt-0.5">
              (จากกำหนดสัญญาเดิม พ.ศ. {(simResult.normalFinishYear || new Date().getFullYear()) + 543})
            </p>
          </div>
        </div>
      </div>

      {/* Explanation Box for User Understanding */}
      <div className="bg-white border border-[#dcd7c5] p-4 rounded-xl space-y-2 text-xs text-[#4a3e26]">
        <div className="flex items-center gap-1.5 font-bold text-teal-900 border-b border-[#e6e4d5] pb-1.5">
          <Zap className="w-4 h-4 text-teal-700 shrink-0" />
          <span>คำอธิบายการทำงานและวิธีอ่านผลลัพธ์ (How It Works)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px] text-[#5e523b]">
          <div className="space-y-1 bg-[#fbfbfa] p-2.5 rounded-lg border border-[#e6e4d5]">
            <span className="font-bold text-[#4a3e26] block">💡 หลักการคำนวณเงินโปะ:</span>
            <p className="leading-relaxed">
              สินเชื่อบ้านคิดดอกเบี้ยรายวันแบบ <strong>"ลดต้นลดดอก"</strong> เมื่อคุณจ่ายเงินเพิ่ม (โปะ) ยอดโปะทั้งหมดจะนำไป <strong>ตัดเงินต้น 100%</strong> โดยไม่โดนหักดอกเบี้ย ทำให้เงินต้นลดลงทันที ส่งผลให้ดอกเบี้ยในงวดถัดๆ ไปลดลงเป็นลูกโซ่
            </p>
          </div>
          <div className="space-y-1 bg-[#fbfbfa] p-2.5 rounded-lg border border-[#e6e4d5]">
            <span className="font-bold text-[#4a3e26] block">📊 การตีความผลลัพธ์:</span>
            <ul className="list-disc list-inside space-y-0.5 leading-relaxed">
              <li><strong>ประหยัดดอกเบี้ย:</strong> เงินดอกเบี้ยรวมที่คุณไม่ต้องจ่ายให้ธนาคารตลอดอายุกู้</li>
              <li><strong>ผ่อนหมดเร็วขึ้น:</strong> จำนวนปี/เดือนที่สั้นลง ทำให้คุณเป็นอิสระเร็วขึ้น</li>
              <li><strong>ปีที่ปลดหนี้หมด:</strong> ปี พ.ศ. ที่ยอดหนี้กลายเป็น 0 บาทจริง</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Amortization Curve Chart */}
      <div className="bg-white border border-[#e6e4d5] p-4 rounded-xl space-y-2">
        <h4 className="text-xs font-bold text-[#4a3e26]">กราฟเปรียบเทียบแนวโน้มยอดหนี้คงเหลือ (ปกติ vs โปะเพิ่ม)</h4>
        <div className="h-64 relative">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );

  // If used with modal wrapper:
  if (onClose) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex justify-center p-4 backdrop-blur-xs">
        <div className="relative w-full max-w-4xl my-auto">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
