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

  // 1b. Total initial loan amount across active contracts
  const totalOriginalLoanAmount = activeContracts.reduce((sum, c) => sum + c.loanAmount, 0);

  // 1c. Maximum remaining unpaid months across active contracts
  let remainingMonths = 0;
  contractBalances.forEach(item => {
    const unpaidCount = item.schedule.filter(row => !row.isPaid).length;
    if (unpaidCount > remainingMonths) {
      remainingMonths = unpaidCount;
    }
  });

  const remainingYears = Math.floor(remainingMonths / 12);
  const remainingMonthsRem = remainingMonths % 12;
  const remainingYearsMonthsStr = remainingYears > 0 
    ? `${remainingYears} ปี${remainingMonthsRem > 0 ? ` ${remainingMonthsRem} เดือน` : ''}`
    : `${remainingMonthsRem} เดือน`;

  // 1d. Estimate previous month's balance or principal paid in last paid month for % reduction calculation
  let lastMonthPrincipalPaid = 0;
  contractBalances.forEach(item => {
    const paidRows = item.schedule.filter(r => r.isPaid);
    if (paidRows.length > 0) {
      const lastPaid = paidRows[paidRows.length - 1];
      lastMonthPrincipalPaid += lastPaid.principalPortion;
    }
  });
  const prevBalanceEstimate = totalBalance + lastMonthPrincipalPaid;
  const monthChangePercent = prevBalanceEstimate > 0 
    ? Math.round((lastMonthPrincipalPaid / prevBalanceEstimate) * 100 * 10) / 10
    : 0;

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

  // Calculate % interest paid of initial home value
  const interestPercentageOfHomeValue = totalOriginalLoanAmount > 0
    ? Math.round((allTimeInterestPaid / totalOriginalLoanAmount) * 100 * 10) / 10
    : 0;

  // Interest breakdown for active contracts
  const interestPaidBreakdown = activeContracts.map(c => {
    const found = allTimeBreakdown.find(b => b.contractId === c.id);
    return {
      contractId: c.id,
      nickname: c.nickname,
      bankName: c.bankName,
      interestPaid: found ? found.interestPaid : 0
    };
  });

  // Principal breakdown for active contracts
  const principalPaidBreakdown = activeContracts.map(c => {
    const found = allTimeBreakdown.find(b => b.contractId === c.id);
    return {
      contractId: c.id,
      nickname: c.nickname,
      bankName: c.bankName,
      principalPaid: found ? found.principalPaid : 0
    };
  });

  return {
    totalBalance,
    totalOriginalLoanAmount,
    monthChangePercent,
    remainingMonths,
    remainingYearsMonthsStr,
    totalExtraPaid,
    nextInstallmentText,
    nextInstallmentDateStr,
    nextInstallmentAmount,
    allNextPayments: nextPayments,
    balancesBreakdown,
    extraPaidBreakdown,
    interestPaidBreakdown,
    principalPaidBreakdown,
    interestPercentageOfHomeValue,
    allTimeTotalPaid,
    allTimePrincipalPaid,
    allTimeInterestPaid,
    allTimeBreakdown
  };
}

/**
 * Simulates prepayment across active contracts
 */
export function simulatePrepayment(
  contracts: LoanContract[],
  payments: PaymentRecord[],
  monthlyExtra: number
) {
  const activeContracts = contracts.filter(c => c.status === 'Active');
  if (activeContracts.length === 0) {
    return {
      normalMonths: 0,
      simulatedMonths: 0,
      monthsSaved: 0,
      yearsSavedStr: '0 ปี 0 เดือน',
      normalTotalInterest: 0,
      simulatedTotalInterest: 0,
      interestSaved: 0,
      curveData: []
    };
  }

  // 1. Prepare initial state for each active contract
  const contractInfos = activeContracts.map(c => {
    const sched = generateAmortizationSchedule(c, payments);
    const unpaidRows = sched.filter(r => !r.isPaid);
    const initialBalance = unpaidRows.length > 0 ? unpaidRows[0].beginningBalance : 0;

    return {
      contract: c,
      unpaidRows,
      initialBalance,
      termMonths: c.totalMonths || 360
    };
  });

  const totalCurrentBalance = contractInfos.reduce((sum, ci) => sum + ci.initialBalance, 0);

  // 2. NORMAL SCHEDULE ACCURATE SNAPSHOTS & METRICS
  let normalMaxMonths = 0;
  let normalFutureInterest = 0;

  contractInfos.forEach(ci => {
    if (ci.unpaidRows.length > normalMaxMonths) {
      normalMaxMonths = ci.unpaidRows.length;
    }
    normalFutureInterest += ci.unpaidRows.reduce((sum, r) => sum + r.interestPortion, 0);
  });

  const maxYearsNormal = Math.max(1, Math.ceil(normalMaxMonths / 12));
  const yearlyNormalSnapshots: number[] = [totalCurrentBalance];

  for (let y = 1; y <= maxYearsNormal; y++) {
    const targetMonthIdx = y * 12;
    let normalSum = 0;
    contractInfos.forEach(ci => {
      if (targetMonthIdx <= ci.unpaidRows.length) {
        normalSum += ci.unpaidRows[targetMonthIdx - 1].endingBalance;
      } else {
        normalSum += 0;
      }
    });
    yearlyNormalSnapshots[y] = Math.max(0, Math.round(normalSum));
  }

  // 3. PREPAYMENT SIMULATION WITH MONTHLY EXTRA PAYMENT
  let simulatedFutureInterest = 0;
  let simulatedMaxMonths = 0;
  const yearlySimulatedSnapshots: number[] = [totalCurrentBalance];

  // Current balance state for each contract
  const simState = contractInfos.map(ci => ({
    contract: ci.contract,
    balance: ci.initialBalance,
    sortedRates: [...ci.contract.interestRates].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate)),
    sortedInstallments: ci.contract.installmentSchedules && ci.contract.installmentSchedules.length > 0
      ? [...ci.contract.installmentSchedules].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
      : []
  }));

  let monthIndex = 0;
  const maxSimMonths = Math.max(600, normalMaxMonths + 24);

  while (simState.some(s => s.balance > 0.01) && monthIndex < maxSimMonths) {
    monthIndex++;

    const currentSimDate = new Date();
    currentSimDate.setMonth(currentSimDate.getMonth() + monthIndex);
    const dateStr = currentSimDate.toISOString().split('T')[0];

    // Calculate interest for each active contract
    const activeDetails = simState.map(s => {
      if (s.balance <= 0.01) {
        return { ...s, activeRate: 0, activeInstallment: 0, interest: 0 };
      }

      let activeRate = s.sortedRates[0]?.rate || 3.5;
      for (const r of s.sortedRates) {
        if (dateStr >= r.effectiveDate) activeRate = r.rate;
        else break;
      }

      let activeInstallment = s.contract.monthlyInstallment;
      for (const inst of s.sortedInstallments) {
        if (dateStr >= inst.effectiveDate) activeInstallment = inst.amount;
        else break;
      }

      const interest = Math.round((s.balance * (activeRate / 100 / 12)) * 100) / 100;
      return { ...s, activeRate, activeInstallment, interest };
    });

    activeDetails.forEach(ad => {
      simulatedFutureInterest += ad.interest;
    });

    // Extra payment allocation: highest interest rate contract first
    let remainingExtra = monthlyExtra;
    const sortedIndices = activeDetails
      .map((ad, idx) => ({ idx, rate: ad.activeRate, bal: ad.balance }))
      .filter(item => item.bal > 0.01)
      .sort((a, b) => b.rate - a.rate);

    simState.forEach((s, idx) => {
      if (s.balance <= 0.01) return;
      const ad = activeDetails[idx];

      let regPrincipal = ad.activeInstallment - ad.interest;
      if (regPrincipal < 0) regPrincipal = 0;
      if (regPrincipal > s.balance) regPrincipal = s.balance;

      let extraAllocated = 0;
      if (remainingExtra > 0) {
        const isHighestRate = sortedIndices[0]?.idx === idx;
        if (isHighestRate) {
          const maxExtraNeeded = Math.max(0, s.balance - regPrincipal);
          extraAllocated = Math.min(remainingExtra, maxExtraNeeded);
          remainingExtra -= extraAllocated;
        }
      }

      const totalPrincipal = Math.min(s.balance, regPrincipal + extraAllocated);
      s.balance = Math.max(0, Math.round((s.balance - totalPrincipal) * 100) / 100);
    });

    if (monthIndex % 12 === 0) {
      const yearIdx = monthIndex / 12;
      const totalSimBal = simState.reduce((sum, s) => sum + s.balance, 0);
      yearlySimulatedSnapshots[yearIdx] = Math.max(0, Math.round(totalSimBal));
    }

    if (simState.every(s => s.balance <= 0.01) && simulatedMaxMonths === 0) {
      simulatedMaxMonths = monthIndex;
      const finalYearIdx = Math.ceil(monthIndex / 12);
      for (let y = finalYearIdx; y <= maxYearsNormal; y++) {
        yearlySimulatedSnapshots[y] = 0;
      }
      break;
    }
  }

  if (simulatedMaxMonths === 0) simulatedMaxMonths = normalMaxMonths;

  const currentYear = new Date().getFullYear();
  const monthsSaved = Math.max(0, normalMaxMonths - simulatedMaxMonths);
  const yearsSaved = Math.floor(monthsSaved / 12);
  const remMonthsSaved = monthsSaved % 12;
  const yearsSavedStr = yearsSaved > 0 
    ? `${yearsSaved} ปี ${remMonthsSaved} เดือน`
    : `${remMonthsSaved} เดือน`;

  const normalFinishYear = currentYear + Math.ceil(normalMaxMonths / 12);
  const simulatedFinishYear = currentYear + Math.ceil(simulatedMaxMonths / 12);

  const interestSaved = Math.max(0, normalFutureInterest - simulatedFutureInterest);

  const maxYears = Math.max(1, Math.ceil(normalMaxMonths / 12));

  let yearStep = 1;
  if (maxYears > 30) {
    yearStep = 5;
  } else if (maxYears > 20) {
    yearStep = 3;
  } else if (maxYears > 10) {
    yearStep = 2;
  } else {
    yearStep = 1;
  }

  const selectedYearsSet = new Set<number>();
  selectedYearsSet.add(0);
  for (let y = yearStep; y < maxYears; y += yearStep) {
    selectedYearsSet.add(y);
  }
  selectedYearsSet.add(maxYears);

  const sortedYears = Array.from(selectedYearsSet).sort((a, b) => a - b);
  const curveData = sortedYears.map(y => {
    const yearLabel = y === 0 ? 'ปัจจุบัน' : `ปีที่ ${y}`;

    let normalBal = yearlyNormalSnapshots[y];
    if (normalBal === undefined) {
      normalBal = y * 12 >= normalMaxMonths ? 0 : (yearlyNormalSnapshots[yearlyNormalSnapshots.length - 1] || 0);
    }

    let simBal = yearlySimulatedSnapshots[y];
    if (simBal === undefined) {
      simBal = y * 12 >= simulatedMaxMonths ? 0 : 0;
    }

    return {
      yearLabel,
      normalBalance: Math.max(0, Math.round(normalBal)),
      simulatedBalance: Math.max(0, Math.round(simBal))
    };
  });

  return {
    normalMonths: normalMaxMonths,
    simulatedMonths: simulatedMaxMonths,
    monthsSaved,
    yearsSaved,
    remMonthsSaved,
    yearsSavedStr,
    normalFinishYear,
    simulatedFinishYear,
    normalTotalInterest: Math.round(normalFutureInterest),
    simulatedTotalInterest: Math.round(simulatedFutureInterest),
    interestSaved: Math.round(interestSaved),
    curveData
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
