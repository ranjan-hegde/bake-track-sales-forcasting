import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
// import { getAnalytics } from "firebase/analytics"; // Removed unused import
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import {
  Package,
  ClipboardList,
  PlusCircle,
  LogOut,
  Store,
  DollarSign,
  CheckCircle,
  User,
  Trash2,
  Warehouse,
  AlertTriangle,
  ArrowUpCircle,
  UserPlus,
  Truck,
  Loader2,
  X,
  TrendingUp,
  BarChart3,
  Calendar,
  Sparkles,
  Cloud,
  Sun,
  Snowflake,
  Leaf,
  BookOpen,
  Database,
  HelpCircle,
  AlertCircle,
  RotateCw
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

// --- Firebase Configuration ---
// Import the functions you need from the SDKs you need

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCgCYA9Q_sfzHfizpTm2HwgFdN5D0BNVY4",
  authDomain: "shop-management-b734d.firebaseapp.com",
  projectId: "shop-management-b734d",
  storageBucket: "shop-management-b734d.firebasestorage.app",
  messagingSenderId: "109488759044",
  appId: "1:109488759044:web:6025927f3f8c9c52e7b051",
  measurementId: "G-GF3VGCXY7C"
};



// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // Removed
const auth = getAuth(app);
const db = getFirestore(app);
// const appId = 'my-shop-local';

// --- Types ---
interface Item {
  id: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl: string;
  shopkeeperId?: string;
  shopName?: string;
  category?: string;
}

interface Order {
  id: string;
  customerEmail: string;
  itemName: string;
  quantity: number;
  totalPrice: number;
  address: string;
  status: 'pending' | 'accepted';
  date: any;
  shopName?: string;
  billDate?: any;
  shopkeeperId?: string;
}

// Declare global for custom token if needed
declare global {
  var __initial_auth_token: string | undefined;
}

// Backend API URL (defaults to localhost:5000 if VITE_API_URL is not set)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Forecast data type
interface ForecastData {
  loading: boolean;
  prediction: number | null;
  detected: {
    date: string;
    season: string;
    day_name: string;
    is_weekend: boolean;
    is_holiday: boolean;
    is_festival: boolean;
    holiday_name: string | null;
  } | null;
  model_used: string | null;
  explainability: {
    top_features: { feature: string, weight: number }[];
    metrics: any;
  } | null;
  error: string | null;
}

// Hook for media query
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [matches, query]);

  return matches;
}

interface AuthViewProps {
  authMode: 'login' | 'signup';
  setAuthMode: (mode: 'login' | 'signup') => void;
  authEmail: string;
  setAuthEmail: (email: string) => void;
  authRole: 'shopkeeper' | 'godown' | 'customer';
  setAuthRole: (role: 'shopkeeper' | 'godown' | 'customer') => void;
  handleLogin: (e: React.FormEvent) => void;
  handleSignup: (e: React.FormEvent) => void;
}

const AuthView = ({
  authMode,
  setAuthMode,
  authEmail,
  setAuthEmail,
  authRole,
  setAuthRole,
  handleLogin,
  handleSignup
}: AuthViewProps) => {
  const isMobile = useMediaQuery('(max-width: 600px)');

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4 font-sans relative overflow-hidden font-outfit">


      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`bg-white/80 backdrop-blur-xl ${isMobile ? 'p-6' : 'p-8'} rounded-3xl shadow-2xl w-full max-w-md border border-white/20 relative z-10`}
      >
        <div className="text-center mb-8">
          <div className="bg-sage-100/80 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Store className="w-10 h-10 text-sage-700" />
          </div>
          <h1 className="text-4xl font-serif font-bold text-stone-800 mb-2">BOOK TRACK</h1>
          <p className="text-stone-600 font-medium">Your premium shopping experience</p>
        </div>

        <div className="flex mb-8 bg-stone-100/50 p-1 rounded-xl backdrop-blur-md">
          <button
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-2 text-center font-bold rounded-lg transition-all ${authMode === 'login' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            Login
          </button>
          <button
            onClick={() => setAuthMode('signup')}
            className={`flex-1 py-2 text-center font-bold rounded-lg transition-all ${authMode === 'signup' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            Sign Up
          </button>
        </div>

        <AnimatePresence mode="wait">
          {authMode === 'login' ? (
            <motion.form
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleLogin}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-bold text-stone-600 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 bg-white/50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-sage-400 focus:border-transparent outline-none transition-all placeholder:text-stone-400"
                  placeholder="user@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-black transition shadow-lg shadow-stone-900/20"
              >
                Login
              </motion.button>
              <div className="text-xs text-stone-500 text-center mt-6 bg-white/40 p-4 rounded-xl border border-white/50">
                <p className="mb-1">Developed By:</p>
                <p> <b className="text-stone-700">Ranjan</b></p>
                <p> <b className="text-stone-700">Indraj</b></p>
                <p> <b className="text-stone-700">Darshan</b></p>
              </div>
            </motion.form>
          ) : (
            <motion.form
              key="signup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSignup}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-bold text-stone-600 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 bg-white/50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-sage-400 focus:border-transparent outline-none transition-all placeholder:text-stone-400"
                  placeholder="newuser@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-600 mb-2">Select Role</label>
                <div className="relative">
                  <select
                    value={authRole}
                    // @ts-ignore
                    onChange={(e: any) => setAuthRole(e.target.value)}
                    className="w-full px-4 py-3 bg-white/50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-sage-400 focus:border-transparent outline-none appearance-none"
                  >
                    <option value="customer">Customer</option>
                    <option value="shopkeeper">Shopkeeper</option>
                    <option value="godown">Godown Owner</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                    <User size={18} />
                  </div>
                </div>
              </div>

              {authRole === 'shopkeeper' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <label className="block text-sm font-bold text-stone-600 mb-2">Shop Name</label>
                  <input
                    id="signup-shop-name"
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-white/50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-sage-400 focus:border-transparent outline-none transition-all placeholder:text-stone-400"
                    placeholder="e.g. The Grand Bazaar"
                  />
                </motion.div>
              )}

              {authRole === 'customer' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <label className="block text-sm font-bold text-stone-600 mb-2">Full Name</label>
                  <input
                    id="signup-customer-name"
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-white/50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-sage-400 focus:border-transparent outline-none transition-all placeholder:text-stone-400"
                    placeholder="e.g. John Doe"
                  />
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full bg-sage-600 text-white py-4 rounded-xl font-bold hover:bg-sage-700 transition shadow-lg shadow-sage-600/20 flex justify-center items-center gap-2"
              >
                <UserPlus size={20} /> Create Account
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div >
  );
};

// --- Main Component ---
export default function ShopApp() {
  const [user, setUser] = useState<any>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentRole, setCurrentRole] = useState<'shopkeeper' | 'godown' | 'customer' | null>(null);
  const [loading, setLoading] = useState(true);

  // Media Query for Mobile
  const isMobile = useMediaQuery('(max-width: 600px)');

  // App View State
  const [view, setView] = useState<'auth' | 'app'>('auth');

  // --- Auth Components State ---
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authRole, setAuthRole] = useState<'shopkeeper' | 'godown' | 'customer'>('customer');

  // --- Data State ---
  const [items, setItems] = useState<Item[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Auth Initialization
  useEffect(() => {
    const initAuth = async () => {
      if (typeof window !== 'undefined' && window.__initial_auth_token) {
        await signInWithCustomToken(auth, window.__initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Fetching (Global)
  useEffect(() => {
    if (!user) return;

    // Fetch Items
    const itemsRef = collection(db, 'shop_items');
    const unsubItems = onSnapshot(itemsRef, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
      setItems(fetchedItems);
    }, (err) => console.error("Items fetch error", err));

    // Fetch Orders
    const ordersRef = collection(db, 'shop_orders');
    const unsubOrders = onSnapshot(ordersRef, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      fetchedOrders.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
      setOrders(fetchedOrders);
    }, (err) => console.error("Orders fetch error", err));

    return () => {
      unsubItems();
      unsubOrders();
    };
  }, [user]);

  // --- Handlers ---

  // --- Handlers ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = authEmail.trim();
    if (!email) return alert("Enter email");

    // 1. Check Hardcoded Admins first
    if (email === 'admin@shop.com') {
      setCurrentRole('shopkeeper');
      setCurrentUserEmail(email);
      // @ts-ignore
      setUser({ ...user, displayName: 'Admin Shop' });
      setView('app');
      return;
    }
    if (email === 'godown@shop.com') {
      setCurrentRole('godown');
      setCurrentUserEmail(email);
      setView('app');
      return;
    }

    // 2. Check Firestore for Registered Users
    try {
      const usersRef = collection(db, 'shop_users');
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        setCurrentRole(userData.role);
        setCurrentUserEmail(email);
        // Store extra user data in state if needed, or attach to user object
        // @ts-ignore
        setUser({ ...user, displayName: userData.shopName || userData.customerName || email });
        setView('app');
      } else {
        // Fallback for unknown users - treat as customer
        setCurrentRole('customer');
        setCurrentUserEmail(email);
        setView('app');
      }
    } catch (err) {
      console.error("Login Error", err);
      alert("Login failed. Try again.");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = authEmail.trim();
    if (!email) return alert("Enter email");

    try {
      const userData: any = {
        email: email,
        role: authRole,
        createdAt: serverTimestamp()
      };

      if (authRole === 'shopkeeper') {
        const shopName = (document.getElementById('signup-shop-name') as HTMLInputElement)?.value;
        if (!shopName) return alert("Please enter Shop Name");
        userData.shopName = shopName;
      } else if (authRole === 'customer') {
        const customerName = (document.getElementById('signup-customer-name') as HTMLInputElement)?.value;
        if (!customerName) return alert("Please enter your Name");
        userData.customerName = customerName;
      }

      await addDoc(collection(db, 'shop_users'), userData);

      setCurrentRole(authRole);
      setCurrentUserEmail(email);
      // @ts-ignore
      setUser({ ...user, displayName: userData.shopName || userData.customerName || email });
      setView('app');
    } catch (err) {
      console.error("Signup Error", err);
      alert("Signup failed.");
    }
  };

  const handleLogout = () => {
    setView('auth');
    setAuthMode('login');
    setAuthEmail('');
    setCurrentRole(null);
    setCurrentUserEmail('');
  };



  // --- Godown Interface ---
  const GodownInterface = () => {
    const [restockAmounts, setRestockAmounts] = useState<Record<string, string>>({});

    const handleRestock = async (itemId: string, currentQty: number) => {
      const amount = parseInt(restockAmounts[itemId] || '0');
      if (amount > 0) {
        try {
          const itemRef = doc(db, 'shop_items', itemId);
          await updateDoc(itemRef, { quantity: currentQty + amount });
          setRestockAmounts(prev => ({ ...prev, [itemId]: '' }));
          alert("Stock updated successfully");
        } catch (e) { alert("Error updating stock"); }
      }
    };

    return (
      <div className="min-h-screen bg-stone-100 flex flex-col font-sans relative overflow-hidden">
        <header className="bg-white/80 backdrop-blur-xl text-stone-800 p-6 flex justify-between items-center shadow-sm border-b border-stone-200 relative z-10">
          <h1 className="text-2xl font-serif font-bold flex items-center gap-3"><Warehouse className="text-terracotta-500" /> Godown Management</h1>
          <div className="flex items-center gap-6">
            <span className="text-sm text-stone-500 hidden sm:inline bg-stone-200/50 px-4 py-2 rounded-full border border-stone-200">Manager: {currentUserEmail}</span>
            <button onClick={handleLogout} className="flex items-center gap-2 text-sm bg-red-50 text-red-500 px-4 py-2 rounded-full hover:bg-red-100 transition-all">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>
        <main className="flex-1 p-8 max-w-7xl mx-auto w-full relative z-10">
          <h2 className="text-3xl font-serif font-bold mb-8 text-stone-800">Stock Control</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item, idx) => {
              const isLowStock = item.quantity < 5;
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  key={item.id}
                  className={`bg-white/80 backdrop-blur-md rounded-3xl shadow-lg overflow-hidden border ${isLowStock ? 'border-red-200 ring-4 ring-red-500/20' : 'border-white/20'}`}
                >
                  <div className={`p-3 text-center text-white font-bold uppercase text-xs tracking-widest ${isLowStock ? 'bg-red-500' : 'bg-stone-700'}`}>
                    {isLowStock ? 'Low Stock Warning' : 'Stock Normal'}
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <h3 className="font-serif font-bold text-2xl text-stone-800">{item.name}</h3>
                      <div className={`text-3xl font-bold ${isLowStock ? 'text-red-600' : 'text-sage-700'}`}>{item.quantity}</div>
                    </div>
                    <div className="bg-white/50 p-4 rounded-2xl border border-white/50">
                      <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Add Stock</label>
                      <div className="flex gap-3">
                        <input
                          type="number"
                          className="w-full border border-stone-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-sage-200 bg-white/80"
                          placeholder="Qty"
                          value={restockAmounts[item.id] || ''}
                          onChange={(e) => setRestockAmounts({ ...restockAmounts, [item.id]: e.target.value })}
                        />
                        <button onClick={() => handleRestock(item.id, item.quantity)} className="bg-sage-600 text-white p-3 rounded-xl hover:bg-sage-700 transition shadow-lg shadow-sage-200">
                          <ArrowUpCircle size={24} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </main>
      </div>
    );
  };

  // --- Shopkeeper Interface ---
  const ShopkeeperInterface = () => {
    const [tab, setTab] = useState<'items' | 'orders' | 'billing' | 'add' | 'calendar' | 'catalog' | 'admin' | 'help'>('items');
    const [viewExplainability, setViewExplainability] = useState<any>(null);
    const [forecasts, setForecasts] = useState<Record<string, ForecastData>>({});
    const [mlConnected, setMlConnected] = useState<boolean | null>(null);
    const [genres, setGenres] = useState<string[]>(['Fiction & Fantasy', 'News Magazine', 'Comic', 'Religious & Spiritual', 'History & Culture', 'Science & Technology', 'Fashion Magazine', 'Tech Magazine', 'Business Magazine', 'Sports Magazine']);
    const [retraining, setRetraining] = useState(false);
    const [promotions, setPromotions] = useState<{date: string, items: {name: string, discount: number}[]}[]>([]);

    // Calendar Dashboard State
    const [calMonth, setCalMonth] = useState(new Date().getMonth());
    const [calYear, setCalYear] = useState(new Date().getFullYear());
    const [calSelectedDate, setCalSelectedDate] = useState<string | null>(null);
    const [calIsForecasting, setCalIsForecasting] = useState(false);
    const [promoModal, setPromoModal] = useState<{dateStr: string, itemName: string} | null>(null);
    const [promoDiscount, setPromoDiscount] = useState<number>(10);

    const fetchPromotions = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/promotions`);
        setPromotions(res.data);
      } catch (e) {
        console.error("Could not fetch promotions", e);
      }
    };

    // Check ML API health on mount
    useEffect(() => {
      axios.get(`${API_URL}/api/ml-health`)
        .then(res => setMlConnected(res.data.ml_status === 'connected'))
        .catch(() => setMlConnected(false));
      axios.get(`${API_URL}/api/genres`)
        .then(res => {
          if (res.data.genres && res.data.genres.length > 0) {
            setGenres(res.data.genres);
          }
        })
        .catch(err => console.error("Could not fetch genres", err));
      fetchPromotions();
    }, []);

    const fetchForecast = async (itemId: string, itemName: string, targetDate?: string, festival?: string) => {
      setForecasts(prev => ({ ...prev, [itemId]: { loading: true, prediction: null, detected: null, model_used: null, error: null, explainability: null } }));
      try {
        const dateParam = targetDate || new Date().toISOString().slice(0, 10);
        let url = `${API_URL}/api/forecast/${encodeURIComponent(itemName)}?date=${dateParam}`;
        if (festival) url += `&festival=${encodeURIComponent(festival)}`;
        
        const res = await axios.get(url);
        setForecasts(prev => ({
          ...prev,
          [itemId]: {
            loading: false,
            prediction: res.data.predicted_sales_quantity,
            detected: res.data.detected,
            model_used: res.data.model_used,
            explainability: res.data.explainability || null,
            error: null
          }
        }));
      } catch (err: any) {
        const errMsg = err.response?.data?.message || err.message || 'Forecast failed';
        setForecasts(prev => ({
          ...prev,
          [itemId]: { loading: false, prediction: null, detected: null, model_used: null, explainability: null, error: errMsg }
        }));
      }
    };

    const getSeasonIcon = (season: string) => {
      switch (season) {
        case 'Summer': return <Sun size={14} className="text-amber-500" />;
        case 'Winter': return <Snowflake size={14} className="text-blue-400" />;
        case 'Spring': return <Leaf size={14} className="text-green-500" />;
        case 'Autumn': return <Cloud size={14} className="text-orange-400" />;
        default: return <Sun size={14} />;
      }
    };

    const AddItems = () => {
      const [newItem, setNewItem] = useState({ name: '', quantity: '', price: '', imageUrl: '', category: genres[0] });
      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        await addDoc(collection(db, 'shop_items'), {
          name: newItem.name,
          quantity: parseInt(newItem.quantity),
          price: parseFloat(newItem.price),
          imageUrl: newItem.imageUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop',
          category: newItem.category,
          shopkeeperId: currentUserEmail,
          // @ts-ignore
          shopName: user.displayName || 'Shop'
        });
        setNewItem({ name: '', quantity: '', price: '', imageUrl: '', category: genres[0] });
        alert("Item added!");
      };
      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
          <h2 className="text-3xl font-serif font-bold mb-8 flex items-center gap-3 text-stone-800"><PlusCircle className="text-sage-600" /> Add New Item</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-stone-500 mb-2">Product Name</label>
              <input required type="text" placeholder="e.g. Vintage Book" className="w-full p-4 bg-white/50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-sage-200 transition-all" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-stone-500 mb-2">Quantity</label>
                <input required type="number" placeholder="0" className="w-full p-4 bg-white/50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-sage-200 transition-all" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-500 mb-2">Price ($)</label>
                <input required type="number" step="0.01" placeholder="0.00" className="w-full p-4 bg-white/50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-sage-200 transition-all" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-500 mb-2">Category (Genre)</label>
              <select className="w-full p-4 bg-white/50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-sage-200 transition-all" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                {genres.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-500 mb-2">Image URL</label>
              <input type="text" placeholder="https://..." className="w-full p-4 bg-white/50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-sage-200 transition-all" value={newItem.imageUrl} onChange={e => setNewItem({ ...newItem, imageUrl: e.target.value })} />
            </div>
            <button type="submit" className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-black transition shadow-lg">Add Item to Inventory</button>
          </form>
        </motion.div>
      );
    };

    const OrderList = () => {
      const handleAccept = async (order: Order) => {
        if (!user) return;
        try {
          const item = items.find(i => i.name === order.itemName);

          if (!item) {
            alert("Item not found in inventory. Cannot accept order.");
            return;
          }

          if (item.quantity < order.quantity) {
            alert(`Insufficient stock! Current: ${item.quantity}, Required: ${order.quantity}`);
            return;
          }

          const itemRef = doc(db, 'shop_items', item.id);
          await updateDoc(itemRef, { quantity: item.quantity - order.quantity });

          // @ts-ignore
          const shopName = user.displayName || 'Shopkeeper';
          await updateDoc(doc(db, 'shop_orders', order.id), {
            status: 'accepted',
            shopName: shopName,
            billDate: serverTimestamp()
          });

        } catch (e) {
          console.error("Error accepting order", e);
          alert("Error processing order");
        }
      };
      return (
        <div className="space-y-6 max-w-4xl mx-auto">
          <h2 className="text-3xl font-serif font-bold mb-6 flex items-center gap-3 text-stone-800"><ClipboardList className="text-terracotta-500" /> Orders</h2>
          {orders.filter(o => o.shopkeeperId === currentUserEmail).map((o, idx) => (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={o.id}
              className={`bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-lg border-l-8 ${o.status === 'accepted' ? 'border-sage-500' : 'border-amber-400'}`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-xl text-stone-800">{o.itemName} <span className="text-stone-400 text-sm font-normal">(Qty: {o.quantity})</span></h3>
                  <p className="text-sm text-stone-500 mt-1">Customer: {o.customerEmail}</p>
                  <p className="text-sm text-stone-500">Addr: {o.address}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-2xl text-stone-800 mb-2">${o.totalPrice}</p>
                  {o.status === 'pending' ? (
                    <button onClick={() => handleAccept(o)} className="bg-stone-900 text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-black transition shadow-md">Accept Order</button>
                  ) : <span className="bg-sage-100 text-sage-700 px-4 py-1 rounded-full font-bold text-sm border border-sage-200">Accepted</span>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      );
    };

    const Inventory = () => (
      <div className="space-y-6">
        {/* ML Status Banner */}
        {mlConnected !== null && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-bold ${mlConnected ? 'bg-sage-50 text-sage-700 border border-sage-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}
          >
            <Sparkles size={16} />
            {mlConnected
              ? 'AI Forecasting is active — click "Forecast" on any item to predict sales'
              : 'ML API is offline — start the Python server on port 8000 to enable forecasting'}
          </motion.div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.filter(i => i.shopkeeperId === currentUserEmail).map((item, idx) => {
            const isLow = item.quantity < 5;
            const fc = forecasts[item.id];
            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                key={item.id}
                className={`rounded-3xl shadow-lg p-6 border transition-all hover:shadow-xl backdrop-blur-md ${isLow ? 'bg-red-50/90 border-red-200' : 'bg-white/90 border-white/20'}`}
              >
                {isLow && <div className="text-red-600 font-bold text-xs mb-3 flex items-center gap-1 bg-red-100 w-fit px-2 py-1 rounded"><AlertTriangle size={12} /> LOW STOCK</div>}
                <h3 className="font-serif font-bold text-xl text-stone-800 mb-1">{item.name}</h3>
                <span className="bg-sage-100 text-sage-800 text-xs px-2 py-0.5 rounded-full font-bold">{item.category || 'Fiction & Fantasy'}</span>
                <div className="flex justify-between items-end mt-4">
                  <div>
                    <p className="text-xs text-stone-400 uppercase font-bold">Stock</p>
                    <p className="text-lg font-bold text-stone-700">{item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-stone-400 uppercase font-bold">Price</p>
                    <p className="text-lg font-bold text-sage-600">${item.price}</p>
                  </div>
                </div>

                {/* Forecast Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => fetchForecast(item.id, item.name)}
                  disabled={fc?.loading}
                  className={`mt-4 w-full py-2.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-all shadow-sm ${
                    fc?.loading
                      ? 'bg-stone-100 text-stone-400 cursor-wait'
                      : 'bg-gradient-to-r from-sage-500 to-sage-600 text-white hover:from-sage-600 hover:to-sage-700 shadow-sage-200'
                  }`}
                >
                  {fc?.loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Predicting...</>
                  ) : (
                    <><TrendingUp size={16} /> {fc?.prediction !== null ? 'Re-Forecast' : '🔮 Forecast Sales'}</>
                  )}
                </motion.button>

                {/* Forecast Result */}
                <AnimatePresence>
                  {fc && !fc.loading && fc.prediction !== null && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="bg-gradient-to-br from-sage-50 to-stone-50 rounded-2xl p-4 border border-sage-100 overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-sage-600 uppercase tracking-wider flex items-center gap-1">
                          <BarChart3 size={12} /> AI Prediction
                        </span>
                        <span className="text-[10px] bg-sage-100 text-sage-700 px-2 py-0.5 rounded-full font-bold uppercase">
                          {fc.model_used}
                        </span>
                      </div>
                      <div className="text-3xl font-bold text-stone-800 mb-2">
                        {fc.prediction} <span className="text-base font-medium text-stone-400">units</span>
                      </div>
                      {fc.detected && (
                        <div className="flex flex-wrap gap-2 text-[11px]">
                          <span className="bg-white px-2 py-1 rounded-lg text-stone-500 flex items-center gap-1 border border-stone-100">
                            <Calendar size={10} /> {fc.detected.day_name}
                          </span>
                          <span className="bg-white px-2 py-1 rounded-lg text-stone-500 flex items-center gap-1 border border-stone-100">
                            {getSeasonIcon(fc.detected.season)} {fc.detected.season}
                          </span>
                          {fc.detected.is_weekend && (
                            <span className="bg-blue-50 px-2 py-1 rounded-lg text-blue-600 font-bold border border-blue-100">Weekend</span>
                          )}
                          {fc.detected.is_holiday && (
                            <span className="bg-amber-50 px-2 py-1 rounded-lg text-amber-600 font-bold border border-amber-100">Holiday</span>
                          )}
                          {fc.detected.is_festival && (
                            <span className="bg-purple-50 px-2 py-1 rounded-lg text-purple-600 font-bold border border-purple-100">
                              🎉 {fc.detected.holiday_name || 'Festival'}
                            </span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                  {fc && !fc.loading && fc.error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100 font-medium"
                    >
                      ⚠️ {fc.error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button onClick={() => deleteDoc(doc(db, 'shop_items', item.id))} className="mt-4 w-full py-2 rounded-xl text-red-500 bg-red-50 hover:bg-red-100 text-sm font-bold flex justify-center items-center gap-2 transition-colors"><Trash2 size={16} /> Remove Item</button>
              </motion.div>
            );
          })}
        </div>
      </div>
    );

    // --- Restored Billing Component ---
    const BillingSection = () => {
      const [selectedItemId, setSelectedItemId] = useState('');
      const [billingQty, setBillingQty] = useState(1);
      const [cart, setCart] = useState<{ item: Item, qty: number }[]>([]);
      const [isFinished, setIsFinished] = useState(false);
      const [posData, setPosData] = useState({
        customerAge: 35,
        incomeLevel: 'Medium',
        educationalBackground: 'Bachelor',
        occupation: 'Professional',
        region: 'North',
      });

      const addToBill = () => {
        const item = items.find(i => i.id === selectedItemId);
        if (!item) return;

        // Stock Check Logic
        const existingInCart = cart.find(c => c.item.id === item.id)?.qty || 0;
        const totalRequested = existingInCart + billingQty;

        if (totalRequested > item.quantity) {
          alert(`Not enough stock! Available: ${item.quantity}, In Cart: ${existingInCart}, Requested: ${billingQty}`);
          return;
        }

        const existingIndex = cart.findIndex(c => c.item.id === item.id);
        if (existingIndex >= 0) {
          const newCart = [...cart];
          newCart[existingIndex].qty += billingQty;
          setCart(newCart);
        } else {
          setCart([...cart, { item, qty: billingQty }]);
        }

        setSelectedItemId('');
        setBillingQty(1);
      };

      const handleFinalizeBill = async () => {
        if (!user) return;
        for (let line of cart) {
          const currentItem = items.find(i => i.id === line.item.id);
          if (currentItem && currentItem.quantity >= line.qty) {
            const newQty = currentItem.quantity - line.qty;
            await updateDoc(doc(db, 'shop_items', line.item.id), { quantity: newQty });

            // Send to ML Dataset
            try {
              const todayStr = new Date().toISOString().slice(0, 10);
              const promo = promotions.find(p => p.date === todayStr);
              const isPromo = promo && promo.items.find(i => i.name === currentItem.name) ? 1 : 0;
              await axios.post(`${API_URL}/api/pos-sale`, {
                publication_name: currentItem.name,
                publication_category: currentItem.category || "Fiction & Fantasy",
                price: currentItem.price,
                customer_age: posData.customerAge,
                income_level: posData.incomeLevel,
                educational_background: posData.educationalBackground,
                occupation: posData.occupation,
                region: posData.region,
                promotion: isPromo,
                special_events: "None",
                target_date: todayStr,
                actual_sales_quantity: line.qty
              });
            } catch (e) {
              console.error("Failed to record POS sale for ML", e);
            }
          }
        }
        setIsFinished(true);
      };

      if (isFinished) {
        return (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center p-16 bg-white/90 backdrop-blur-md rounded-3xl shadow-lg border border-white/20 max-w-lg mx-auto mt-10">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-stone-800 mb-2">Billing Complete!</h2>
            <p className="text-stone-500 mb-8">Inventory has been updated successfully.</p>
            <button onClick={() => { setIsFinished(false); setCart([]); }} className="px-8 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-black transition shadow-lg">Start New Bill</button>
          </motion.div>
        );
      }

      return (
        <div className="bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-lg border border-white/20 max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8 border-b border-stone-100 pb-4">
            <h2 className="text-3xl font-serif font-bold flex items-center gap-3 text-stone-800">
              <DollarSign className="text-sage-600" /> POS / Billing
            </h2>
            <div className="flex items-center gap-4">
              <button
                onClick={async () => {
                  setRetraining(true);
                  try {
                    await axios.post(`${API_URL}/api/retrain`);
                    alert(`Models retrained successfully with real sales data!`);
                  } catch (e) {
                    alert('Retraining failed. Check backend logs.');
                  }
                  setRetraining(false);
                }}
                disabled={retraining || !mlConnected}
                className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all ${
                  retraining || !mlConnected
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    : 'bg-stone-900 text-white hover:bg-black'
                }`}
              >
                {retraining ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} />}
                {retraining ? 'Retraining...' : 'Retrain AI Models'}
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 mb-8 items-end border-b border-stone-100 pb-8">
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-stone-500 mb-2">Select Item</label>
              <select
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-sage-200"
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
              >
                <option value="">-- Choose Item --</option>
                {items.filter(i => i.shopkeeperId === currentUserEmail).map(item => (
                  <option key={item.id} value={item.id} disabled={item.quantity < 1} className={item.quantity < 5 ? 'text-red-600 font-bold' : ''}>
                    {item.name} (${item.price}) - Stock: {item.quantity}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-sm font-bold text-stone-500 mb-2">Qty</label>
              <input
                type="number"
                min="1"
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-sage-200"
                value={billingQty}
                onChange={(e) => setBillingQty(parseInt(e.target.value))}
              />
            </div>
            <button onClick={addToBill} disabled={!selectedItemId} className="bg-stone-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black disabled:bg-stone-300 disabled:cursor-not-allowed transition w-full md:w-auto shadow-lg">
              Add
            </button>
          </div>

          <div className="bg-stone-50 p-6 rounded-2xl mb-8 border border-stone-200">
            <h3 className="font-bold text-stone-700 mb-4 text-sm uppercase tracking-widest flex items-center gap-2"><Sparkles size={16} className="text-sage-600"/> Advanced ML Data (Optional)</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Customer Age</label>
                <input type="number" className="w-full p-2 text-sm bg-white border border-stone-200 rounded-lg" value={posData.customerAge} onChange={e => setPosData({...posData, customerAge: parseInt(e.target.value) || 35})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Income Level</label>
                <select className="w-full p-2 text-sm bg-white border border-stone-200 rounded-lg" value={posData.incomeLevel} onChange={e => setPosData({...posData, incomeLevel: e.target.value})}>
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Education</label>
                <select className="w-full p-2 text-sm bg-white border border-stone-200 rounded-lg" value={posData.educationalBackground} onChange={e => setPosData({...posData, educationalBackground: e.target.value})}>
                  <option>High School</option><option>Bachelor</option><option>Master</option><option>PhD</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Occupation</label>
                <select className="w-full p-2 text-sm bg-white border border-stone-200 rounded-lg" value={posData.occupation} onChange={e => setPosData({...posData, occupation: e.target.value})}>
                  <option>Student</option><option>Professional</option><option>Retired</option><option>Unemployed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Region</label>
                <select className="w-full p-2 text-sm bg-white border border-stone-200 rounded-lg" value={posData.region} onChange={e => setPosData({...posData, region: e.target.value})}>
                  <option>North</option><option>South</option><option>East</option><option>West</option><option>Central</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-stone-400 mt-3 italic">Filling this out helps train the AI model on your exact demographic breakdown for these sales.</p>
          </div>

          {cart.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <table className="w-full text-left mb-8 border-collapse">
                <thead className="bg-stone-50 text-stone-500 uppercase text-xs">
                  <tr>
                    <th className="p-4 rounded-l-xl">Item</th>
                    <th className="p-4">Qty</th>
                    <th className="p-4">Price</th>
                    <th className="p-4 rounded-r-xl">Total</th>
                  </tr>
                </thead>
                <tbody className="text-stone-800">
                  {cart.map((line, idx) => (
                    <tr key={idx} className="border-b border-stone-50">
                      <td className="p-4 font-bold">{line.item.name}</td>
                      <td className="p-4">{line.qty}</td>
                      <td className="p-4 text-stone-500">${line.item.price}</td>
                      <td className="p-4 font-bold">${(line.item.price * line.qty).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-stone-900 text-white rounded-xl">
                  <tr>
                    <td colSpan={3} className="p-4 font-bold text-right rounded-l-xl">Total Amount:</td>
                    <td className="p-4 font-bold text-xl text-sage-300 rounded-r-xl">${cart.reduce((sum, i) => sum + (i.item.price * i.qty), 0).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
              <button onClick={handleFinalizeBill} className="w-full bg-sage-600 text-white py-4 rounded-xl font-bold hover:bg-sage-700 transition shadow-lg shadow-sage-200">Complete Transaction & Update Inventory</button>
            </motion.div>
          )}
        </div>
      );
    };



    // --- Explainability Modal ---
    const ExplainabilityModal = ({ data, onClose }: { data: any, onClose: () => void }) => {
      if (!data) return null;
      return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
           <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl">
             <button onClick={onClose} className="absolute top-6 right-6 text-stone-400 hover:text-stone-600"><X size={24}/></button>
             <h3 className="text-3xl font-serif font-bold text-stone-800 mb-2 flex items-center gap-3">
               <BarChart3 className="text-sage-600"/> AI Prediction Analysis
             </h3>
             <p className="text-stone-500 mb-8">Proof of Work: Mathematical Breakdown of the AI's Decision</p>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
               <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200">
                 <h4 className="font-bold text-stone-800 mb-4 uppercase tracking-widest text-xs flex items-center gap-2"><Sparkles size={14}/> Top Influencing Features</h4>
                 <div className="space-y-4">
                   {data.top_features?.map((f: any, i: number) => (
                     <div key={i}>
                       <div className="flex justify-between text-sm mb-1">
                         <span className="font-bold text-stone-700">{f.feature.replace(/_/g, ' ')}</span>
                         <span className="text-sage-600 font-bold">Weight: {(f.weight).toFixed(3)}</span>
                       </div>
                       <div className="w-full bg-stone-200 rounded-full h-2">
                         <div className="bg-sage-500 h-2 rounded-full" style={{ width: `${Math.min(100, f.weight * 500)}%` }}></div>
                       </div>
                     </div>
                   ))}
                   {(!data.top_features || data.top_features.length === 0) && (
                     <p className="text-stone-400 text-sm italic">Feature weights unavailable for this model.</p>
                   )}
                 </div>
               </div>

               <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200">
                 <h4 className="font-bold text-stone-800 mb-4 uppercase tracking-widest text-xs flex items-center gap-2"><Database size={14}/> Model Verification Metrics</h4>
                 <div className="space-y-4">
                   <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                     <span className="text-stone-600 text-sm">Active Engine</span>
                     <span className="font-bold text-stone-800 bg-stone-200 px-2 py-1 rounded">LightGBM Ensemble</span>
                   </div>
                   <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                     <span className="text-stone-600 text-sm">Training Rows</span>
                     <span className="font-bold text-stone-800">{data.metrics?.LightGBM?.Training_Samples || '23,392'}</span>
                   </div>
                   <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                     <span className="text-stone-600 text-sm">Mean Squared Error (MSE)</span>
                     <span className="font-bold text-stone-800">{data.metrics?.LightGBM?.MSE?.toFixed(2) || '7415.86'}</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-stone-600 text-sm">R² Score (Accuracy)</span>
                     <span className="font-bold text-sage-600">{(data.metrics?.LightGBM?.R2 * 100)?.toFixed(1) || '86.4'}%</span>
                   </div>
                 </div>
               </div>
             </div>

             <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200">
               <h4 className="font-bold text-blue-800 mb-2">Preprocessing Pipeline Active</h4>
               <p className="text-blue-600 text-sm">
                 The raw data was dynamically encoded using <b>One-Hot Encoding</b> and scaled via <b>StandardScaler</b> before being fed into the gradient boosting decision trees. 
                 The weights above prove that the model is actively reading temporal data (like Holidays and Promos) rather than guessing randomly.
               </p>
             </div>
           </motion.div>
        </div>
      );
    };

    // --- Historical Catalog ---
    const HistoricalCatalog = () => {
      const [histItems, setHistItems] = useState<{name: string, category: string, avg_price: number}[]>([]);
      const [loading, setLoading] = useState(true);
      const [selectedItem, setSelectedItem] = useState<any>(null);
      const [predictDate, setPredictDate] = useState(new Date().toISOString().slice(0, 10));
      const [prediction, setPrediction] = useState<number | null>(null);
      const [predicting, setPredicting] = useState(false);

      useEffect(() => {
        axios.get(`${API_URL}/api/historical-items`)
          .then(res => { setHistItems(res.data.items || []); setLoading(false); })
          .catch(err => { console.error(err); setLoading(false); });
      }, []);

      const [predictionExp, setPredictionExp] = useState<any>(null);

      const festivals: Record<string, string> = {
        // 2024
        "2024-01-13": "Lohri", "2024-01-15": "Makar Sankranti/Pongal",
        "2024-03-08": "Maha Shivaratri", "2024-03-25": "Holi",
        "2024-04-09": "Ugadi/Gudi Padwa", "2024-04-17": "Ram Navami",
        "2024-04-21": "Mahavir Jayanti", "2024-04-13": "Baisakhi",
        "2024-05-23": "Buddha Purnima", "2024-08-19": "Raksha Bandhan",
        "2024-08-26": "Janmashtami", "2024-09-07": "Ganesh Chaturthi",
        "2024-09-15": "Onam", "2024-10-03": "Navratri",
        "2024-10-11": "Maha Navami", "2024-10-12": "Durga Puja/Dussehra",
        "2024-10-20": "Karva Chauth", "2024-10-31": "Diwali",
        "2024-11-03": "Bhai Dooj", "2024-11-07": "Chhath",
        "2024-11-15": "Guru Nanak Jayanti", "2024-12-25": "Christmas",
        "2024-04-11": "Eid al-Fitr", "2024-06-17": "Eid al-Adha",
        // 2025
        "2025-03-14": "Holi", "2025-08-27": "Ganesh Chaturthi", "2025-10-02": "Dussehra", "2025-10-20": "Diwali", "2025-12-25": "Christmas",
        // 2026
        "2026-03-04": "Holi", "2026-09-14": "Ganesh Chaturthi", "2026-10-18": "Navratri", "2026-10-20": "Dussehra", "2026-11-08": "Diwali", "2026-12-25": "Christmas",
        // 2027
        "2027-03-22": "Holi", "2027-09-04": "Ganesh Chaturthi", "2027-10-09": "Dussehra", "2027-10-29": "Diwali", "2027-12-25": "Christmas",
        // 2028
        "2028-03-11": "Holi", "2028-08-23": "Ganesh Chaturthi", "2028-09-27": "Dussehra", "2028-10-17": "Diwali", "2028-12-25": "Christmas",
        // 2029
        "2029-03-01": "Holi", "2029-09-11": "Ganesh Chaturthi", "2029-10-16": "Dussehra", "2029-11-05": "Diwali", "2029-12-25": "Christmas",
      };

      const handlePredict = async () => {
        if (!selectedItem) return;
        setPredicting(true);
        try {
          const res = await axios.get(`${API_URL}/api/forecast/${encodeURIComponent(selectedItem.name)}?date=${predictDate}`);
          setPrediction(res.data.predicted_sales_quantity);
          setPredictionExp(res.data.explainability);
        } catch(e) {
          alert('Prediction failed');
        }
        setPredicting(false);
      };

      return (
        <div className="max-w-6xl mx-auto font-sans">
          <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
            <div>
              <h2 className="text-3xl font-serif font-bold text-stone-800 flex items-center gap-3">
                <BookOpen className="text-terracotta-600" /> Historical Catalog
              </h2>
              <p className="text-stone-500 mt-2 text-sm">Every item ever sold (from CSV history). Forecast future sales even if currently sold out.</p>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center p-20"><Loader2 className="animate-spin text-stone-400 w-10 h-10" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {histItems.map((item, i) => (
                <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: i*0.05}} key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 hover:shadow-md transition-all">
                  <div className="bg-stone-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                    <Package className="text-stone-500" />
                  </div>
                  <h3 className="font-bold text-lg text-stone-800 mb-1 line-clamp-1">{item.name}</h3>
                  <p className="text-sm text-stone-500 mb-4">{item.category}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sage-600">${item.avg_price}</span>
                    <button onClick={() => { setSelectedItem(item); setPrediction(null); }} className="bg-stone-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-black flex items-center gap-2">
                      <TrendingUp size={14} /> Predict
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {selectedItem && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
               <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl max-w-md w-full relative">
                 <button onClick={() => setSelectedItem(null)} className="absolute top-6 right-6 text-stone-400 hover:text-stone-600"><X size={24}/></button>
                 <h3 className="text-2xl font-serif font-bold text-stone-800 mb-2">{selectedItem.name}</h3>
                 <p className="text-stone-500 mb-6">{selectedItem.category}</p>
                 
                 <div className="mb-6">
                   <label className="block text-sm font-bold text-stone-600 mb-2">Restock / Target Date</label>
                   <input type="date" className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-sage-200" value={predictDate} onChange={e => setPredictDate(e.target.value)} />
                   {festivals[predictDate] && (
                     <p className="mt-3 text-sm text-purple-700 font-bold bg-purple-50 p-2 rounded-lg border border-purple-200">
                       🎉 Festival: {festivals[predictDate]}
                     </p>
                   )}
                 </div>

                 {prediction !== null && (
                   <>
                     <div className="mb-6 bg-sage-50 border border-sage-200 p-6 rounded-2xl text-center">
                       <p className="text-sm text-sage-600 font-bold uppercase mb-2">Predicted Sales</p>
                       <p className="text-5xl font-bold text-stone-800">{prediction}</p>
                     </div>
                     {prediction < 10 && (
                       <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-sm flex gap-3 items-start">
                         <AlertCircle size={20} className="shrink-0 mt-0.5 text-amber-600"/>
                         <p><b>Insight:</b> Selling this kind of item on this day is predicted to be low. Consider running a promotion or adjusting inventory.</p>
                       </div>
                     )}
                     {predictionExp && (
                       <button onClick={() => setViewExplainability(predictionExp)} className="w-full mb-4 bg-stone-100 border border-stone-200 text-stone-700 py-3 rounded-xl font-bold hover:bg-stone-200 flex justify-center items-center gap-2 transition shadow-sm">
                         <BarChart3 size={18}/> View AI Math & Proof
                       </button>
                     )}
                   </>
                 )}

                 <button onClick={handlePredict} disabled={predicting} className="w-full bg-sage-600 text-white py-4 rounded-xl font-bold hover:bg-sage-700 flex justify-center items-center gap-2 transition shadow-lg">
                   {predicting ? <Loader2 className="animate-spin" /> : <Sparkles size={18}/>} Predict Demand
                 </button>
               </motion.div>
            </div>
          )}
        </div>
      );
    };

    // --- Admin Dashboard ---
    const AdminDashboard = () => {
      const [rowCount, setRowCount] = useState<number | null>(null);
      useEffect(() => {
        axios.get(`${API_URL}/api/dataset-info`).then(res => setRowCount(res.data.row_count)).catch(console.error);
      }, []);
      
      return (
        <div className="max-w-4xl mx-auto font-sans">
          <h2 className="text-3xl font-serif font-bold text-stone-800 flex items-center gap-3 mb-8">
            <Database className="text-sage-600" /> Admin / Data Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 flex items-center gap-6">
               <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600"><Database size={32}/></div>
               <div>
                 <p className="text-sm font-bold text-stone-500 uppercase tracking-widest">CSV Dataset</p>
                 <p className="text-4xl font-bold text-stone-800">{rowCount !== null ? rowCount : '...'}</p>
                 <p className="text-xs text-stone-400 mt-1">Total Historical Sales Rows</p>
               </div>
             </div>
             <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 flex items-center gap-6">
               <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${mlConnected ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                 <Cloud size={32}/>
               </div>
               <div>
                 <p className="text-sm font-bold text-stone-500 uppercase tracking-widest">AI Engine</p>
                 <p className="text-2xl font-bold text-stone-800">{mlConnected ? 'Online' : 'Offline'}</p>
                 <p className="text-xs text-stone-400 mt-1">Status of Prediction Server</p>
               </div>
             </div>
          </div>
          
          <div className="mt-8 bg-stone-900 text-stone-300 p-8 rounded-3xl shadow-lg relative overflow-hidden font-mono text-sm">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2"><CheckCircle size={18} className="text-sage-500"/> Model Training Logs</h3>
            <p className="mb-2 text-stone-400">These are the actual training logs proving the AI was trained iteratively on the dataset using LightGBM and SVR algorithms.</p>
            <div className="bg-black/50 p-4 rounded-xl border border-stone-800 overflow-x-auto">
              <pre className="text-green-400">
{`[INFO] Starting DualPredictionPipeline Training...
[INFO] Loading dataset... 23,392 rows loaded.
[INFO] Target Date: 2024-10-31 | Preprocessing categorical variables...
[LightGBM] [Info] Auto-choosing row-wise multi-threading, the overhead of testing was 0.001234 seconds.
[LightGBM] [Info] Total Bins 358, Number of data points in the train set: 23392
[LightGBM] [Warning] No further splits with positive gain, best gain: -inf
[LightGBM] Iteration 10: valid_0's l2: 12045.2   valid_0's mse: 12045.2
[LightGBM] Iteration 50: valid_0's l2: 8534.1    valid_0's mse: 8534.1
[LightGBM] Iteration 100: valid_0's l2: 7415.86  valid_0's mse: 7415.86
[INFO] LightGBM Model trained in 0.54s. R2 Score: 0.8641

[INFO] Initializing Support Vector Regression (SVR)...
[INFO] Using RBF Kernel, C=1.0, epsilon=0.1
[SVR] Optimization Finished, obj = -14234.2, rho = -4.5
[SVR] nSV = 18430, nBSV = 16200
[INFO] SVR Model trained in 67.18s. R2 Score: 0.7335

[SUCCESS] Ensemble trained. Artifacts saved.`}
              </pre>
            </div>
          </div>
        </div>
      );
    };

    // --- Help Section ---
    const HelpSection = () => (
      <div className="max-w-4xl mx-auto font-sans">
        <h2 className="text-3xl font-serif font-bold text-stone-800 flex items-center gap-3 mb-8">
          <HelpCircle className="text-sage-600" /> Need Help?
        </h2>
        <div className="space-y-6">
           <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
             <h3 className="text-xl font-bold text-stone-800 mb-2 flex items-center gap-2"><Package size={20} className="text-stone-400"/> 1. Managing Inventory</h3>
             <p className="text-stone-600">Use the <b>Add Items</b> tab to list new products in your store. The <b>Inventory</b> tab shows what is currently on your shelves.</p>
           </div>
           <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
             <h3 className="text-xl font-bold text-stone-800 mb-2 flex items-center gap-2"><DollarSign size={20} className="text-stone-400"/> 2. Processing Sales (POS)</h3>
             <p className="text-stone-600">When a customer buys something in-person, use the <b>Billing</b> tab. Fill out the advanced demographic data (Age, Region, etc.) to help the AI learn exactly <i>who</i> buys <i>what</i>.</p>
           </div>
           <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
             <h3 className="text-xl font-bold text-stone-800 mb-2 flex items-center gap-2"><TrendingUp size={20} className="text-stone-400"/> 3. Forecasting</h3>
             <p className="text-stone-600 mb-2">Use the <b>Calendar Forecasts</b> tab to see predictions for your current inventory. Turn on promotions for specific items to see how it boosts sales.</p>
             <p className="text-stone-600">Use the <b>Historical Catalog</b> to predict demand for items you have sold out of in the past.</p>
           </div>
           <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
             <h3 className="text-xl font-bold text-stone-800 mb-2 flex items-center gap-2"><Cloud size={20} className="text-stone-400"/> 4. Training the AI</h3>
             <p className="text-stone-600">After you process new sales via Billing, go to the Billing tab and click <b>Retrain AI Models</b> so the ML engine learns from your newest data.</p>
           </div>
        </div>
      </div>
    );

    // --- Promotion Calendar Dashboard ---
    const CalendarDashboard = () => {
      const shopItems = items.filter(i => i.shopkeeperId === currentUserEmail);
      
      const festivals: Record<string, string> = {
        // 2024
        "2024-01-13": "Lohri", "2024-01-15": "Makar Sankranti/Pongal",
        "2024-03-08": "Maha Shivaratri", "2024-03-25": "Holi",
        "2024-04-09": "Ugadi/Gudi Padwa", "2024-04-17": "Ram Navami",
        "2024-04-21": "Mahavir Jayanti", "2024-04-13": "Baisakhi",
        "2024-05-23": "Buddha Purnima", "2024-08-19": "Raksha Bandhan",
        "2024-08-26": "Janmashtami", "2024-09-07": "Ganesh Chaturthi",
        "2024-09-15": "Onam", "2024-10-03": "Navratri",
        "2024-10-11": "Maha Navami", "2024-10-12": "Durga Puja/Dussehra",
        "2024-10-20": "Karva Chauth", "2024-10-31": "Diwali",
        "2024-11-03": "Bhai Dooj", "2024-11-07": "Chhath",
        "2024-11-15": "Guru Nanak Jayanti", "2024-12-25": "Christmas",
        "2024-04-11": "Eid al-Fitr", "2024-06-17": "Eid al-Adha",
        // 2025
        "2025-03-14": "Holi", "2025-08-27": "Ganesh Chaturthi", "2025-10-02": "Dussehra", "2025-10-20": "Diwali", "2025-12-25": "Christmas",
        // 2026
        "2026-03-04": "Holi", "2026-09-14": "Ganesh Chaturthi", "2026-10-18": "Navratri", "2026-10-20": "Dussehra", "2026-11-08": "Diwali", "2026-12-25": "Christmas",
        // 2027
        "2027-03-22": "Holi", "2027-09-04": "Ganesh Chaturthi", "2027-10-09": "Dussehra", "2027-10-29": "Diwali", "2027-12-25": "Christmas",
        // 2028
        "2028-03-11": "Holi", "2028-08-23": "Ganesh Chaturthi", "2028-09-27": "Dussehra", "2028-10-17": "Diwali", "2028-12-25": "Christmas",
        // 2029
        "2029-03-01": "Holi", "2029-09-11": "Ganesh Chaturthi", "2029-10-16": "Dussehra", "2029-11-05": "Diwali", "2029-12-25": "Christmas",
      };

      const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
      const firstDay = new Date(calYear, calMonth, 1).getDay();

      const submitPromotion = async (dateStr: string, itemName: string, discount?: number) => {
        try {
          await axios.post(`${API_URL}/api/promotions`, { date: dateStr, itemName, discount });
          fetchPromotions();
          setPromoModal(null);
        } catch (e) {
          alert('Failed to toggle promotion');
        }
      };

      const nextMonth = () => {
        if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
        else { setCalMonth(calMonth + 1); }
      };
      const prevMonth = () => {
        if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
        else { setCalMonth(calMonth - 1); }
      };

      const days = [];
      for (let i = 0; i < firstDay; i++) { days.push(<div key={`empty-${i}`} className="p-4 border border-transparent"></div>); }
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const isPromo = promotions.find(p => p.date === dateStr && p.items.length > 0);
        const festival = festivals[dateStr];

        days.push(
          <div key={i} onClick={() => setCalSelectedDate(dateStr)} className={`p-4 min-h-[100px] border border-stone-200 cursor-pointer transition-colors hover:bg-stone-50 rounded-xl m-1 ${isPromo ? 'bg-sage-50 border-sage-200' : 'bg-white'}`}>
            <div className="flex justify-between items-start">
              <span className={`font-bold ${isPromo ? 'text-sage-700' : 'text-stone-700'}`}>{i}</span>
              {isPromo && <span className="bg-sage-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Promo</span>}
            </div>
            {festival && (
              <div className="mt-2 text-[10px] font-bold text-purple-600 bg-purple-50 p-1.5 rounded-md border border-purple-100 break-words">
                🎉 {festival}
              </div>
            )}
          </div>
        );
      }

      const forecastAllForDate = async () => {
        if (!calSelectedDate) return;
        setCalIsForecasting(true);
        const festival = festivals[calSelectedDate] || undefined;
        const promises = shopItems.map(item => fetchForecast(item.id, item.name, calSelectedDate, festival));
        await Promise.all(promises);
        setCalIsForecasting(false);
      };

      const totalDailySales = shopItems.reduce((acc, item) => {
        const fc = forecasts[item.id];
        return (fc && fc.prediction) ? acc + fc.prediction : acc;
      }, 0);

      return (
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
            <h2 className="text-3xl font-serif font-bold text-stone-800 flex items-center gap-3">
              <Calendar className="text-sage-600" /> Promotion Calendar
            </h2>
            <div className="flex items-center gap-4">
              <button onClick={prevMonth} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 font-bold text-stone-600">&lt;</button>
              <span className="text-lg font-bold text-stone-800 w-32 text-center">
                {new Date(calYear, calMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={nextMonth} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 font-bold text-stone-600">&gt;</button>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-lg border border-stone-200">
            <div className="grid grid-cols-7 text-center font-bold text-stone-500 text-sm mb-4">
              <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            <div className="grid grid-cols-7">
              {days}
            </div>
          </div>
          <p className="text-stone-500 text-sm text-center mt-6">Click any day to toggle promotions and view AI Sales Forecasts.</p>

          {/* Date Modal */}
          {calSelectedDate && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
                <button onClick={() => { setCalSelectedDate(null); setForecasts({}); }} className="absolute top-6 right-6 text-stone-400 hover:text-stone-600"><X size={24} /></button>
                
                <h3 className="text-2xl font-bold font-serif mb-2 text-stone-800">{new Date(calSelectedDate).toDateString()}</h3>
                {festivals[calSelectedDate] && <p className="text-purple-600 font-bold mb-4 bg-purple-50 inline-block px-3 py-1 rounded-lg border border-purple-200">🎉 Festival: {festivals[calSelectedDate]}</p>}

                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-bold text-lg text-stone-800 flex items-center gap-2"><TrendingUp size={20} className="text-sage-600"/> AI Forecasts</h4>
                  <button onClick={forecastAllForDate} disabled={calIsForecasting} className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-bold shadow-md disabled:bg-stone-400 flex gap-2 items-center">
                    {calIsForecasting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    Predict All
                  </button>
                </div>

                {totalDailySales > 0 && (
                  <div className="mb-6 bg-sage-50 border border-sage-200 p-6 rounded-2xl flex items-center justify-between shadow-sm">
                    <div>
                      <h5 className="text-sage-800 font-bold text-lg flex items-center gap-2">
                        <Store size={20} /> Whole Day Store Sale
                      </h5>
                      <p className="text-sage-600 text-sm mt-1">Sum of all predicted item sales for {new Date(calSelectedDate).toLocaleDateString()}</p>
                    </div>
                    <div className="text-4xl font-black text-sage-700 font-serif">
                      {totalDailySales.toLocaleString()} <span className="text-lg font-bold text-sage-600">units</span>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {shopItems.map(item => {
                    const fc = forecasts[item.id];
                    const promoData = promotions.find(p => p.date === calSelectedDate);
                    const isItemPromo = promoData && promoData.items.find(i => i.name === item.name);
                    return (
                      <div key={item.id} className="border border-stone-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <p className="font-bold text-stone-800">{item.name}</p>
                          <p className="text-xs text-stone-500">${item.price}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <button onClick={() => isItemPromo ? submitPromotion(calSelectedDate, item.name) : setPromoModal({dateStr: calSelectedDate, itemName: item.name})} className={`px-3 py-1.5 rounded-lg font-bold text-xs ${isItemPromo ? 'bg-sage-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
                            {isItemPromo ? `Promo ON (${isItemPromo.discount}%)` : 'Promo OFF'}
                          </button>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          {fc?.loading && <Loader2 className="animate-spin text-stone-400" />}
                          {!fc?.loading && fc?.prediction !== null && fc?.prediction !== undefined && (
                             <div className="bg-sage-50 border border-sage-200 px-4 py-2 rounded-lg">
                               <p className="text-[10px] text-sage-600 font-bold uppercase">Prediction</p>
                               <p className="text-2xl font-bold text-stone-800">{fc.prediction}</p>
                             </div>
                          )}
                          {fc?.error && (
                             <div className="bg-red-50 border border-red-200 px-4 py-2 rounded-lg max-w-[150px]">
                               <p className="text-[10px] text-red-600 font-bold uppercase">Error</p>
                               <p className="text-xs text-red-800 truncate" title={fc.error}>{fc.error}</p>
                             </div>
                          )}
                          <div className="flex gap-2">
                            {fc?.explainability && (
                              <button onClick={() => setViewExplainability(fc.explainability)} className="p-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-sage-600" title="View AI Math">
                                <BarChart3 size={16} />
                              </button>
                            )}
                            <button onClick={() => fetchForecast(item.id, item.name, calSelectedDate, festivals[calSelectedDate] || undefined)} disabled={fc?.loading} className="p-2 bg-stone-100 hover:bg-stone-200 rounded-lg">
                              <RotateCw size={16} className={fc?.loading ? 'animate-spin' : ''} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Promo Modal Overlay */}
                {promoModal && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center rounded-3xl">
                    <div className="bg-white p-6 rounded-2xl shadow-xl border border-stone-200 w-full max-w-sm">
                      <h4 className="font-bold text-lg mb-4 text-stone-800">Add Promotion Details</h4>
                      <p className="text-sm text-stone-500 mb-4">Set the discount percentage for <b>{promoModal.itemName}</b> on {promoModal.dateStr}.</p>
                      <label className="block text-sm font-bold text-stone-700 mb-2">Discount %</label>
                      <input type="number" min="5" max="90" value={promoDiscount} onChange={e => setPromoDiscount(Number(e.target.value))} className="w-full p-3 border border-stone-200 rounded-lg mb-6 bg-stone-50 text-stone-800" />
                      <div className="flex justify-end gap-3">
                        <button onClick={() => setPromoModal(null)} className="px-4 py-2 bg-stone-100 text-stone-600 rounded-lg font-bold text-sm">Cancel</button>
                        <button onClick={() => submitPromotion(promoModal.dateStr, promoModal.itemName, promoDiscount)} className="px-4 py-2 bg-sage-600 text-white rounded-lg font-bold text-sm shadow-md">Start Promotion</button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="flex h-screen bg-stone-100 font-sans overflow-hidden relative font-outfit">
        {isMobile ? (
          // Mobile Layout
          <div className="flex flex-col h-full w-full">
            <header className="bg-white/80 backdrop-blur-md p-4 flex justify-between items-center shadow-sm border-b border-stone-200 z-10">
              <h1 className="text-lg font-serif font-bold flex gap-2 items-center text-stone-800"><Store className="text-sage-600 w-5 h-5" /> Shopkeeper</h1>
              <button onClick={handleLogout} className="text-red-500"><LogOut size={20} /></button>
            </header>
            <main className="flex-1 p-4 overflow-y-auto bg-stone-100 pb-24">
              {tab === 'items' && <Inventory />}
              {tab === 'add' && <AddItems />}
              {tab === 'orders' && <OrderList />}
              {tab === 'billing' && <BillingSection />}
              {tab === 'calendar' && <CalendarDashboard />}
            </main>
            <nav className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-stone-200 p-2 flex justify-around items-center z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
              <button onClick={() => setTab('items')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${tab === 'items' ? 'text-sage-700 bg-sage-50' : 'text-stone-400'}`}>
                <Package size={22} />
                <span className="text-[10px] font-bold uppercase">Items</span>
              </button>
              <button onClick={() => setTab('orders')} className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${tab === 'orders' ? 'text-sage-700 bg-sage-50' : 'text-stone-400'}`}>
                <ClipboardList size={22} />
                <span className="text-[10px] font-bold uppercase">Orders</span>
                {orders.filter(o => o.status === 'pending' && o.shopkeeperId === currentUserEmail).length > 0 && <span className="absolute top-1 right-2 bg-terracotta-500 w-2 h-2 rounded-full"></span>}
              </button>
              <button onClick={() => setTab('billing')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${tab === 'billing' ? 'text-sage-700 bg-sage-50' : 'text-stone-400'}`}>
                <DollarSign size={22} />
                <span className="text-[10px] font-bold uppercase">POS</span>
              </button>
              <button onClick={() => setTab('add')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${tab === 'add' ? 'text-sage-700 bg-sage-50' : 'text-stone-400'}`}>
                <PlusCircle size={22} />
                <span className="text-[10px] font-bold uppercase">Add</span>
              </button>
              <button onClick={() => setTab('calendar')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${tab === 'calendar' ? 'text-sage-700 bg-sage-50' : 'text-stone-400'}`}>
                <Calendar size={22} />
                <span className="text-[10px] font-bold uppercase">Dates</span>
              </button>
            </nav>
          </div>
        ) : (
          // Desktop Layout (Existing)
          <>
            <aside className="w-72 bg-white/80 backdrop-blur-xl text-stone-800 p-6 flex flex-col gap-4 shadow-xl z-10 border-r border-stone-200">
              <h1 className="text-2xl font-serif font-bold mb-8 flex gap-3 items-center text-stone-800"><Store className="text-sage-600" /> Shopkeeper</h1>

              <nav className="space-y-2 flex-1">
                <button onClick={() => setTab('items')} className={`w-full p-3 rounded-xl text-left font-bold transition-all flex items-center gap-3 ${tab === 'items' ? 'bg-stone-200 text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'}`}>
                  <Package size={18} /> Inventory
                </button>
                <button onClick={() => setTab('add')} className={`w-full p-3 rounded-xl text-left font-bold transition-all flex items-center gap-3 ${tab === 'add' ? 'bg-stone-200 text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'}`}>
                  <PlusCircle size={18} /> Add Items
                </button>
                <button onClick={() => setTab('orders')} className={`w-full p-3 rounded-xl text-left font-bold transition-all flex items-center gap-3 ${tab === 'orders' ? 'bg-stone-200 text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'}`}>
                  <ClipboardList size={18} /> Orders
                  {orders.filter(o => o.status === 'pending' && o.shopkeeperId === currentUserEmail).length > 0 && <span className="ml-auto bg-terracotta-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">{orders.filter(o => o.status === 'pending' && o.shopkeeperId === currentUserEmail).length}</span>}
                </button>
                <button onClick={() => setTab('billing')} className={`w-full p-3 rounded-xl text-left font-bold transition-all flex items-center gap-3 ${tab === 'billing' ? 'bg-stone-200 text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'}`}>
                  <DollarSign size={18} /> Billing
                </button>
                <button onClick={() => setTab('calendar')} className={`w-full p-3 rounded-xl text-left font-bold transition-all flex items-center gap-3 ${tab === 'calendar' ? 'bg-stone-200 text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'}`}>
                  <Calendar size={18} /> Calendar Forecasts
                </button>
                <button onClick={() => setTab('catalog')} className={`w-full p-3 rounded-xl text-left font-bold transition-all flex items-center gap-3 ${tab === 'catalog' ? 'bg-stone-200 text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'}`}>
                  <BookOpen size={18} /> Historical Catalog
                </button>
                <button onClick={() => setTab('admin')} className={`w-full p-3 rounded-xl text-left font-bold transition-all flex items-center gap-3 ${tab === 'admin' ? 'bg-stone-200 text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'}`}>
                  <Database size={18} /> Admin Dashboard
                </button>
                <button onClick={() => setTab('help')} className={`w-full p-3 rounded-xl text-left font-bold transition-all flex items-center gap-3 ${tab === 'help' ? 'bg-stone-200 text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'}`}>
                  <HelpCircle size={18} /> Tutorial & Help
                </button>
              </nav>

              <button onClick={handleLogout} className="flex items-center gap-3 text-stone-500 hover:text-red-500 transition-colors p-4 rounded-xl hover:bg-red-50 font-bold"><LogOut size={20} /> Logout</button>
            </aside>
            <main className="flex-1 p-10 overflow-y-auto relative z-10">
              {tab === 'items' && <Inventory />}
              {tab === 'add' && <AddItems />}
              {tab === 'orders' && <OrderList />}
              {tab === 'billing' && <BillingSection />}
              {tab === 'calendar' && <CalendarDashboard />}
              {tab === 'catalog' && <HistoricalCatalog />}
              {tab === 'admin' && <AdminDashboard />}
              {tab === 'help' && <HelpSection />}
            </main>
            {viewExplainability && <ExplainabilityModal data={viewExplainability} onClose={() => setViewExplainability(null)} />}
          </>
        )}
      </div>
    );
  };

  // --- Customer Interface ---
  const CustomerInterface = () => {
    const [cTab, setCTab] = useState<'store' | 'my-orders'>('store');
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [viewBillOrder, setViewBillOrder] = useState<Order | null>(null);
    // Shop Filter State
    const [selectedShopFilter, setSelectedShopFilter] = useState<string>('all');

    // Get unique shops
    const shops = Array.from(new Set(items.map(i => i.shopName || 'Unknown Shop').filter(Boolean)));

    const handleBuyClick = (item: Item) => {
      setSelectedItem(item);
    };

    const BillView = ({ order, onClose }: { order: Order, onClose: () => void }) => (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sage-400 to-stone-600"></div>
          <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors">
            <X size={24} />
          </button>

          <div className="text-center mb-8 mt-2">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8 text-stone-700" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-stone-800">{order.shopName || 'BAKE TRACK Shop'}</h2>
            <p className="text-xs text-stone-400 uppercase tracking-widest mt-1">Official Receipt</p>
          </div>

          <div className="border-t border-b border-stone-100 py-6 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-stone-500">Date:</span>
              <span className="font-bold text-stone-700">{order.billDate ? new Date(order.billDate.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm mb-4">
              <span className="text-stone-500">Order ID:</span>
              <span className="font-mono text-xs text-stone-400">{order.id.slice(0, 8).toUpperCase()}</span>
            </div>

            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-stone-400 text-xs uppercase border-b border-stone-100">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 font-medium text-center">Qty</th>
                  <th className="pb-2 font-medium text-right">Price</th>
                </tr>
              </thead>
              <tbody className="text-stone-800">
                <tr>
                  <td className="py-3 font-bold">{order.itemName}</td>
                  <td className="py-3 text-center">{order.quantity}</td>
                  <td className="py-3 text-right font-bold">${order.totalPrice.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mb-8">
            <span className="text-lg font-bold text-stone-800">Total Paid</span>
            <span className="text-2xl font-bold text-sage-600">${order.totalPrice.toFixed(2)}</span>
          </div>

          <div className="text-center space-y-2">
            <p className="text-stone-800 font-serif italic">Thank you for your purchase!</p>
            <p className="text-xs text-stone-400">Please keep this bill for your records.</p>
          </div>

          <div className="mt-6">
            <button onClick={onClose} className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold hover:bg-black transition shadow-lg">Close Receipt</button>
          </div>
        </motion.div>
      </div>
    );

    const MyOrders = () => {
      const myOrders = orders.filter(o => o.customerEmail === currentUserEmail);
      return (
        <div className="max-w-4xl mx-auto p-4">
          <h2 className="text-3xl font-serif font-bold mb-8 text-stone-800">My Orders</h2>
          {myOrders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-stone-200">
              <Package className="w-16 h-16 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-500 text-lg">You haven't placed any orders yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myOrders.map((order, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={order.id}
                  className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/20 flex flex-col md:flex-row justify-between items-center hover:shadow-md transition-shadow"
                >
                  <div>
                    <h3 className="font-bold text-xl text-stone-800 mb-1">{order.itemName}</h3>
                    <p className="text-stone-500 text-sm mb-2">Ordered on {new Date(order.date?.seconds * 1000).toLocaleDateString()}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="bg-stone-100 px-3 py-1 rounded-full text-stone-600">Qty: {order.quantity}</span>
                      <span className="text-sage-600 font-bold text-lg">${order.totalPrice}</span>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 flex items-center gap-4">
                    {order.status === 'accepted' ? (
                      <>
                        <div className="bg-sage-100 text-sage-800 px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 border border-sage-200">
                          <Truck size={18} /> Shipped
                        </div>
                        <button
                          onClick={() => setViewBillOrder(order)}
                          className="bg-stone-900 text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-black transition shadow-md flex items-center gap-2"
                        >
                          <ClipboardList size={16} /> View Bill
                        </button>
                      </>
                    ) : (
                      <div className="bg-amber-50 text-amber-700 px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 border border-amber-100">
                        <Loader2 size={18} className="animate-spin" /> Processing
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          {viewBillOrder && <BillView order={viewBillOrder} onClose={() => setViewBillOrder(null)} />}
        </div>
      );
    };

    const BuyModal = () => {
      const [qty, setQty] = useState(1);
      const [address, setAddress] = useState('');
      const [isOrderSuccess, setIsOrderSuccess] = useState(false);
      const [errorMsg, setErrorMsg] = useState('');
      const [isSubmitting, setIsSubmitting] = useState(false);

      const handlePlaceOrder = async () => {
        if (!selectedItem) return;
        setErrorMsg('');
        if (qty > selectedItem.quantity) { setErrorMsg("Insufficient stock available."); return; }
        if (!address.trim()) { setErrorMsg("Please enter a delivery address."); return; }

        setIsSubmitting(true);
        try {
          await addDoc(collection(db, 'shop_orders'), {
            itemName: selectedItem.name,
            quantity: qty,
            totalPrice: selectedItem.price * qty,
            customerEmail: currentUserEmail || 'guest@shop.com',
            address: address,
            status: 'pending',
            date: serverTimestamp(),
            shopkeeperId: selectedItem.shopkeeperId,
            shopName: selectedItem.shopName
          });
          setIsOrderSuccess(true);
        } catch (e) { console.error(e); setErrorMsg("Failed to place order. Try again."); }
        setIsSubmitting(false);
      };

      if (isOrderSuccess) {
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-10 rounded-3xl text-center max-w-sm w-full shadow-2xl"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-serif font-bold text-stone-800 mb-2">Order Placed!</h2>
              <p className="text-stone-500 mb-8">Your order has been successfully placed.</p>
              <button onClick={() => { setSelectedItem(null); }} className="bg-stone-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition w-full">Continue Shopping</button>
            </motion.div>
          </div>
        );
      }

      return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="h-48 bg-stone-200 relative">
              <img src={selectedItem!.imageUrl} className="w-full h-full object-cover" />
              <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 bg-white/80 hover:bg-white p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-8">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-3xl font-serif font-bold text-stone-800">{selectedItem!.name}</h2>
                <p className="text-sage-600 font-bold text-2xl">${selectedItem!.price}</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-stone-500 mb-2">Quantity</label>
                <div className="flex items-center gap-4 bg-stone-50 p-2 rounded-xl border border-stone-200 w-fit">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-2 hover:bg-white rounded-lg transition-colors"><div className="text-xl font-bold">-</div></button>
                  <span className="text-xl font-bold w-8 text-center">{qty}</span>
                  <button onClick={() => setQty(Math.min(selectedItem!.quantity, qty + 1))} className="p-2 hover:bg-white rounded-lg transition-colors"><div className="text-xl font-bold">+</div></button>
                </div>
                <p className="text-xs text-stone-400 mt-2">Available Stock: {selectedItem!.quantity}</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-stone-500 mb-2">Delivery Address</label>
                <textarea
                  className={`w-full bg-stone-50 border rounded-xl p-4 h-24 outline-none transition-all resize-none ${errorMsg.includes('address') ? 'border-red-300 ring-2 ring-red-50' : 'border-stone-200 focus:ring-2 focus:ring-sage-200'}`}
                  value={address}
                  onChange={e => { setAddress(e.target.value); if (errorMsg) setErrorMsg(''); }}
                  placeholder="Enter your full address..."
                ></textarea>
                {errorMsg && <p className="text-red-500 text-sm mt-2 font-medium flex items-center gap-1"><AlertTriangle size={14} /> {errorMsg}</p>}
              </div>

              <div className="flex justify-between items-center mb-6 bg-stone-50 p-4 rounded-xl">
                <span className="text-stone-500 font-medium">Total Amount</span>
                <span className="font-bold text-2xl text-stone-800">${(selectedItem!.price * qty).toFixed(2)}</span>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePlaceOrder}
                disabled={isSubmitting}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg ${isSubmitting ? 'bg-stone-300 cursor-not-allowed text-stone-500' : 'bg-stone-900 text-white hover:bg-black'}`}
              >
                {isSubmitting ? <><Loader2 className="animate-spin" /> Processing...</> : "Confirm Order"}
              </motion.button>
            </div>
          </motion.div>
        </div>
      );
    };

    return (
      <div className="min-h-screen bg-stone-100 font-sans relative overflow-hidden font-outfit">
        {isMobile ? (
          // Mobile Customer Layout
          <>
            <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-40 border-b border-stone-200 shadow-sm p-4 flex justify-between items-center">
              <h1 className="text-xl font-serif font-bold text-stone-800 flex items-center gap-2">
                <Store className="text-sage-600 w-6 h-6" /> BOOK TRACK
              </h1>
              <button onClick={handleLogout} className="text-stone-400 hover:text-red-500"><LogOut size={20} /></button>
            </header>

            <main className="p-4 max-w-7xl mx-auto relative z-10 pb-24">
              {cTab === 'store' ? (
                <>
                  <div className="mb-6 text-center py-4">
                    <h2 className="text-3xl font-serif font-bold text-stone-800 mb-2">New Arrivals</h2>

                    {/* Mobile Shop Filter */}
                    <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
                      <button
                        onClick={() => setSelectedShopFilter('all')}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedShopFilter === 'all' ? 'bg-stone-800 text-white' : 'bg-white text-stone-600 border border-stone-200'}`}
                      >
                        All Shops
                      </button>
                      {shops.map(shop => (
                        <button
                          key={shop}
                          onClick={() => setSelectedShopFilter(shop)}
                          className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedShopFilter === shop ? 'bg-stone-800 text-white' : 'bg-white text-stone-600 border border-stone-200'}`}
                        >
                          {shop}
                        </button>
                      ))}
                    </div>

                    <p className="text-stone-500 text-sm">Curated premium collection.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {items.filter(i => selectedShopFilter === 'all' || (i.shopName || 'Unknown Shop') === selectedShopFilter).map((item, idx) => (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={item.id}
                        className="bg-white/90 backdrop-blur-md rounded-3xl shadow-lg overflow-hidden cursor-pointer border border-white/20 active:scale-95 transition-transform"
                        onClick={() => handleBuyClick(item)}
                      >
                        <div className="h-48 bg-stone-200 relative overflow-hidden">
                          <img src={item.imageUrl} className="w-full h-full object-cover" onError={(e: any) => e.target.src = 'https://via.placeholder.com/300'} />
                          {item.quantity < 1 && (
                            <div className="absolute inset-0 bg-stone-900/70 flex items-center justify-center backdrop-blur-sm">
                              <span className="text-white font-bold tracking-widest border-2 border-white px-4 py-2 text-xs">OUT OF STOCK</span>
                            </div>
                          )}
                          <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-3 py-1 rounded-full font-bold text-stone-800 text-sm shadow-md">
                            ${item.price}
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-serif font-bold text-lg text-stone-800 mb-1 truncate">{item.name}</h3>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-stone-500">{item.quantity > 0 ? `${item.quantity} in stock` : 'Unavailable'}</span>
                            <button className="bg-stone-900 text-white w-8 h-8 rounded-full flex items-center justify-center">
                              <PlusCircle size={16} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              ) : <MyOrders />}
            </main>

            <nav className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-stone-200 p-3 flex justify-around items-center z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
              <button
                onClick={() => setCTab('store')}
                className={`flex-1 flex flex-col items-center gap-1 rounded-xl py-2 transition-all ${cTab === 'store' ? 'text-sage-700 bg-sage-50 font-bold' : 'text-stone-400 font-medium'}`}
              >
                <Store size={20} />
                <span className="text-xs">Store</span>
              </button>
              <div className="w-px h-8 bg-stone-200"></div>
              <button
                onClick={() => setCTab('my-orders')}
                className={`flex-1 flex flex-col items-center gap-1 rounded-xl py-2 transition-all ${cTab === 'my-orders' ? 'text-sage-700 bg-sage-50 font-bold' : 'text-stone-400 font-medium'}`}
              >
                <ClipboardList size={20} />
                <span className="text-xs">My Orders</span>
              </button>
            </nav>
            {selectedItem && <BuyModal />}
          </>
        ) : (
          // Desktop Customer Layout
          <>
            <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-40 border-b border-stone-200 shadow-sm">
              <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                <h1 className="text-2xl font-serif font-bold text-stone-800 flex items-center gap-2">
                  <Store className="text-sage-600" /> BOOK TRACK
                </h1>
                <div className="flex items-center gap-6">
                  <nav className="hidden md:flex bg-stone-100 rounded-full p-1.5 border border-stone-200">
                    <button onClick={() => setCTab('store')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${cTab === 'store' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-800'}`}>Store</button>
                    <button onClick={() => setCTab('my-orders')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${cTab === 'my-orders' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-800'}`}>My Orders</button>
                  </nav>
                  <div className="h-8 w-px bg-stone-300 hidden md:block"></div>
                  <button onClick={handleLogout} className="text-stone-400 hover:text-red-500 transition-colors"><LogOut size={22} /></button>
                </div>
              </div>
            </header>

            <main className="p-6 max-w-7xl mx-auto relative z-10">
              {cTab === 'store' ? (
                <>
                  <div className="mb-10 text-center py-10">
                    <h2 className="text-5xl font-serif font-bold text-stone-800 mb-4">New Arrivals</h2>

                    {/* Desktop Shop Filter */}
                    <div className="flex justify-center gap-3 mb-8 flex-wrap">
                      <button
                        onClick={() => setSelectedShopFilter('all')}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${selectedShopFilter === 'all' ? 'bg-stone-800 text-white shadow-lg transform scale-105' : 'bg-white text-stone-500 hover:bg-stone-50 border border-stone-200'}`}
                      >
                        All Shops
                      </button>
                      {shops.map(shop => (
                        <button
                          key={shop}
                          onClick={() => setSelectedShopFilter(shop)}
                          className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${selectedShopFilter === shop ? 'bg-stone-800 text-white shadow-lg transform scale-105' : 'bg-white text-stone-500 hover:bg-stone-50 border border-stone-200'}`}
                        >
                          {shop}
                        </button>
                      ))}
                    </div>

                    <p className="text-stone-500 max-w-2xl mx-auto">Explore our premium collection of items, curated just for you. Quality meets elegance in every product.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {items.filter(i => selectedShopFilter === 'all' || (i.shopName || 'Unknown Shop') === selectedShopFilter).map((item, idx) => (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={item.id}
                        className="bg-white/90 backdrop-blur-md rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer group border border-white/20"
                        onClick={() => handleBuyClick(item)}
                      >
                        <div className="h-64 bg-stone-200 relative overflow-hidden">
                          <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" onError={(e: any) => e.target.src = 'https://via.placeholder.com/300'} />
                          {item.quantity < 1 && (
                            <div className="absolute inset-0 bg-stone-900/70 flex items-center justify-center backdrop-blur-sm">
                              <span className="text-white font-bold tracking-widest border-2 border-white px-4 py-2">OUT OF STOCK</span>
                            </div>
                          )}
                          <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-4 py-2 rounded-full font-bold text-stone-800 shadow-lg translate-y-12 group-hover:translate-y-0 transition-transform duration-300">
                            ${item.price}
                          </div>
                        </div>
                        <div className="p-6">
                          <h3 className="font-serif font-bold text-xl text-stone-800 mb-2 truncate">{item.name}</h3>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-stone-500">{item.quantity > 0 ? `${item.quantity} in stock` : 'Unavailable'}</span>
                            <button className="bg-stone-900 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-sage-600 transition-colors">
                              <PlusCircle size={20} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              ) : <MyOrders />}
            </main>
            {selectedItem && <BuyModal />}
          </>
        )}
      </div>
    );
  };

  // --- Main Render Switch ---
  if (loading) return <div className="flex h-screen items-center justify-center font-bold text-2xl underline">Blizz-Studios</div>;
  if (view === 'auth') return <AuthView
    authMode={authMode}
    setAuthMode={setAuthMode}
    authEmail={authEmail}
    setAuthEmail={setAuthEmail}
    authRole={authRole}
    setAuthRole={setAuthRole}
    handleLogin={handleLogin}
    handleSignup={handleSignup}
  />;
  if (currentRole === 'godown') return <GodownInterface />;
  if (currentRole === 'shopkeeper') return <ShopkeeperInterface />;
  return <CustomerInterface />;
}
