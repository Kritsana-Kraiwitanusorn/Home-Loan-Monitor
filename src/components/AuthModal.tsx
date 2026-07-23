import React, { useState } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { LogIn, Landmark, ShieldCheck, HeartHandshake, Mail, Lock, UserPlus, Sparkles } from 'lucide-react';

export default function AuthModal() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Email / Password Form States
  const [activeTab, setActiveTab] = useState<'google_demo' | 'email_form'>('google_demo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  // 1. Google Auth Handler
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error(err);
      setError(
        'ไม่สามารถเข้าสู่ระบบผ่าน Google Pop-up ได้ในเบราว์เซอร์นี้ (เนื่องจากระบบความปลอดภัย iframe หรือคุกกี้บุคคลที่สาม) กรุณาใช้ช่องทางสมัครสมาชิกด้วย Email ด้านบนแทน'
      );
    } finally {
      setLoading(false);
    }
  };

  // 2. Demo Account Quick Login (Self-healing registration if account doesn't exist)
  const handleDemoSignIn = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const demoEmail = 'demo.homeloan@ai-studio.com';
    const demoPassword = 'demouser123456';

    try {
      // Try to sign in first
      await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
    } catch (signInErr: any) {
      // If user not found, register first then sign in
      if (
        signInErr.code === 'auth/user-not-found' ||
        signInErr.code === 'auth/invalid-credential' ||
        String(signInErr.message).includes('not-found') ||
        String(signInErr.message).includes('invalid-credential')
      ) {
        try {
          await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
        } catch (signUpErr: any) {
          console.error('Demo signup failed: ', signUpErr);
          setError('เกิดข้อผิดพลาดในการเปิดใช้งานบัญชีทดลองส่วนกลาง กรุณาลองใช้วิธีสมัครด้วยอีเมลของคุณเอง');
          setLoading(false);
          return;
        }
      } else {
        console.error('Demo signin error: ', signInErr);
        setError('เกิดข้อผิดพลาดในการเชื่อมต่อกรุณาลองใหม่อีกครั้ง');
        setLoading(false);
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Custom Email/Password Authentication
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      return;
    }
    if (password.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isRegister) {
        // Register mode
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        setSuccess('สมัครสมาชิกสำเร็จและเข้าสู่ระบบเรียบร้อยแล้ว!');
      } else {
        // Login mode
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: any) {
      console.error(err);
      let thError = 'เกิดข้อผิดพลาดทางการยืนยันตัวตน กรุณาตรวจสอบข้อมูลอีกครั้ง';
      if (err.code === 'auth/email-already-in-use') {
        thError = 'อีเมลนี้ถูกใช้งานในระบบแล้ว กรุณาเข้าสู่ระบบแทน';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        thError = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบความถูกต้อง';
      } else if (err.code === 'auth/invalid-email') {
        thError = 'รูปแบบอีเมลไม่ถูกต้อง';
      } else if (err.code === 'auth/user-not-found') {
        thError = 'ไม่พบผู้ใช้งานด้วยอีเมลนี้ กรุณาสมัครสมาชิกก่อนเข้าใช้งาน';
      }
      setError(thError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#e8ebe0] flex items-center justify-center p-4">
      {/* Decorative Outer retro corner brackets wrapper */}
      <div className="relative max-w-md w-full bg-[#fbfbfa] border border-[#c0b298] p-6 md:p-8 shadow-sm rounded-sm">
        
        {/* Retro corners style */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#7d6840]" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#7d6840]" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#7d6840]" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#7d6840]" />

        {/* Content */}
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 rounded-full bg-[#f4f3ea] border border-[#c0b298] text-[#7d6840] mb-1 animate-pulse">
              <Landmark className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className="text-xs uppercase tracking-widest text-[#7d6840] font-semibold block">
                บันทึกภาระผูกพัน · HOME LOAN LEDGER
              </span>
              <h1 className="text-2xl font-bold text-[#4a3e26] font-serif">
                บันทึกผ่อนบ้าน Best & Koy
              </h1>
              <p className="text-xs text-[#70644e] leading-relaxed max-w-sm mx-auto">
                ระบบวิเคราะห์หนี้สิน คำนวณตารางดอกเบี้ย และจำลองการโปะค่างวดบ้านเพื่อลดดอกเบี้ยสะสมและหมดหนี้เร็วขึ้น
              </p>
            </div>
          </div>

          {/* Authentication Channels Tabs */}
          <div className="flex border-b border-[#e6e4d5] text-xs">
            <button
              onClick={() => {
                setActiveTab('google_demo');
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2 font-semibold border-b-2 transition-all ${
                activeTab === 'google_demo'
                  ? 'border-[#7d6840] text-[#7d6840]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              บัญชี Google / บัญชีทดลอง
            </button>
            <button
              onClick={() => {
                setActiveTab('email_form');
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2 font-semibold border-b-2 transition-all ${
                activeTab === 'email_form'
                  ? 'border-[#7d6840] text-[#7d6840]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              อีเมลส่วนตัว (Email & Password)
            </button>
          </div>

          {/* Error & Success Messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-sm text-left font-sans leading-relaxed">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-sm text-left font-sans">
              {success}
            </div>
          )}

          {/* TAB 1: Google & Demo Quick Access */}
          {activeTab === 'google_demo' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <button
                  id="google-signin-btn"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#7d6840] hover:bg-[#685533] text-white font-medium rounded-sm shadow-sm transition-colors duration-200 disabled:opacity-50 text-xs cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>เข้าสู่ระบบด้วย Google Account</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDemoSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-sm shadow-sm transition-colors duration-200 disabled:opacity-50 text-xs cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>เข้าใช้งานทันทีด้วยบัญชีทดลอง (Demo Login)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-left bg-amber-50/50 p-3 border border-amber-200/60 rounded-sm">
                <p className="text-[10px] text-[#7d6840] leading-relaxed">
                  💡 <strong>คำแนะนำสำหรับการใช้งานใน iFrame หรือ Shared App:</strong> แนะนำให้คลิกเลือก <strong>"เข้าใช้งานทันทีด้วยบัญชีทดลอง"</strong> หรือคลิกแถบ <strong>"อีเมลส่วนตัว"</strong> ด้านบนเพื่อสร้างรหัสผ่านส่วนตัวของคุณเอง เนื่องจากฟังก์ชันการเข้าสู่ระบบแบบ Google Pop-up อาจจะถูกสกัดกั้นตามนโยบายด้านความปลอดภัยของเว็บบราวเซอร์ในโหมดพรีวิว
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Custom Email Form */}
          {activeTab === 'email_form' && (
            <form onSubmit={handleEmailAuthSubmit} className="space-y-4">
              {/* Email field */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-[#7d6840] uppercase block">
                  ที่อยู่อีเมล (Email Address)
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-[#c0b298] rounded-sm py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-[#7d6840] font-mono text-[#4a3e26]"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-[#7d6840] uppercase block">
                  รหัสผ่าน (Password - ขั้นต่ำ 6 ตัวอักษร)
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-[#c0b298] rounded-sm py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-[#7d6840] font-mono text-[#4a3e26]"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#7d6840] hover:bg-[#685533] text-white font-medium rounded-sm shadow-sm transition-colors duration-200 disabled:opacity-50 text-xs cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : isRegister ? (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>ลงทะเบียนและสมัครสมาชิกใหม่</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>ลงชื่อเข้าใช้งานด้วยอีเมล</span>
                    </>
                  )}
                </button>

                {/* Toggle Register/Login */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(!isRegister);
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-[11px] text-[#7d6840] hover:underline transition-all font-medium"
                  >
                    {isRegister
                      ? 'มีบัญชีอยู่แล้ว? คลิกที่นี่เพื่อ "เข้าสู่ระบบ"'
                      : 'ยังไม่มีบัญชีส่วนตัว? คลิกที่นี่เพื่อ "สมัครสมาชิกใหม่"'}
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="border-t border-[#e6e4d5] my-4" />

          {/* Benefits bullets */}
          <div className="text-left space-y-2.5 text-[11px] text-[#70644e] py-1 max-w-xs mx-auto">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#7d6840] shrink-0 mt-0.5" />
              <span>เก็บข้อมูลทางการเงินอย่างปลอดภัยแยกตามบัญชีส่วนบุคคล</span>
            </div>
            <div className="flex items-start gap-2.5">
              <HeartHandshake className="w-3.5 h-3.5 text-[#7d6840] shrink-0 mt-0.5" />
              <span>รองรับการเพิ่มหลายสัญญา และคำนวณยอดโปะลดยอดคงเหลืออัตโนมัติ</span>
            </div>
          </div>

          <p className="text-[9px] text-gray-400 text-center">
            * ระบบทำงานบน Cloud Run พร้อมรักษาความปลอดภัยผ่านทาง Google Firebase Authentication
          </p>
        </div>
      </div>
    </div>
  );
}

