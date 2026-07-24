import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { LoanContract, PaymentRecord } from './types';
import { calculateSummaryMetrics, generateAmortizationSchedule } from './lib/loanUtils';

// Components
import Header from './components/Header';
import Overview from './components/Overview';
import AllTimeOverview from './components/AllTimeOverview';
import ContractCard from './components/ContractCard';
import ContractDetail from './components/ContractDetail';
import AuthModal from './components/AuthModal';
import AddContractModal from './components/AddContractModal';
import RecordPaymentModal from './components/RecordPaymentModal';
import DoughnutComparisonChart from './components/DoughnutComparisonChart';
import PrepaymentSimulator from './components/PrepaymentSimulator';
import RefinanceAnalysisSection from './components/RefinanceAnalysisSection';

import { Landmark, Plus, RefreshCw, HelpCircle, Calculator, Zap } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  const [contracts, setContracts] = useState<LoanContract[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  // Custom App Header Settings State
  const [appTitle, setAppTitle] = useState('บันทึกผ่อนบ้าน Best & Koy');
  const [houseNumber, setHouseNumber] = useState('บ้านเลขที่ 222/101');

  // Navigation & Modals State
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [editingContract, setEditingContract] = useState<LoanContract | null>(null);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [preselectedInstallmentIndex, setPreselectedInstallmentIndex] = useState(1);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [draggedContractId, setDraggedContractId] = useState<string | null>(null);
  const [showAllTimeModal, setShowAllTimeModal] = useState(false);
  const [showRefinanceModal, setShowRefinanceModal] = useState(false);
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);


  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setAuthLoading(false);
      if (!authUser) {
        setContracts([]);
        setPayments([]);
        setSelectedContractId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Monitor Firestore Data (Real-time Sync)
  useEffect(() => {
    if (!user) return;

    setDataLoading(true);

    // 1. Listen to Contracts
    const contractsRef = collection(db, 'contracts');
    const contractsQuery = query(contractsRef, where('userId', '==', user.uid));
    
    const unsubscribeContracts = onSnapshot(
      contractsQuery,
      (snapshot) => {
        const list: LoanContract[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as LoanContract);
        });
        setContracts(list);
        setDataLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'contracts');
        setDataLoading(false);
      }
    );

    // 2. Listen to Payments
    const paymentsRef = collection(db, 'payments');
    const paymentsQuery = query(paymentsRef, where('userId', '==', user.uid));

    const unsubscribePayments = onSnapshot(
      paymentsQuery,
      (snapshot) => {
        const list: PaymentRecord[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as PaymentRecord);
        });
        setPayments(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'payments');
      }
    );

    // 3. Listen to Settings
    const settingsDocRef = doc(db, 'settings', user.uid);
    const unsubscribeSettings = onSnapshot(
      settingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.title) setAppTitle(data.title);
          if (data.houseNumber) setHouseNumber(data.houseNumber);
        } else {
          setAppTitle('บันทึกผ่อนบ้าน Best & Koy');
          setHouseNumber('บ้านเลขที่ 222/101');
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `settings/${user.uid}`);
      }
    );

    return () => {
      unsubscribeContracts();
      unsubscribePayments();
      unsubscribeSettings();
    };
  }, [user]);

  // Handle Save Contract (Create / Update)
  const handleSaveContract = async (contractData: Omit<LoanContract, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    const nowStr = new Date().toISOString();

    try {
      if (editingContract) {
        // Edit mode
        const docRef = doc(db, 'contracts', editingContract.id);
        await updateDoc(docRef, {
          ...contractData,
          updatedAt: nowStr
        });
      } else {
        // Add mode
        const colRef = collection(db, 'contracts');
        await addDoc(colRef, {
          ...contractData,
          userId: user.uid,
          createdAt: nowStr,
          updatedAt: nowStr
        });
      }
    } catch (error) {
      handleFirestoreError(error, editingContract ? OperationType.UPDATE : OperationType.CREATE, 'contracts');
    }
  };

  // Handle Delete Contract
  const handleDeleteContract = async (contractId: string) => {
    if (!user) return;

    try {
      // 1. Delete Contract document
      await deleteDoc(doc(db, 'contracts', contractId));

      // 2. Delete all related payments
      const paymentsRef = collection(db, 'payments');
      const q = query(
        paymentsRef,
        where('contractId', '==', contractId),
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);

      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      if (selectedContractId === contractId) {
        setSelectedContractId(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'contracts');
    }
  };

  // Handle Save Payment (Record actual installment pay)
  const handleSavePayment = async (
    paymentData: Omit<PaymentRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    paymentId?: string
  ) => {
    if (!user) return;
    const nowStr = new Date().toISOString();

    try {
      if (paymentId) {
        // Edit mode by specific ID
        const docRef = doc(db, 'payments', paymentId);
        await updateDoc(docRef, {
          ...paymentData,
          note: paymentData.note || '',
          updatedAt: nowStr
        });
      } else {
        // Add mode: check if this installment was already recorded. If so, delete old one.
        const paymentsRef = collection(db, 'payments');
        const q = query(
          paymentsRef,
          where('contractId', '==', paymentData.contractId),
          where('installmentIndex', '==', paymentData.installmentIndex),
          where('userId', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();

        // Add new payment record
        await addDoc(collection(db, 'payments'), {
          ...paymentData,
          note: paymentData.note || '',
          userId: user.uid,
          createdAt: nowStr,
          updatedAt: nowStr
        });
      }
    } catch (error) {
      handleFirestoreError(error, paymentId ? OperationType.UPDATE : OperationType.CREATE, 'payments');
    }
  };

  // Handle Delete Payment Record
  const handleDeletePayment = async (paymentId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'payments', paymentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'payments');
    }
  };

  // Handle CSV batch import of payments
  const handleImportPayments = async (parsedPayments: Array<Omit<PaymentRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => {
    if (!user) return;
    
    try {
      const batch = writeBatch(db);
      const nowStr = new Date().toISOString();

      parsedPayments.forEach((p) => {
        const docRef = doc(collection(db, 'payments'));
        batch.set(docRef, {
          ...p,
          note: p.note || '',
          userId: user.uid,
          createdAt: nowStr,
          updatedAt: nowStr
        });
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'payments');
    }
  };

  // Sort contracts helper: sortOrder asc, then createdAt asc
  const getSortedContractsList = (contractsList: LoanContract[]) => {
    return [...contractsList].sort((a, b) => {
      const aOrder = a.sortOrder !== undefined ? a.sortOrder : Number.MAX_SAFE_INTEGER;
      const bOrder = b.sortOrder !== undefined ? b.sortOrder : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  };

  // Reorder contracts in Firestore (Drag and drop)
  const handleReorderContracts = async (draggedId: string, targetId: string) => {
    if (!user) return;
    
    const sorted = getSortedContractsList(contracts);
    const draggedIdx = sorted.findIndex((c) => c.id === draggedId);
    const targetIdx = sorted.findIndex((c) => c.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1 || draggedIdx === targetIdx) return;

    const newList = [...sorted];
    const [removed] = newList.splice(draggedIdx, 1);
    newList.splice(targetIdx, 0, removed);

    const batch = writeBatch(db);
    newList.forEach((c, index) => {
      const docRef = doc(db, 'contracts', c.id);
      batch.update(docRef, {
        sortOrder: index,
        updatedAt: new Date().toISOString()
      });
    });

    setDataLoading(true);
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'contracts');
    } finally {
      setDataLoading(false);
    }
  };

  // Move contract position (arrow buttons)
  const handleMoveContract = async (contractId: string, direction: 'prev' | 'next') => {
    if (!user) return;
    
    const sorted = getSortedContractsList(contracts);
    const currentIdx = sorted.findIndex((c) => c.id === contractId);
    if (currentIdx === -1) return;

    const targetIdx = direction === 'prev' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const newList = [...sorted];
    const temp = newList[currentIdx];
    newList[currentIdx] = newList[targetIdx];
    newList[targetIdx] = temp;

    const batch = writeBatch(db);
    newList.forEach((c, index) => {
      const docRef = doc(db, 'contracts', c.id);
      batch.update(docRef, {
        sortOrder: index,
        updatedAt: new Date().toISOString()
      });
    });

    setDataLoading(true);
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'contracts');
    } finally {
      setDataLoading(false);
    }
  };

  // Pre-seed mock data matching the image.png exactly
  const handlePreseedMockData = async () => {
    if (!user) return;
    setDataLoading(true);

    try {
      const batch = writeBatch(db);
      const nowStr = new Date().toISOString();

      // Create Contract 1 (กรุงไทย)
      const c1Ref = doc(collection(db, 'contracts'));
      const c1Id = c1Ref.id;
      const c1Data = {
        userId: user.uid,
        nickname: 'สัญญาที่ 1',
        bankName: 'ธนาคารกรุงไทย',
        loanAmount: 2500000,
        startDate: '2026-01-01',
        totalMonths: 360,
        monthlyInstallment: 15000,
        dueDay: 5,
        status: 'Active',
        interestRates: [
          { effectiveDate: '2026-01-01', rate: 3.5 }
        ],
        createdAt: nowStr,
        updatedAt: nowStr
      };
      batch.set(c1Ref, c1Data);

      // Create Contract 2 (กสิกร)
      const c2Ref = doc(collection(db, 'contracts'));
      const c2Id = c2Ref.id;
      const c2Data = {
        userId: user.uid,
        nickname: 'สัญญาที่ 2',
        bankName: 'ธนาคารกสิกรไทย',
        loanAmount: 800000,
        startDate: '2026-01-01',
        totalMonths: 360,
        monthlyInstallment: 6000,
        dueDay: 10,
        status: 'Active',
        interestRates: [
          { effectiveDate: '2026-01-01', rate: 3.2 }
        ],
        createdAt: nowStr,
        updatedAt: nowStr
      };
      batch.set(c2Ref, c2Data);

      // Create Contract 3 (ไทยพาณิชย์)
      const c3Ref = doc(collection(db, 'contracts'));
      const c3Id = c3Ref.id;
      const c3Data = {
        userId: user.uid,
        nickname: 'สัญญาที่ 3',
        bankName: 'ธนาคารไทยพาณิชย์',
        loanAmount: 400000,
        startDate: '2026-01-01',
        totalMonths: 360,
        monthlyInstallment: 4500,
        dueDay: 15,
        status: 'Active',
        interestRates: [
          { effectiveDate: '2026-01-01', rate: 3.4 }
        ],
        createdAt: nowStr,
        updatedAt: nowStr
      };
      batch.set(c3Ref, c3Data);

      // Seed mock payments history to produce percentages matching mockup exactly (27%, 31%, 38%)
      // By paying regular payments + significant extra prepayments
      
      // Payments for Contract 1 (Targeting around ~27% paid, remaining ~1,941,865)
      // Let's record 12 months of payments, some with large prepayments
      const prepaysC1 = [10000, 15000, 20000, 15000, 25000, 10000, 15000, 30000, 10000, 20000, 15000, 12000];
      for (let m = 1; m <= 12; m++) {
        const pRef = doc(collection(db, 'payments'));
        const dateStr = `2026-${m.toString().padStart(2, '0')}-05`;
        const extra = prepaysC1[m - 1] || 10000;
        batch.set(pRef, {
          userId: user.uid,
          contractId: c1Id,
          installmentIndex: m,
          paymentDate: dateStr,
          scheduledAmount: 15000,
          extraAmount: extra,
          totalPaid: 15000 + extra,
          note: m === 8 ? 'โปะเพิ่มพิเศษช่วงเทศกาล' : 'ชำระรายเดือนพร้อมโปะเพิ่ม',
          createdAt: nowStr,
          updatedAt: nowStr
        });
      }

      // Payments for Contract 2 (Targeting around ~31% paid, remaining ~590,272)
      const prepaysC2 = [5000, 8000, 5000, 10000, 6000, 5000, 7000, 8000, 5000, 6000, 5000, 4000];
      for (let m = 1; m <= 12; m++) {
        const pRef = doc(collection(db, 'payments'));
        const dateStr = `2026-${m.toString().padStart(2, '0')}-10`;
        const extra = prepaysC2[m - 1] || 5000;
        batch.set(pRef, {
          userId: user.uid,
          contractId: c2Id,
          installmentIndex: m,
          paymentDate: dateStr,
          scheduledAmount: 6000,
          extraAmount: extra,
          totalPaid: 6000 + extra,
          note: 'ผ่อนชำระพร้อมยอดโปะปกติ',
          createdAt: nowStr,
          updatedAt: nowStr
        });
      }

      // Payments for Contract 3 (Targeting around ~38% paid, remaining ~265,556)
      const prepaysC3 = [3000, 4000, 3000, 5000, 3000, 4000, 3000, 5000, 3000, 4000, 3000, 3000];
      for (let m = 1; m <= 12; m++) {
        const pRef = doc(collection(db, 'payments'));
        const dateStr = `2026-${m.toString().padStart(2, '0')}-15`;
        const extra = prepaysC3[m - 1] || 3000;
        batch.set(pRef, {
          userId: user.uid,
          contractId: c3Id,
          installmentIndex: m,
          paymentDate: dateStr,
          scheduledAmount: 4500,
          extraAmount: extra,
          totalPaid: 4500 + extra,
          note: 'ตัดผ่านบัญชีเงินฝากออมทรัพย์',
          createdAt: nowStr,
          updatedAt: nowStr
        });
      }

      await batch.commit();
    } catch (err: any) {
      console.error(err);
    } finally {
      setDataLoading(false);
    }
  };

  // Handle Save App Header Settings
  const handleSaveSettings = async (newTitle: string, newHouseNumber: string) => {
    if (!user) return;
    try {
      const settingsDocRef = doc(db, 'settings', user.uid);
      const batch = writeBatch(db);
      batch.set(settingsDocRef, {
        userId: user.uid,
        title: newTitle,
        houseNumber: newHouseNumber,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `settings/${user.uid}`);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#e8ebe0] flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-[#7d6840] animate-spin mx-auto" />
          <p className="text-sm font-medium text-[#7d6840]">กำลังเริ่มต้นระบบบันทึกผ่อนบ้าน Best & Koy...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  const sortedContracts = getSortedContractsList(contracts);

  // Generate dynamic schedules for all contracts to calculate summary metrics
  const contractsWithSchedules = sortedContracts.map((c) => ({
    contract: c,
    schedule: generateAmortizationSchedule(c, payments)
  }));

  const metrics = calculateSummaryMetrics(sortedContracts, payments);
  const activeContractDetails = sortedContracts.find((c) => c.id === selectedContractId);

  return (
    <div className="min-h-screen bg-[#e8ebe0] text-[#4a3e26] font-sans pb-16">
      <div className="max-w-6xl mx-auto px-5 py-4 md:px-6 md:py-6 space-y-6">
        
        {/* Header & Overview Metrics for Dashboard view */}
        {!activeContractDetails ? (
          <div className="space-y-4 md:space-y-6">
            <Header
              totalContractsCount={contracts.filter((c) => c.status === 'Active' || !c.status).length}
              title={appTitle}
              houseNumber={houseNumber}
              onSaveSettings={handleSaveSettings}
            />
            <Overview
              totalBalance={metrics.totalBalance}
              monthChangePercent={metrics.monthChangePercent}
              totalExtraPaid={metrics.totalExtraPaid}
              allTimePrincipalPaid={metrics.allTimePrincipalPaid}
              allTimeInterestPaid={metrics.allTimeInterestPaid}
              interestPercentageOfHomeValue={metrics.interestPercentageOfHomeValue}
              remainingYearsMonthsStr={metrics.remainingYearsMonthsStr}
              nextInstallmentText={metrics.nextInstallmentText}
              nextInstallmentDateStr={metrics.nextInstallmentDateStr}
              nextInstallmentAmount={metrics.nextInstallmentAmount}
              allNextPayments={metrics.allNextPayments}
              balancesBreakdown={metrics.balancesBreakdown}
              extraPaidBreakdown={metrics.extraPaidBreakdown}
              principalPaidBreakdown={metrics.principalPaidBreakdown}
              interestPaidBreakdown={metrics.interestPaidBreakdown}
            />
          </div>
        ) : (
          <Header
            totalContractsCount={contracts.filter((c) => c.status === 'Active' || !c.status).length}
            title={appTitle}
            houseNumber={houseNumber}
            onSaveSettings={handleSaveSettings}
          />
        )}

        {/* Loading Overlay for Firestore mutations */}
        {dataLoading && (
          <div className="flex items-center justify-center p-3 bg-white border border-[#c0b298] text-xs text-[#7d6840] font-semibold gap-2 animate-pulse rounded-xl shadow-xs">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>กำลังซิงค์ข้อมูลกับระบบคลาวด์ Firebase...</span>
          </div>
        )}

        {/* Main Section Route Switcher */}
        {activeContractDetails ? (
          /* CONTRACT DETAIL VIEW */
          <ContractDetail
            contract={activeContractDetails}
            payments={payments}
            onBack={() => setSelectedContractId(null)}
            onEditContract={() => {
              setEditingContract(activeContractDetails);
              setShowAddContractModal(true);
            }}
            onRecordPayment={(idx) => {
              setPreselectedInstallmentIndex(idx || 1);
              setEditingPayment(null);
              setShowRecordPaymentModal(true);
            }}
            onEditPayment={(payment) => {
              setEditingPayment(payment);
              setShowRecordPaymentModal(true);
            }}
            onDeletePayment={handleDeletePayment}
            onImportPayments={handleImportPayments}
          />
        ) : (
          /* DASHBOARD SUMMARY VIEW */
          <div className="space-y-6">
            {/* If zero contracts, show nice empty state with mock data prompt */}
            {contracts.length === 0 ? (
              <div className="relative bg-[#fbfbfa] border border-[#c0b298]/80 p-10 text-center rounded-2xl shadow-sm space-y-6">
                <div className="inline-flex p-4 rounded-full bg-[#e8ebe0] border border-[#c0b298] text-[#7d6840]">
                  <Landmark className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-[#4a3e26] font-serif">ยังไม่มีบัญชีสัญญาสินเชื่อบ้าน</h3>
                  <p className="text-xs text-[#70644e] max-w-md mx-auto leading-relaxed">
                    เพิ่มสัญญาสินเชื่อบ้านครั้งแรกของคุณเพื่อคำนวณตารางดอกเบี้ย และบันทึกยอดชำระจริงในแต่ละงวด หรือคลิกปุ่มด้านล่างเพื่อสร้างข้อมูลทดลองเพื่อทดสอบการทำงานของระบบ
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setEditingContract(null);
                      setShowAddContractModal(true);
                    }}
                    className="flex items-center gap-2 py-2.5 px-6 bg-[#7d6840] hover:bg-[#685533] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>เพิ่มสัญญาสินเชื่อแรก</span>
                  </button>

                  <button
                    onClick={handlePreseedMockData}
                    className="flex items-center gap-2 py-2.5 px-6 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>สร้างข้อมูลสัญญาทดลองตามต้นแบบ (Pre-seed demo)</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVE DASHBOARD ANALYTICS & CONTRACT CARDS */
              <div className="space-y-6">
                {/* Section 1: Active Contracts List & Action Toolbar */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <h2 className="text-lg font-bold text-[#4a3e26] font-sans">
                      สัญญาสินเชื่อทั้งหมด ({contracts.length} สัญญา)
                    </h2>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setShowSimulatorModal(true)}
                        className="flex items-center gap-1.5 bg-teal-50 border border-teal-300 hover:bg-teal-100 text-teal-900 text-xs font-semibold px-3.5 py-2 shadow-xs rounded-xl transition-colors cursor-pointer"
                        title="ทดลองปรับยอดโปะเพิ่มต่อเดือนเพื่อดูสถิติการปิดบัญชีเร็วขึ้น"
                      >
                        <Zap className="w-3.5 h-3.5 text-teal-700" />
                        <span>จำลองการโปะ</span>
                      </button>

                      <button
                        onClick={() => setShowRefinanceModal(true)}
                        className="flex items-center gap-1.5 bg-amber-50/80 border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-semibold px-3.5 py-2 shadow-xs rounded-xl transition-colors cursor-pointer"
                        title="เปรียบเทียบความคุ้มค่าการรีไฟแนนซ์หรือขอลดดอกเบี้ย"
                      >
                        <Calculator className="w-3.5 h-3.5 text-amber-700" />
                        <span>วิเคราะห์รีไฟแนนซ์</span>
                      </button>

                      {contracts.length > 0 && (
                        <button
                          onClick={() => setShowAllTimeModal(true)}
                          className="flex items-center gap-1.5 bg-[#fbfbfa] border border-[#c0b298] hover:bg-[#e6e4d5]/50 text-[#7d6840] hover:text-[#5e4e2f] text-xs font-semibold px-3.5 py-2 shadow-xs rounded-xl transition-colors cursor-pointer"
                          title="ดูสรุปสถิติจ่ายรวมสะสมทั้งหมดของทุกบัญชี"
                        >
                          <span>ยอดชำระสะสมทั้งหมด</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setEditingContract(null);
                          setShowAddContractModal(true);
                        }}
                        className="flex items-center gap-1.5 bg-[#7d6840] hover:bg-[#685533] text-white text-xs font-semibold px-3.5 py-2 shadow-xs rounded-xl transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เพิ่มสัญญาสินเชื่อ</span>
                      </button>
                    </div>
                  </div>

                  {/* Contracts Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {contractsWithSchedules.map(({ contract, schedule }, index) => (
                      <ContractCard
                        key={contract.id}
                        contract={contract}
                        schedule={schedule}
                        onSelect={(id) => setSelectedContractId(id)}
                        onDragStart={(e, id) => {
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggedContractId(id);
                        }}
                        onDragOver={(e, id) => {
                          e.preventDefault();
                        }}
                        onDrop={(e, id) => {
                          e.preventDefault();
                          if (draggedContractId && draggedContractId !== id) {
                            handleReorderContracts(draggedContractId, id);
                          }
                        }}
                        onDragEnd={() => {
                          setDraggedContractId(null);
                        }}
                        isDragging={draggedContractId === contract.id}
                        onMove={handleMoveContract}
                        isFirst={index === 0}
                        isLast={index === contractsWithSchedules.length - 1}
                      />
                    ))}
                  </div>
                </div>

                {/* Seed demo data reminder */}
                <div className="text-center mt-6">
                  <button
                    onClick={handlePreseedMockData}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#7d6840] transition-colors cursor-pointer"
                    title="คลิกเพื่อรีเซ็ตหรือเขียนข้อมูลสัญญาทดลองทับลงบนคลาวด์ของคุณ"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>ต้องการโหลดตัวอย่างสัญญาทั้ง 3 ตามรูปภาพสกรีนช็อตหรือไม่? คลิกเพื่อสร้างตัวอย่าง</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODAL: ADD / EDIT CONTRACT */}
        {showAddContractModal && (
          <AddContractModal
            contract={editingContract}
            onClose={() => {
              setShowAddContractModal(false);
              setEditingContract(null);
            }}
            onSave={handleSaveContract}
            onDelete={editingContract ? () => handleDeleteContract(editingContract.id) : undefined}
          />
        )}

        {/* MODAL: RECORD PAYMENT */}
        {showRecordPaymentModal && (
          <RecordPaymentModal
            contracts={contracts}
            selectedContractId={selectedContractId || undefined}
            nextInstallmentIndex={preselectedInstallmentIndex}
            onClose={() => {
              setShowRecordPaymentModal(false);
              setEditingPayment(null);
            }}
            onSave={handleSavePayment}
            editingPayment={editingPayment}
          />
        )}

        {/* MODAL: ALL TIME OVERVIEW */}
        <AllTimeOverview
          isOpen={showAllTimeModal}
          onClose={() => setShowAllTimeModal(false)}
          allTimeTotalPaid={metrics.allTimeTotalPaid}
          allTimePrincipalPaid={metrics.allTimePrincipalPaid}
          allTimeInterestPaid={metrics.allTimeInterestPaid}
          totalRemainingBalance={metrics.totalBalance}
          allTimeBreakdown={metrics.allTimeBreakdown}
        />

        {/* MODAL: REFINANCE ANALYSIS */}
        <RefinanceAnalysisSection
          isOpen={showRefinanceModal}
          onClose={() => setShowRefinanceModal(false)}
          contracts={contracts}
          payments={payments}
        />

        {/* MODAL: PREPAYMENT SIMULATOR */}
        {showSimulatorModal && (
          <PrepaymentSimulator
            isOpen={showSimulatorModal}
            onClose={() => setShowSimulatorModal(false)}
            contracts={contracts}
            payments={payments}
          />
        )}
      </div>
    </div>
  );
}
