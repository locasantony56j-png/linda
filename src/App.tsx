import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  Menu,
  Settings,
  Copy,
  X, 
  Pill, 
  Stethoscope, 
  BookOpen, 
  User, 
  Hospital as HospitalIcon, 
  AlertCircle, 
  MessageSquare, 
  Calculator, 
  ChevronRight, 
  Languages,
  ArrowLeft,
  Info,
  Activity,
  HeartPulse,
  Brain,
  Image as ImageIcon,
  Clock,
  CheckCircle2,
  Zap,
  MapPin,
  Phone,
  Send,
  Plus,
  Minus,
  Trash2,
  Scan,
  Camera,
  Upload,
  Calendar,
  Check,
  Bookmark as BookmarkIcon,
  Moon,
  Sun,
  Share2,
  Download,
  Mail,
  LogOut,
  LogIn,
  MessageCircle,
  Droplets,
  Scale,
  FileText,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  auth, 
  db,
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  setDoc,
  getDoc
} from './firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  medicines, 
  dictionary, 
  diseases, 
  doctors, 
  emergencyGuides, 
  medicalImages, 
  hospitals,
  abbreviations,
  flashcards,
  quizQuestions,
  studyNotes,
  initialExamPlans,
  academicDictionary,
  bloodDonors
} from './data';
import { Medicine, DictionaryTerm, Disease, Doctor, EmergencyGuide, MedicalImage, Hospital, Language, Abbreviation, Flashcard, QuizQuestion, StudyNote, ExamPlan, Bookmark, Note, BloodDonor, Prescription } from './types';

// --- AI Assistant Setup ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// --- Components ---

const LanguageToggle = ({ lang, setLang }: { lang: Language, setLang: (l: Language) => void }) => (
  <button 
    onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/20"
  >
    <Languages size={16} />
    <span className="text-sm font-medium">{lang === 'en' ? 'বাংলা' : 'English'}</span>
  </button>
);

const SectionHeader = ({ title, icon: Icon, onBack }: { title: string, icon: any, onBack?: () => void }) => (
  <div className="flex items-center gap-3 mb-6">
    {onBack && (
      <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
        <ArrowLeft size={20} />
      </button>
    )}
    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
      <Icon size={24} />
    </div>
    <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
  </div>
);

interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  key?: string | number;
}

const Card = ({ children, onClick, className = "" }: CardProps) => (
  <motion.div 
    whileHover={{ y: -4, scale: 1.01 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-4 cursor-pointer hover:border-emerald-500/50 transition-all ${className}`}
  >
    {children}
  </motion.div>
);

// --- Main App ---

export default function App() {
  const [lang, setLang] = useState<Language>('bn');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyGuide | null>(null);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [interactionList, setInteractionList] = useState<Medicine[]>([]);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // Firebase & UI State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [aiDictionaryResult, setAiDictionaryResult] = useState<string | null>(null);
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateInput, setTranslateInput] = useState('');
  const [translateOutput, setTranslateOutput] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, []);
  
  // Dosage Calculator State
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [dosePerKg, setDosePerKg] = useState('');
  
  // Quiz State
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  
  // Flashcard State
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);

  // BMI State
  const [bmiHeight, setBmiHeight] = useState('');
  const [bmiWeight, setBmiWeight] = useState('');
  const [bmiResult, setBmiResult] = useState<{ value: number, status: string } | null>(null);

  // Blood Donor State
  const [bloodGroupSearch, setBloodGroupSearch] = useState('');
  const [bloodLocationSearch, setBloodLocationSearch] = useState('');

  // Prescription State
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isUploadingPrescription, setIsUploadingPrescription] = useState(false);

  // Scan & Diagnosis State
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [examPlans, setExamPlans] = useState<ExamPlan[]>(initialExamPlans);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const chatEndRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsubBookmarks: (() => void) | null = null;
    let unsubNotes: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // Cleanup previous listeners
      if (unsubBookmarks) unsubBookmarks();
      if (unsubNotes) unsubNotes();

      if (user) {
        // Sync user profile
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.darkMode !== undefined) setDarkMode(data.darkMode);
          if (data.language) setLang(data.language as Language);
        } else {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            role: 'user',
            darkMode: true,
            language: 'bn'
          });
        }

        // Sync bookmarks
        const qBookmarks = query(collection(db, 'bookmarks'), where('userId', '==', user.uid));
        unsubBookmarks = onSnapshot(qBookmarks, (snapshot) => {
          setBookmarks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bookmark)));
        });

        // Sync notes
        const qNotes = query(collection(db, 'notes'), where('userId', '==', user.uid));
        unsubNotes = onSnapshot(qNotes, (snapshot) => {
          setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note)));
        });
      } else {
        setBookmarks([]);
        setNotes([]);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubBookmarks) unsubBookmarks();
      if (unsubNotes) unsubNotes();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const filteredMedicines = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return medicines.filter(m => 
      m.name.toLowerCase().includes(q) || 
      m.genericName.toLowerCase().includes(q) || 
      m.companyName.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filteredDictionary = useMemo(() => {
    if (!searchQuery && !globalSearchQuery) return [];
    const q = (searchQuery || globalSearchQuery).toLowerCase();
    return dictionary.filter(d => d.term.toLowerCase().includes(q) || d.meaningBangla.includes(q));
  }, [searchQuery, globalSearchQuery]);

  const filteredAcademicDictionary = useMemo(() => {
    if (!searchQuery && !globalSearchQuery) return [];
    const q = (searchQuery || globalSearchQuery).toLowerCase();
    return academicDictionary.filter(d => d.term.toLowerCase().includes(q) || d.meaningBangla.includes(q));
  }, [searchQuery, globalSearchQuery]);

  const filteredDiseases = useMemo(() => {
    if (!searchQuery && !globalSearchQuery) return [];
    const q = (searchQuery || globalSearchQuery).toLowerCase();
    return diseases.filter(d => 
      d.name.en.toLowerCase().includes(q) || 
      d.name.bn.includes(q)
    );
  }, [searchQuery, globalSearchQuery]);

  const globalSearchResults = useMemo(() => {
    if (!globalSearchQuery) return null;
    const q = globalSearchQuery.toLowerCase();
    
    const meds = medicines.filter(m => 
      m.name.toLowerCase().includes(q) || 
      m.genericName.toLowerCase().includes(q) || 
      m.companyName.toLowerCase().includes(q)
    );
    
    const dict = dictionary.filter(d => 
      d.term.toLowerCase().includes(q) || 
      d.meaningBangla.includes(q)
    );

    const acadDict = academicDictionary.filter(d => 
      d.term.toLowerCase().includes(q) || 
      d.meaningBangla.includes(q)
    );
    
    const diss = diseases.filter(d => 
      d.name.en.toLowerCase().includes(q) || 
      d.name.bn.includes(q)
    );
    
    return { meds, dict, acadDict, diss };
  }, [globalSearchQuery]);

  const filteredDoctors = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return doctors.filter(d => 
      d.name.en.toLowerCase().includes(q) || 
      d.name.bn.includes(q) || 
      d.specialization.en.toLowerCase().includes(q) ||
      d.specialization.bn.includes(q) ||
      d.hospital.en.toLowerCase().includes(q) ||
      d.hospital.bn.includes(q)
    );
  }, [searchQuery]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const toggleDarkMode = async () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (user) {
      await setDoc(doc(db, 'users', user.uid), { darkMode: newMode }, { merge: true });
    }
  };

  const handleSaveNote = async () => {
    if (!user) {
      handleLogin();
      return;
    }
    if (!noteTitle.trim() || !noteContent.trim()) return;

    try {
      if (editingNoteId) {
        await setDoc(doc(db, 'notes', editingNoteId), {
          title: noteTitle,
          content: noteContent,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await addDoc(collection(db, 'notes'), {
          userId: user.uid,
          title: noteTitle,
          content: noteContent,
          updatedAt: serverTimestamp()
        });
      }
      setNoteTitle('');
      setNoteContent('');
      setEditingNoteId(null);
    } catch (error) {
      console.error("Error saving note:", error);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notes', id));
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const handleTranslate = async () => {
    if (!translateInput.trim()) return;
    if (!isOnline) {
      setTranslateOutput(lang === 'en' ? "Offline: Translation requires internet connection." : "অফলাইন: অনুবাদের জন্য ইন্টারনেট সংযোগ প্রয়োজন।");
      return;
    }
    setIsTranslating(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = `Translate the following text to ${lang === 'en' ? 'Bengali' : 'English'}. This is a general-purpose translator, so handle any topic (medical, academic, or general). If it's a complex term, provide a brief explanation. Text: "${translateInput}"`;
      const result = await model.generateContent(prompt);
      setTranslateOutput(result.response.text());
    } catch (error) {
      console.error("Translation error:", error);
      setTranslateOutput("Translation failed. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  };

  const toggleBookmark = async (itemId: string, type: 'medicine' | 'dictionary' | 'disease') => {
    if (!user) {
      handleLogin();
      return;
    }

    const existing = bookmarks.find(b => b.itemId === itemId && b.type === type);
    if (existing) {
      await deleteDoc(doc(db, 'bookmarks', existing.id));
    } else {
      await addDoc(collection(db, 'bookmarks'), {
        userId: user.uid,
        itemId,
        type,
        savedAt: new Date().toISOString()
      });
    }
  };

  const [showToast, setShowToast] = useState<string | null>(null);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setShowToast(lang === 'en' ? 'Link copied to clipboard!' : 'লিঙ্কটি ক্লিপবোর্ডে কপি করা হয়েছে!');
  };

  const shareItem = async (title: string, text: string) => {
    const urlToShare = window.location.origin;
    const fullText = `${text}\n\nCheck it out here: ${urlToShare}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: fullText,
          url: urlToShare
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          copyToClipboard(urlToShare);
        }
      }
    } else {
      copyToClipboard(urlToShare);
    }
  };

  const shortenUrl = async (url: string) => {
    try {
      const response = await fetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`);
      const data = await response.json();
      if (data.shorturl) {
        setShortUrl(data.shorturl);
        return data.shorturl;
      }
    } catch (error) {
      console.error("URL shortening failed:", error);
    }
    return url;
  };

  useEffect(() => {
    shortenUrl(window.location.origin);
  }, []);
  const handleAIChat = async (text: string) => {
    if (!text.trim()) return;
    if (!isOnline) {
      setChatMessages([...chatMessages, { role: 'user' as const, text }, { role: 'model' as const, text: lang === 'en' ? 'I am offline. Please connect to the internet to chat with me.' : 'আমি অফলাইনে আছি। আমার সাথে চ্যাট করতে দয়া করে ইন্টারনেটে সংযুক্ত হন।' }]);
      return;
    }
    const newMessages = [...chatMessages, { role: 'user' as const, text }];
    setChatMessages(newMessages);
    setIsTyping(true);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(`You are a medical learning assistant for students in Bangladesh. Answer in ${lang === 'en' ? 'English' : 'Bangla'}. Topic: ${text}`);
      setChatMessages([...newMessages, { role: 'model' as const, text: result.response.text() || 'Error' }]);
    } catch (error) {
      console.error(error);
      setChatMessages([...newMessages, { role: 'model' as const, text: 'Sorry, I encountered an error.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleScanAnalysis = async (base64Image: string, text?: string) => {
    if (!isOnline) {
      setScanResult(lang === 'en' ? 'Offline: Scan analysis requires internet connection.' : 'অফলাইন: স্ক্যান বিশ্লেষণের জন্য ইন্টারনেট সংযোগ প্রয়োজন।');
      return;
    }
    setIsScanning(true);
    setScanResult(null);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const promptText = `You are a medical diagnostic assistant for medical students in Bangladesh. 
      Analyze the provided image (which could be a symptom photo or a medical report) and any provided text: "${text || ''}".
      Provide a likely diagnosis/condition.
      Suggest next steps:
      1. Necessary medical tests.
      2. Recommended medicines with dosage (mention these are for educational reference).
      3. Precautions.
      4. Lifestyle or home care instructions.
      
      Answer in ${lang === 'en' ? 'English' : 'Bangla'}. 
      Make the response clear, accurate, and easy to understand for a medical student.
      IMPORTANT: Include a disclaimer that this is for educational purposes and not a substitute for professional medical advice.`;

      const result = await model.generateContent([
        promptText,
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image.split(',')[1]
          }
        }
      ]);

      setScanResult(result.response.text() || 'Error analyzing scan.');
    } catch (error) {
      console.error(error);
      setScanResult('Sorry, I encountered an error during analysis.');
    } finally {
      setIsScanning(false);
    }
  };

  const checkInteractions = () => {
    if (interactionList.length < 2) return null;
    const genericNames = interactionList.map(m => m.genericName);
    const risks: string[] = [];
    
    interactionList.forEach(m => {
      if (m.interactions) {
        m.interactions.forEach(inter => {
          if (genericNames.includes(inter)) {
            risks.push(`${m.name} (${m.genericName}) interacts with ${inter}`);
          }
        });
      }
    });

    return risks;
  };

  const renderHome = () => (
    <div className="space-y-8 pb-24">
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" size={20} />
        <input 
          type="text"
          placeholder={lang === 'en' ? "Search medicines, diseases, terms..." : "ওষুধ, রোগ, শব্দ খুঁজুন..."}
          className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          value={globalSearchQuery}
          onChange={(e) => setGlobalSearchQuery(e.target.value)}
        />
      </div>

      {globalSearchQuery ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">{lang === 'en' ? 'Search Results' : 'অনুসন্ধান ফলাফল'}</h3>
            <button onClick={() => setGlobalSearchQuery('')} className="text-sm text-emerald-400 font-bold">
              {lang === 'en' ? 'Clear' : 'মুছে ফেলুন'}
            </button>
          </div>

          {globalSearchResults?.meds.length === 0 && globalSearchResults?.dict.length === 0 && globalSearchResults?.acadDict.length === 0 && globalSearchResults?.diss.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              {lang === 'en' ? 'No results found' : 'কোন ফলাফল পাওয়া যায়নি'}
            </div>
          ) : (
            <div className="space-y-6">
              {globalSearchResults?.meds.length! > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 px-1">{lang === 'en' ? 'Medicines' : 'ওষুধ'}</h4>
                  {globalSearchResults?.meds.map(m => (
                    <Card key={m.id} onClick={() => { setSelectedMedicine(m); setActiveTab('medicines'); }}>
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="font-bold text-emerald-400">{m.name}</h5>
                          <p className="text-xs text-zinc-500">{m.genericName}</p>
                        </div>
                        <ChevronRight size={16} className="text-zinc-700" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {globalSearchResults?.diss.length! > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 px-1">{lang === 'en' ? 'Diseases' : 'রোগ'}</h4>
                  {globalSearchResults?.diss.map(d => (
                    <Card key={d.id} onClick={() => { setSelectedDisease(d); setActiveTab('diseases'); }}>
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="font-bold text-purple-400">{d.name[lang]}</h5>
                          <p className="text-xs text-zinc-500 truncate max-w-[200px]">{d.symptoms[lang]}</p>
                        </div>
                        <ChevronRight size={16} className="text-zinc-700" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {globalSearchResults?.dict.length! > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 px-1">{lang === 'en' ? 'Dictionary' : 'অভিধান'}</h4>
                  {globalSearchResults?.dict.map(term => (
                    <Card key={term.id} onClick={() => setActiveTab('dictionary')}>
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="font-bold text-amber-400">{term.term}</h5>
                          <p className="text-xs text-zinc-500">{term.meaningBangla}</p>
                        </div>
                        <ChevronRight size={16} className="text-zinc-700" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {globalSearchResults?.acadDict.length! > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 px-1">{lang === 'en' ? 'Academic Dictionary' : 'একাডেমিক অভিধান'}</h4>
                  {globalSearchResults?.acadDict.map(term => (
                    <Card key={term.id} onClick={() => setActiveTab('academic')}>
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="font-bold text-indigo-400">{term.term}</h5>
                          <p className="text-xs text-zinc-500">{term.meaningBangla}</p>
                        </div>
                        <ChevronRight size={16} className="text-zinc-700" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="relative h-48 rounded-3xl overflow-hidden mb-8">
            <img 
              src="https://picsum.photos/seed/medical/1200/400" 
              className="w-full h-full object-cover opacity-60" 
              alt="Banner"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent flex flex-col justify-end p-6">
              <h1 className="text-3xl font-bold mb-1">
                {lang === 'en' ? 'Welcome, Medical Student' : 'স্বাগতম, মেডিকেল শিক্ষার্থী'}
              </h1>
              <p className="text-zinc-400">
                {lang === 'en' ? 'Your all-in-one medical super app' : 'আপনার অল-ইন-ওয়ান মেডিকেল সুপার অ্যাপ'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { id: 'medicines', icon: Pill, label: lang === 'en' ? 'Medicines' : 'ওষুধ', color: 'bg-blue-500/20 text-blue-400' },
              { id: 'diseases', icon: Stethoscope, label: lang === 'en' ? 'Diseases' : 'রোগ', color: 'bg-purple-500/20 text-purple-400' },
              { id: 'dictionary', icon: BookOpen, label: lang === 'en' ? 'Dictionary' : 'অভিধান', color: 'bg-amber-500/20 text-amber-400' },
              { id: 'tools', icon: Calculator, label: lang === 'en' ? 'Tools' : 'সরঞ্জাম', color: 'bg-emerald-500/20 text-emerald-400' },
              { id: 'bookmarks', icon: BookmarkIcon, label: lang === 'en' ? 'Bookmarks' : 'বুকমার্ক', color: 'bg-yellow-500/20 text-yellow-400' },
              { id: 'doctors', icon: User, label: lang === 'en' ? 'Doctors' : 'ডাক্তার', color: 'bg-rose-500/20 text-rose-400' },
              { id: 'hospitals', icon: HospitalIcon, label: lang === 'en' ? 'Hospitals' : 'হাসপাতাল', color: 'bg-cyan-500/20 text-cyan-400' },
              { id: 'emergency', icon: AlertCircle, label: lang === 'en' ? 'Emergency' : 'জরুরি', color: 'bg-red-500/20 text-red-400' },
              { id: 'blood', icon: Droplets, label: lang === 'en' ? 'Blood Donor' : 'রক্তদাতা', color: 'bg-red-500/20 text-red-500' },
              { id: 'prescriptions', icon: FileText, label: lang === 'en' ? 'Prescriptions' : 'প্রেসক্রিপশন', color: 'bg-orange-500/20 text-orange-400' },
              { id: 'scan', icon: Scan, label: lang === 'en' ? 'Scan & Diagnosis' : 'স্ক্যান ও রোগ নির্ণয়', color: 'bg-teal-500/20 text-teal-400' },
              { id: 'ai', icon: MessageSquare, label: lang === 'en' ? 'AI Assistant' : 'এআই সহকারী', color: 'bg-indigo-500/20 text-indigo-400' },
            ].map(item => (
              <Card key={item.id} onClick={() => setActiveTab(item.id)} className="flex flex-col items-center justify-center py-6 gap-3">
                <div className={`p-3 rounded-2xl ${item.color}`}>
                  <item.icon size={28} />
                </div>
                <span className="font-semibold text-sm">{item.label}</span>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold px-1">{lang === 'en' ? 'Quick Emergency Guide' : 'দ্রুত জরুরি নির্দেশিকা'}</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {emergencyGuides.map(guide => (
                <Card key={guide.id} onClick={() => { setSelectedEmergency(guide); setActiveTab('emergency'); }} className="min-w-[200px] flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
                    <AlertCircle size={20} />
                  </div>
                  <span className="font-medium">{guide.title[lang]}</span>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderMedicines = () => (
    <div className="space-y-6 pb-24">
      <SectionHeader title={lang === 'en' ? 'Medicine Database' : 'ওষুধের ডাটাবেস'} icon={Pill} onBack={() => setActiveTab('home')} />
      
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" size={20} />
        <input 
          type="text"
          placeholder={lang === 'en' ? "Search by Name, Generic or Company..." : "নাম, জেনেরিক বা কোম্পানি দিয়ে খুঁজুন..."}
          className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {searchQuery ? (
          filteredMedicines.length > 0 ? (
            filteredMedicines.map(m => (
              <Card key={m.id} onClick={() => setSelectedMedicine(m)}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-bold text-emerald-400">{m.name}</h4>
                    <p className="text-sm text-zinc-400">{m.genericName}</p>
                    <p className="text-xs text-zinc-500 mt-1">{m.companyName}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded-md">{m.type}</span>
                    <p className="text-sm font-bold text-emerald-500 mt-2">{m.price}</p>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 text-zinc-500">
              {lang === 'en' ? 'No medicines found' : 'কোন ওষুধ পাওয়া যায়নি'}
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-emerald-500/10 border-emerald-500/20" onClick={() => setActiveTab('interaction')}>
              <div className="flex items-center gap-3">
                <Zap className="text-emerald-400" />
                <div>
                  <h4 className="font-bold">{lang === 'en' ? 'Interaction Checker' : 'ওষুধের মিথস্ক্রিয়া'}</h4>
                  <p className="text-xs text-zinc-400">{lang === 'en' ? 'Check risks between medicines' : 'ওষুধের মধ্যে ঝুঁকি পরীক্ষা করুন'}</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedMedicine && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl p-6 overflow-y-auto"
          >
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{selectedMedicine.type}</span>
                  <h2 className="text-4xl font-black mt-2">{selectedMedicine.name}</h2>
                  <p className="text-xl text-zinc-400">{selectedMedicine.genericName}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => toggleBookmark(selectedMedicine.id, 'medicine')}
                    className={`p-3 rounded-full transition-colors ${bookmarks.find(b => b.itemId === selectedMedicine.id) ? 'bg-emerald-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}
                  >
                    <BookmarkIcon size={20} fill={bookmarks.find(b => b.itemId === selectedMedicine.id) ? 'currentColor' : 'none'} />
                  </button>
                  <button 
                    onClick={() => shareItem(selectedMedicine.name, `${selectedMedicine.name} (${selectedMedicine.genericName}) - ${selectedMedicine.uses[lang]}`)}
                    className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <Share2 size={20} />
                  </button>
                  <button onClick={() => setSelectedMedicine(null)} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-xs text-zinc-500 uppercase font-bold mb-1">{lang === 'en' ? 'Dosage' : 'মাত্রা'}</p>
                  <p className="font-bold">{selectedMedicine.dosage}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-xs text-zinc-500 uppercase font-bold mb-1">{lang === 'en' ? 'Price' : 'মূল্য'}</p>
                  <p className="font-bold text-emerald-400">{selectedMedicine.price}</p>
                </div>
              </div>

              <div className="space-y-6">
                {[
                  { title: lang === 'en' ? 'Uses' : 'ব্যবহার', content: selectedMedicine.uses[lang], icon: Info },
                  { title: lang === 'en' ? 'How to Use' : 'ব্যবহার পদ্ধতি', content: selectedMedicine.howToUse[lang], icon: Clock },
                  { title: lang === 'en' ? 'Warnings' : 'সতর্কতা', content: selectedMedicine.warnings[lang], icon: AlertCircle },
                  { title: lang === 'en' ? 'Side Effects' : 'পার্শ্বপ্রতিক্রিয়া', content: selectedMedicine.sideEffects[lang], icon: Activity },
                  { title: lang === 'en' ? 'Contraindications' : 'যাদের জন্য নয়', content: selectedMedicine.contraindications[lang], icon: X },
                ].map(section => (
                  <div key={section.title} className="space-y-2">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <section.icon size={18} />
                      <h4 className="text-sm font-bold uppercase tracking-wider">{section.title}</h4>
                    </div>
                    <p className="text-zinc-200 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5">{section.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderInteraction = () => (
    <div className="space-y-6 pb-24">
      <SectionHeader title={lang === 'en' ? 'Interaction Checker' : 'ওষুধের মিথস্ক্রিয়া'} icon={Zap} onBack={() => setActiveTab('medicines')} />
      
      <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 space-y-4">
        <p className="text-sm text-zinc-400">{lang === 'en' ? 'Add medicines to check for potential drug-drug interactions.' : 'সম্ভাব্য ওষুধের মিথস্ক্রিয়া পরীক্ষা করতে ওষুধ যোগ করুন।'}</p>
        
        <div className="flex gap-2">
          <select 
            className="flex-1 bg-zinc-800 border border-white/10 rounded-xl px-4 py-2 focus:outline-none"
            onChange={(e) => {
              const med = medicines.find(m => m.id === e.target.value);
              if (med && !interactionList.find(i => i.id === med.id)) {
                setInteractionList([...interactionList, med]);
              }
            }}
          >
            <option value="">{lang === 'en' ? 'Select Medicine...' : 'ওষুধ নির্বাচন করুন...'}</option>
            {medicines.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.genericName})</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          {interactionList.map(m => (
            <div key={m.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
              <span>{m.name}</span>
              <button onClick={() => setInteractionList(interactionList.filter(i => i.id !== m.id))} className="text-red-400 p-1 hover:bg-red-500/10 rounded-lg">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        {interactionList.length >= 2 && (
          <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400" />
              {lang === 'en' ? 'Analysis Result' : 'বিশ্লেষণ ফলাফল'}
            </h4>
            {checkInteractions()?.length ? (
              <ul className="space-y-1">
                {checkInteractions()?.map((risk, i) => (
                  <li key={i} className="text-sm text-red-400">• {risk}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-emerald-400">{lang === 'en' ? 'No significant interactions found between these medicines.' : 'এই ওষুধগুলোর মধ্যে কোনো উল্লেখযোগ্য মিথস্ক্রিয়া পাওয়া যায়নি।'}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const searchDictionaryAI = async () => {
    if (!searchQuery.trim()) return;
    if (!isOnline) {
      setAiDictionaryResult(lang === 'en' ? 'Offline: AI search requires internet connection.' : 'অফলাইন: এআই অনুসন্ধানের জন্য ইন্টারনেট সংযোগ প্রয়োজন।');
      return;
    }
    setIsSearchingAI(true);
    setAiDictionaryResult(null);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = `Act as a comprehensive general-purpose and academic dictionary for students from Class 1 to Ph.D. level. Define the word or concept: "${searchQuery}". Provide the English meaning, Bengali meaning, synonyms, usage in a sentence, and a detailed explanation in ${lang === 'en' ? 'English' : 'Bangla'}. Format clearly.`;
      const result = await model.generateContent(prompt);
      setAiDictionaryResult(result.response.text() || 'Not found.');
    } catch (error) {
      console.error(error);
      setAiDictionaryResult('Error fetching definition.');
    } finally {
      setIsSearchingAI(false);
    }
  };

  const playAudio = async (text: string) => {
    console.log("TTS not supported in this version", text);
  };

  const renderAcademicDictionary = () => (
    <div className="space-y-6 pb-24">
      <SectionHeader title={lang === 'en' ? 'Academic Dictionary' : 'একাডেমিক অভিধান'} icon={Brain} onBack={() => setActiveTab('home')} />
      
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
        <input 
          type="text"
          placeholder={lang === 'en' ? "Search academic terms..." : "একাডেমিক শব্দ খুঁজুন..."}
          className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {(searchQuery ? filteredAcademicDictionary : academicDictionary).map(d => (
          <Card key={d.id} className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xl font-bold text-indigo-400">{d.term}</h4>
                <span className="text-sm font-medium bg-white/10 px-3 py-1 rounded-full mt-1 inline-block">{d.meaningBangla}</span>
              </div>
              <button 
                onClick={() => playAudio(d.term)}
                className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Zap size={16} />
              </button>
            </div>
            <p className="text-sm text-zinc-400 italic">{d.explanationEnglish}</p>
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <p className="text-sm leading-relaxed">{d.definition[lang]}</p>
            </div>
            {d.synonyms && (
              <p className="text-xs text-zinc-500">
                <span className="font-bold">{lang === 'en' ? 'Synonyms: ' : 'প্রতিশব্দ: '}</span>
                {d.synonyms.join(', ')}
              </p>
            )}
            {d.usage && (
              <p className="text-xs text-zinc-500 italic">
                <span className="font-bold not-italic">{lang === 'en' ? 'Usage: ' : 'ব্যবহার: '}</span>
                "{d.usage[lang]}"
              </p>
            )}
          </Card>
        ))}
        {searchQuery && filteredAcademicDictionary.length === 0 && (
          <div className="text-center py-8 space-y-4">
            <p className="text-zinc-400">{lang === 'en' ? 'Word not found in local dictionary.' : 'স্থানীয় অভিধানে শব্দটি পাওয়া যায়নি।'}</p>
            <button 
              onClick={searchDictionaryAI}
              disabled={isSearchingAI}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 mx-auto"
            >
              <Brain size={20} />
              {isSearchingAI ? (lang === 'en' ? 'Searching Academic Books...' : 'একাডেমিক বইয়ে খোঁজা হচ্ছে...') : (lang === 'en' ? 'Search in Academic Books (AI)' : 'একাডেমিক বইয়ে খুঁজুন (AI)')}
            </button>
            {aiDictionaryResult && (
              <div className="mt-6 text-left bg-zinc-900 border border-indigo-500/30 p-6 rounded-2xl">
                <div className="flex items-center gap-2 text-indigo-400 mb-4">
                  <BookOpen size={20} />
                  <h4 className="font-bold">{lang === 'en' ? 'AI Dictionary Result' : 'এআই অভিধান ফলাফল'}</h4>
                </div>
                <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-sm">
                  {aiDictionaryResult}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

    const renderNoteBook = () => (
    <div className="space-y-6 pb-24">
      <SectionHeader title={lang === 'en' ? 'Note Book' : 'নোট বুক'} icon={MessageSquare} onBack={() => setActiveTab('home')} />
      
      <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 space-y-4">
        <input 
          type="text"
          placeholder={lang === 'en' ? "Note Title" : "নোটের শিরোনাম"}
          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          value={noteTitle}
          onChange={(e) => setNoteTitle(e.target.value)}
        />
        <textarea 
          placeholder={lang === 'en' ? "Write your note here..." : "আপনার নোট এখানে লিখুন..."}
          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 h-32 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
        />
        <div className="flex gap-2">
          <button 
            onClick={handleSaveNote}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <Check size={20} />
            {editingNoteId ? (lang === 'en' ? 'Update Note' : 'নোট আপডেট করুন') : (lang === 'en' ? 'Save Note' : 'নোট সেভ করুন')}
          </button>
          {editingNoteId && (
            <button 
              onClick={() => { setEditingNoteId(null); setNoteTitle(''); setNoteContent(''); }}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {notes.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <MessageSquare className="mx-auto text-zinc-600 mb-4" size={48} />
            <p className="text-zinc-500">{lang === 'en' ? 'No notes yet. Start writing!' : 'এখনো কোনো নোট নেই। লেখা শুরু করুন!'}</p>
          </div>
        ) : (
          [...notes].sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)).map(note => (
            <Card key={note.id} className="space-y-3">
              <div className="flex justify-between items-start">
                <h4 className="text-xl font-bold text-emerald-400">{note.title}</h4>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setEditingNoteId(note.id); setNoteTitle(note.title); setNoteContent(note.content); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
                  >
                    <Settings size={16} />
                  </button>
                  <button 
                    onClick={() => setNoteToDelete(note.id)}
                    className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-red-400 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="text-zinc-300 whitespace-pre-wrap">{note.content}</p>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
                {note.updatedAt?.toDate ? note.updatedAt.toDate().toLocaleString() : 'Just now'}
              </div>

              {noteToDelete === note.id && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col gap-3">
                  <p className="text-sm font-bold text-red-400">
                    {lang === 'en' ? 'Are you sure you want to delete this note?' : 'আপনি কি নিশ্চিত যে আপনি এই নোটটি মুছে ফেলতে চান?'}
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { handleDeleteNote(note.id); setNoteToDelete(null); }}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      {lang === 'en' ? 'Yes, Delete' : 'হ্যাঁ, মুছুন'}
                    </button>
                    <button 
                      onClick={() => setNoteToDelete(null)}
                      className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      {lang === 'en' ? 'Cancel' : 'বাতিল'}
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );

  const renderTranslate = () => (
    <div className="space-y-6 pb-24">
      <SectionHeader title={lang === 'en' ? 'AI Translator' : 'এআই অনুবাদক'} icon={Languages} onBack={() => setActiveTab('home')} />
      
      <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-emerald-400">{lang === 'en' ? 'English' : 'ইংরেজি'}</span>
          <Languages className="text-zinc-500" size={20} />
          <span className="text-sm font-bold text-emerald-400">{lang === 'en' ? 'Bengali' : 'বাংলা'}</span>
        </div>
        
        <textarea 
          placeholder={lang === 'en' ? "Enter any text to translate..." : "অনুবাদ করার জন্য যেকোনো টেক্সট লিখুন..."}
          className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 h-40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none text-lg"
          value={translateInput}
          onChange={(e) => setTranslateInput(e.target.value)}
        />
        
        <button 
          onClick={handleTranslate}
          disabled={isTranslating || !translateInput.trim()}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
        >
          {isTranslating ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <Zap size={20} />
          )}
          {lang === 'en' ? 'Translate Now' : 'এখনই অনুবাদ করুন'}
        </button>

        {translateOutput && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-emerald-400">{lang === 'en' ? 'Translation Result' : 'অনুবাদ ফলাফল'}</h4>
              <button 
                onClick={() => { navigator.clipboard.writeText(translateOutput); alert('Copied!'); }}
                className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Copy size={16} />
              </button>
            </div>
            <div className="text-lg leading-relaxed whitespace-pre-wrap selectable">
              {translateOutput}
            </div>
          </motion.div>
        )}
      </div>

      <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6">
        <h4 className="font-bold mb-4 flex items-center gap-2">
          <Info size={18} className="text-emerald-400" />
          {lang === 'en' ? 'Translation Tips' : 'অনুবাদ টিপস'}
        </h4>
        <ul className="text-sm text-zinc-400 space-y-2 list-disc pl-5">
          <li>{lang === 'en' ? 'You can translate anything: medical terms, academic text, or general conversation.' : 'আপনি যেকোনো কিছু অনুবাদ করতে পারেন: চিকিৎসা শব্দ, একাডেমিক টেক্সট বা সাধারণ কথোপকথন।'}</li>
          <li>{lang === 'en' ? 'AI will provide context for complex terminology.' : 'এআই জটিল শব্দের জন্য ব্যাখ্যা প্রদান করবে।'}</li>
          <li>{lang === 'en' ? 'Supports both English to Bengali and vice versa.' : 'ইংরেজি থেকে বাংলা এবং বাংলা থেকে ইংরেজি উভয়ই সাপোর্ট করে।'}</li>
        </ul>
      </div>
    </div>
  );

  const renderBnEnDictionary = () => (
    <div className="space-y-6 pb-24">
      <SectionHeader title={lang === 'en' ? 'EN to BN Dictionary' : 'ইংরেজি থেকে বাংলা অভিধান'} icon={BookOpen} onBack={() => setActiveTab('home')} />
      
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
        <input 
          type="text"
          placeholder={lang === 'en' ? "Search in English..." : "ইংরেজিতে খুঁজুন..."}
          className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {dictionary.filter(d => d.term.toLowerCase().includes(searchQuery.toLowerCase())).map(d => (
          <Card key={d.id} className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xl font-bold text-emerald-400">{d.term}</h4>
                <span className="text-sm font-medium bg-white/10 px-3 py-1 rounded-full mt-1 inline-block">{d.meaningBangla}</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => toggleBookmark(d.id, 'dictionary')}
                  className={`p-2 rounded-lg transition-colors ${bookmarks.find(b => b.itemId === d.id) ? 'bg-emerald-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}
                >
                  <BookmarkIcon size={16} fill={bookmarks.find(b => b.itemId === d.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
            <p className="text-sm text-zinc-400 italic">{d.explanationEnglish}</p>
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <p className="text-sm leading-relaxed">{d.definition[lang]}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => {
    const appUrl = "https://ais-dev-uuldwodrmltusrvngttfcp-15332223291.asia-southeast1.run.app";
    const displayUrl = appUrl;

    return (
      <div className="space-y-6 pb-24">
        <SectionHeader title={lang === 'en' ? 'Settings & Share' : 'সেটিংস ও শেয়ার'} icon={Settings} onBack={() => setActiveTab('home')} />
        
        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 space-y-6">
          <h3 className="text-xl font-bold">{lang === 'en' ? 'Share App' : 'অ্যাপ শেয়ার করুন'}</h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-emerald-400 flex items-center gap-2">
                {lang === 'en' ? 'App Link' : 'অ্যাপ লিঙ্ক'}
              </h4>
              <p className="text-xs text-zinc-500 truncate">{displayUrl}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => copyToClipboard(displayUrl)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-all"
              >
                <Copy size={16} />
                {lang === 'en' ? 'Copy' : 'কপি'}
              </button>
              <button 
                onClick={() => shareItem('Bristy Health Care', `Check out Bristy Health Care: ${displayUrl}`)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all"
              >
                <Share2 size={16} />
                {lang === 'en' ? 'Share' : 'শেয়ার'}
              </button>
              <button 
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('Check out Bristy Health Care: ' + displayUrl)}`, '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-all"
              >
                <MessageCircle size={16} />
                WhatsApp
              </button>
            </div>
          </div>
        </div>

        {deferredPrompt ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500 rounded-xl text-white">
                <Download size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">{lang === 'en' ? 'Install App' : 'অ্যাপ ইনস্টল করুন'}</h3>
                <p className="text-sm text-zinc-400">{lang === 'en' ? 'Install Bristy Health Care on your home screen for quick access.' : 'দ্রুত ব্যবহারের জন্য ব্রিস্টি হেলথ কেয়ার আপনার হোম স্ক্রিনে ইনস্টল করুন।'}</p>
              </div>
            </div>
            <button 
              onClick={handleInstallClick}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <Download size={20} />
              {lang === 'en' ? 'Install Now' : 'এখনই ইনস্টল করুন'}
            </button>
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 rounded-xl text-zinc-400">
                <Info size={24} />
              </div>
              <h3 className="text-xl font-bold">{lang === 'en' ? 'How to Install' : 'কিভাবে ইনস্টল করবেন'}</h3>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {lang === 'en' 
                ? 'To use this as an app, open this link in Chrome (Android) or Safari (iOS) and select "Add to Home Screen" from the browser menu.' 
                : 'এটি অ্যাপ হিসেবে ব্যবহার করতে, এই লিঙ্কটি ক্রোম (অ্যান্ড্রয়েড) বা সাফারি (আইওএস)-এ ওপেন করুন এবং ব্রাউজার মেনু থেকে "Add to Home Screen" সিলেক্ট করুন।'}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderDictionary = () => (
    <div className="space-y-6 pb-24">
      <SectionHeader title={lang === 'en' ? 'Medical Dictionary' : 'চিকিৎসা অভিধান'} icon={BookOpen} onBack={() => setActiveTab('home')} />
      
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
        <input 
          type="text"
          placeholder={lang === 'en' ? "Search medical terms..." : "চিকিৎসা শব্দ খুঁজুন..."}
          className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {(searchQuery ? filteredDictionary : dictionary).map(d => (
          <Card key={d.id} className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xl font-bold text-emerald-400">{d.term}</h4>
                <span className="text-sm font-medium bg-white/10 px-3 py-1 rounded-full mt-1 inline-block">{d.meaningBangla}</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => toggleBookmark(d.id, 'dictionary')}
                  className={`p-2 rounded-lg transition-colors ${bookmarks.find(b => b.itemId === d.id) ? 'bg-emerald-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}
                >
                  <BookmarkIcon size={16} fill={bookmarks.find(b => b.itemId === d.id) ? 'currentColor' : 'none'} />
                </button>
                <button 
                  onClick={() => shareItem(d.term, `${d.term}: ${d.definition[lang]}`)}
                  className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>
            <p className="text-sm text-zinc-400 italic">{d.explanationEnglish}</p>
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <p className="text-sm leading-relaxed">{d.definition[lang]}</p>
            </div>
            {d.relatedTerms && (
              <div className="flex flex-wrap gap-2 pt-2">
                {d.relatedTerms.map(t => (
                  <span key={t} className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 bg-white/5 px-2 py-1 rounded border border-white/5">{t}</span>
                ))}
              </div>
            )}
          </Card>
        ))}
        {searchQuery && filteredDictionary.length === 0 && (
          <div className="text-center py-8 space-y-4">
            <p className="text-zinc-400">{lang === 'en' ? 'Word not found in local dictionary.' : 'স্থানীয় অভিধানে শব্দটি পাওয়া যায়নি।'}</p>
            <button 
              onClick={searchDictionaryAI}
              disabled={isSearchingAI}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 mx-auto"
            >
              <Brain size={20} />
              {isSearchingAI ? (lang === 'en' ? 'Searching Medical Books...' : 'মেডিকেল বইয়ে খোঁজা হচ্ছে...') : (lang === 'en' ? 'Search in Medical Books (AI)' : 'মেডিকেল বইয়ে খুঁজুন (AI)')}
            </button>
            {aiDictionaryResult && (
              <div className="mt-6 text-left bg-zinc-900 border border-indigo-500/30 p-6 rounded-2xl">
                <div className="flex items-center gap-2 text-indigo-400 mb-4">
                  <BookOpen size={20} />
                  <h4 className="font-bold">{lang === 'en' ? 'AI Dictionary Result' : 'এআই অভিধান ফলাফল'}</h4>
                </div>
                <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-sm">
                  {aiDictionaryResult}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderDiseases = () => (
    <div className="space-y-6 pb-24">
      <SectionHeader title={lang === 'en' ? 'Disease Information' : 'রোগের তথ্য'} icon={Stethoscope} onBack={() => setActiveTab('home')} />
      
      <div className="grid gap-4">
        {diseases.map(d => (
          <Card key={d.id} onClick={() => setSelectedDisease(d)}>
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-lg font-bold text-emerald-400">{d.name[lang]}</h4>
                <p className="text-xs text-zinc-500 mt-1">{lang === 'en' ? 'Symptoms, Causes, Treatment' : 'লক্ষণ, কারণ, চিকিৎসা'}</p>
              </div>
              <ChevronRight size={20} className="text-zinc-600" />
            </div>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {selectedDisease && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 z-50 bg-black p-6 overflow-y-auto"
          >
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="flex justify-between items-center">
                <button onClick={() => setSelectedDisease(null)} className="p-2 bg-white/10 rounded-full">
                  <ArrowLeft size={24} />
                </button>
                <h2 className="text-2xl font-bold">{selectedDisease.name[lang]}</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => toggleBookmark(selectedDisease.id, 'disease')}
                    className={`p-2 rounded-lg transition-colors ${bookmarks.find(b => b.itemId === selectedDisease.id) ? 'bg-emerald-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}
                  >
                    <BookmarkIcon size={20} fill={bookmarks.find(b => b.itemId === selectedDisease.id) ? 'currentColor' : 'none'} />
                  </button>
                  <button 
                    onClick={() => shareItem(selectedDisease.name[lang], `${selectedDisease.name[lang]} - ${selectedDisease.symptoms[lang]}`)}
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <Share2 size={20} />
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                {[
                  { title: lang === 'en' ? 'Symptoms' : 'লক্ষণ', content: selectedDisease.symptoms[lang], icon: Activity },
                  { title: lang === 'en' ? 'Causes' : 'কারণ', content: selectedDisease.causes[lang], icon: Info },
                  { title: lang === 'en' ? 'Diagnosis' : 'রোগ নির্ণয়', content: selectedDisease.diagnosis[lang], icon: Search },
                  { title: lang === 'en' ? 'Treatment' : 'চিকিৎসা', content: selectedDisease.treatment[lang], icon: Pill },
                  { title: lang === 'en' ? 'Prevention' : 'প্রতিরোধ', content: selectedDisease.prevention[lang], icon: CheckCircle2 },
                ].map(section => (
                  <div key={section.title} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                        <section.icon size={20} />
                      </div>
                      <h4 className="text-lg font-bold">{section.title}</h4>
                    </div>
                    <div className="bg-zinc-900 border border-white/10 p-5 rounded-2xl leading-relaxed text-zinc-300">
                      {section.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderDosageCalculator = () => (
    <div className="space-y-6">
      <SectionHeader 
        title={lang === 'en' ? 'Drug Dosage Calculator' : 'ওষুধের ডোজ ক্যালকুলেটর'} 
        icon={Calculator} 
        onBack={() => setActiveTool(null)} 
      />
      <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
              {lang === 'en' ? 'Patient Weight (kg)' : 'রোগীর ওজন (কেজি)'}
            </label>
            <input 
              type="number" 
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 outline-none"
              placeholder="e.g. 70"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
              {lang === 'en' ? 'Dose per kg (mg/kg)' : 'প্রতি কেজিতে ডোজ (মিগ্রা/কেজি)'}
            </label>
            <input 
              type="number" 
              value={dosePerKg}
              onChange={(e) => setDosePerKg(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 outline-none"
              placeholder="e.g. 15"
            />
          </div>
        </div>

        {weight && dosePerKg && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center"
          >
            <p className="text-sm text-zinc-400 mb-1">{lang === 'en' ? 'Total Recommended Dose' : 'মোট প্রস্তাবিত ডোজ'}</p>
            <h3 className="text-4xl font-black text-emerald-400">
              {(parseFloat(weight) * parseFloat(dosePerKg)).toFixed(2)} <span className="text-xl">mg</span>
            </h3>
          </motion.div>
        )}

        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3">
          <AlertCircle className="text-amber-400 shrink-0" size={20} />
          <p className="text-xs text-amber-200/80 leading-relaxed">
            {lang === 'en' 
              ? 'Disclaimer: This calculator is for educational purposes only. Always verify dosages with official medical guidelines and a senior consultant.' 
              : 'দাবিত্যাগ: এই ক্যালকুলেটরটি শুধুমাত্র শিক্ষামূলক উদ্দেশ্যে। সর্বদা অফিসিয়াল মেডিকেল গাইডলাইন এবং সিনিয়র কনসালটেন্টের সাথে ডোজ যাচাই করুন।'}
          </p>
        </div>
      </div>
    </div>
  );

  const renderAbbreviations = () => (
    <div className="space-y-6">
      <SectionHeader 
        title={lang === 'en' ? 'Medical Abbreviations' : 'চিকিৎসা সংক্ষেপ'} 
        icon={BookOpen} 
        onBack={() => setActiveTool(null)} 
      />
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
        <input 
          type="text"
          placeholder={lang === 'en' ? "Search abbreviations..." : "সংক্ষিপ্ত রূপ খুঁজুন..."}
          className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="grid gap-3">
        {abbreviations
          .filter(a => a.short.toLowerCase().includes(searchQuery.toLowerCase()) || a.full[lang].toLowerCase().includes(searchQuery.toLowerCase()))
          .map(a => (
            <Card key={a.id} className="flex justify-between items-center">
              <span className="text-lg font-black text-emerald-400">{a.short}</span>
              <span className="text-zinc-300">{a.full[lang]}</span>
            </Card>
          ))}
      </div>
    </div>
  );

  const renderFlashcards = () => {
    const card = flashcards[currentFlashcardIndex];
    return (
      <div className="space-y-6">
        <SectionHeader 
          title={lang === 'en' ? 'Medical Flashcards' : 'মেডিকেল ফ্ল্যাশকার্ড'} 
          icon={Zap} 
          onBack={() => setActiveTool(null)} 
        />
        <div className="flex flex-col items-center gap-8">
          <div className="w-full max-w-md perspective-1000">
            <motion.div 
              animate={{ rotateY: isFlashcardFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, type: 'spring' }}
              onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)}
              className="relative w-full aspect-[3/2] cursor-pointer preserve-3d"
            >
              {/* Front */}
              <div className="absolute inset-0 backface-hidden bg-zinc-900 border-2 border-emerald-500/30 rounded-3xl flex flex-col items-center justify-center p-8 text-center shadow-2xl shadow-emerald-500/10">
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-4">{card.category}</span>
                <h3 className="text-3xl font-bold">{card.front[lang]}</h3>
                <p className="mt-6 text-zinc-500 text-sm">{lang === 'en' ? 'Tap to flip' : 'উল্টাতে ট্যাপ করুন'}</p>
              </div>
              {/* Back */}
              <div className="absolute inset-0 backface-hidden bg-emerald-500 border-2 border-emerald-400 rounded-3xl flex flex-col items-center justify-center p-8 text-center rotate-y-180 shadow-2xl shadow-emerald-500/20">
                <h3 className="text-2xl font-bold text-black">{card.back[lang]}</h3>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={() => {
                setCurrentFlashcardIndex((prev) => (prev > 0 ? prev - 1 : flashcards.length - 1));
                setIsFlashcardFlipped(false);
              }}
              className="p-4 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all"
            >
              <ArrowLeft size={24} />
            </button>
            <span className="font-bold text-zinc-500">{currentFlashcardIndex + 1} / {flashcards.length}</span>
            <button 
              onClick={() => {
                setCurrentFlashcardIndex((prev) => (prev < flashcards.length - 1 ? prev + 1 : 0));
                setIsFlashcardFlipped(false);
              }}
              className="p-4 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderQuiz = () => {
    if (showQuizResult) {
      return (
        <div className="space-y-8 text-center py-12">
          <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-bold">{lang === 'en' ? 'Quiz Completed!' : 'কুইজ সম্পন্ন হয়েছে!'}</h2>
          <p className="text-zinc-400 text-lg">
            {lang === 'en' ? `You scored ${quizScore} out of ${quizQuestions.length}` : `আপনি ${quizQuestions.length} এর মধ্যে ${quizScore} পেয়েছেন`}
          </p>
          <button 
            onClick={() => {
              setCurrentQuizIndex(0);
              setQuizScore(0);
              setShowQuizResult(false);
              setSelectedQuizOption(null);
            }}
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all"
          >
            {lang === 'en' ? 'Try Again' : 'আবার চেষ্টা করুন'}
          </button>
          <button onClick={() => setActiveTool(null)} className="block mx-auto text-zinc-500 hover:text-zinc-300 font-medium">
            {lang === 'en' ? 'Back to Tools' : 'সরঞ্জামে ফিরে যান'}
          </button>
        </div>
      );
    }

    const question = quizQuestions[currentQuizIndex];
    return (
      <div className="space-y-6">
        <SectionHeader 
          title={lang === 'en' ? 'Medical Quiz' : 'মেডিকেল কুইজ'} 
          icon={Brain} 
          onBack={() => setActiveTool(null)} 
        />
        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-8">
          <div className="flex justify-between items-center text-sm font-bold text-zinc-500">
            <span>{lang === 'en' ? 'Question' : 'প্রশ্ন'} {currentQuizIndex + 1} / {quizQuestions.length}</span>
            <span>{lang === 'en' ? 'Score' : 'স্কোর'}: {quizScore}</span>
          </div>
          
          <h3 className="text-xl sm:text-2xl font-bold leading-tight">{question.question[lang]}</h3>

          <div className="grid gap-4">
            {question.options[lang].map((option, idx) => {
              const isSelected = selectedQuizOption === idx;
              const isCorrect = idx === question.correctAnswer;
              const showResult = selectedQuizOption !== null;

              let bgColor = "bg-white/5 border-white/10";
              if (showResult) {
                if (isCorrect) bgColor = "bg-emerald-500/20 border-emerald-500/50 text-emerald-400";
                else if (isSelected) bgColor = "bg-red-500/20 border-red-500/50 text-red-400";
              }

              return (
                <button 
                  key={idx}
                  disabled={showResult}
                  onClick={() => {
                    setSelectedQuizOption(idx);
                    if (idx === question.correctAnswer) setQuizScore(quizScore + 1);
                  }}
                  className={`w-full text-left p-5 rounded-2xl border transition-all flex items-center justify-between ${bgColor} ${!showResult && 'hover:bg-white/10 hover:border-emerald-500/30'}`}
                >
                  <span className="font-medium">{option}</span>
                  {showResult && isCorrect && <CheckCircle2 size={20} />}
                  {showResult && isSelected && !isCorrect && <X size={20} />}
                </button>
              );
            })}
          </div>

          {selectedQuizOption !== null && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3"
            >
              <h4 className="font-bold text-emerald-400">{lang === 'en' ? 'Explanation' : 'ব্যাখ্যা'}</h4>
              <p className="text-sm text-zinc-300 leading-relaxed">{question.explanation[lang]}</p>
              <button 
                onClick={() => {
                  if (currentQuizIndex < quizQuestions.length - 1) {
                    setCurrentQuizIndex(currentQuizIndex + 1);
                    setSelectedQuizOption(null);
                  } else {
                    setShowQuizResult(true);
                  }
                }}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all mt-4"
              >
                {currentQuizIndex < quizQuestions.length - 1 ? (lang === 'en' ? 'Next Question' : 'পরবর্তী প্রশ্ন') : (lang === 'en' ? 'See Results' : 'ফলাফল দেখুন')}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    );
  };

  const renderStudyNotes = () => (
    <div className="space-y-6">
      <SectionHeader 
        title={lang === 'en' ? 'Clinical Study Notes' : 'ক্লিনিকাল স্টাডি নোট'} 
        icon={BookOpen} 
        onBack={() => setActiveTool(null)} 
      />
      <div className="grid gap-4">
        {studyNotes.map(note => (
          <Card key={note.id} className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xl font-bold text-emerald-400">{note.title[lang]}</h4>
              <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">
                {note.category}
              </span>
            </div>
            <div className="bg-black/30 p-5 rounded-2xl border border-white/5 leading-relaxed text-zinc-300">
              {note.content[lang]}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderExamPlanner = () => (
    <div className="space-y-6">
      <SectionHeader 
        title={lang === 'en' ? 'Exam Prep Planner' : 'পরীক্ষার প্রস্তুতি প্ল্যানার'} 
        icon={Calendar} 
        onBack={() => setActiveTool(null)} 
      />
      <div className="grid gap-6">
        {examPlans.map(plan => (
          <Card key={plan.id} className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-2xl font-bold text-emerald-400">{plan.subject[lang]}</h4>
                <p className="text-sm text-zinc-500 flex items-center gap-2 mt-1">
                  <Calendar size={14} />
                  {lang === 'en' ? 'Exam Date:' : 'পরীক্ষার তারিখ:'} {plan.date}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-white">
                  {Math.round((plan.topics.filter(t => t.completed).length / plan.topics.length) * 100)}%
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  {lang === 'en' ? 'Progress' : 'অগ্রগতি'}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {plan.topics.map((topic, i) => (
                <div 
                  key={i} 
                  onClick={() => {
                    const newPlans = [...examPlans];
                    const pIndex = newPlans.findIndex(p => p.id === plan.id);
                    newPlans[pIndex].topics[i].completed = !newPlans[pIndex].topics[i].completed;
                    setExamPlans(newPlans);
                  }}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${topic.completed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${topic.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-700'}`}>
                    {topic.completed && <Check size={14} strokeWidth={3} />}
                  </div>
                  <span className={`font-medium ${topic.completed ? 'text-emerald-400 line-through opacity-60' : 'text-zinc-200'}`}>
                    {topic.title[lang]}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderBookmarks = () => (
    <div className="space-y-6 pb-24">
      <SectionHeader title={lang === 'en' ? 'My Bookmarks' : 'আমার বুকমার্ক'} icon={BookmarkIcon} onBack={() => setActiveTab('home')} />
      <div className="grid gap-4">
        {bookmarks.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            {lang === 'en' ? 'No bookmarks yet' : 'এখনো কোনো বুকমার্ক নেই'}
          </div>
        ) : (
          bookmarks.map(b => {
            let item: any;
            if (b.type === 'medicine') item = medicines.find(m => m.id === b.itemId);
            if (b.type === 'dictionary') item = dictionary.find(d => d.id === b.itemId);
            if (b.type === 'disease') item = diseases.find(d => d.id === b.itemId);
            
            if (!item) return null;

            return (
              <Card key={b.id} onClick={() => {
                if (b.type === 'medicine') setSelectedMedicine(item);
                if (b.type === 'disease') setSelectedDisease(item);
                setActiveTab(b.type === 'medicine' ? 'medicines' : b.type === 'disease' ? 'diseases' : 'dictionary');
              }}>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-emerald-400">{b.type === 'dictionary' ? item.term : item.name[lang] || item.name}</h4>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest">{b.type}</p>
                  </div>
                  <ChevronRight size={16} className="text-zinc-700" />
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );

  const renderTools = () => {
    if (activeTool === 'dosage') return renderDosageCalculator();
    if (activeTool === 'abbreviations') return renderAbbreviations();
    if (activeTool === 'flashcards') return renderFlashcards();
    if (activeTool === 'quiz') return renderQuiz();
    if (activeTool === 'notes') return renderStudyNotes();
    if (activeTool === 'planner') return renderExamPlanner();

    return (
      <div className="space-y-6 pb-24">
        <SectionHeader title={lang === 'en' ? 'Student Study Tools' : 'শিক্ষার্থী স্টাডি টুলস'} icon={Calculator} onBack={() => setActiveTab('home')} />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { id: 'dosage', title: lang === 'en' ? 'Dosage Calculator' : 'ডোজ ক্যালকুলেটর', icon: Calculator, desc: lang === 'en' ? 'Calculate drug dosage by weight' : 'ওজন অনুযায়ী ওষুধের ডোজ গণনা করুন' },
            { id: 'abbreviations', title: lang === 'en' ? 'Medical Abbreviations' : 'চিকিৎসা সংক্ষেপ', icon: BookOpen, desc: lang === 'en' ? 'Common medical short forms' : 'সাধারণ চিকিৎসা সংক্ষিপ্ত রূপ' },
            { id: 'notes', title: lang === 'en' ? 'Clinical Notes' : 'ক্লিনিকাল নোট', icon: Pill, desc: lang === 'en' ? 'Quick reference for clinicals' : 'ক্লিনিকালের জন্য দ্রুত রেফারেন্স' },
            { id: 'flashcards', title: lang === 'en' ? 'Flashcards' : 'ফ্ল্যাশকার্ড', icon: Zap, desc: lang === 'en' ? 'Memorize medical terms' : 'চিকিৎসা শব্দ মুখস্থ করুন' },
            { id: 'quiz', title: lang === 'en' ? 'Medical Quiz' : 'মেডিকেল কুইজ', icon: Brain, desc: lang === 'en' ? 'Test your knowledge' : 'আপনার জ্ঞান পরীক্ষা করুন' },
            { id: 'planner', title: lang === 'en' ? 'Exam Planner' : 'পরীক্ষার প্ল্যানার', icon: Calendar, desc: lang === 'en' ? 'Track your study progress' : 'আপনার পড়াশোনার অগ্রগতি ট্র্যাক করুন' },
            { id: 'bmi', title: lang === 'en' ? 'BMI Calculator' : 'বিএমআই ক্যালকুলেটর', icon: Scale, desc: lang === 'en' ? 'Check your health status' : 'আপনার স্বাস্থ্য অবস্থা পরীক্ষা করুন' },
            { id: 'period', title: lang === 'en' ? 'Period Tracker' : 'পিরিয়ড ট্র্যাকার', icon: HeartPulse, desc: lang === 'en' ? 'Track menstrual cycle' : 'মাসিক চক্র ট্র্যাক করুন' },
            { id: 'images', title: lang === 'en' ? 'Image Library' : 'ছবি লাইব্রেরি', icon: ImageIcon, desc: lang === 'en' ? 'Anatomy & clinical images' : 'অ্যানাটমি ও ক্লিনিকাল ছবি' },
          ].map(tool => (
            <Card key={tool.id} className="flex items-start gap-4" onClick={() => {
              if (['bmi', 'period'].includes(tool.id)) setActiveTab(tool.id);
              else setActiveTool(tool.id);
            }}>
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <tool.icon size={24} />
              </div>
              <div>
                <h4 className="font-bold">{tool.title}</h4>
                <p className="text-xs text-zinc-500 mt-1">{tool.desc}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-8 space-y-4">
          <h3 className="text-xl font-bold px-1">{lang === 'en' ? 'Medical Image Library' : 'মেডিকেল ছবি লাইব্রেরি'}</h3>
          <div className="grid grid-cols-2 gap-4">
            {medicalImages.map(img => (
              <div key={img.id} className="group relative rounded-2xl overflow-hidden aspect-square border border-white/10">
                <img src={img.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={img.title[lang]} referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
                  <span className="text-xs font-bold">{img.title[lang]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderEmergency = () => (
    <div className="space-y-6 pb-24">
      <SectionHeader title={lang === 'en' ? 'Emergency Guide' : 'জরুরি নির্দেশিকা'} icon={AlertCircle} onBack={() => setActiveTab('home')} />
      
      <div className="grid gap-4">
        {emergencyGuides.map(guide => (
          <Card key={guide.id} onClick={() => setSelectedEmergency(guide)}>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/20 text-red-400 rounded-xl">
                <HeartPulse size={24} />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold">{guide.title[lang]}</h4>
                <p className="text-xs text-zinc-500">{lang === 'en' ? 'Immediate actions to take' : 'তাত্ক্ষণিক করণীয় পদক্ষেপ'}</p>
              </div>
              <ChevronRight size={20} className="text-zinc-600" />
            </div>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {selectedEmergency && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-6"
          >
            <div className="bg-zinc-900 border border-red-500/30 w-full max-w-lg rounded-3xl p-8 space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 text-red-400 rounded-lg">
                    <AlertCircle size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-red-400">{selectedEmergency.title[lang]}</h2>
                </div>
                <button onClick={() => setSelectedEmergency(null)} className="p-2 hover:bg-white/10 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-500">{lang === 'en' ? 'Emergency Steps' : 'জরুরি পদক্ষেপ'}</h4>
                {selectedEmergency.steps[lang].map((step, i) => (
                  <div key={i} className="flex gap-4 items-start bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold">{i + 1}</span>
                    <p className="text-zinc-200 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>

              <button 
                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                onClick={() => window.open('tel:999')}
              >
                <Phone size={20} />
                {lang === 'en' ? 'Call Emergency (999)' : 'জরুরি কল করুন (৯৯৯)'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderScan = () => (
    <div className="space-y-6 pb-24">
      <SectionHeader title={lang === 'en' ? 'Scan & Diagnosis' : 'স্ক্যান ও রোগ নির্ণয়'} icon={Scan} onBack={() => setActiveTab('home')} />
      
      <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
            <Camera size={40} />
          </div>
          <h3 className="text-xl font-bold">{lang === 'en' ? 'Analyze Symptoms or Reports' : 'উপসর্গ বা রিপোর্ট বিশ্লেষণ করুন'}</h3>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto">
            {lang === 'en' ? 'Upload or take a photo of a symptom or medical report for AI analysis.' : 'এআই বিশ্লেষণের জন্য একটি উপসর্গ বা মেডিকেল রিপোর্টের ছবি আপলোড করুন বা তুলুন।'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <label className="flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-bold transition-all cursor-pointer">
            <Camera size={20} />
            {lang === 'en' ? 'Take Photo' : 'ছবি তুলুন'}
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const base64 = reader.result as string;
                    setScanImage(base64);
                    handleScanAnalysis(base64);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </label>
          <label className="flex items-center justify-center gap-2 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-bold transition-all cursor-pointer border border-white/10">
            <Upload size={20} />
            {lang === 'en' ? 'Upload Image' : 'ছবি আপলোড'}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const base64 = reader.result as string;
                    setScanImage(base64);
                    handleScanAnalysis(base64);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </label>
        </div>

        {scanImage && (
          <div className="mt-8 space-y-6">
            <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-video max-w-md mx-auto">
              <img src={scanImage} className="w-full h-full object-cover" alt="Scan" />
              {isScanning && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} 
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"
                  />
                  <p className="text-emerald-400 font-bold animate-pulse">{lang === 'en' ? 'Analyzing...' : 'বিশ্লেষণ করা হচ্ছে...'}</p>
                </div>
              )}
            </div>

            {scanResult && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900 border border-white/10 rounded-2xl p-6 space-y-4"
              >
                <div className="flex items-center gap-2 text-emerald-400">
                  <Activity size={20} />
                  <h4 className="font-bold">{lang === 'en' ? 'Analysis Result' : 'বিশ্লেষণ ফলাফল'}</h4>
                </div>
                <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {scanResult}
                </div>
                <button 
                  onClick={() => {
                    setScanImage(null);
                    setScanResult(null);
                  }}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 text-sm font-bold transition-all"
                >
                  {lang === 'en' ? 'Clear & Scan Again' : 'মুছে ফেলুন এবং আবার স্ক্যান করুন'}
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderAI = () => (
    <div className="flex flex-col h-[calc(100vh-80px)] pb-24">
      <SectionHeader title={lang === 'en' ? 'AI Medical Assistant' : 'এআই চিকিৎসা সহকারী'} icon={MessageSquare} onBack={() => setActiveTab('home')} />
      
      {!isOnline && (
        <div className="mx-2 mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-amber-400">
          <AlertCircle size={20} />
          <p className="text-xs font-bold">
            {lang === 'en' ? 'You are offline. AI features are currently unavailable.' : 'আপনি অফলাইনে আছেন। এআই বৈশিষ্ট্যগুলো বর্তমানে অনুপলব্ধ।'}
          </p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-4 p-2 no-scrollbar">
        {chatMessages.length === 0 && (
          <div className="text-center py-12 space-y-4">
            <div className="w-20 h-20 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto">
              <Brain size={40} />
            </div>
            <h3 className="text-xl font-bold">{lang === 'en' ? 'How can I help you today?' : 'আমি আজ আপনাকে কীভাবে সাহায্য করতে পারি?'}</h3>
            <p className="text-sm text-zinc-500 max-w-xs mx-auto">
              {lang === 'en' ? 'Ask me about diseases, medicines, or any medical study topics.' : 'আমাকে রোগ, ওষুধ বা যেকোনো চিকিৎসা সংক্রান্ত বিষয়ে জিজ্ঞাসা করুন।'}
            </p>
          </div>
        )}
        {chatMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-zinc-900 border border-white/10 rounded-tl-none'}`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-zinc-900 border border-white/10 p-4 rounded-2xl rounded-tl-none flex gap-1">
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-zinc-500 rounded-full" />
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-zinc-500 rounded-full" />
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-zinc-500 rounded-full" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 bg-black/50 backdrop-blur-lg border-t border-white/10 flex gap-2">
        <input 
          type="text"
          placeholder={lang === 'en' ? "Ask anything..." : "কিছু জিজ্ঞাসা করুন..."}
          className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAIChat(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
        />
        <button className="p-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors">
          <Send size={20} />
        </button>
      </div>
    </div>
  );

  const renderDoctors = () => (
    <div className="space-y-6 pb-24">
      <SectionHeader title={lang === 'en' ? 'Doctor Directory' : 'ডাক্তার ডিরেক্টরি'} icon={User} onBack={() => setActiveTab('home')} />
      
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
        <input 
          type="text"
          placeholder={lang === 'en' ? "Search by Name, Specialty, or Hospital..." : "নাম, বিশেষজ্ঞ বা হাসপাতাল দিয়ে খুঁজুন..."}
          className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {(searchQuery ? filteredDoctors : doctors).map(doc => (
          <Card key={doc.id} onClick={() => setSelectedDoctor(doc)} className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <User size={32} />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold">{doc.name[lang]}</h4>
              <p className="text-sm text-emerald-400 font-medium">{doc.specialization[lang]}</p>
              <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                <HospitalIcon size={12} />
                {doc.hospital[lang]}
              </p>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-full">
              <ChevronRight size={20} />
            </div>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {selectedDoctor && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl p-6 overflow-y-auto"
          >
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-between items-start mb-8">
                <button 
                  onClick={() => setSelectedDoctor(null)}
                  className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-colors"
                >
                  <ArrowLeft size={24} />
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={() => shareItem(selectedDoctor.name[lang], `${selectedDoctor.name[lang]} - ${selectedDoctor.specialization[lang]} at ${selectedDoctor.hospital[lang]}`)}
                    className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-colors"
                  >
                    <Share2 size={24} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-32 h-32 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border-2 border-emerald-500/20 mb-4">
                  <User size={64} />
                </div>
                <h3 className="text-3xl font-bold mb-2">{selectedDoctor.name[lang]}</h3>
                <p className="text-xl text-emerald-400 font-medium">{selectedDoctor.specialization[lang]}</p>
              </div>

              <div className="grid gap-4">
                <div className="bg-zinc-900 border border-white/10 p-6 rounded-3xl space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl">
                      <HospitalIcon size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 uppercase tracking-wider font-bold mb-1">{lang === 'en' ? 'Hospital' : 'হাসপাতাল'}</p>
                      <p className="text-lg font-bold">{selectedDoctor.hospital[lang]}</p>
                      <p className="text-sm text-zinc-400">{selectedDoctor.location[lang]}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl">
                      <Phone size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 uppercase tracking-wider font-bold mb-1">{lang === 'en' ? 'Contact' : 'যোগাযোগ'}</p>
                      <p className="text-lg font-bold">{selectedDoctor.phone}</p>
                      {selectedDoctor.email && <p className="text-sm text-zinc-400">{selectedDoctor.email}</p>}
                    </div>
                  </div>

                  {selectedDoctor.workingHours && (
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl">
                        <Clock size={24} />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500 uppercase tracking-wider font-bold mb-1">{lang === 'en' ? 'Working Hours' : 'কাজের সময়'}</p>
                        <p className="text-lg font-bold">{selectedDoctor.workingHours[lang]}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 mt-4">
                  <a 
                    href={`tel:${selectedDoctor.phone}`}
                    className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                  >
                    <Phone size={20} />
                    {lang === 'en' ? 'Call Now' : 'কল করুন'}
                  </a>
                  {selectedDoctor.email && (
                    <a 
                      href={`mailto:${selectedDoctor.email}`}
                      className="flex-1 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <Mail size={20} />
                      {lang === 'en' ? 'Email' : 'ইমেইল'}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const calculateBMI = () => {
    const h = parseFloat(bmiHeight) / 100;
    const w = parseFloat(bmiWeight);
    if (h > 0 && w > 0) {
      const bmi = w / (h * h);
      let status = '';
      if (bmi < 18.5) status = lang === 'en' ? 'Underweight' : 'কম ওজন';
      else if (bmi < 25) status = lang === 'en' ? 'Normal' : 'স্বাভাবিক';
      else if (bmi < 30) status = lang === 'en' ? 'Overweight' : 'অতিরিক্ত ওজন';
      else status = lang === 'en' ? 'Obese' : 'স্থূলতা';
      setBmiResult({ value: parseFloat(bmi.toFixed(1)), status });
    }
  };

  const renderBMI = () => (
    <div className="space-y-6 pb-24">
      <SectionHeader title={lang === 'en' ? 'BMI Calculator' : 'বিএমআই ক্যালকুলেটর'} icon={Scale} onBack={() => setActiveTab('tools')} />
      <Card className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-zinc-500 mb-2">{lang === 'en' ? 'Height (cm)' : 'উচ্চতা (সেমি)'}</label>
          <input 
            type="number" 
            value={bmiHeight} 
            onChange={(e) => setBmiHeight(e.target.value)}
            className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            placeholder="e.g. 170"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-zinc-500 mb-2">{lang === 'en' ? 'Weight (kg)' : 'ওজন (কেজি)'}</label>
          <input 
            type="number" 
            value={bmiWeight} 
            onChange={(e) => setBmiWeight(e.target.value)}
            className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            placeholder="e.g. 65"
          />
        </div>
        <button 
          onClick={calculateBMI}
          className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20"
        >
          {lang === 'en' ? 'Calculate BMI' : 'বিএমআই গণনা করুন'}
        </button>

        {bmiResult && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2"
          >
            <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest">{lang === 'en' ? 'Your BMI' : 'আপনার বিএমআই'}</p>
            <h3 className="text-5xl font-black text-emerald-400">{bmiResult.value}</h3>
            <p className="text-xl font-bold">{bmiResult.status}</p>
          </motion.div>
        )}
      </Card>
    </div>
  );

  const renderBloodDonors = () => {
    const filteredDonors = bloodDonors.filter(d => 
      (bloodGroupSearch === '' || d.bloodGroup === bloodGroupSearch) &&
      (bloodLocationSearch === '' || d.location.toLowerCase().includes(bloodLocationSearch.toLowerCase()))
    );

    return (
      <div className="space-y-6 pb-24">
        <SectionHeader title={lang === 'en' ? 'Blood Donor Finder' : 'রক্তদাতা খুঁজুন'} icon={Droplets} onBack={() => setActiveTab('home')} />
        
        <div className="grid grid-cols-2 gap-4">
          <select 
            value={bloodGroupSearch}
            onChange={(e) => setBloodGroupSearch(e.target.value)}
            className="bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none"
          >
            <option value="">{lang === 'en' ? 'All Groups' : 'সব গ্রুপ'}</option>
            {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <input 
            type="text"
            placeholder={lang === 'en' ? 'Location...' : 'অবস্থান...'}
            value={bloodLocationSearch}
            onChange={(e) => setBloodLocationSearch(e.target.value)}
            className="bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none"
          />
        </div>

        <div className="space-y-4">
          {filteredDonors.map(donor => (
            <Card key={donor.id} className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${donor.available ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-zinc-500'}`}>
                  {donor.bloodGroup}
                </div>
                <div>
                  <h4 className="font-bold">{donor.name}</h4>
                  <p className="text-xs text-zinc-500">{donor.location} • {lang === 'en' ? 'Last Donated: ' : 'শেষ দান: '}{donor.lastDonated}</p>
                </div>
              </div>
              <a href={`tel:${donor.phone}`} className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full hover:bg-emerald-500/20 transition-colors">
                <Phone size={20} />
              </a>
            </Card>
          ))}
          {filteredDonors.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              {lang === 'en' ? 'No donors found' : 'কোন দাতা পাওয়া যায়নি'}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPrescriptions = () => (
    <div className="space-y-6 pb-24">
      <SectionHeader title={lang === 'en' ? 'Prescription Storage' : 'প্রেসক্রিপশন স্টোরেজ'} icon={FileText} onBack={() => setActiveTab('home')} />
      
      <Card className="border-dashed border-2 border-emerald-500/30 bg-emerald-500/5 flex flex-col items-center justify-center py-12 gap-4">
        <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-full">
          <Upload size={32} />
        </div>
        <div className="text-center">
          <h4 className="font-bold">{lang === 'en' ? 'Upload Prescription' : 'প্রেসক্রিপশন আপলোড করুন'}</h4>
          <p className="text-xs text-zinc-500">{lang === 'en' ? 'Keep your medical records safe and accessible' : 'আপনার মেডিকেল রেকর্ড নিরাপদ এবং সহজলভ্য রাখুন'}</p>
        </div>
        <input 
          type="file" 
          id="prescription-upload" 
          className="hidden" 
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              setIsUploadingPrescription(true);
              const reader = new FileReader();
              reader.onloadend = async () => {
                const base64 = reader.result as string;
                const newPrescription: Prescription = {
                  id: Math.random().toString(36).substring(7),
                  userId: user?.uid || 'local',
                  imageUrl: base64,
                  date: new Date().toISOString().split('T')[0],
                };
                setPrescriptions([newPrescription, ...prescriptions]);
                setIsUploadingPrescription(false);
              };
              reader.readAsDataURL(file);
            }
          }}
        />
        <label 
          htmlFor="prescription-upload"
          className="px-6 py-2 bg-emerald-500 text-white rounded-xl font-bold cursor-pointer hover:bg-emerald-600 transition-colors"
        >
          {isUploadingPrescription ? (lang === 'en' ? 'Uploading...' : 'আপলোড হচ্ছে...') : (lang === 'en' ? 'Select Image' : 'ছবি নির্বাচন করুন')}
        </label>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {prescriptions.map(p => (
          <Card key={p.id} className="p-2 overflow-hidden group">
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2">
              <img src={p.imageUrl} className="w-full h-full object-cover" alt="Prescription" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button className="p-2 bg-white/20 rounded-full hover:bg-white/40"><ImageIcon size={18} /></button>
                <button 
                  onClick={() => setPrescriptions(prescriptions.filter(item => item.id !== p.id))}
                  className="p-2 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/40"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <div className="px-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase">{p.date}</p>
              <p className="text-xs font-bold truncate">{p.doctorName || (lang === 'en' ? 'Medical Record' : 'মেডিকেল রেকর্ড')}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderPeriodTracker = () => (
    <div className="space-y-6 pb-24">
      <SectionHeader title={lang === 'en' ? 'Period Tracker' : 'পিরিয়ড ট্র্যাকার'} icon={Calendar} onBack={() => setActiveTab('tools')} />
      <Card className="text-center space-y-6 py-8">
        <div className="w-24 h-24 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto">
          <HeartPulse size={48} />
        </div>
        <div>
          <h3 className="text-2xl font-bold">{lang === 'en' ? 'Next Period in 12 Days' : 'পরবর্তী পিরিয়ড ১২ দিনের মধ্যে'}</h3>
          <p className="text-zinc-500 text-sm">{lang === 'en' ? 'Cycle Day: 16' : 'চক্রের দিন: ১৬'}</p>
        </div>
        <div className="flex justify-center gap-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 2 ? 'bg-rose-500 text-white' : 'bg-white/5 text-zinc-500'}`}>
              {14 + i}
            </div>
          ))}
        </div>
        <button className="px-8 py-3 bg-rose-500 text-white rounded-xl font-bold shadow-lg shadow-rose-500/20">
          {lang === 'en' ? 'Log Period' : 'পিরিয়ড লগ করুন'}
        </button>
      </Card>
      
      <div className="grid grid-cols-2 gap-4">
        <Card className="flex flex-col items-center gap-2 py-6">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl"><Sun size={24} /></div>
          <span className="text-xs font-bold">{lang === 'en' ? 'Ovulation' : 'ডিম্বস্ফোটন'}</span>
          <span className="text-lg font-black">2 Days</span>
        </Card>
        <Card className="flex flex-col items-center gap-2 py-6">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl"><Brain size={24} /></div>
          <span className="text-xs font-bold">{lang === 'en' ? 'Mood' : 'মেজাজ'}</span>
          <span className="text-lg font-black">{lang === 'en' ? 'Happy' : 'খুশি'}</span>
        </Card>
      </div>
    </div>
  );

  const renderHospitals = () => (
    <div className="space-y-6 pb-24">
      <SectionHeader title={lang === 'en' ? 'Hospitals & Pharmacies' : 'হাসপাতাল ও ফার্মেসি'} icon={HospitalIcon} onBack={() => setActiveTab('home')} />
      
      <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl mb-6">
        <div className="flex items-center gap-3">
          <MapPin className="text-emerald-400" />
          <p className="text-sm font-medium">{lang === 'en' ? 'Finding medical facilities near you...' : 'আপনার কাছাকাছি চিকিৎসা কেন্দ্র খোঁজা হচ্ছে...'}</p>
        </div>
      </div>

      <div className="grid gap-4">
        {hospitals.map(h => (
          <Card key={h.id} className="flex items-center gap-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <HospitalIcon size={24} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold">{h.name[lang]}</h4>
              <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                <MapPin size={12} />
                {h.location[lang]}
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
              {h.type}
            </span>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div 
      ref={appRef}
      className={`min-h-screen transition-colors duration-300 selection:bg-emerald-500/30 ${darkMode ? 'bg-black text-white' : 'bg-zinc-50 text-zinc-900'}`}
    >
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className={`fixed inset-y-0 left-0 z-[70] w-80 shadow-2xl ${darkMode ? 'bg-zinc-900 border-r border-white/10' : 'bg-white border-r border-zinc-200'}`}
            >
              <div className="flex flex-col h-full">
                <div className="p-6 flex justify-between items-center border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-xl">B</div>
                    <span className="font-black text-xl tracking-tighter">HEALTH CARE</span>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {deferredPrompt && (
                    <button 
                      onClick={() => { handleInstallClick(); setIsSidebarOpen(false); }}
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 mb-4"
                    >
                      <Download size={20} />
                      <span className="font-bold">{lang === 'en' ? 'Install App' : 'অ্যাপ ইনস্টল করুন'}</span>
                    </button>
                  )}

                  {user ? (
                    <div className="p-4 mb-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {user.email?.[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{user.displayName || 'User'}</p>
                        <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={handleLogin}
                      className="w-full p-4 mb-6 bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
                    >
                      <LogIn size={20} />
                      {lang === 'en' ? 'Login with Google' : 'গুগল দিয়ে লগইন'}
                    </button>
                  )}

                  {[
                    { id: 'home', icon: Zap, label: lang === 'en' ? 'Home' : 'হোম' },
                    { id: 'bookmarks', icon: BookmarkIcon, label: lang === 'en' ? 'Bookmarks' : 'বুকমার্ক' },
                    { id: 'notebook', icon: MessageSquare, label: lang === 'en' ? 'Note Book' : 'নোট বুক' },
                    { id: 'translate', icon: Languages, label: lang === 'en' ? 'AI Translator' : 'এআই অনুবাদক' },
                    { id: 'bnen', icon: BookOpen, label: lang === 'en' ? 'General Dictionary' : 'সাধারণ অভিধান' },
                    { id: 'settings', icon: Settings, label: lang === 'en' ? 'Settings & Share' : 'সেটিংস ও শেয়ার' },
                  ].map(item => (
                    <button 
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${activeTab === item.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'hover:bg-white/5'}`}
                    >
                      <item.icon size={20} />
                      <span className="font-bold">{item.label}</span>
                    </button>
                  ))}
                </div>

                <div className="p-4 border-t border-white/5 space-y-2">
                  <button 
                    onClick={toggleDarkMode}
                    className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                      <span className="font-bold">{lang === 'en' ? (darkMode ? 'Light Mode' : 'Dark Mode') : (darkMode ? 'লাইট মোড' : 'ডার্ক মোড')}</span>
                    </div>
                  </button>

                  {user && (
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-red-500/10 text-red-400 transition-all"
                    >
                      <LogOut size={20} />
                      <span className="font-bold">{lang === 'en' ? 'Logout' : 'লগআউট'}</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b px-6 py-4 ${darkMode ? 'bg-black/50 border-white/10' : 'bg-white/50 border-zinc-200'}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all border border-white/10 shadow-xl"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
              <div className="p-2 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20">
                <Activity className="text-white" size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tighter uppercase hidden sm:inline">Bristy Health Care</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {isOnline ? (lang === 'en' ? 'Online' : 'অনলাইন') : (lang === 'en' ? 'Offline' : 'অফলাইন')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleDarkMode} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <LanguageToggle lang={lang} setLang={setLang} />
            {user ? (
              <button onClick={handleLogout} className="p-2 bg-red-500/10 text-red-400 rounded-full hover:bg-red-500/20 transition-colors" title={lang === 'en' ? 'Logout' : 'লগআউট'}>
                <LogOut size={20} />
              </button>
            ) : (
              <button onClick={handleLogin} className="p-2 bg-emerald-500/10 text-emerald-400 rounded-full hover:bg-emerald-500/20 transition-colors" title={lang === 'en' ? 'Login' : 'লগইন'}>
                <LogIn size={20} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'home' && renderHome()}
            {activeTab === 'medicines' && renderMedicines()}
            {activeTab === 'interaction' && renderInteraction()}
            {activeTab === 'dictionary' && renderDictionary()}
            {activeTab === 'diseases' && renderDiseases()}
            {activeTab === 'tools' && renderTools()}
            {activeTab === 'emergency' && renderEmergency()}
            {activeTab === 'scan' && renderScan()}
            {activeTab === 'ai' && renderAI()}
            {activeTab === 'bmi' && renderBMI()}
            {activeTab === 'blood' && renderBloodDonors()}
            {activeTab === 'prescriptions' && renderPrescriptions()}
            {activeTab === 'period' && renderPeriodTracker()}
            {activeTab === 'academic' && renderAcademicDictionary()}
            {activeTab === 'doctors' && renderDoctors()}
            {activeTab === 'hospitals' && renderHospitals()}
            {activeTab === 'notebook' && renderNoteBook()}
            {activeTab === 'translate' && renderTranslate()}
            {activeTab === 'bnen' && renderBnEnDictionary()}
            {activeTab === 'bookmarks' && renderBookmarks()}
            {activeTab === 'settings' && renderSettings()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 z-40 backdrop-blur-2xl border-t py-3 ${darkMode ? 'bg-black/80 border-white/10' : 'bg-white/80 border-zinc-200 shadow-2xl'}`}>
        <div className="flex gap-6 overflow-x-auto no-scrollbar items-center px-6 max-w-7xl mx-auto">
          {[
            { id: 'home', icon: Zap, label: lang === 'en' ? 'Home' : 'হোম' },
            { id: 'medicines', icon: Pill, label: lang === 'en' ? 'Meds' : 'ওষুধ' },
            { id: 'diseases', icon: Stethoscope, label: lang === 'en' ? 'Diseases' : 'রোগ' },
            { id: 'dictionary', icon: BookOpen, label: lang === 'en' ? 'Dictionary' : 'অভিধান' },
            { id: 'notebook', icon: MessageSquare, label: lang === 'en' ? 'Notes' : 'নোট' },
            { id: 'translate', icon: Languages, label: lang === 'en' ? 'Translate' : 'অনুবাদ' },
            { id: 'academic', icon: Brain, label: lang === 'en' ? 'Academic' : 'একাডেমিক' },
            { id: 'tools', icon: Calculator, label: lang === 'en' ? 'Tools' : 'সরঞ্জাম' },
            { id: 'doctors', icon: User, label: lang === 'en' ? 'Doctors' : 'ডাক্তার' },
            { id: 'hospitals', icon: HospitalIcon, label: lang === 'en' ? 'Hospitals' : 'হাসপাতাল' },
            { id: 'emergency', icon: AlertCircle, label: lang === 'en' ? 'Help' : 'সাহায্য' },
            { id: 'scan', icon: Scan, label: lang === 'en' ? 'Scan' : 'স্ক্যান' },
            { id: 'ai', icon: MessageSquare, label: lang === 'en' ? 'AI' : 'এআই' },
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 transition-all min-w-[48px] ${activeTab === item.id ? 'text-emerald-400 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-emerald-500 text-white rounded-full shadow-2xl font-bold flex items-center gap-2 whitespace-nowrap"
          >
            <CheckCircle2 size={18} />
            {showToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
