import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  query 
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Users, 
  UserCog, 
  ClipboardCheck, 
  CalendarClock, 
  TrendingUp, 
  TrendingDown, 
  ArrowLeftRight, 
  Settings2, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Search, 
  Plus, 
  Trash2, 
  User, 
  History, 
  Calendar, 
  Clock, 
  FileSpreadsheet, 
  FileText,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  ShieldAlert,
  PlusCircle,
  Layers,
  UserPlus
} from 'lucide-react';

// --- Safe Configuration Loader ---
// لتجنب خطأ "import.meta" في البيئات القديمة، نقوم بالتحقق من وجود المتغيرات العالمية أولاً
// وفي حالة الرفع على GitHub، يفضل استخدام مفاتيحك الخاصة أو الربط مع Vercel/Netlify Environment Variables
const getAppConfig = () => {
  // 1. محاولة الحصول على الإعدادات من متغير البيئة الخاص بالمنصة (Canvas/Preview)
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try {
      return JSON.parse(__firebase_config);
    } catch (e) {
      console.warn("Failed to parse global firebase config");
    }
  }
  
  // 2. محاولة الحصول من Vite (للتطوير المحلي) مع تجنب تعطل المجمع (Bundler)
  // نستخدم try/catch هنا للتعامل مع بيئة es2015
  try {
    const metaEnv = (import.meta && import.meta.env) ? import.meta.env : {};
    if (metaEnv.VITE_FIREBASE_API_KEY) {
      return {
        apiKey: metaEnv.VITE_FIREBASE_API_KEY,
        authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: metaEnv.VITE_FIREBASE_PROJECT_ID,
        storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: metaEnv.VITE_FIREBASE_APP_ID,
      };
    }
  } catch (err) {
    // تجاهل الخطأ في بيئة es2015
  }

  // 3. الإعدادات الافتراضية (Fallback) - يجب استبدالها بمفاتيحك الحقيقية في GitHub Secrets
  return {
    apiKey: "",
    authDomain: "mantiqedu.firebaseapp.com",
    projectId: "mantiqedu",
    storageBucket: "mantiqedu.firebasestorage.app",
    messagingSenderId: "226946538055",
    appId: "1:226946538055:web:f31e5a7f80662366e02f62"
  };
};

const firebaseConfig = getAppConfig();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// الحصول على appId بشكل آمن
const getAppId = () => {
  if (typeof __app_id !== 'undefined' && __app_id) return __app_id;
  try {
    if (import.meta && import.meta.env && import.meta.env.VITE_MANTIQ_APP_ID) {
      return import.meta.env.VITE_MANTIQ_APP_ID;
    }
  } catch(e) {}
  return 'mantiq-edu-prod';
};
const appId = getAppId();

// --- UI Translations ---
const UI = {
    en: {
        dashboard: "Overview", volume: "Total Revenue", assets: "Students",
        addRecord: "Add Entry", cancel: "Cancel", role: "Super Admin",
        submit: "Save & Sync", studentProfile: "Student Summary", backToList: "Back",
        netCash: "Net Cash", inflow: "Inflow", outflow: "Outflow",
        searchPlaceholder: "Search...", filterAll: "All Grades",
        todaySchedule: "Today's Classes", noLectures: "No classes today.",
        online: "Online", offline: "Offline", confirmTitle: "Confirm Delete",
        confirmBtn: "Yes, Delete", keepBtn: "No, Keep",
        currency: "EGP", attSuccess: "Attendance Saved!",
        teachersMgmt: "Teachers", cash_flow: "Cash Flow",
        securityAlert: "Security Alert: Source inspection disabled.",
        settingsTitle: "Academy Configuration",
        addTeacher: "Add Teacher", addGrade: "Add Grade", addCategory: "Add Category",
        teachers: "Teachers List", grades: "Grades & Fees",
        incomeCats: "Income Categories", expenseCats: "Expense Categories"
    },
    ar: {
        dashboard: "نظرة عامة", volume: "إجمالي الإيرادات", assets: "عدد الطلاب",
        addRecord: "إضافة سجل", cancel: "إلغاء", role: "مدير النظام",
        submit: "حفظ ومزامنة", studentProfile: "ملخص الطالب", backToList: "العودة",
        netCash: "صافي الربح", inflow: "الوارد", outflow: "الصادر",
        searchPlaceholder: "بحث...", filterAll: "كل المستويات",
        todaySchedule: "محاضرات اليوم", noLectures: "لا توجد محاضرات اليوم.",
        online: "متصل", offline: "غير متصل", confirmTitle: "تأكيد الحذف",
        confirmBtn: "نعم، احذف", keepBtn: "لا، احتفظ به",
        currency: "ج.م", attSuccess: "تم حفظ الحضور!",
        teachersMgmt: "إدارة المعلمين", cash_flow: "التدفق المالي",
        securityAlert: "تنبيه أمني: فحص المصدر معطل.",
        settingsTitle: "إعدادات الأكاديمية",
        addTeacher: "إضافة معلم", addGrade: "إضافة مستوى", addCategory: "إضافة تصنيف",
        teachers: "قائمة المعلمين", grades: "المستويات والرسوم",
        incomeCats: "تصنيفات الإيرادات", expenseCats: "تصنيفات المصاريف"
    }
};

const NAV_ITEMS = [
    { id: 'dashboard', label: { en: 'Dashboard', ar: 'لوحة القيادة' }, icon: LayoutDashboard },
    { id: 'students', label: { en: 'Students', ar: 'الطلاب' }, icon: Users, cols: ['Stu-ID', 'Student Name', 'Age', 'Phone', 'Grade'] },
    { id: 'teachers_mgmt', label: { en: 'Teachers', ar: 'المعلمون' }, icon: UserCog },
    { id: 'attendance', label: { en: 'Attendance', ar: 'الحضور' }, icon: ClipboardCheck },
    { id: 'subjects', label: { en: 'Schedule', ar: 'الجدول' }, icon: CalendarClock, cols: ['Grade', 'Subject Name', 'Teacher Name', 'Day', 'Room', 'Start Time'] },
    { id: 'income', label: { en: 'Income', ar: 'الإيرادات' }, icon: TrendingUp, cols: ['Stu-ID', 'Student Name', 'Category', 'Subcategory', 'Amount', 'Date'] },
    { id: 'expenses', label: { en: 'Expenses', ar: 'المصاريف' }, icon: TrendingDown, cols: ['Expense ID', 'Title', 'Category', 'Subcategory', 'Amount', 'Date'] },
    { id: 'cash_flow', label: { en: 'Cash Flow', ar: 'التدفق المالي' }, icon: ArrowLeftRight, cols: ['Type', 'Label', 'Category', 'Amount', 'Date'] },
    { id: 'config', label: { en: 'Settings', ar: 'الإعدادات' }, icon: Settings2 }
];

// --- Sub-components ---
const Card = ({ title, value, color, icon: Icon }) => (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-none shadow-sm transition-all hover:scale-[1.02]">
        <h4 className={`text-[10px] font-black uppercase mb-2 ${color}`}>{title}</h4>
        <div className="flex items-end justify-between">
            <p className="text-3xl font-black dark:text-white truncate">{value}</p>
            {Icon && <Icon className={`${color} opacity-20 w-8 h-8 flex-shrink-0`} />}
        </div>
    </div>
);

export default function App() {
    const [user, setUser] = useState(null);
    const [page, setPage] = useState('dashboard');
    const [darkMode, setDarkMode] = useState(false);
    const [lang, setLang] = useState('ar');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [libsReady, setLibsReady] = useState(false);
    
    const [data, setData] = useState({
        students: [], income: [], expenses: [], subjects: [], attendance: [],
        config: { teachers: [], gradeFees: {}, incomeCategories: [], expenseCategories: [] }
    });

    const t = (key) => UI[lang][key] || key;
    const _t = (en, ar) => lang === 'en' ? en : ar;

    // --- External Libs Loader ---
    useEffect(() => {
        const scripts = [
            'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js'
        ];
        
        let loadedCount = 0;
        scripts.forEach(src => {
            if (document.querySelector(`script[src="${src}"]`)) {
                loadedCount++;
                if (loadedCount === scripts.length) setLibsReady(true);
                return;
            }
            const script = document.createElement('script');
            script.src = src; script.async = true;
            script.onload = () => {
                loadedCount++;
                if (loadedCount === scripts.length) setLibsReady(true);
            };
            document.head.appendChild(script);
        });
    }, []);

    // --- Firebase Auth & Sync ---
    useEffect(() => {
        const initAuth = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (e) { console.error("Authentication Error", e); }
        };
        initAuth();
        const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;
        const collections = ['students', 'income', 'expenses', 'subjects', 'attendance'];
        const unsubscribers = collections.map(coll => 
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', coll), (snap) => {
                setData(prev => ({ ...prev, [coll]: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
            }, (err) => console.error(`Error syncing ${coll}:`, err))
        );
        const unsubConfig = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), (ds) => {
            if (ds.exists()) setData(prev => ({ ...prev, config: ds.data() }));
        }, (err) => console.error("Error syncing config:", err));

        return () => { unsubscribers.forEach(u => u()); unsubConfig(); };
    }, [user]);

    // --- Update Firebase Config ---
    const updateFirebaseConfig = async (newConfig) => {
        if (!user) return;
        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), newConfig);
        } catch (err) { addNotification(err.message); }
    };

    // --- Helpers ---
    const addNotification = (msg) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, msg }]);
        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
    };

    const totals = useMemo(() => {
        const inc = data.income.reduce((s, i) => s + (parseFloat(i.Amount) || 0), 0);
        const exp = data.expenses.reduce((s, e) => s + (parseFloat(e.Amount) || 0), 0);
        return { inc, exp, net: inc - exp };
    }, [data.income, data.expenses]);

    const filteredData = useMemo(() => {
        let raw = [];
        if (page === 'cash_flow') {
            raw = [
                ...data.income.map(i => ({ ...i, Type: 'Inflow', Label: i['Student Name'] })),
                ...data.expenses.map(e => ({ ...e, Type: 'Outflow', Label: e['Title'] }))
            ].sort((a, b) => new Date(b.Date) - new Date(a.Date));
        } else {
            raw = data[page] || [];
        }
        if (!searchQuery) return raw;
        const q = searchQuery.toLowerCase();
        return raw.filter(item => Object.values(item).some(v => String(v).toLowerCase().includes(q)));
    }, [page, data, searchQuery]);

    const generateID = (prefix, list, key) => {
        let max = 0;
        list.forEach(item => {
            const val = item[key] ? String(item[key]) : '';
            const num = parseInt(val.replace(prefix, ''));
            if (!isNaN(num) && num > max) max = num;
        });
        return prefix + String(max + 1).padStart(4, '0');
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!user) return;
        const fd = new FormData(e.target);
        const row = Object.fromEntries(fd.entries());
        if (page === 'students') row['Stu-ID'] = generateID('STU-', data.students, 'Stu-ID');
        if (page === 'expenses') row['Expense ID'] = generateID('EXP-', data.expenses, 'Expense ID');
        setLoading(true);
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', page), row);
            setIsModalOpen(false);
        } catch (err) { addNotification(err.message); }
        setLoading(false);
    };

    const handleDelete = async () => {
        if (!user || !deleteConfirm) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', page, deleteConfirm.id));
            setDeleteConfirm(null);
        } catch (err) { addNotification(err.message); }
    };

    // --- UI Sections ---
    const Sidebar = () => (
        <aside className={`fixed lg:static inset-y-0 ${lang === 'ar' ? 'right-0 border-l' : 'left-0 border-r'} w-72 bg-white dark:bg-slate-900 z-50 transition-transform transform ${isSidebarOpen ? 'translate-x-0' : (lang === 'ar' ? 'translate-x-full' : '-translate-x-full')} lg:translate-x-0 shadow-2xl lg:shadow-none`}>
            <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-sky-400 rounded-xl"><GraduationCap className="text-white w-5 h-5" /></div>
                    <span className="text-xl font-black tracking-tighter dark:text-white">MANTIQ</span>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
            </div>
            <nav className="p-6 space-y-2 overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar">
                {NAV_ITEMS.map(item => (
                    <button 
                        key={item.id}
                        onClick={() => { setPage(item.id); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${page === item.id ? 'bg-sky-400 text-white shadow-lg shadow-sky-200 dark:shadow-none' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400'}`}
                    >
                        <item.icon className="w-5 h-5" />
                        <span>{_t(item.label.en, item.label.ar)}</span>
                    </button>
                ))}
            </nav>
        </aside>
    );

    const SettingsView = () => (
        <div className="space-y-10 pb-20 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black uppercase tracking-tighter dark:text-white">{t('settingsTitle')}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Teachers */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-none">
                    <h3 className="font-black text-sm uppercase mb-6 flex items-center gap-2 dark:text-white"><UserPlus className="w-5 h-5 text-sky-400" /> {t('teachers')}</h3>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const name = e.target.teacherName.value.trim();
                        if (name && !data.config.teachers.includes(name)) {
                            updateFirebaseConfig({ ...data.config, teachers: [...data.config.teachers, name] });
                            e.target.reset();
                        }
                    }} className="flex gap-2 mb-6">
                        <input name="teacherName" placeholder="Teacher Name..." className="flex-1 bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-xl outline-none text-xs font-bold dark:text-white" required />
                        <button type="submit" className="bg-sky-400 text-slate-900 p-3 rounded-xl hover:scale-105 active:scale-95 transition-all"><Plus /></button>
                    </form>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {data.config.teachers.map((name, i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl group">
                                <span className="font-bold text-sm dark:text-slate-300">{name}</span>
                                <button onClick={() => updateFirebaseConfig({ ...data.config, teachers: data.config.teachers.filter(t => t !== name) })} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Grades */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-none">
                    <h3 className="font-black text-sm uppercase mb-6 flex items-center gap-2 dark:text-white"><GraduationCap className="w-5 h-5 text-sky-400" /> {t('grades')}</h3>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const name = e.target.gradeName.value.trim();
                        const fee = parseFloat(e.target.gradeFee.value);
                        if (name && !isNaN(fee)) {
                            updateFirebaseConfig({ ...data.config, gradeFees: { ...data.config.gradeFees, [name]: fee } });
                            e.target.reset();
                        }
                    }} className="space-y-2 mb-6">
                        <input name="gradeName" placeholder="Grade Name..." className="w-full bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-xl outline-none text-xs font-bold dark:text-white" required />
                        <div className="flex gap-2">
                            <input name="gradeFee" type="number" placeholder="Fee..." className="flex-1 bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-xl outline-none text-xs font-bold dark:text-white" required />
                            <button type="submit" className="bg-sky-400 text-slate-900 px-6 rounded-xl font-black text-[10px] uppercase transition-all">Add</button>
                        </div>
                    </form>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {Object.entries(data.config.gradeFees).map(([name, fee], i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl group">
                                <div><p className="font-black text-xs dark:text-white">{name}</p><p className="text-[9px] text-sky-400 font-bold">{fee} {t('currency')}</p></div>
                                <button onClick={() => {
                                    const newFees = { ...data.config.gradeFees };
                                    delete newFees[name];
                                    updateFirebaseConfig({ ...data.config, gradeFees: newFees });
                                }} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {/* Financial Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {['income', 'expense'].map(type => (
                    <div key={type} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-none">
                        <h3 className="font-black text-sm uppercase mb-6 flex items-center gap-2 dark:text-white"><Layers className="w-5 h-5 text-sky-400" /> {t(type === 'income' ? 'incomeCats' : 'expenseCats')}</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const name = e.target.catName.value.trim();
                            const field = type === 'income' ? 'incomeCategories' : 'expenseCategories';
                            if (name) {
                                updateFirebaseConfig({ ...data.config, [field]: [...data.config[field], { name, subs: [] }] });
                                e.target.reset();
                            }
                        }} className="flex gap-2 mb-6">
                            <input name="catName" placeholder="New Category..." className="flex-1 bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-xl outline-none text-xs font-bold dark:text-white" required />
                            <button type="submit" className="bg-sky-400 text-slate-900 p-3 rounded-xl active:scale-95 transition-all"><Plus /></button>
                        </form>
                        <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                            {(type === 'income' ? data.config.incomeCategories : data.config.expenseCategories).map((cat, ci) => (
                                <div key={ci} className="p-5 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] font-black uppercase text-slate-600 dark:text-white">{cat.name}</span>
                                        <button onClick={() => {
                                            const field = type === 'income' ? 'incomeCategories' : 'expenseCategories';
                                            const newList = [...data.config[field]];
                                            newList.splice(ci, 1);
                                            updateFirebaseConfig({ ...data.config, [field]: newList });
                                        }} className="text-slate-300 hover:text-rose-400"><Trash2 size={14} /></button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {cat.subs.map((s, si) => (
                                            <span key={si} className="bg-white dark:bg-slate-700 px-3 py-1 rounded-lg text-[9px] font-black flex items-center gap-2 shadow-sm dark:text-slate-300">
                                                {s}
                                                <button onClick={() => {
                                                    const field = type === 'income' ? 'incomeCategories' : 'expenseCategories';
                                                    const newList = [...data.config[field]];
                                                    newList[ci].subs.splice(si, 1);
                                                    updateFirebaseConfig({ ...data.config, [field]: newList });
                                                }} className="text-slate-300 hover:text-rose-400"><X size={10} /></button>
                                            </span>
                                        ))}
                                    </div>
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        const name = e.target.subName.value.trim();
                                        const field = type === 'income' ? 'incomeCategories' : 'expenseCategories';
                                        if (name) {
                                            const newList = [...data.config[field]];
                                            newList[ci].subs.push(name);
                                            updateFirebaseConfig({ ...data.config, [field]: newList });
                                            e.target.reset();
                                        }
                                    }} className="flex gap-2">
                                        <input name="subName" placeholder="Sub..." className="flex-1 bg-white dark:bg-slate-900 px-3 py-1 rounded-lg text-[10px] outline-none shadow-inner border dark:border-slate-700/50 dark:text-white" required />
                                        <button type="submit" className="text-sky-400 hover:scale-110 transition-transform"><PlusCircle size={20} /></button>
                                    </form>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className={`min-h-screen flex ${lang === 'ar' ? 'flex-row-reverse' : ''} bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <Sidebar />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b dark:border-slate-800 sticky top-0 z-20 flex items-center justify-between px-6 lg:px-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 hover:bg-slate-200"><Menu className="w-5 h-5" /></button>
                        <h2 className="text-lg font-black uppercase tracking-tighter dark:text-white truncate">
                            {_t(NAV_ITEMS.find(n => n.id === page)?.label.en, NAV_ITEMS.find(n => n.id === page)?.label.ar)}
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                            <div className={`w-2 h-2 rounded-full ${user ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                            <span className="text-[8px] font-black uppercase text-slate-500">{user ? t('online') : t('offline')}</span>
                        </div>
                        <button onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')} className="text-[10px] font-black uppercase px-4 py-2 border rounded-xl dark:border-slate-700 dark:text-white hover:bg-slate-100 transition-colors">
                            {lang === 'en' ? 'العربية' : 'English'}
                        </button>
                        <button onClick={() => { setDarkMode(!darkMode); document.documentElement.classList.toggle('dark'); }} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full dark:text-white hover:rotate-12 transition-transform">
                            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 lg:p-12 max-w-7xl mx-auto w-full custom-scrollbar">
                    {page === 'config' ? <SettingsView /> : (
                        page === 'dashboard' ? (
                            <div className="space-y-10 animate-in fade-in duration-500">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <Card title={t('assets')} value={data.students.length} color="text-slate-400" icon={Users} />
                                    <Card title={t('inflow')} value={`${totals.inc.toLocaleString()} ${t('currency')}`} color="text-emerald-500" icon={TrendingUp} />
                                    <Card title={t('outflow')} value={`${totals.exp.toLocaleString()} ${t('currency')}`} color="text-rose-500" icon={TrendingDown} />
                                    <Card title={t('netCash')} value={`${totals.net.toLocaleString()} ${t('currency')}`} color="text-sky-400" icon={ArrowLeftRight} />
                                </div>
                                <h3 className="text-xl font-black uppercase flex items-center gap-2 dark:text-white"><Calendar className="w-5 h-5 text-sky-400" /> {t('todaySchedule')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {data.subjects.slice(0, 6).map((sub, i) => (
                                        <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-none shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between mb-4">
                                                <span className="text-[10px] font-black text-sky-400 uppercase">{sub.Room}</span>
                                                <span className="px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded text-[9px] font-black dark:text-slate-400 uppercase">{sub.Grade}</span>
                                            </div>
                                            <h4 className="font-black text-lg mb-1 dark:text-white">{sub['Subject Name']}</h4>
                                            <p className="text-xs text-slate-400 font-bold mb-4">{sub['Teacher Name']}</p>
                                            <div className="flex items-center gap-2 text-sky-400 font-black text-xs pt-4 border-t dark:border-slate-800"><Clock size={14} /> {sub['Start Time']} | {sub['Day']}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="flex flex-col lg:flex-row justify-between gap-6">
                                    <div>
                                        <h2 className="text-3xl font-black uppercase tracking-tighter dark:text-white">{_t(NAV_ITEMS.find(n => n.id === page)?.label.en, NAV_ITEMS.find(n => n.id === page)?.label.ar)}</h2>
                                        <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">{filteredData.length} Results Found</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {libsReady && window.XLSX && (
                                            <button onClick={() => {
                                                const ws = window.XLSX.utils.json_to_sheet(filteredData);
                                                const wb = window.XLSX.utils.book_new();
                                                window.XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
                                                window.XLSX.writeFile(wb, `MANTIQ_${page}.xlsx`);
                                            }} className="bg-emerald-100 text-emerald-700 px-4 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-emerald-200 transition-colors"><FileSpreadsheet size={16} /> Excel</button>
                                        )}
                                        {page !== 'cash_flow' && <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 dark:bg-sky-400 dark:text-slate-900 text-white px-8 py-3 rounded-xl font-black text-xs uppercase shadow-xl hover:scale-105 transition-all">{t('addRecord')}</button>}
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-none p-4 flex items-center shadow-sm">
                                    <Search className="text-slate-400 w-5 h-5 ml-4" />
                                    <input type="text" placeholder={t('searchPlaceholder')} className="w-full bg-transparent border-none outline-none text-sm font-bold p-2 dark:text-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                </div>
                                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-none overflow-hidden overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase">
                                            <tr>{(NAV_ITEMS.find(n => n.id === page)?.cols || []).map((c, i) => <th key={i} className="px-6 py-5 whitespace-nowrap">{c}</th>)}<th className="px-6 py-5 text-center">Action</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredData.map((row, idx) => (
                                                <tr key={row.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group">
                                                    {(NAV_ITEMS.find(n => n.id === page)?.cols || []).map((k, i) => <td key={i} className={`px-6 py-4 text-sm whitespace-nowrap ${k === 'Amount' ? 'font-black text-emerald-600' : 'font-bold dark:text-slate-300'}`}>{row[k] || '-'}</td>)}
                                                    <td className="px-6 py-4 flex justify-center"><button onClick={() => setDeleteConfirm(row)} className="p-2 text-slate-300 hover:text-rose-500 transition-all"><Trash2 size={18} /></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    )}
                </main>
            </div>

            {/* Modals & Notifications */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 dark:text-white">{t('addRecord')}</h2>
                        <form onSubmit={handleAdd} className="space-y-4">
                            {(NAV_ITEMS.find(n => n.id === page)?.cols || []).map((col, i) => {
                                if (col.includes('ID')) return null;
                                if (col === 'Grade') return (
                                    <div key={i}><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block ml-2">{col}</label>
                                        <select name={col} className="w-full bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-xl outline-none font-bold text-sm dark:text-white" required>
                                            {Object.keys(data.config.gradeFees).map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                );
                                if (col === 'Teacher Name') return (
                                    <div key={i}><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block ml-2">{col}</label>
                                        <select name={col} className="w-full bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-xl outline-none font-bold text-sm dark:text-white" required>
                                            {data.config.teachers.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                );
                                if (col === 'Category') return (
                                    <div key={i}><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block ml-2">{col}</label>
                                        <select name={col} className="w-full bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-xl outline-none font-bold text-sm dark:text-white" required>
                                            {(page === 'income' ? data.config.incomeCategories : data.config.expenseCategories).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                );
                                return (
                                    <div key={i}><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block ml-2">{col}</label>
                                        <input name={col} type={col === 'Amount' ? 'number' : col.includes('Date') ? 'date' : 'text'} className="w-full bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-xl outline-none font-bold text-sm dark:text-white" required />
                                    </div>
                                );
                            })}
                            <div className="flex gap-3 mt-10">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 py-4 rounded-2xl uppercase font-black text-xs text-slate-400">{t('cancel')}</button>
                                <button type="submit" disabled={loading} className="flex-1 bg-sky-400 text-slate-900 py-4 rounded-2xl uppercase font-black text-xs shadow-xl disabled:opacity-50 transition-colors hover:bg-sky-500">{loading ? '...' : t('submit')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteConfirm && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in zoom-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] p-8 text-center shadow-2xl">
                        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce"><AlertTriangle size={32} /></div>
                        <h2 className="text-2xl font-black uppercase mb-4 tracking-tighter dark:text-white">{t('confirmTitle')}</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-10 leading-relaxed">هل أنت متأكد من حذف هذا السجل؟</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={handleDelete} className="w-full bg-rose-500 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-rose-600 active:scale-95 transition-all">{t('confirmBtn')}</button>
                            <button onClick={() => setDeleteConfirm(null)} className="w-full bg-slate-100 dark:bg-slate-800 py-4 rounded-2xl font-black uppercase text-xs text-slate-400 hover:bg-slate-200 transition-all">{t('keepBtn')}</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed bottom-10 right-10 z-[150] space-y-3 pointer-events-none">
                {notifications.map(n => <div key={n.id} className="bg-slate-900 dark:bg-slate-800 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border-l-4 border-rose-500 animate-in slide-in-from-right pointer-events-auto"><ShieldAlert className="text-rose-500 w-5 h-5" /><span className="text-xs font-bold">{n.msg}</span></div>)}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700;800&family=Noto+Sans+Arabic:wght@400;700;800&display=swap');
                body { font-family: 'Plus Jakarta Sans', 'Noto Sans Arabic', sans-serif; }
            `}</style>
        </div>
    );
}
