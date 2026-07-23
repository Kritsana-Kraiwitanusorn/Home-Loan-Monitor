import React, { useState } from 'react';
import { LoanContract, AmortizationRow } from '../types';
import { formatCurrency, formatThaiDate } from '../lib/loanUtils';
import { Landmark, ArrowUpRight } from 'lucide-react';

interface ContractCardProps {
  key?: string;
  contract: LoanContract;
  schedule: AmortizationRow[];
  onSelect: (contractId: string) => void;
  onDragStart?: (e: React.DragEvent, contractId: string) => void;
  onDragOver?: (e: React.DragEvent, contractId: string) => void;
  onDrop?: (e: React.DragEvent, contractId: string) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
  onMove?: (contractId: string, direction: 'prev' | 'next') => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export default function ContractCard({
  contract,
  schedule,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging = false,
  onMove,
  isFirst = false,
  isLast = false
}: ContractCardProps) {
  // Find current remaining balance
  const firstUnpaid = schedule.find(row => !row.isPaid);
  const remainingBalance = firstUnpaid ? firstUnpaid.beginningBalance : 0;
  
  // Calculate percentage paid
  const originalAmount = contract.loanAmount;
  const amountPaid = Math.max(0, originalAmount - remainingBalance);
  const percentPaid = Math.min(100, Math.round((amountPaid / originalAmount) * 100));

  // Find next unpaid payment row
  const nextPayment = schedule.find(row => !row.isPaid);
  const nextDueDate = nextPayment ? nextPayment.dueDate : '';
  const isFullyPaid = remainingBalance <= 0.01 || !nextPayment;

  // Status computation
  let statusText = 'ยังไม่ถึงกำหนด';
  let statusBg = 'bg-[#f0f4ee] text-[#4d6a45] border border-[#d6e3d2]';
  
  if (isFullyPaid) {
    statusText = 'ผ่อนชำระหมดแล้ว';
    statusBg = 'bg-emerald-50 text-emerald-800 border border-emerald-200';
  } else {
    // Check if any unpaid installment is overdue
    const hasOverdue = schedule.some(row => !row.isPaid && row.status === 'Overdue');
    if (hasOverdue) {
      statusText = 'ค้างชำระ';
      statusBg = 'bg-red-50 text-red-700 border border-red-200';
    }
  }

  // Get localized Thai bank name icon/color accent
  const getBankAccent = (bank: string) => {
    const bankLower = bank.toLowerCase();
    if (bankLower.includes('กรุงไทย') || bankLower.includes('ktb')) {
      return { text: 'text-sky-600', label: 'ธนาคารกรุงไทย' };
    }
    if (bankLower.includes('กสิกร') || bankLower.includes('kbank')) {
      return { text: 'text-emerald-700', label: 'ธนาคารกสิกรไทย' };
    }
    if (bankLower.includes('ไทยพาณิชย์') || bankLower.includes('scb')) {
      return { text: 'text-purple-700', label: 'ธนาคารไทยพาณิชย์' };
    }
    if (bankLower.includes('ออมสิน') || bankLower.includes('gsb')) {
      return { text: 'text-pink-600', label: 'ธนาคารออมสิน' };
    }
    if (bankLower.includes('ธอส') || bankLower.includes('ghb')) {
      return { text: 'text-orange-600', label: 'ธนาคารอาคารสงเคราะห์' };
    }
    if (bankLower.includes('กรุงเทพ') || bankLower.includes('bbl')) {
      return { text: 'text-blue-800', label: 'ธนาคารกรุงเทพ' };
    }
    if (bankLower.includes('เกียรตินาคิน') || bankLower.includes('kkp')) {
      return { text: 'text-violet-600', label: 'ธนาคารเกียรตินาคินภัทร' };
    }
    if (bankLower.includes('ซีไอเอ็มบี') || bankLower.includes('cimb')) {
      return { text: 'text-red-600', label: 'ธนาคารซีไอเอ็มบี ไทย' };
    }
    if (bankLower.includes('ทิสโก้') || bankLower.includes('tisco')) {
      return { text: 'text-blue-600', label: 'ธนาคารทิสโก้' };
    }
    if (bankLower.includes('ไทยเครดิต')) {
      return { text: 'text-amber-800', label: 'ธนาคารไทยเครดิต' };
    }
    if (bankLower.includes('ไอซีบีซี') || bankLower.includes('icbc')) {
      return { text: 'text-red-700', label: 'ธนาคารไอซีบีซี' };
    }
    return { text: 'text-[#7d6840]', label: bank };
  };

  const bankAccent = getBankAccent(contract.bankName);

  const isInactive = contract.status === 'Closed' || contract.status === 'Refinanced';
  
  // Dynamic styling variables depending on status
  let cardBg = 'bg-[#fbfbfa]';
  let cardBorder = 'border-[#c0b298] hover:border-[#7d6840] hover:bg-white';
  let textPrimary = 'text-[#4a3e26]';
  let textSecondary = 'text-[#70644e]';
  let progressColor = 'bg-[#7d6840]';
  let stampBorderColor = 'border-[#7d6840]';
  let stampTextColor = 'text-[#7d6840]';
  let stampInnerBorder = 'border-[#7d6840]/35';
  let stampText = 'ผ่อนแล้ว';
  let stampValue = `${percentPaid}%`;

  if (contract.status === 'Closed') {
    cardBg = 'bg-[#f2efe9]/50';
    cardBorder = 'border-[#d3cbbe] hover:border-gray-400 hover:bg-[#f2efe9]/75';
    textPrimary = 'text-gray-500';
    textSecondary = 'text-gray-400';
    progressColor = 'bg-gray-400';
    stampBorderColor = 'border-gray-400';
    stampTextColor = 'text-gray-500';
    stampInnerBorder = 'border-gray-400/30';
    stampText = 'ปิดบัญชี';
    stampValue = '100%';
  } else if (contract.status === 'Refinanced') {
    cardBg = 'bg-[#f4f4f3]';
    cardBorder = 'border-[#e4dcba] hover:border-[#b39e60] hover:bg-[#f4f4f3]/80';
    textPrimary = 'text-[#6b5b3a]';
    textSecondary = 'text-[#8c7a52]';
    progressColor = 'bg-[#b39e60]';
    stampBorderColor = 'border-[#b39e60]';
    stampTextColor = 'text-[#6b5b3a]';
    stampInnerBorder = 'border-[#b39e60]/30';
    stampText = 'รีไฟแนนซ์';
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e, contract.id)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver && onDragOver(e, contract.id);
      }}
      onDrop={(e) => onDrop && onDrop(e, contract.id)}
      onDragEnd={(e) => onDragEnd && onDragEnd(e)}
      onClick={() => onSelect(contract.id)}
      className={`relative ${cardBg} border p-4.5 shadow-none rounded-xs transition-all duration-200 cursor-pointer group flex flex-col justify-between h-[210px] ${
        isDragging 
          ? 'opacity-40 border-dashed border-[#7d6840] bg-[#e8ebe0]/20' 
          : isInactive
            ? 'opacity-75 hover:opacity-100 ' + cardBorder
            : cardBorder
      }`}
    >
      {/* Retro corner brackets on card */}
      <div className={`absolute top-1.5 left-1.5 w-3 h-3 border-t border-l ${isInactive ? 'border-gray-300' : 'border-[#c0b298]/80 group-hover:border-[#7d6840]'} transition-colors`} />
      <div className={`absolute top-1.5 right-1.5 w-3 h-3 border-t border-r ${isInactive ? 'border-gray-300' : 'border-[#c0b298]/80 group-hover:border-[#7d6840]'} transition-colors`} />
      <div className={`absolute bottom-1.5 left-1.5 w-3 h-3 border-b border-l ${isInactive ? 'border-gray-300' : 'border-[#c0b298]/80 group-hover:border-[#7d6840]'} transition-colors`} />
      <div className={`absolute bottom-1.5 right-1.5 w-3 h-3 border-b border-r ${isInactive ? 'border-gray-300' : 'border-[#c0b298]/80 group-hover:border-[#7d6840]'} transition-colors`} />
 
      {/* Retro Ink Stamp [%ผ่อนแล้ว] overlapping the top-right corner */}
      <div className={`absolute -top-4 -right-4 w-[76px] h-[76px] rounded-full border-2 border-dashed ${stampBorderColor} bg-white shadow-sm flex flex-col items-center justify-center rotate-12 z-10 transition-transform group-hover:rotate-6 group-hover:scale-105`}>
        <div className={`absolute inset-0.5 rounded-full border border-double ${stampInnerBorder}`} />
        <div className="text-center">
          <div className={`text-[15px] font-mono font-black ${stampTextColor} tracking-tighter leading-none`}>
            {stampValue}
          </div>
          <div className={`text-[8px] ${stampTextColor} font-sans font-extrabold uppercase tracking-wider mt-0.5 leading-none`}>
            {stampText}
          </div>
        </div>
      </div>

      {/* Top Section */}
      <div className="pr-10">
        <div>
          {/* Bank name */}
          <div className={`flex items-center gap-1.5 text-xs ${textSecondary} font-medium mb-1 min-w-0`}>
            <Landmark className={`w-3.5 h-3.5 ${isInactive ? 'text-gray-400' : bankAccent.text} shrink-0`} />
            <span className="truncate">{bankAccent.label}</span>
          </div>
          {/* Contract Nickname */}
          <h3 className={`text-[16px] font-bold ${textPrimary} font-sans flex items-center gap-0.5 ${!isInactive ? 'group-hover:text-[#7d6840]' : ''} transition-colors line-clamp-1`}>
            {contract.nickname}
            <ArrowUpRight className={`w-3.5 h-3.5 opacity-0 ${!isInactive ? 'group-hover:opacity-100 text-[#7d6840]' : ''} transition-opacity shrink-0`} />
          </h3>
        </div>
      </div>

      {/* Middle Section (Remaining Balance & Progress) */}
      <div className="my-2.5 space-y-2">
        <div>
          <div className={`text-xl font-bold ${textPrimary} leading-none`}>
            {formatCurrency(remainingBalance)} <span className={`text-xs font-normal ${textSecondary}`}>บาท</span>
          </div>
          <div className={`text-[10px] ${textSecondary}/85 mt-1`}>
            คงเหลือ จากยอดกู้ {formatCurrency(originalAmount)} บ.
          </div>
        </div>

        {/* Progress Bar */}
        <div className={`w-full h-1 ${contract.status === 'Closed' ? 'bg-gray-300' : contract.status === 'Refinanced' ? 'bg-[#ebdcb2]/40' : 'bg-[#e6e4d5]'} rounded-full overflow-hidden`}>
          <div
            className={`h-full ${progressColor} rounded-full transition-all duration-500`}
            style={{ width: `${percentPaid}%` }}
          />
        </div>
      </div>

      {/* Bottom Row */}
      <div className={`flex items-center justify-between border-t ${isInactive ? 'border-gray-200' : 'border-[#e6e4d5]'} pt-2 mt-auto`}>
        <div className={`text-[11px] ${textSecondary} font-mono truncate mr-1`}>
          {nextDueDate ? `ดิวถัดไป: ${formatThaiDate(nextDueDate)}` : 'ผ่อนหมดแล้ว'}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Account status */}
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-xs border ${
            contract.status === 'Closed' 
              ? 'bg-gray-100 text-gray-600 border-gray-300' 
              : contract.status === 'Refinanced' 
                ? 'bg-[#FBF9EC] text-[#8c7a52] border-[#e4dcba]' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
          }`}>
            {contract.status === 'Closed' ? 'ปิดบัญชีแล้ว' : contract.status === 'Refinanced' ? 'รีไฟแนนซ์' : 'ปกติ (Active)'}
          </span>
          
          {/* Installment payment status */}
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-xs ${statusBg}`}>
            {statusText}
          </span>
        </div>
      </div>
    </div>
  );
}
