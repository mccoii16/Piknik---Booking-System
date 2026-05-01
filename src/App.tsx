import React, { useState, useRef, useMemo, useEffect, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  ChevronRight, 
  ChevronLeft, 
  MapPin, 
  Phone, 
  User, 
  Mail, 
  CheckCircle2, 
  Upload, 
  CreditCard,
  Target,
  Trophy,
  Clock,
  ShieldCheck,
  Search,
  X,
  LayoutDashboard,
  Users,
  Settings,
  LogIn
} from 'lucide-react';
import { auth, db, storage } from './lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';

// --- Constants & Types ---

const STEPS = {
  LANDING: 0,
  SELECTION: 1,
  DETAILS: 2,
  PAYMENT: 3,
  SUCCESS: 4,
  ADMIN: 5,
};

const calculatePrice = (slots: string[]) => {
  return slots.reduce((total, slot) => {
    // Expected format: "8:00 AM"
    const [time, ampm] = slot.split(' ');
    const [hourStr] = time.split(':');
    let hour = parseInt(hourStr);
    
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    
    // Day rate: 8 AM to 4 PM (16:00)
    // Nightrate: 4 PM (16:00) onwards and before 8 AM
    if (hour >= 8 && hour < 16) {
      return total + 500;
    }
    return total + 550;
  }, 0);
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(price);
};

const COLORS = {
  forest: '#2D3A2A',
  yellow: '#F9E154',
  red: '#E94B3C',
  white: '#FFFFFF',
};

const LOGO_URL = "https://i.ibb.co/N2Fcp08v/piknik-logo.png"; 

type FormData = {
  name: string;
  email: string;
  phone: string;
  court: string;
  date: string; // ISO format YYYY-MM-DD
  timeSlots: string[];
  proofOfPayment: File | null;
};

type Booking = {
  id: string;
  name: string;
  email: string;
  phone: string;
  court: string;
  date: string;
  timeSlots: string[];
  totalPrice: number;
  status: 'confirmed' | 'blocked';
  timestamp: number;
  proofOfPaymentUrl?: string;
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

interface DetailsStepProps {
  prevStep: () => void;
  nextStep: () => void;
  formData: FormData;
  updateFormData: (fields: Partial<FormData>) => void;
}

const DetailsStep = ({ prevStep, nextStep, formData, updateFormData }: DetailsStepProps) => {
  const [localData, setLocalData] = React.useState({
    name: formData.name,
    email: formData.email,
    phone: formData.phone
  });

  const handleNext = () => {
    updateFormData(localData);
    nextStep();
  };

  return (
    <motion.div 
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="p-8 md:p-12 flex flex-col min-h-screen"
    >
      <header className="flex justify-between items-center mb-12">
        <button onClick={prevStep} className="flex items-center text-white/40 hover:text-[#F9E154] transition-colors font-bold uppercase text-[10px] tracking-widest">
          <ChevronLeft size={16} /> Back to Selection
        </button>
        <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/10 text-white/50 flex items-center justify-center text-[10px] font-bold border border-white/5">1</div>
              <span className="text-[10px] font-bold uppercase text-white/30 tracking-widest">Selection</span>
            </div>
            <div className="w-4 h-[1px] bg-white/10"></div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#F9E154] text-[#2D3A2A] flex items-center justify-center text-[10px] font-bold">2</div>
              <span className="text-[10px] font-bold uppercase text-white tracking-widest">Renter</span>
            </div>
            <div className="w-4 h-[1px] bg-white/10"></div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/10 text-white/50 flex items-center justify-center text-[10px] font-bold border border-white/5">3</div>
              <span className="text-[10px] font-bold uppercase text-white/30 tracking-widest">Payment</span>
            </div>
        </div>
      </header>
      
      <div className="max-w-xl mx-auto w-full flex-1">
        <h2 className="text-3xl md:text-5xl font-black text-white mb-2 uppercase italic tracking-tighter whitespace-nowrap">Renter Details</h2>
        <p className="text-white/40 mb-8 uppercase text-[10px] font-bold tracking-[0.3em]">Start your championship journey.</p>
  
        <div className="space-y-4">
          <div className="relative group">
            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#E94B3C] transition-colors z-10" size={18} />
            <input 
              type="text"
              placeholder="Full Name"
              value={localData.name}
              onChange={(e) => setLocalData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-white border-2 border-transparent rounded-2xl py-4 pl-14 pr-6 text-[#2D3A2A] font-bold placeholder:text-stone-300 focus:outline-none focus:border-[#F9E154] shadow-2xl transition-all text-lg"
            />
          </div>
          <div className="relative group">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#E94B3C] transition-colors z-10" size={18} />
            <input 
              type="email"
              placeholder="Email Address"
              value={localData.email}
              onChange={(e) => setLocalData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full bg-white border-2 border-transparent rounded-2xl py-4 pl-14 pr-6 text-[#2D3A2A] font-bold placeholder:text-stone-300 focus:outline-none focus:border-[#F9E154] shadow-2xl transition-all text-lg"
            />
          </div>
          <div className="relative group">
            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#E94B3C] transition-colors z-10" size={18} />
            <input 
              type="tel"
              placeholder="Phone Number"
              value={localData.phone}
              onChange={(e) => setLocalData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full bg-white border-2 border-transparent rounded-2xl py-4 pl-14 pr-6 text-[#2D3A2A] font-bold placeholder:text-stone-300 focus:outline-none focus:border-[#F9E154] shadow-2xl transition-all text-lg"
            />
          </div>
        </div>
  
        <button 
          disabled={!localData.name || !localData.email || !localData.phone}
          onClick={handleNext}
          className="w-full mt-10 bg-[#F9E154] hover:bg-[#E94B3C] text-[#2D3A2A] hover:text-white py-4 rounded-sm font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed group flex items-center justify-center gap-3 shadow-2xl border-2 border-transparent hover:border-[#E94B3C]"
        >
          PROCEED TO PAYMENT <ChevronRight className="group-hover:translate-x-1 transition-transform" size={18} />
        </button>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [step, setStep] = useState(STEPS.LANDING);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  
  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || []
      },
      operationType,
      path
    }
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    court: 'Court 1',
    date: new Date().toISOString().split('T')[0],
    timeSlots: [],
    proofOfPayment: null,
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Connection test
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  // Auth listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
  }, []);

  // Bookings listener
  useEffect(() => {
    const path = 'bookings';
    const q = query(collection(db, path), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  }, []);

  const bookedSlots = useMemo(() => {
    return bookings
      .filter(b => b.court === formData.court && b.date === formData.date)
      .flatMap(b => b.timeSlots);
  }, [bookings, formData.court, formData.date]);

  const updateFormData = (fields: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...fields }));
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      updateFormData({ proofOfPayment: e.target.files[0] });
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    let proofUrl = '';
    
    try {
      if (formData.proofOfPayment) {
        try {
          const fileRef = ref(storage, `proofs/${Date.now()}_${formData.proofOfPayment.name}`);
          await uploadBytes(fileRef, formData.proofOfPayment);
          proofUrl = await getDownloadURL(fileRef);
        } catch (storageErr) {
          console.warn("Storage upload failed, likely due to rules. Continuing without proof URL.", storageErr);
          // We continue because we don't want to block the user if storage rules aren't deployed yet
        }
      }

      const bookingData: Omit<Booking, 'id'> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        court: formData.court,
        date: formData.date,
        timeSlots: formData.timeSlots,
        totalPrice: calculatePrice(formData.timeSlots),
        status: 'confirmed',
        timestamp: Date.now(),
        proofOfPaymentUrl: proofUrl,
      };

      const path = 'bookings';
      await addDoc(collection(db, path), bookingData);
      setIsVerifying(false);
      nextStep();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bookings');
      setIsVerifying(false);
      alert("Something went wrong. Please try again.");
    }
  };

  const handleAdminLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setStep(STEPS.ADMIN);
    } catch (error) {
      console.error("Login Error: ", error);
    }
  };

  // --- Render Helpers ---

  const LandingStep = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen text-center px-6 relative overflow-hidden"
    >
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 rounded-full bg-[#F9E154] opacity-5 blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 rounded-full bg-[#E94B3C] opacity-5 blur-3xl" />
      
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-12 flex flex-col items-center"
      >
        <img 
          src={LOGO_URL} 
          alt="Piknik Premier Pickleball" 
          className="w-48 md:w-64 mb-6 drop-shadow-2xl"
          referrerPolicy="no-referrer"
        />
        <div className="text-center">
          <span className="text-[#E94B3C] font-bold tracking-widest text-sm mb-2 block uppercase">Est. 2026</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="max-w-md"
      >
        <p className="text-stone-300 mb-10 text-lg">
          Experience world-class pickleball in the heart of the forest. 
          Premium courts, peak performance.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={nextStep}
          id="btn-book-now"
          className="relative z-20 bg-[#F9E154] text-[#2D3A2A] px-8 py-2.5 rounded-sm text-xs font-black uppercase tracking-[0.3em] transition-all hover:bg-white hover:text-[#E94B3C] shadow-2xl hover:shadow-[#F9E154]/20 border-2 border-transparent hover:border-[#E94B3C]"
        >
          Book Now
        </motion.button>
      </motion.div>

      <div className="absolute bottom-10 flex gap-8">
        <div className="flex items-center gap-2 text-stone-500 text-xs font-mono">
          <Target size={14} /> 2 PREMIUM COURTS
        </div>
        <div className="flex items-center gap-2 text-stone-500 text-xs font-mono">
          <Clock size={14} /> 12AM - 12MN OPEN
        </div>
      </div>
    </motion.div>
  );

  const DetailsStepInternal = () => (
    <DetailsStep 
      prevStep={prevStep} 
      nextStep={nextStep} 
      formData={formData} 
      updateFormData={updateFormData} 
    />
  );

  const SelectionStep = () => {
    const hours = Array.from({ length: 24 }, (_, i) => {
      const h = i % 12 || 12;
      const ampm = i < 12 ? 'AM' : 'PM';
      return `${h}:00 ${ampm}`;
    });

    const dates = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d;
    });

    return (
      <div className="p-0 flex flex-col min-h-screen bg-[#2D3A2A]">
        {/* Header Section */}
        <header className="flex justify-between md:justify-between items-center px-6 md:px-12 py-6 bg-black/20 border-b border-white/10 shrink-0">
          <div className="flex-1 md:flex-none flex justify-center md:justify-start">
            <img 
              src={LOGO_URL} 
              alt="Logo" 
              className="h-12 w-auto"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="hidden md:flex gap-8 items-center">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#F9E154] text-[#2D3A2A] flex items-center justify-center text-[10px] font-bold">1</div>
              <span className="text-[10px] font-bold uppercase text-white tracking-widest">Selection</span>
            </div>
            <div className="w-4 h-[1px] bg-white/10"></div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/10 text-white/50 flex items-center justify-center text-[10px] font-bold border border-white/5">2</div>
              <span className="text-[10px] font-bold uppercase text-white/30 tracking-widest">Renter</span>
            </div>
            <div className="w-4 h-[1px] bg-white/10"></div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/10 text-white/50 flex items-center justify-center text-[10px] font-bold border border-white/5">3</div>
              <span className="text-[10px] font-bold uppercase text-white/30 tracking-widest">Payment</span>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col p-4 md:p-8 gap-6 md:gap-8 overflow-y-auto">
          {/* Top Panel: Date Selector */}
          <div className="w-full bg-black/20 rounded-2xl p-4 border border-white/5">
            <div className="flex items-center gap-6 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-white/10 border border-white/10"></div>
                <span className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Open</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#F9E154]"></div>
                <span className="text-[10px] font-bold uppercase text-[#F9E154] tracking-widest">Held</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-white/40"></div>
                <span className="text-[10px] font-bold uppercase text-white/20 tracking-widest">Booked</span>
              </div>
            </div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#F9E154] uppercase text-[10px] font-bold tracking-[0.2em]">01. Select Date</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
              {dates.map((d) => {
                const dateStr = d.toISOString().split('T')[0];
                const isSelected = formData.date === dateStr;
                const day = d.toLocaleDateString('en-US', { weekday: 'short' });
                const dateNum = d.getDate();

                return (
                  <button
                    key={dateStr}
                    onClick={() => updateFormData({ date: dateStr, timeSlots: [] })}
                    className={`flex flex-col items-center justify-center min-w-[56px] h-16 rounded-xl border-2 transition-all ${
                      isSelected 
                      ? 'bg-[#F9E154] text-[#2D3A2A] border-[#F9E154]' 
                      : 'bg-white/5 border-transparent text-white/40 hover:border-white/10'
                    }`}
                  >
                    <span className={`text-[10px] font-bold uppercase mb-1 ${isSelected ? 'text-[#2D3A2A]' : 'text-white/40'}`}>{day}</span>
                    <span className="text-lg font-black">{dateNum}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 md:gap-8 flex-1">
            {/* Left Panel: Court Toggle */}
            <div className="w-full md:w-1/3 flex flex-col gap-6 shrink-0 h-fit md:h-auto">
              <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                <h2 className="text-[#F9E154] uppercase text-[10px] font-bold tracking-[0.2em] mb-4">02. Select Court</h2>
                <div className="grid grid-cols-2 gap-3">
                  {['Court 1', 'Court 2'].map(c => (
                    <button
                      key={c}
                      onClick={() => updateFormData({ court: c, timeSlots: [] })}
                      className={`py-3.5 rounded-xl border-2 transition-colors font-bold text-sm uppercase ${
                        formData.court === c 
                        ? 'bg-[#F9E154] text-[#2D3A2A] border-[#F9E154]' 
                        : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="hidden md:block bg-black/20 rounded-2xl p-6 border border-white/5 flex-1 select-none">
                <h2 className="text-white/40 uppercase text-[10px] font-bold tracking-[0.2em] mb-4 italic">Summary</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/40">Date</span>
                    <span className="text-white font-bold">{new Date(formData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/40">Court</span>
                    <span className="text-white font-bold">{formData.court}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/40">Hours</span>
                    <span className="text-white font-bold">{formData.timeSlots.length} HR(S)</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/40">Time Slot</span>
                    <div className="text-right">
                      {formData.timeSlots.length > 0 ? (
                        formData.timeSlots.map(s => (
                          <div key={s} className="text-[#F9E154] font-bold">{s}</div>
                        ))
                      ) : (
                        <span className="text-white/20 italic">Not Selected</span>
                      )}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <div className="text-[10px] font-bold uppercase text-white/40 mb-1">Estimated Cost</div>
                    <div className="text-2xl font-black text-[#F9E154]">{formatPrice(calculatePrice(formData.timeSlots))}</div>
                  </div>
                  
                  <div className="pt-4 mt-2">
                    <div className="text-[9px] font-bold uppercase text-white/20 mb-2 tracking-widest border-b border-white/5 pb-1">Price Rates</div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-white/30 uppercase tracking-tighter italic">08:00 AM - 04:00 PM</span>
                      <span className="text-white/50 font-bold">₱500</span>
                    </div>
                    <div className="flex justify-between text-[10px] mt-1">
                      <span className="text-white/30 uppercase tracking-tighter italic">04:00 PM - 08:00 AM</span>
                      <span className="text-white/50 font-bold">₱550</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Time Grid */}
            <div className="w-full md:w-2/3 bg-white/5 rounded-3xl p-6 md:p-8 border border-white/10 flex flex-col overflow-y-auto">
              <div className="mb-6 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-4">
                  <h2 className="text-[#F9E154] uppercase text-[10px] font-bold tracking-[0.2em] whitespace-nowrap">03. Pick Your Time</h2>
                  <p className="text-white/40 text-[10px] whitespace-nowrap opacity-60">24-hour service active</p>
                </div>
                
                <div className="flex flex-wrap gap-x-3 gap-y-2 text-[8px] uppercase font-bold tracking-widest text-white/30 border-t border-white/5 pt-4">
                  <div className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-2.5 h-2.5 bg-white/10 rounded-sm border border-white/10"></span> Open</div>
                  <div className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-2.5 h-2.5 bg-[#F9E154] rounded-sm"></span> Held</div>
                  <div className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-2.5 h-2.5 bg-white/40 rounded-sm"></span> Booked</div>
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-2 mb-8 lowercase">
                {hours.map(h => {
                  const isBooked = bookedSlots.includes(h);
                  const isSelected = formData.timeSlots.includes(h);
                  
                  return (
                    <button
                      key={h}
                      disabled={isBooked}
                      onClick={() => {
                        const newSlots = isSelected 
                          ? formData.timeSlots.filter(s => s !== h)
                          : [...formData.timeSlots, h];
                        updateFormData({ timeSlots: newSlots });
                      }}
                      className={`py-3 rounded-lg border-2 transition-colors font-bold text-[10px] uppercase tracking-tighter ${
                        isSelected
                          ? 'bg-[#F9E154] text-[#2D3A2A] border-[#F9E154]' 
                          : isBooked
                            ? 'bg-white/10 text-white/10 border-transparent cursor-not-allowed' 
                            : 'bg-white/5 text-white/60 border-transparent hover:border-white/20'
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>

              {/* Mobile Summary */}
              <div className="md:hidden bg-black/20 rounded-2xl p-6 border border-white/5 mb-8 select-none">
                <h2 className="text-white/40 uppercase text-[10px] font-bold tracking-[0.2em] mb-4 italic">Summary</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/40">Date</span>
                    <span className="text-white font-bold">{new Date(formData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/40">Court</span>
                    <span className="text-white font-bold">{formData.court}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/40">Hours</span>
                    <span className="text-white font-bold">{formData.timeSlots.length} HR(S)</span>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <div className="text-[10px] font-bold uppercase text-white/40 mb-1">Estimated Cost</div>
                    <div className="text-2xl font-black text-[#F9E154]">{formatPrice(calculatePrice(formData.timeSlots))}</div>
                  </div>

                  <div className="pt-4 mt-2 grid grid-cols-2 gap-4">
                    <div className="px-3 py-2 bg-white/5 rounded-lg border border-white/5">
                      <div className="text-[8px] font-bold uppercase text-white/20 mb-1">Day Rate (8AM-4PM)</div>
                      <div className="text-xs font-black text-white/60">₱500.00</div>
                    </div>
                    <div className="px-3 py-2 bg-white/5 rounded-lg border border-white/5">
                      <div className="text-[8px] font-bold uppercase text-white/20 mb-1">Night Rate (4PM-8AM)</div>
                      <div className="text-xs font-black text-white/60">₱550.00</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Non-sticky footer button */}
              <div className="mt-auto pt-8 border-t border-white/10">
                <button 
                  disabled={formData.timeSlots.length === 0}
                  onClick={nextStep}
                  className="w-full bg-[#F9E154] hover:bg-white text-[#2D3A2A] py-3.5 rounded-sm font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 disabled:opacity-10 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-black/20 border-2 border-transparent hover:border-[#E94B3C]"
                >
                  NEXT: RENTER DETAILS <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </main>

        <div className="h-1 w-full flex opacity-30">
          <div className="flex-1 bg-[#F9E154]"></div>
          <div className="flex-1 bg-[#E94B3C]"></div>
          <div className="flex-1 bg-white"></div>
        </div>
      </div>
    );
  };

  const PaymentStep = () => (
    <motion.div 
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="p-6 md:p-12 flex flex-col min-h-screen overflow-y-auto"
    >
      <header className="flex justify-between items-center mb-12">
        <button onClick={prevStep} className="flex items-center text-white/40 hover:text-[#F9E154] transition-colors font-bold uppercase text-[10px] tracking-widest">
          <ChevronLeft size={16} /> Back to Renter
        </button>
        <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/10 text-white/50 flex items-center justify-center text-[10px] font-bold border border-white/5">1</div>
              <span className="text-[10px] font-bold uppercase text-white/30 tracking-widest">Selection</span>
            </div>
            <div className="w-4 h-[1px] bg-white/10"></div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/10 text-white/50 flex items-center justify-center text-[10px] font-bold border border-white/5">2</div>
              <span className="text-[10px] font-bold uppercase text-white/30 tracking-widest">Renter</span>
            </div>
            <div className="w-4 h-[1px] bg-white/10"></div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#F9E154] text-[#2D3A2A] flex items-center justify-center text-[10px] font-bold">3</div>
              <span className="text-[10px] font-bold uppercase text-white tracking-widest">Payment</span>
            </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto w-full flex-1 flex flex-col text-center">
        <h2 className="text-3xl md:text-5xl font-black text-white mb-2 uppercase italic tracking-tighter">Secure Payment</h2>
        <p className="text-white/40 mb-8 uppercase text-[10px] font-bold tracking-[0.3em]">Scan to pay {formatPrice(calculatePrice(formData.timeSlots))} via GCash</p>

        <div className="bg-white p-8 rounded-3xl inline-block mb-8 shadow-2xl mx-auto">
          <div className="w-48 h-48 bg-[#007DFE] flex flex-col items-center justify-center rounded-xl p-4 relative overflow-hidden">
            <div className="bg-white w-full h-full rounded flex items-center justify-center text-[#007DFE] font-black text-4xl">
              GCash
            </div>
            <div className="absolute top-2 right-2 flex gap-1">
               <div className="w-2 h-2 bg-white rounded-full opacity-50" />
               <div className="w-2 h-2 bg-white rounded-full opacity-50" />
            </div>
          </div>
          <p className="text-[#2D3A2A] font-bold mt-4">0917-888-2024</p>
          <p className="text-stone-400 text-xs uppercase font-bold tracking-widest">PIKNIK PREMIER INC.</p>
        </div>

        <div className="mb-10">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-white/10 hover:border-[#F9E154] bg-white/5 rounded-2xl p-8 flex flex-col items-center gap-2 transition-all group"
          >
            {formData.proofOfPayment ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="text-[#F9E154]" />
                <span className="text-white font-bold text-sm">{formData.proofOfPayment.name}</span>
                <span className="text-white/20 text-[10px] uppercase font-bold tracking-widest">Click to change</span>
              </div>
            ) : (
              <>
                <Upload className="text-white/20 group-hover:text-[#F9E154] transition-colors" />
                <span className="text-white/40 group-hover:text-white transition-colors uppercase text-[10px] font-bold tracking-widest">Upload Proof of Payment</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-auto pb-12">
          <button 
            disabled={!formData.proofOfPayment || isVerifying}
            onClick={handleVerify}
            className="w-full bg-[#E94B3C] text-white py-4 rounded-sm font-black text-sm uppercase tracking-[0.2em] transition-all hover:bg-white hover:text-[#E94B3C] disabled:opacity-30 disabled:cursor-not-allowed overflow-hidden relative border-2 border-transparent hover:border-[#E94B3C] shadow-2xl"
          >
            {isVerifying ? (
              <motion.div 
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="flex items-center justify-center gap-3"
              >
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying Transaction...
              </motion.div>
            ) : (
              "VERIFY & CONFIRM"
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );

  const SuccessStep = () => (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-screen text-center p-8"
    >
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 10, -10, 0]
        }}
        transition={{ duration: 0.5 }}
        className="bg-[#F9E154] p-6 rounded-full mb-8 shadow-[0_0_50px_rgba(249,225,84,0.3)]"
      >
        <Trophy size={64} className="text-[#2D3A2A]" />
      </motion.div>

      <h2 className="text-4xl md:text-6xl font-black text-white mb-4 uppercase italic leading-tight tracking-tight">
        See You At <br />The Court!
      </h2>
      <p className="text-stone-400 text-lg md:xl mb-12">Your booking has been confirmed successfully.</p>

      <div className="bg-stone-800/30 border border-white/5 rounded-3xl p-8 w-full max-w-sm backdrop-blur-md mb-12 text-left">
        <div className="flex justify-between mb-4 border-b border-white/5 pb-4">
          <span className="text-stone-500 uppercase text-xs font-bold tracking-widest">Guest</span>
          <span className="text-white font-bold">{formData.name}</span>
        </div>
        <div className="flex justify-between mb-4 border-b border-white/5 pb-4">
          <span className="text-stone-500 uppercase text-xs font-bold tracking-widest">Date</span>
          <span className="text-white font-bold">{new Date(formData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <div className="flex justify-between mb-4 border-b border-white/5 pb-4">
          <span className="text-stone-500 uppercase text-xs font-bold tracking-widest">Location</span>
          <span className="text-[#F9E154] font-bold">{formData.court}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500 uppercase text-xs font-bold tracking-widest">Time</span>
          <div className="text-right">
            {formData.timeSlots.map(s => (
              <div key={s} className="text-white font-bold">{s}</div>
            ))}
          </div>
        </div>
      </div>

      <button 
        onClick={() => setStep(STEPS.LANDING)}
        className="text-[#F9E154] font-bold uppercase tracking-widest hover:text-white transition-colors"
      >
        New Booking
      </button>
    </motion.div>
  );

  const AdminDashboard = () => {
    const stats = {
      total: bookings.length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      revenue: bookings.reduce((acc, b) => acc + (b.totalPrice || 0), 0),
    };

    return (
      <div className="min-h-screen bg-[#1A2219] text-white flex">
        {/* Sidebar */}
        <aside className="w-64 bg-black/20 border-r border-white/5 flex flex-col p-6 hidden lg:flex">
          <div className="flex items-center gap-3 mb-12">
            <img 
              src={LOGO_URL} 
              alt="Logo" 
              className="h-8 w-auto"
              referrerPolicy="no-referrer"
            />
            <div className="text-white font-black text-xl tracking-tighter italic">
              ADMIN
            </div>
          </div>
          <nav className="space-y-2 flex-1">
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-[#F9E154] text-[#2D3A2A] rounded-xl font-bold">
              <LayoutDashboard size={20} /> Dashboard
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-white/50 hover:bg-white/5 rounded-xl font-bold transition-colors">
              <Users size={20} /> Customers
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-white/50 hover:bg-white/5 rounded-xl font-bold transition-colors">
              <Settings size={20} /> Settings
            </button>
          </nav>
          <button 
            onClick={() => setStep(STEPS.LANDING)}
            className="flex items-center gap-2 text-white/30 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
          >
            <X size={16} /> Exit Admin
          </button>
        </aside>

        {/* Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <header className="flex justify-between items-center mb-12">
            <div>
              <h1 className="text-3xl font-black italic uppercase">Analytics Dashboard</h1>
              <p className="text-white/40">Manage your court schedules and bookings.</p>
            </div>
            <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/5">
               <div className="w-10 h-10 rounded-xl bg-[#E94B3C] flex items-center justify-center font-bold overflow-hidden">
                 {user?.photoURL ? (
                    <img src={user.photoURL} alt="Admin" className="w-full h-full object-cover" />
                 ) : (
                    user?.displayName?.[0] || 'A'
                 )}
               </div>
               <div className="pr-4">
                 <div className="text-xs font-bold">{user?.displayName || 'Admin User'}</div>
                 <div className="text-[10px] text-white/40 uppercase">{user?.email || 'Root Access'}</div>
               </div>
            </div>
          </header>

          <div className="grid grid-cols-3 gap-6 mb-12">
            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
              <div className="text-white/40 text-xs font-bold uppercase mb-2">Total Bookings</div>
              <div className="text-4xl font-black text-[#F9E154]">{stats.total}</div>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
              <div className="text-white/40 text-xs font-bold uppercase mb-2">Confirmed Revenue</div>
              <div className="text-4xl font-black text-[#F9E154]">₱{stats.revenue.toLocaleString()}</div>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
              <div className="text-white/40 text-xs font-bold uppercase mb-2">Active Users</div>
              <div className="text-4xl font-black text-[#F9E154]">{stats.confirmed}</div>
            </div>
          </div>

          <div className="bg-black/20 rounded-3xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h2 className="font-black text-xl uppercase italic">Recent Transactions</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input 
                  type="text" 
                  placeholder="Filter bookings..."
                  className="bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-[#F9E154]"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-white/30 text-[10px] uppercase font-bold tracking-widest border-b border-white/5">
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Schedule</th>
                    <th className="px-6 py-4">Court</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bookings.map(b => (
                    <tr key={b.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-sm">{b.name}</div>
                        <div className="text-[10px] text-white/30">{b.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs">{b.email}</div>
                        <div className="text-[10px] text-white/40">{b.phone}</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold">{b.timeSlots.join(', ')}</td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black bg-[#F9E154]/10 text-[#F9E154] px-2 py-1 rounded uppercase">
                          {b.court}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${b.status === 'confirmed' ? 'bg-emerald-500' : 'bg-white/20'}`} />
                          <span className="text-[10px] uppercase font-bold tracking-widest italic">{b.status}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#2D3A2A] text-white font-sans selection:bg-[#F9E154] selection:text-[#2D3A2A]">
      <main className="max-w-7xl mx-auto min-h-screen relative overflow-hidden">
          <AnimatePresence mode="wait">
            {step === STEPS.LANDING && <LandingStep key="landing" nextStep={nextStep} />}
            {step === STEPS.SELECTION && <SelectionStep key="selection" />}
            {step === STEPS.DETAILS && (
              <DetailsStepInternal 
                key="details" 
              />
            )}
            {step === STEPS.PAYMENT && <PaymentStep key="payment" />}
            {step === STEPS.SUCCESS && <SuccessStep key="success" />}
            {step === STEPS.ADMIN && <AdminDashboard key="admin" />}
          </AnimatePresence>

        {/* Hidden Admin Entry (Bottom Right) */}
        {step === STEPS.LANDING && (
          <button 
            onClick={user ? () => setStep(STEPS.ADMIN) : handleAdminLogin}
            className="absolute bottom-4 right-4 opacity-10 hover:opacity-100 transition-opacity p-2 text-stone-500 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
          >
            <ShieldCheck size={14} /> {user ? 'Admin Dashboard' : 'Admin Login'}
          </button>
        )}
      </main>
    </div>
  );
}
