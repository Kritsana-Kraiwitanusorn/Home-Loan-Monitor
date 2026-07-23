import { LoanContract, PaymentRecord, AmortizationRow, InterestRate } from '../types';

/**
 * Formats a YYYY-MM-DD date string into a beautiful Thai Buddhist Era (BE) date
 * Example: "2026-08-05" -> "5 ส.ค. 2569"
 */
export function formatThaiDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  const thaiYear = year + 543;
  const thaiMonth = thaiMonths[month - 1] || '';

  return `${day} ${thaiMonth} ${thaiYear}`;
}

/**
 * Checks if a year is a leap year
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Calculates number of days between two date strings (YYYY-MM-DD)
 */
export function getDaysBetweenDates(d1Str: string, d2Str: string): number {
  const d1 = new Date(d1Str);
  const d2 = new Date(d2Str);
  
  // Set times to midnight to calculate exact day boundaries
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculates due date for a specific installment index
 */
export function calculateDueDate(startDateStr: string, installmentIndex: number, dueDay: number): string {
  const parts = startDateStr.split('-');
  if (parts.length !== 3) return startDateStr;

  const startYear = parseInt(parts[0], 10);
  const startMonth = parseInt(parts[1], 10);

  // InstallmentIndex is 1-indexed. Installment #1 is 1 month after start date
  let year = startYear;
  let month = startMonth + installmentIndex;

  while (month > 12) {
    month -= 12;
    year += 1;
  }

  // Find number of days in that month
  const daysInMonth = new Date(year, month, 0).getDate();
  const actualDay = Math.min(dueDay, daysInMonth);

  const yearStr = year.toString();
  const monthStr = month.toString().padStart(2, '0');
  const dayStr = actualDay.toString().padStart(2, '0');

  return `${yearStr}-${monthStr}-${dayStr}`;
}

/**
 * Generates the full amortization schedule for a contract
 */
export function generateAmortizationSchedule(
  contract: LoanContract,
  payments: PaymentRecord[]
): AmortizationRow[] {
  const schedule: AmortizationRow[] = [];
  let beginningBalance = contract.loanAmount;
  const todayStr = new Date().toISOString().split('T')[0];

  // Filter and sort payments for this contract
  const contractPayments = payments
    .filter(p => p.contractId === contract.id)
    .reduce((acc, p) => {
      acc[p.installmentIndex] = p;
      return acc;
    }, {} as Record<number, PaymentRecord>);

  // Sort interest rates by effective date ascending
  const sortedRates = [...contract.interestRates].sort(
    (a, b) => a.effectiveDate.localeCompare(b.effectiveDate)
  );

  const maxInstallments = Math.max(contract.totalMonths * 1.5, 360);

  for (let i = 1; i <= maxInstallments; i++) {
    if (beginningBalance <= 0.01) {
      break;
    }

    const dueDate = calculateDueDate(contract.startDate, i - 1, contract.dueDay);

    // Find applicable interest rate
    let activeRate = sortedRates[0]?.rate || 3.0;
    for (const r of sortedRates) {
      if (dueDate >= r.effectiveDate) {
        activeRate = r.rate;
      } else {
        break;
      }
    }

    // Find applicable installment amount
    let activeInstallment = contract.monthlyInstallment;
    if (contract.installmentSchedules && contract.installmentSchedules.length > 0) {
      const sortedInstallments = [...contract.installmentSchedules].sort(
        (a, b) => a.effectiveDate.localeCompare(b.effectiveDate)
      );
      for (const inst of sortedInstallments) {
        if (dueDate >= inst.effectiveDate) {
          activeInstallment = inst.amount;
        } else {
          break;
        }
      }
    }

    // Interest portion calculation based on chosen interestCalcMethod
    const calcMethod = contract.interestCalcMethod || 'monthly';
    let interestPortionRaw = 0;

    if (calcMethod === 'daily_365' || calcMethod === 'daily_actual' || calcMethod === 'yearly') {
      const prevDueDate = i === 1
        ? contract.startDate
        : calculateDueDate(contract.startDate, i - 2, contract.dueDay);
      const daysInPeriod = getDaysBetweenDates(prevDueDate, dueDate);

      let denominator = 365;
      if (calcMethod === 'daily_actual' || calcMethod === 'yearly') {
        const currentYear = parseInt(dueDate.split('-')[0], 10);
        denominator = isLeapYear(currentYear) ? 366 : 365;
      }

      interestPortionRaw = beginningBalance * (activeRate / 100) * (daysInPeriod / denominator);
    } else {
      // Default: 'monthly' - Simple Flat 1/12th
      interestPortionRaw = beginningBalance * (activeRate / 100 / 12);
    }

    const interestPortion = Math.round(interestPortionRaw * 100) / 100;

    const recordedPayment = contractPayments[i];
    let scheduledAmount = activeInstallment;
    let extraAmount = 0;
    let totalPaid = 0;
    let isPaid = false;
    let paymentDate: string | undefined;
    let note: string | undefined;
    let status: 'Paid' | 'Unpaid' | 'Overdue' = 'Unpaid';

    if (recordedPayment) {
      isPaid = true;
      paymentDate = recordedPayment.paymentDate;
      scheduledAmount = recordedPayment.scheduledAmount;
      extraAmount = recordedPayment.extraAmount;
      totalPaid = recordedPayment.totalPaid;
      note = recordedPayment.note;
      status = 'Paid';
    } else {
      // Unpaid or Overdue
      totalPaid = scheduledAmount;
      if (dueDate < todayStr && contract.status === 'Active') {
        status = 'Overdue';
      } else {
        status = 'Unpaid';
      }
    }

    // Principal portion calculation
    // If paid, it's what was actually paid minus the computed interest
    // If unpaid, it's the expected regular payment minus interest
    let actualInterest = isPaid ? Math.min(interestPortion, totalPaid) : Math.min(interestPortion, scheduledAmount);
    actualInterest = Math.round(actualInterest * 100) / 100;

    let principalPortion = totalPaid - actualInterest;
    if (principalPortion > beginningBalance) {
      principalPortion = beginningBalance;
      // Adjust totalPaid and extraAmount if overpaid past ending balance
      if (isPaid) {
        totalPaid = principalPortion + actualInterest;
      } else {
        scheduledAmount = principalPortion + actualInterest;
      }
    }
    principalPortion = Math.round(principalPortion * 100) / 100;

    const endingBalance = Math.max(0, Math.round((beginningBalance - principalPortion) * 100) / 100);

    schedule.push({
      installmentIndex: i,
      dueDate,
      interestRate: activeRate,
      beginningBalance,
      scheduledAmount: isPaid ? scheduledAmount : activeInstallment,
      extraAmount,
      interestPortion: actualInterest,
      principalPortion,
      endingBalance,
      isPaid,
      paymentDate,
      note,
      status
    });

    beginningBalance = endingBalance;
  }

  return schedule;
}

/**
 * Calculates high-level metrics for the entire portfolio
 */
export function calculateSummaryMetrics(
  contracts: LoanContract[],
  payments: PaymentRecord[]
) {
  let totalBalance = 0;
  let totalExtraPaid = 0;
  let nextInstallmentText = 'ไม่มีงวดถัดไป';
  let nextInstallmentDateStr = '';
  let nextInstallmentAmount = 0;

  const activeContracts = contracts.filter(c => c.status === 'Active');
  const todayStr = new Date().toISOString().split('T')[0];

  // Calculate remaining balance per active contract
  const contractBalances = activeContracts.map(c => {
    const sched = generateAmortizationSchedule(c, payments);
    // Find first unpaid row
    const firstUnpaid = sched.find(row => !row.isPaid);
    const balance = firstUnpaid ? firstUnpaid.beginningBalance : 0;
    
    // Find next payment info
    const nextUnpaid = sched.find(row => !row.isPaid);

    return {
      contract: c,
      balance,
      nextUnpaid,
      schedule: sched
    };
  });

  // 1. Total remaining balance across all active contracts
  totalBalance = contractBalances.reduce((sum, item) => sum + item.balance, 0);

  // 2. Accumulated extra payment
  totalExtraPaid = payments.reduce((sum, p) => sum + p.extraAmount, 0);

  // Breakdown of balances per contract
  const balancesBreakdown = contractBalances.map(item => ({
    contractId: item.contract.id,
    nickname: item.contract.nickname,
    bankName: item.contract.bankName,
    balance: item.balance
  }));

  // Breakdown of extra paid per contract
  const extraPaidBreakdown = activeContracts.map(c => {
    const extraAmount = payments
      .filter(p => p.contractId === c.id)
      .reduce((sum, p) => sum + p.extraAmount, 0);
    return {
      contractId: c.id,
      nickname: c.nickname,
      bankName: c.bankName,
      extraAmount
    };
  });

  // 3. Next payment across all active contracts, sorted by nearest due date
  const nextPayments = contractBalances
    .filter(item => item.nextUnpaid)
    .map(item => ({
      contractId: item.contract.id,
      nickname: item.contract.nickname,
      bankName: item.contract.bankName,
      dueDate: item.nextUnpaid!.dueDate,
      amount: item.contract.monthlyInstallment
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  if (nextPayments.length > 0) {
    const next = nextPayments[0];
    nextInstallmentDateStr = next.dueDate;
    nextInstallmentAmount = next.amount;
    nextInstallmentText = `งวดถัดไป · ${next.nickname}`;
  }

  // 4. Calculate all-time metrics for all contracts of all statuses
  let allTimeTotalPaid = 0;
  let allTimePrincipalPaid = 0;
  let allTimeInterestPaid = 0;

  const allTimeBreakdown = contracts.map(c => {
    const sched = generateAmortizationSchedule(c, payments);
    let contractTotalPaid = 0;
    let contractPrincipalPaid = 0;
    let contractInterestPaid = 0;
    
    sched.forEach(row => {
      if (row.isPaid) {
        contractPrincipalPaid += row.principalPortion;
        contractInterestPaid += row.interestPortion;
        contractTotalPaid += (row.principalPortion + row.interestPortion);
      }
    });

    allTimePrincipalPaid += contractPrincipalPaid;
    allTimeInterestPaid += contractInterestPaid;
    allTimeTotalPaid += contractTotalPaid;

    return {
      contractId: c.id,
      nickname: c.nickname,
      bankName: c.bankName,
      status: c.status,
      totalPaid: contractTotalPaid,
      principalPaid: contractPrincipalPaid,
      interestPaid: contractInterestPaid
    };
  }).filter(item => item.totalPaid > 0);

  return {
    totalBalance,
    totalExtraPaid,
    nextInstallmentText,
    nextInstallmentDateStr,
    nextInstallmentAmount,
    allNextPayments: nextPayments,
    balancesBreakdown,
    extraPaidBreakdown,
    allTimeTotalPaid,
    allTimePrincipalPaid,
    allTimeInterestPaid,
    allTimeBreakdown
  };
}

/**
 * Formats numbers into standard Thai currency string with commas
 * Example: 2797693 -> "2,797,693"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Exports amortization schedule to CSV string
 */
export function exportAmortizationToCSV(schedule: AmortizationRow[], contractNickname: string): string {
  const headers = [
    'งวดที่ (Installment)',
    'วันกำหนดจ่าย (Due Date)',
    'อัตราดอกเบี้ย (%) (Interest Rate)',
    'ยอดเงินต้นคงเหลือยกมา (Beginning Balance)',
    'ยอดค่างวดปกติ (Scheduled Payment)',
    'ยอดโปะเพิ่ม (Extra Payment)',
    'ตัดดอกเบี้ย (Interest Portion)',
    'ตัดเงินต้น (Principal Portion)',
    'ยอดคงเหลือ (Ending Balance)',
    'สถานะการจ่าย (Status)',
    'วันที่จ่ายจริง (Actual Payment Date)',
    'หมายเหตุ (Note)'
  ];

  const rows = schedule.map(row => [
    row.installmentIndex,
    row.dueDate,
    row.interestRate,
    row.beginningBalance,
    row.scheduledAmount,
    row.extraAmount,
    row.interestPortion,
    row.principalPortion,
    row.endingBalance,
    row.status === 'Paid' ? 'จ่ายแล้ว' : row.status === 'Overdue' ? 'ค้างจ่าย' : 'ยังไม่ถึงกำหนด',
    row.paymentDate || '-',
    row.note || '-'
  ]);

  return [
    `สัญญาสินเชื่อ: ${contractNickname}`,
    headers.join(','),
    ...rows.map(r => r.map(val => {
      // Escape commas in strings if any
      const s = String(val);
      return s.includes(',') ? `"${s}"` : s;
    }).join(','))
  ].join('\n');
}

/**
 * Exports payments history to CSV string
 */
export function exportPaymentsToCSV(payments: PaymentRecord[], contracts: LoanContract[]): string {
  const headers = [
    'สัญญา (Contract)',
    'งวดที่ (Installment)',
    'วันที่จ่ายจริง (Payment Date)',
    'ยอดตามงวดปกติ (Scheduled Paid)',
    'ยอดโปะเพิ่ม (Extra Paid)',
    'ยอดจ่ายรวมทั้งหมด (Total Paid)',
    'หมายเหตุ (Note)'
  ];

  const contractMap = contracts.reduce((acc, c) => {
    acc[c.id] = c.nickname;
    return acc;
  }, {} as Record<string, string>);

  const rows = payments.map(p => [
    contractMap[p.contractId] || 'ไม่ทราบสัญญา',
    p.installmentIndex,
    p.paymentDate,
    p.scheduledAmount,
    p.extraAmount,
    p.totalPaid,
    p.note || '-'
  ]);

  return [
    headers.join(','),
    ...rows.map(r => r.map(val => {
      const s = String(val);
      return s.includes(',') ? `"${s}"` : s;
    }).join(','))
  ].join('\n');
}
