import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Bell, Shield, Palette, Globe, Save, Loader2, Database, RefreshCw, Download, Smartphone, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useUserProfile, useCategories, useAccounts } from "../lib/hooks/useFinanceData";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../components/AuthProvider";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from "../lib/constants";
import { useRegisterSW } from 'virtual:pwa-register/react';
import { cn } from "../lib/utils";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "preferences", label: "Preferences", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "data", label: "Data Management", icon: Database },
  { id: "pwa", label: "App Settings", icon: Smartphone },
  { id: "security", label: "Security", icon: Shield },
];

export default function Settings() {
  const { user } = useAuth();
  const { profile, loading } = useUserProfile();
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const [activeTab, setActiveTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const {
    offlineReady,
    needUpdate,
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const [isOfflineReady, setOfflineReady] = offlineReady;
  const [isNeedUpdate, setNeedUpdate] = needUpdate;

  useEffect(() => {
    const handleOfflineReady = () => setOfflineReady(true);
    window.addEventListener('pwa-offline-ready', handleOfflineReady);
    return () => window.removeEventListener('pwa-offline-ready', handleOfflineReady);
  }, [setOfflineReady]);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    gender: "Male",
    monthlyIncomeGoal: 0,
    netWorthTarget: 0,
    currency: "ETB",
    theme: "dark",
    emailNotifications: true,
    budgetAlerts: true,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        username: profile.username || "",
        gender: profile.gender || "Male",
        monthlyIncomeGoal: profile.monthlyIncomeGoal || 0,
        netWorthTarget: profile.netWorthTarget || 0,
        currency: profile.currency || "ETB",
        theme: profile.theme || "dark",
        emailNotifications: profile.emailNotifications !== false,
        budgetAlerts: profile.budgetAlerts !== false,
      });
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'monthlyIncomeGoal' || name === 'netWorthTarget' ? Number(value) : value
    }));
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("You must be signed in to save settings");
      return;
    }
    
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email || profile?.email || '',
        role: profile?.role || 'user',
        name: formData.name || profile?.name || user.displayName || 'User',
        username: formData.username,
        gender: formData.gender,
        monthlyIncomeGoal: formData.monthlyIncomeGoal,
        netWorthTarget: formData.netWorthTarget,
        currency: formData.currency,
        theme: formData.theme,
        emailNotifications: formData.emailNotifications,
        budgetAlerts: formData.budgetAlerts,
        profileCompleted: profile?.profileCompleted !== false,
      }, { merge: true });
      toast.success("Settings saved successfully");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInitializeData = async () => {
    if (!user) return;
    if (!window.confirm("This will add default categories and accounts. Existing data will not be deleted. Continue?")) return;

    setIsInitializing(true);
    try {
      const categoriesRef = collection(db, 'categories');
      const accountsRef = collection(db, 'accounts');

      const promises = [];
      
      DEFAULT_CATEGORIES.forEach(cat => {
        const exists = categories.some(c => c.name === cat.name);
        if (!exists) {
          promises.push(addDoc(categoriesRef, { ...cat, userId: user.uid }));
        }
      });

      DEFAULT_ACCOUNTS.forEach(acc => {
        const exists = accounts.some(a => a.name === acc.name);
        if (!exists) {
          promises.push(addDoc(accountsRef, { ...acc, userId: user.uid }));
        }
      });

      await Promise.all(promises);
      toast.success("Default data initialized successfully");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'data');
      toast.error("Failed to initialize data");
    } finally {
      setIsInitializing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-12 flex flex-col sm:flex-row justify-between items-end gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-brand rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
            <h2 className="text-4xl font-display font-bold text-white tracking-tight">Settings</h2>
          </div>
          <p className="text-[10px] text-white/55 uppercase tracking-[0.4em] font-bold ml-4">Manage your account and app settings</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="group relative flex items-center justify-center gap-3 px-10 py-4 rounded-[24px] bg-white text-black text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-brand hover:text-white transition-all duration-500 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand/20 to-emerald-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10 flex items-center gap-3">
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4 group-hover:scale-110 transition-transform duration-500" />
            )}
            Save Changes
          </div>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-16">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="sticky top-8 space-y-1.5 p-2 rounded-[32px] bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl shadow-2xl">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-6 py-4 rounded-[22px] text-[10px] font-bold uppercase tracking-[0.25em] transition-all duration-500 group relative overflow-hidden",
                    isActive 
                      ? "text-brand" 
                      : "text-white/55 hover:text-white/84"
                  )}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white/[0.03] border border-white/[0.05] shadow-inner"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div className="relative z-10 flex items-center gap-5">
                    <tab.icon className={cn("w-5 h-5 transition-all duration-500", isActive ? "text-brand scale-110" : "text-white/45 group-hover:text-white/65")} />
                    {tab.label}
                  </div>
                  {isActive && <ChevronRight className="relative z-10 w-4 h-4 opacity-50" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="p-12 rounded-[48px] bg-gradient-to-br from-[#0f0f0f] to-[#050505] border border-white/[0.03] shadow-[0_40px_100px_rgba(0,0,0,0.4)] relative overflow-hidden"
          >
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand/5 rounded-full blur-[120px] opacity-40 pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] opacity-40 pointer-events-none" />
            
            <div className="relative z-10">
              {activeTab === "profile" && (
                <div className="space-y-12">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-10 pb-12 border-b border-white/[0.03]">
                    <div className="relative group">
                      <div className="w-36 h-36 rounded-[44px] bg-gradient-to-tr from-brand/20 to-emerald-400/20 p-1 relative shadow-2xl transition-transform duration-700 group-hover:scale-105 group-hover:rotate-3">
                        <div className="w-full h-full rounded-[40px] bg-[#0a0a0a] flex items-center justify-center overflow-hidden border border-white/[0.05]">
                          {user?.photoURL ? (
                            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="text-4xl font-display font-bold text-brand">
                              {formData.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-brand text-black flex items-center justify-center shadow-2xl border-4 border-[#0a0a0a] group-hover:scale-110 transition-transform duration-500 cursor-pointer">
                        <RefreshCw className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-center md:text-left pt-4">
                      <h3 className="text-3xl font-display font-bold text-white tracking-tight mb-2">Personal Identity</h3>
                      <p className="text-sm text-white/65 leading-relaxed max-w-md">Your identity is securely managed through your Google Account. Update your display name and preferences below.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                    <div className="space-y-4 group">
                      <label className="text-[10px] font-bold text-white/45 group-focus-within:text-brand uppercase tracking-[0.3em] ml-1 transition-colors">Full Name</label>
                      <input 
                        type="text" 
                        name="name"
                        value={formData.name} 
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        className="w-full px-8 py-5 bg-white/[0.01] border border-white/[0.05] rounded-[24px] text-white font-medium focus:outline-none focus:border-brand/40 focus:bg-white/[0.03] transition-all duration-500 shadow-inner placeholder:text-white/45" 
                      />
                    </div>
                    <div className="space-y-4 group">
                      <label className="text-[10px] font-bold text-white/45 uppercase tracking-[0.3em] ml-1">Email Address</label>
                      <div className="relative">
                        <input 
                          type="email" 
                          value={profile?.email || user?.email || ""} 
                          className="w-full px-8 py-5 bg-white/[0.01] border border-white/[0.03] rounded-[24px] text-white/55 cursor-not-allowed focus:outline-none placeholder:text-white/45" 
                          disabled 
                        />
                        <Shield className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
                      </div>
                    </div>
                    <div className="space-y-4 group">
                      <label className="text-[10px] font-bold text-white/45 group-focus-within:text-brand uppercase tracking-[0.3em] ml-1 transition-colors">Username</label>
                      <input 
                        type="text" 
                        name="username"
                        value={formData.username} 
                        onChange={handleChange}
                        placeholder="@username"
                        className="w-full px-8 py-5 bg-white/[0.01] border border-white/[0.05] rounded-[24px] text-white font-medium focus:outline-none focus:border-brand/40 focus:bg-white/[0.03] transition-all duration-500 shadow-inner placeholder:text-white/45" 
                      />
                    </div>
                    <div className="space-y-4 group">
                      <label className="text-[10px] font-bold text-white/45 group-focus-within:text-brand uppercase tracking-[0.3em] ml-1 transition-colors">Gender Identity</label>
                      <div className="relative">
                        <select 
                          name="gender"
                          value={formData.gender} 
                          onChange={handleChange}
                          className="w-full px-8 py-5 bg-white/[0.01] border border-white/[0.05] rounded-[24px] text-white font-medium focus:outline-none focus:border-brand/40 focus:bg-white/[0.03] transition-all duration-500 shadow-inner appearance-none" 
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                        <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/55 rotate-90 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-4 group">
                      <label className="text-[10px] font-bold text-white/45 group-focus-within:text-brand uppercase tracking-[0.3em] ml-1 transition-colors">Monthly Income Goal</label>
                      <div className="relative">
                        <span className="absolute left-8 top-1/2 -translate-y-1/2 text-white/45 font-bold text-xs">ETB</span>
                        <input 
                          type="number" 
                          name="monthlyIncomeGoal"
                          value={formData.monthlyIncomeGoal} 
                          onChange={handleChange}
                          className="w-full pl-20 pr-8 py-5 bg-white/[0.01] border border-white/[0.05] rounded-[24px] text-white font-medium focus:outline-none focus:border-brand/40 focus:bg-white/[0.03] transition-all duration-500 shadow-inner" 
                        />
                      </div>
                    </div>
                    <div className="space-y-4 group">
                      <label className="text-[10px] font-bold text-white/45 group-focus-within:text-brand uppercase tracking-[0.3em] ml-1 transition-colors">Net Worth Target</label>
                      <div className="relative">
                        <span className="absolute left-8 top-1/2 -translate-y-1/2 text-white/45 font-bold text-xs">Br</span>
                        <input 
                          type="number" 
                          name="netWorthTarget"
                          value={formData.netWorthTarget} 
                          onChange={handleChange}
                          className="w-full pl-14 pr-8 py-5 bg-white/[0.01] border border-white/[0.05] rounded-[24px] text-white font-medium focus:outline-none focus:border-brand/40 focus:bg-white/[0.03] transition-all duration-500 shadow-inner" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "preferences" && (
                <div className="space-y-12">
                  <div className="space-y-10">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-10 border-b border-white/[0.03]">
                      <div className="flex items-center gap-8">
                        <div className="w-16 h-16 rounded-[24px] bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/55 shadow-xl">
                          <Globe className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="text-2xl font-display font-bold text-white tracking-tight">Currency & Region</h4>
                          <p className="text-sm text-white/65 mt-1">Primary currency for global calculations</p>
                        </div>
                      </div>
                      <div className="relative w-full sm:w-auto">
                        <select 
                          name="currency"
                          value={formData.currency}
                          onChange={handleChange}
                          className="w-full sm:w-48 px-8 py-4 bg-white/[0.02] border border-white/[0.05] rounded-[20px] text-white font-bold text-xs focus:outline-none focus:border-brand/40 transition-all shadow-2xl appearance-none"
                        >
                          <option value="ETB">ETB (Br)</option>
                        </select>
                        <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/55 rotate-90 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-10 border-b border-white/[0.03]">
                      <div className="flex items-center gap-8">
                        <div className="w-16 h-16 rounded-[24px] bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/55 shadow-xl">
                          <Palette className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="text-2xl font-display font-bold text-white tracking-tight">Interface Theme</h4>
                          <p className="text-sm text-white/65 mt-1">Visual aesthetic of the platform</p>
                        </div>
                      </div>
                      <div className="flex bg-white/[0.01] border border-white/[0.05] rounded-[20px] p-1.5 shadow-inner w-full sm:w-auto">
                        {(['dark', 'light', 'system'] as const).map((t) => (
                          <button 
                            key={t}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, theme: t as any }));
                              // Let ThemeProvider handle all DOM/theme side effects in one place.
                              window.dispatchEvent(new CustomEvent('apply-theme', { detail: t }));
                            }}
                            className={cn(
                              "flex-1 sm:flex-none px-8 py-3 rounded-[16px] text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 capitalize",
                              formData.theme === t 
                                ? "bg-white/[0.05] text-white shadow-[0_10px_20px_rgba(0,0,0,0.2)]" 
                                : "text-white/45 hover:text-white/65"
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="space-y-12">
                  <div className="space-y-10">
                    <div className="flex items-center justify-between pb-10 border-b border-white/[0.03]">
                      <div className="flex items-center gap-8">
                        <div className="w-16 h-16 rounded-[24px] bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/55 shadow-xl">
                          <Bell className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="text-2xl font-display font-bold text-white tracking-tight">Email Summaries</h4>
                          <p className="text-sm text-white/65 mt-1">Get a summary of your spending each month</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer group">
                        <input type="checkbox" className="sr-only peer" checked={formData.emailNotifications} onChange={(e) => setFormData(f => ({...f, emailNotifications: e.target.checked}))} />
                        <div className="w-16 h-8 bg-white/[0.03] border border-white/[0.05] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-8 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white/10 after:rounded-full after:h-[24px] after:w-[24px] after:transition-all duration-500 peer-checked:bg-brand peer-checked:after:bg-black peer-checked:after:opacity-100 shadow-inner"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between pb-10 border-b border-white/[0.03]">
                      <div className="flex items-center gap-8">
                        <div className="w-16 h-16 rounded-[24px] bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/55 shadow-xl">
                          <Shield className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="text-2xl font-display font-bold text-white tracking-tight">Budget Thresholds</h4>
                          <p className="text-sm text-white/65 mt-1">Get alerted when you are close to your budget limit</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer group">
                        <input type="checkbox" className="sr-only peer" checked={formData.budgetAlerts} onChange={(e) => setFormData(f => ({...f, budgetAlerts: e.target.checked}))} />
                        <div className="w-16 h-8 bg-white/[0.03] border border-white/[0.05] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-8 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white/10 after:rounded-full after:h-[24px] after:w-[24px] after:transition-all duration-500 peer-checked:bg-brand peer-checked:after:bg-black peer-checked:after:opacity-100 shadow-inner"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "data" && (
                <div className="space-y-12">
                  <div className="p-12 rounded-[40px] bg-white/[0.01] border border-white/[0.03] shadow-inner relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-8 mb-10">
                        <div className="w-20 h-20 rounded-[28px] bg-brand/10 flex items-center justify-center text-brand shadow-2xl border border-brand/10">
                          <RefreshCw className="w-10 h-10" />
                        </div>
                        <div>
                          <h4 className="text-3xl font-display font-bold text-white tracking-tight">Load Default Categories & Accounts</h4>
                          <p className="text-sm text-white/65 mt-1">Quickly fill in standard categories and accounts</p>
                        </div>
                      </div>
                      <p className="text-base text-white/72 mb-12 leading-relaxed max-w-2xl">
                        Starting fresh? Use this to quickly set up standard financial categories like "Food", "Transportation", and "Housing". This process is additive and won't delete your existing records.
                      </p>
                      <button 
                        onClick={handleInitializeData}
                        disabled={isInitializing}
                        className="flex items-center justify-center gap-4 px-12 py-5 rounded-[24px] bg-white/[0.03] border border-white/[0.05] text-[11px] font-bold uppercase tracking-[0.25em] text-white hover:bg-white/[0.08] hover:border-white/10 transition-all duration-500 active:scale-95 shadow-2xl"
                      >
                        {isInitializing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Database className="w-4 h-4" />
                        )}
                        Load Default Categories
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "pwa" && (
                <div className="space-y-12">
                  <div className="p-12 rounded-[40px] bg-white/[0.01] border border-white/[0.03] shadow-inner relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-8 mb-10">
                        <div className="w-20 h-20 rounded-[28px] bg-blue-500/10 flex items-center justify-center text-blue-400 shadow-2xl border border-blue-500/10">
                          <Smartphone className="w-10 h-10" />
                        </div>
                        <div>
                          <h4 className="text-3xl font-display font-bold text-white tracking-tight">Install the App</h4>
                          <p className="text-sm text-white/65 mt-1">Add Birr Tracker to your home screen</p>
                        </div>
                      </div>
                      <p className="text-base text-white/72 mb-12 leading-relaxed max-w-2xl">
                        Install the app on your phone or desktop for a better experience and quick access.
                      </p>
                      <button 
                        onClick={handleInstall}
                        disabled={!deferredPrompt}
                        className="flex items-center justify-center gap-4 px-12 py-5 rounded-[24px] bg-blue-500 text-white text-[11px] font-bold uppercase tracking-[0.25em] hover:bg-blue-600 transition-all duration-500 active:scale-95 shadow-[0_20px_50px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="w-4 h-4" />
                        {deferredPrompt ? 'Install Application' : 'Already Installed'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="p-10 rounded-[40px] bg-white/[0.01] border border-white/[0.03] shadow-inner group">
                      <div className="flex items-center justify-between mb-8">
                        <h5 className="text-[10px] font-bold text-white/45 uppercase tracking-[0.4em]">Offline Status</h5>
                        <div className={cn(
                          "w-3 h-3 rounded-full transition-all duration-500",
                          isOfflineReady ? "bg-brand shadow-[0_0_20px_rgba(16,185,129,0.6)]" : "bg-amber-500 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                        )} />
                      </div>
                      <p className="text-2xl font-display font-bold text-white mb-3">
                        {isOfflineReady ? 'Ready for Offline' : 'Syncing Data...'}
                      </p>
                      <p className="text-sm text-white/65 leading-relaxed">
                        Your data is saved on this device so you can access it without internet.
                      </p>
                    </div>

                    <div className="p-10 rounded-[40px] bg-white/[0.01] border border-white/[0.03] shadow-inner group">
                      <div className="flex items-center justify-between mb-8">
                        <h5 className="text-[10px] font-bold text-white/45 uppercase tracking-[0.4em]">App Version</h5>
                        <RefreshCw className={cn("w-5 h-5 text-white/45 transition-all duration-500", isNeedUpdate && "text-brand animate-spin")} />
                      </div>
                      <p className="text-2xl font-display font-bold text-white mb-3">
                        {isNeedUpdate ? 'Update Available' : 'Up to Date'}
                      </p>
                      {isNeedUpdate ? (
                        <button 
                          onClick={() => updateServiceWorker(true)}
                          className="mt-4 text-[11px] font-bold text-brand uppercase tracking-[0.2em] hover:text-brand-dark transition-colors"
                        >
                          Install Update Now
                        </button>
                      ) : (
                        <p className="text-sm text-white/65 leading-relaxed">
                          You are on the latest version.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="space-y-12">
                  <div className="space-y-10">
                    <div className="flex items-center justify-between pb-10 border-b border-white/[0.03]">
                      <div className="flex items-center gap-8">
                        <div className="w-16 h-16 rounded-[24px] bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/55 shadow-xl">
                          <Shield className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="text-2xl font-display font-bold text-white tracking-tight">Two-Factor Auth</h4>
                          <p className="text-sm text-white/65 mt-1">Add an extra layer of protection</p>
                        </div>
                      </div>
                      <button className="px-8 py-4 rounded-[18px] bg-white/[0.03] border border-white/[0.05] text-[10px] font-bold uppercase tracking-[0.2em] text-white/84 hover:bg-white/[0.08] hover:text-white transition-all duration-500">
                        Enable 2FA
                      </button>
                    </div>

                    <div className="pt-10">
                      <div className="p-12 rounded-[40px] bg-rose-500/[0.01] border border-rose-500/[0.05] shadow-inner relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        
                        <h4 className="text-2xl font-display font-bold text-rose-400 tracking-tight mb-4">Danger Zone</h4>
                        <p className="text-base text-rose-400/40 mb-10 leading-relaxed max-w-2xl">
                          Permanently delete your account and all associated financial data. This action is irreversible and will delete all records from our our system.
                        </p>
                        <button className="px-10 py-5 rounded-[24px] bg-rose-500/10 text-rose-400 text-[11px] font-bold uppercase tracking-[0.25em] hover:bg-rose-500/20 transition-all duration-500 border border-rose-500/20 active:scale-95 shadow-2xl">
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
