import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { LogOut, Home, User, Edit2, Check, X } from 'lucide-react';

interface HeaderProps {
  totalContractsCount: number;
  title: string;
  houseNumber: string;
  onSaveSettings: (title: string, houseNumber: string) => Promise<void>;
}

export default function Header({
  totalContractsCount,
  title,
  houseNumber,
  onSaveSettings
}: HeaderProps) {
  const user = auth.currentUser;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);

  const [isEditingHouse, setIsEditingHouse] = useState(false);
  const [tempHouse, setTempHouse] = useState(houseNumber);

  // Update local states when props change
  useEffect(() => {
    setTempTitle(title);
  }, [title]);

  useEffect(() => {
    setTempHouse(houseNumber);
  }, [houseNumber]);

  const handleSignOut = () => {
    signOut(auth);
  };

  const handleSaveTitle = async () => {
    if (tempTitle.trim() === '') {
      setTempTitle(title);
      setIsEditingTitle(false);
      return;
    }
    setIsEditingTitle(false);
    await onSaveSettings(tempTitle.trim(), houseNumber);
  };

  const handleSaveHouse = async () => {
    if (tempHouse.trim() === '') {
      setTempHouse(houseNumber);
      setIsEditingHouse(false);
      return;
    }
    setIsEditingHouse(false);
    await onSaveSettings(title, tempHouse.trim());
  };

  return (
    <header className="relative w-full bg-[#fbfbfa] border border-[#c0b298] p-4 sm:p-5 md:p-6 shadow-sm rounded-none">
      {/* Vintage style corner brackets */}
      <div className="absolute top-2 left-2 w-5 h-5 border-t border-l border-[#7d6840]" />
      <div className="absolute top-2 right-2 w-5 h-5 border-t border-r border-[#7d6840]" />
      <div className="absolute bottom-2 left-2 w-5 h-5 border-b border-l border-[#7d6840]" />
      <div className="absolute bottom-2 right-2 w-5 h-5 border-b border-r border-[#7d6840]" />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left Side: Title */}
        <div className="flex items-start gap-3 w-full md:w-auto">
          <div className="space-y-1 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-[10px] md:text-xs tracking-widest text-[#7d6840] font-medium font-sans uppercase">
                บันทึกภาระผูกพัน · HOME LOAN LEDGER
              </span>
            </div>
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full">
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') {
                      setTempTitle(title);
                      setIsEditingTitle(false);
                    }
                  }}
                  className="text-lg sm:text-xl md:text-2xl font-bold text-[#4a3e26] font-sans border-b border-[#7d6840] bg-transparent focus:outline-none focus:border-b-2 py-0.5 w-full sm:max-w-[450px]"
                  autoFocus
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={handleSaveTitle} className="p-1.5 text-emerald-700 hover:bg-[#e8ebe0] rounded-sm cursor-pointer" title="บันทึก">
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setTempTitle(title);
                      setIsEditingTitle(false);
                    }}
                    className="p-1.5 text-red-600 hover:bg-[#e8ebe0] rounded-sm cursor-pointer"
                    title="ยกเลิก"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <h1 
                onClick={() => setIsEditingTitle(true)}
                className="group flex items-center gap-2 text-xl sm:text-2xl md:text-3xl font-bold text-[#4a3e26] font-sans cursor-pointer hover:bg-[#ebdcb2]/20 px-2 py-0.5 -ml-2 rounded-lg transition-all duration-150 break-words"
                title="คลิกเพื่อแก้ไขชื่อบันทึก"
              >
                <span>{title}</span>
                <Edit2 className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </h1>
            )}
          </div>
        </div>

        {/* Right Side: House Count + User Profile */}
        <div className="flex flex-wrap items-center md:items-end justify-between md:justify-end gap-3 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-[#e6e4d5]">
          <div className="flex flex-col md:items-end gap-1.5 w-full md:w-auto">
            {/* House Count Banner */}
            <div className="inline-flex items-center gap-2 text-xs md:text-sm text-[#7d6840] font-medium flex-wrap">
              <Home className="w-4 h-4 shrink-0" />
              {isEditingHouse ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input
                    type="text"
                    value={tempHouse}
                    onChange={(e) => setTempHouse(e.target.value)}
                    onBlur={handleSaveHouse}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveHouse();
                      if (e.key === 'Escape') {
                        setTempHouse(houseNumber);
                        setIsEditingHouse(false);
                      }
                    }}
                    className="text-xs md:text-sm text-[#7d6840] font-sans border-b border-[#7d6840] bg-transparent focus:outline-none focus:border-b-2 py-0.5 w-28 sm:w-36 font-medium"
                    autoFocus
                  />
                  <span>· {totalContractsCount} สัญญา</span>
                  <button onClick={handleSaveHouse} className="p-1 text-emerald-700 hover:bg-[#e8ebe0] rounded-xs cursor-pointer" title="บันทึก">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setTempHouse(houseNumber);
                      setIsEditingHouse(false);
                    }}
                    className="p-1 text-red-600 hover:bg-[#e8ebe0] rounded-xs cursor-pointer"
                    title="ยกเลิก"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingHouse(true)}
                  className="group inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#ebdcb2]/20 px-1.5 py-0.5 rounded-sm transition-all duration-150"
                  title="คลิกเพื่อแก้ไขบ้านเลขที่"
                >
                  <span>{houseNumber} · {totalContractsCount} สัญญา</span>
                  <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              )}
            </div>

            {/* User Profile & Logout */}
            {user && (
              <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-[#70644e] w-full md:w-auto">
                <div className="flex items-center gap-1.5 bg-[#e8ebe0] px-2.5 py-1 border border-[#e6e4d5] rounded-lg">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-4 h-4 rounded-full shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-3 h-3 text-[#7d6840] shrink-0" />
                  )}
                  <span className="max-w-[120px] sm:max-w-[160px] truncate font-medium">{user.displayName || user.email}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-[#e8ebe0] text-[#7d6840] hover:text-red-700 transition-colors duration-200 cursor-pointer shrink-0"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
