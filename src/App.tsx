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
import ResponsibleModal from './components/ResponsibleModal';
import ToolsSidebar from './components/ToolsSidebar';
import AllTimeOverview from './components/AllTimeOverview';
import ContractCard from './components/ContractCard';
import ContractDetail from './components/ContractDetail';
import AuthModal from './components/AuthModal';
import AddContractModal from './components/AddContractModal';
import RecordPaymentModal from './components/RecordPaymentModal';
import DoughnutComparisonChart from './components/DoughnutComparisonChart';
import PrepaymentSimulator from './components/PrepaymentSimulator';
import RefinanceAnalysisSection from './components/RefinanceAnalysisSection';

import { Landmark, Plus, RefreshCw, HelpCircle, Calculator, Zap, LayoutDashboard, Layers, Filter, CheckCircle2, AlertCircle, Menu } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  const [contracts, setContracts] = useState<LoanContract[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  // Custom App Header Settings State
  const [appTitle, setAppTitle] = useState('บันทึกผ่อนบ้าน Best & Koy');
  const [houseNumber, setHouseNumber] = useState('บ้านเลขที่ 222/101');

  // Navigation & Tabs State
  const [activeTab, setActiveTab] = useState<'overview' | 'contracts'>('overview');
  const [contractsFilter, setContractsFilter] = useState<'all' | 'active' | 'closed'>('all');
  const [showToolsDrawer, setShowToolsDrawer] = useState(false);

  // Modals State
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
  const [showResponsibleModal, setShowResponsibleModal] = useState(false);


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

  // Handle Quick Update Contract (e.g. from Responsible section or inline edit)
  const handleUpdateContract = async (contractId: string, updates: Partial<LoanContract>) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'contracts', contractId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'contracts');
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
        responsiblePerson: 'Best',
        plannedExtraPayment: 10000,
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
        responsiblePerson: 'Koy',
        plannedExtraPayment: 5000,
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
        responsiblePerson: 'Best & Koy',
        plannedExtraPayment: 3000,
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

  const activeContractsCount = contracts.filter((c) => c.status === 'Active' || !c.status).length;
  const closedContractsCount = contracts.filter((c) => c.status === 'Closed' || c.status === 'Refinanced').length;

  const filteredContractsWithSchedules = contractsWithSchedules.filter(({ contract }) => {
    if (contractsFilter === 'active') {
      return contract.status === 'Active' || !contract.status;
    }
    if (contractsFilter === 'closed') {
      return contract.status === 'Closed' || contract.status === 'Refinanced';
    }
    return true;
  });

  const metrics = calculateSummaryMetrics(sortedContracts, payments);
  const activeContractDetails = sortedContracts.find((c) => c.id === selectedContractId);

  return (
    <div className="min-h-screen bg-[#e8ebe0] text-[#4a3e26] font-sans pb-16">
      <div className="max-w-6xl mx-auto px-4 py-4 md:px-6 md:py-6 space-y-6">
        
        {/* Header (Always Visible) */}
        <Header
          totalContractsCount={activeContractsCount}
          title={appTitle}
          houseNumber={houseNumber}
          onSaveSettings={handleSaveSettings}
        />

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
          /* DASHBOARD VIEW WITH TABS & ACTION TOOLBAR */
          <div className="space-y-6">
            
            {/* Primary Navigation Tabs & Actions Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-2.5 bg-[#fbfbfa] border border-[#c0b298] p-2 rounded-2xl shadow-2xs">
              
              {/* Left group: Tools Sidebar button + Tabs */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Sidebar Drawer Launcher */}
                <button
                  onClick={() => setShowToolsDrawer(true)}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-bold text-[#7d6840] hover:text-[#4a3e26] bg-[#f4f3ea] hover:bg-[#e8ebe0] border border-[#c0b298] transition-all shadow-2xs cursor-pointer group shrink-0"
                  title="เปิดเมนูเครื่องมือและการจัดการ (ผู้รับผิดชอบการชำระ, จำลองการโปะ, วิเคราะห์รีไฟแนนซ์)"
                >
                  <Menu className="w-4 h-4 text-[#7d6840] group-hover:scale-110 transition-transform shrink-0" />
                  <span>เมนู & เครื่องมือ</span>
                </button>

                <div className="h-6 w-[1px] bg-[#c0b298]/60 hidden sm:block mx-0.5" />

                {/* Tab 1: Overview */}
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'overview'
                      ? 'bg-[#7d6840] text-white shadow-xs'
                      : 'text-[#70644e] hover:bg-[#e8ebe0] hover:text-[#4a3e26]'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>ภาพรวมสินเชื่อ</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      activeTab === 'overview'
                        ? 'bg-white/20 text-white'
                        : 'bg-[#e8ebe0] text-[#70644e]'
                    }`}
                  >
                    Active: {activeContractsCount}
                  </span>
                </button>

                {/* Tab 2: Loan Contracts List */}
                <button
                  onClick={() => setActiveTab('contracts')}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'contracts'
                      ? 'bg-[#7d6840] text-white shadow-xs'
                      : 'text-[#70644e] hover:bg-[#e8ebe0] hover:text-[#4a3e26]'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>สัญญาสินเชื่อ</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      activeTab === 'contracts'
                        ? 'bg-white/20 text-white'
                        : 'bg-[#e8ebe0] text-[#70644e]'
                    }`}
                  >
                    {contracts.length} สัญญา
                  </span>
                </button>
              </div>

              {/* Right group: Add New Contract Button */}
              <div className="flex items-center ml-auto">
                <button
                  onClick={() => {
                    setEditingContract(null);
                    setShowAddContractModal(true);
                  }}
                  className="flex items-center gap-1.5 bg-[#7d6840] hover:bg-[#655230] text-white text-xs md:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer transform active:scale-95 shrink-0"
                  title="เพิ่มสัญญาสินเชื่อใหม่เข้าระบบ"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>เพิ่มสัญญาใหม่</span>
                </button>
              </div>
            </div>

            {/* Zero Contracts Empty State */}
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
              <>
                {/* TAB 1: OVERVIEW */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Top Overview Metric Cards */}
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
                )}

                {/* TAB 2: CONTRACTS LIST & FILTERING */}
                {activeTab === 'contracts' && (
                  <div className="space-y-4">
                    {/* Filter Bar & Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#fbfbfa] border border-[#c0b298] p-3.5 rounded-2xl shadow-2xs">
                      
                      {/* Status Filter Buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-[#70644e] uppercase flex items-center gap-1 mr-1">
                          <Filter className="w-3.5 h-3.5 text-[#7d6840]" />
                          กรองสถานะ:
                        </span>

                        <button
                          onClick={() => setContractsFilter('all')}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                            contractsFilter === 'all'
                              ? 'bg-[#7d6840] text-white border-[#7d6840] shadow-2xs'
                              : 'bg-[#f4f3ea] text-[#70644e] border-[#c0b298]/60 hover:bg-[#e8ebe0]'
                          }`}
                        >
                          ทั้งหมด ({contracts.length})
                        </button>

                        <button
                          onClick={() => setContractsFilter('active')}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                            contractsFilter === 'active'
                              ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>กำลังผ่อน / Active ({activeContractsCount})</span>
                        </button>

                        <button
                          onClick={() => setContractsFilter('closed')}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                            contractsFilter === 'closed'
                              ? 'bg-gray-800 text-white border-gray-800 shadow-2xs'
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>ปิดสัญญา / รีไฟแนนซ์แล้ว ({closedContractsCount})</span>
                        </button>
                      </div>
                    </div>

                    {/* Filtered Contracts Cards Grid */}
                    {filteredContractsWithSchedules.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {filteredContractsWithSchedules.map(({ contract, schedule }, index) => (
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
                            isLast={index === filteredContractsWithSchedules.length - 1}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="bg-[#fbfbfa] border border-[#c0b298] p-8 text-center rounded-2xl">
                        <p className="text-xs text-[#70644e]">
                          ไม่มีสัญญาในตัวกรองนี้ ({contractsFilter === 'active' ? 'กำลังผ่อน' : 'ปิดสัญญาแล้ว'})
                        </p>
                        <button
                          onClick={() => setContractsFilter('all')}
                          className="mt-3 text-xs text-[#7d6840] font-bold hover:underline cursor-pointer"
                        >
                          แสดงสัญญาทั้งหมด ({contracts.length})
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* DRAWER: LEFT TOOLS SIDEBAR (HAMBURGER MENU) */}
        <ToolsSidebar
          isOpen={showToolsDrawer}
          onClose={() => setShowToolsDrawer(false)}
          onOpenResponsible={() => setShowResponsibleModal(true)}
          onOpenSimulator={() => setShowSimulatorModal(true)}
          onOpenRefinance={() => setShowRefinanceModal(true)}
          onOpenAllTime={() => setShowAllTimeModal(true)}
          onPreseedDemo={handlePreseedMockData}
          contractsCount={contracts.length}
        />

        {/* MODAL: RESPONSIBLE BREAKDOWN */}
        <ResponsibleModal
          isOpen={showResponsibleModal}
          onClose={() => setShowResponsibleModal(false)}
          contracts={sortedContracts}
          payments={payments}
          onUpdateContract={handleUpdateContract}
        />

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
