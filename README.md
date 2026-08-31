# 🏠 Home Loan Installment Monitor

**บันทึกผ่อนบ้าน** — เว็บแอปสำหรับติดตามการผ่อนชำระสินเชื่อบ้านแบบครบวงจร บันทึกข้อมูลสัญญาเงินกู้ ตารางผ่อนชำระ (Amortization Schedule) แบบละเอียด รองรับการจ่ายเงินโปะเพิ่ม พร้อม Dashboard สรุปภาพรวม และเครื่องมือวิเคราะห์ทางการเงินสำหรับผู้กู้

สร้างด้วย Google AI Studio (จาก template [`google-gemini/aistudio-repository-template`](https://github.com/google-gemini/aistudio-repository-template)) โดยใช้ React + TypeScript + Firebase

---

## ✨ ฟีเจอร์หลัก

- **จัดการสัญญาเงินกู้หลายสัญญา** — บันทึกชื่อเล่นสัญญา ธนาคาร วงเงินกู้ วันที่เริ่มต้น จำนวนงวด วันครบกำหนดชำระ และสถานะ (Active / Closed / Refinanced)
- **อัตราดอกเบี้ยแบบขั้นบันได** — รองรับการปรับอัตราดอกเบี้ยหลายช่วงเวลาในสัญญาเดียว พร้อมวิธีคำนวณดอกเบี้ยหลายแบบ (`daily_365`, `daily_actual`, `monthly`, `yearly`)
- **ตารางผ่อนชำระอัตโนมัติ (Amortization Schedule)** — คำนวณเงินต้น/ดอกเบี้ยแต่ละงวด ยอดคงเหลือ และสถานะ (ชำระแล้ว / ยังไม่ชำระ / ค้างชำระ)
- **บันทึกการชำระเงินจริง** พร้อมเงินโปะเพิ่ม (Extra Payment) ต่องวด
- **Dashboard ภาพรวม** ทั้งรายสัญญาและภาพรวมทุกสัญญา (All-Time Overview) พร้อมกราฟเปรียบเทียบ (Doughnut Chart)
- **Prepayment Simulator** — จำลองผลของการโปะเงินเพิ่มต่อระยะเวลาผ่อนและดอกเบี้ยที่ประหยัดได้
- **Refinance Analysis** — เครื่องมือวิเคราะห์ความคุ้มค่าในการรีไฟแนนซ์
- **แบ่งสัดส่วนผู้รับผิดชอบ (Responsible Shares)** — สำหรับกรณีผ่อนร่วมกันหลายคน พร้อมสรุปยอดของแต่ละคน
- **ข้อมูลเชิงลึกเชิงรุก (Proactive Insights)** — คำแนะนำอัตโนมัติเกี่ยวกับการโปะเงินในแต่ละเดือน
- **Export ข้อมูลเป็น CSV** ทั้งตารางผ่อนชำระและประวัติการจ่ายเงิน
- **ระบบยืนยันตัวตน (Authentication)** ผ่าน Firebase Auth (Google Sign-In และ Email/Password)
- **Sync ข้อมูลแบบเรียลไทม์** ด้วย Cloud Firestore พร้อม Security Rules ป้องกันข้อมูลของผู้ใช้แต่ละคน

---

## 🛠️ Tech Stack

| ส่วนประกอบ | เทคโนโลยี |
|---|---|
| Frontend Framework | React 19 + TypeScript |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 4 |
| Backend / Database | Firebase (Firestore + Authentication) |
| Charts | Chart.js + react-chartjs-2 |
| Icons | lucide-react |
| Animation | Motion (Framer Motion) |
| AI (scaffold) | @google/genai (Gemini API — เตรียมไว้จาก AI Studio template) |

---

## 📁 โครงสร้างโปรเจกต์

```
Home-Loan-Monitor/
├── assets/                     # ทรัพยากรของ AI Studio
├── src/
│   ├── components/             # React components ทั้งหมดของ UI
│   │   ├── AddContractModal.tsx
│   │   ├── AllTimeOverview.tsx
│   │   ├── AuthModal.tsx
│   │   ├── ContractCard.tsx
│   │   ├── ContractDetail.tsx
│   │   ├── DoughnutComparisonChart.tsx
│   │   ├── Header.tsx
│   │   ├── Overview.tsx
│   │   ├── PrepaymentSimulator.tsx
│   │   ├── ProactiveInsights.tsx
│   │   ├── RecordPaymentModal.tsx
│   │   ├── RefinanceAnalysisSection.tsx
│   │   ├── ResponsibleModal.tsx
│   │   ├── ResponsibleSection.tsx
│   │   ├── ResponsibleSharesModal.tsx
│   │   └── ToolsSidebar.tsx
│   ├── lib/
│   │   ├── firebase.ts         # การตั้งค่า Firebase App/Auth/Firestore
│   │   └── loanUtils.ts        # ตรรกะคำนวณสินเชื่อ, amortization, CSV export
│   ├── App.tsx                 # จุดรวม state และ logic หลักของแอป
│   ├── main.tsx                # Entry point ของ React
│   ├── types.ts                # TypeScript interfaces (Contract, Payment, ฯลฯ)
│   └── index.css
├── firebase-applet-config.json # Firebase client config (project นี้)
├── firebase-blueprint.json     # Schema ของ Firestore entities
├── firestore.rules             # Security Rules ของ Firestore
├── security_spec.md            # ข้อกำหนดด้านความปลอดภัยของข้อมูล
├── .env.example
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 เริ่มต้นใช้งาน

### สิ่งที่ต้องมี

- [Bun](https://bun.sh/) (โปรเจกต์ใช้ `bun.lock`) หรือ npm/yarn
- บัญชี [Firebase](https://firebase.google.com/) สำหรับสร้างโปรเจกต์ Firestore + Authentication ของตัวเอง

### ติดตั้ง

```bash
# ติดตั้ง dependencies
bun install
# หรือ
npm install
```

### ตั้งค่า Environment Variables

คัดลอกไฟล์ตัวอย่างแล้วกรอกค่าของตัวเอง:

```bash
cp .env.example .env
```

| ตัวแปร | คำอธิบาย |
|---|---|
| `GEMINI_API_KEY` | ใช้สำหรับเรียก Gemini API (ฉีดค่าอัตโนมัติเมื่อรันผ่าน Google AI Studio) |
| `APP_URL` | URL ที่แอปนี้ถูก host อยู่ (ใช้สำหรับ self-referential link / OAuth callback) |

> ⚠️ ไฟล์ `firebase-applet-config.json` มี Firebase Web API key ของโปรเจกต์เดโมอยู่แล้ว หากจะนำไปใช้งานจริง **แนะนำให้สร้างโปรเจกต์ Firebase ของตัวเอง** แล้วแทนที่ค่าคอนฟิกในไฟล์นี้ พร้อม deploy `firestore.rules` ไปยังโปรเจกต์ของตัวเองด้วย เพื่อความปลอดภัยของข้อมูลผู้ใช้

### รันในโหมด Development

```bash
bun run dev
# แอปจะรันที่ http://localhost:3000
```

### คำสั่งอื่น ๆ

| คำสั่ง | คำอธิบาย |
|---|---|
| `bun run dev` | รันเซิร์ฟเวอร์พัฒนา (hot reload) |
| `bun run build` | Build โปรเจกต์สำหรับ production |
| `bun run preview` | Preview ผลลัพธ์หลัง build |
| `bun run lint` | ตรวจสอบ type ด้วย `tsc --noEmit` |
| `bun run clean` | ลบไฟล์ที่ build ไว้ (`dist`, `server.js`) |

---

## 🔐 ความปลอดภัยของข้อมูล

โปรเจกต์นี้มีเอกสาร [`security_spec.md`](./security_spec.md) ระบุ Data Invariants และรายการ "Dirty Dozen" ของ attack payloads ที่ต้องป้องกัน เช่น:

- ป้องกันการปลอมแปลงตัวตน (Identity Spoofing) บน Contract/Payment
- ตรวจสอบค่าที่ผิดปกติ เช่น `dueDay` เกิน 31, `loanAmount` ติดลบ, สถานะสัญญาที่ไม่รู้จัก
- ป้องกันการแก้ไข field ที่ระบบสร้างขึ้นเอง (เช่น `createdAt`)
- ป้องกันการ list ข้อมูลทั้งหมดโดยไม่กรองด้วย `userId`

กฎเหล่านี้ถูกนำไปใช้จริงใน [`firestore.rules`](./firestore.rules) โดยยึดหลักว่าผู้ใช้แต่ละคนเข้าถึงได้เฉพาะเอกสารที่ `userId` ตรงกับ `request.auth.uid` ของตนเองเท่านั้น

---

## 📊 โครงสร้างข้อมูล (Firestore)

อธิบายไว้ใน [`firebase-blueprint.json`](./firebase-blueprint.json):

- **`/contracts/{contractId}`** — ข้อมูลสัญญาเงินกู้ (ธนาคาร, วงเงิน, อัตราดอกเบี้ย, สถานะ ฯลฯ)
- **`/payments/{paymentId}`** — ประวัติการชำระเงินแต่ละงวด (จำนวนตามกำหนด + เงินโปะเพิ่ม)
- **`/settings/{userId}`** — การตั้งค่าเฉพาะผู้ใช้ (ชื่อแอป, เลขที่บ้าน)

---

## 📝 License

ยังไม่ได้ระบุ License — เพิ่มไฟล์ `LICENSE` หากต้องการเผยแพร่แบบ Open Source
