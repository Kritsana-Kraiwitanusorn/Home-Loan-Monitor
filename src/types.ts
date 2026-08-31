export interface InterestRate {
  effectiveDate: string; // YYYY-MM-DD
  rate: number; // Annual rate as percentage (e.g., 3.5)
}

export interface InstallmentSchedule {
  effectiveDate: string; // YYYY-MM-DD
  amount: number; // Scheduled monthly payment amount
}

export interface LoanContract {
  id: string;
  userId: string;
  nickname: string;
  bankName: string;
  loanAmount: number;
  startDate: string; // YYYY-MM-DD
  totalMonths: number;
  monthlyInstallment: number; // Scheduled monthly payment amount
  dueDay: number; // Day of month (1-31)
  status: 'Active' | 'Closed' | 'Refinanced';
  interestRates: InterestRate[];
  interestCalcMethod?: 'daily_365' | 'daily_actual' | 'monthly' | 'yearly';
  installmentSchedules?: InstallmentSchedule[];
  responsiblePerson?: string; // e.g., 'Best', 'Koy', 'Best & Koy'
  plannedExtraPayment?: number; // Target extra payment per month
  createdAt: string;
  updatedAt: string;
  sortOrder?: number;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  contractId: string;
  installmentIndex: number; // 1-indexed installment number
  paymentDate: string; // YYYY-MM-DD
  scheduledAmount: number; // Required regular amount
  extraAmount: number; // Optional top-up / prepayment / โปะเพิ่ม
  totalPaid: number; // scheduledAmount + extraAmount
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AmortizationRow {
  installmentIndex: number;
  dueDate: string; // YYYY-MM-DD
  interestRate: number; // Annual rate in percent
  beginningBalance: number;
  scheduledAmount: number;
  extraAmount: number;
  interestPortion: number;
  principalPortion: number;
  endingBalance: number;
  isPaid: boolean;
  paymentDate?: string;
  note?: string;
  status: 'Paid' | 'Unpaid' | 'Overdue';
}
