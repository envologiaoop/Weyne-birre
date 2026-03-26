import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Receipt, Wallet, PieChart, Settings, LogOut, Tags,
  Scan, CreditCard, Trophy, Menu, X, Sparkles, TrendingUp, Upload,
  ArrowLeftRight, RefreshCw, FileBarChart2, AlertTriangle, Users
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../AuthProvider';
import { AIAdvisor } from '../AIAdvisor';
import { QuickAddWidget } from '../QuickAddWidget';
import { KeyboardShortcutsHelp } from '../KeyboardShortcutsHelp';
import { TransferModal } from '../modals/TransferModal';
import { RecurringTransactionModal } from '../modals/RecurringTransactionModal';
import { useAchievementTracker } from '../../lib/hooks/useAchievementTracker';
import { useRecurringChecker } from '../../lib/hooks/useRecurringChecker';
import { useSubscriptionChecker } from '../../lib/hooks/useSubscriptionChecker';
import { useKeyboardShortcuts } from '../../lib/hooks/useKeyboardShortcuts';
import { useBudgetAlerts } from '../../lib/hooks/useBudgetAlerts';
import { motion, AnimatePresence } from 'motion/react';

const navItems = [
  { name: 'Dashboard',     href: '/',            icon: LayoutDashboard },
  { name: 'Transactions',  href: '/transactions', icon: Receipt },
  { name: 'Accounts',      href: '/accounts',     icon: Wallet },
  { name: 'Budgets',       href: '/budgets',      icon: PieChart },
  { name: 'Net Worth',     href: '/net-worth',    icon: TrendingUp },
  { name: 'Subscriptions', href: '/subscriptions',icon: CreditCard },
  { name: 'Debts',         href: '/debts',        icon: Users },
  { name: 'Receipts',      href: '/receipts',     icon: Scan },
  { name: 'Reports',       href: '/reports',      icon: FileBarChart2 },
  { name: 'AI Advisor',    href: '/ai-advisor',   icon: Sparkles },
  { name: 'Bank Import',   href: '/bank-import',  icon: Upload },
  { name: 'Achievements',  href: '/achievements', icon: Trophy },
  { name: 'Categories',    href: '/categories',   icon: Tags },
  { name: 'Settings',      href: '/settings',     icon: Settings },
];

// ── Logout confirmation dialog ──────────────────────────────────────────────
function LogoutConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[80] backdrop-blur-sm"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="bg-card border border-normal rounded-3xl shadow-2xl w-full max-w-sm p-8 pointer-events-auto">
          <div className="flex flex-col items-center text-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-rose-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-primary mb-1">Sign out?</h3>
              <p className="text-sm text-muted">You will need to sign back in to access your financial data.</p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl border border-normal text-secondary hover:text-primary hover:bg-overlay text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Main Layout ──────────────────────────────────────────────────────────────
export default function DashboardLayout() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [transferOpen, setTransferOpen]   = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [logoutOpen, setLogoutOpen]       = useState(false);

  useAchievementTracker();
  useSubscriptionChecker();
  useRecurringChecker();
  useKeyboardShortcuts({ onNewTransfer: () => setTransferOpen(true) });
  useBudgetAlerts();

  const currentPage = navItems.find(item =>
    item.href === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.href)
  )?.name ?? 'Overview';

  const handleSignOut = async () => {
    setLogoutOpen(false);
    await signOut();
  };

  return (
    <div className="flex h-screen bg-page text-primary font-sans selection:bg-brand/20 transition-colors duration-300">

      {/* ── Mobile overlay ── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <aside
        className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-subtle flex flex-col shadow-xl transition-all duration-300 lg:translate-x-0 lg:static"
        style={{
          transform: `translateX(${isSidebarOpen ? '0' : '-100%'})`,
        }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-subtle shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand/15 border border-brand/25 flex items-center justify-center shrink-0">
              <img src="https://img.icons8.com/fluency/512/money-bag.png" alt="Logo" className="w-5 h-5 object-contain" />
            </div>
            <span className="font-display font-bold text-base text-primary tracking-tight">Birr Tracker</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-muted hover:text-primary transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick actions */}
        <div className="px-3 py-2.5 border-b border-subtle shrink-0">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => { setTransferOpen(true); setIsSidebarOpen(false); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-overlay hover:bg-brand/10 border border-subtle hover:border-brand/25 text-muted hover:text-brand text-[11px] font-semibold uppercase tracking-wide transition-all"
            >
              <ArrowLeftRight className="w-3 h-3" /> Transfer
            </button>
            <button
              onClick={() => { setRecurringOpen(true); setIsSidebarOpen(false); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-overlay hover:bg-brand/10 border border-subtle hover:border-brand/25 text-muted hover:text-brand text-[11px] font-semibold uppercase tracking-wide transition-all"
            >
              <RefreshCw className="w-3 h-3" /> Recurring
            </button>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto scrollbar-hide">
          {navItems.map(item => {
            const isActive = item.href === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group relative',
                  isActive
                    ? 'bg-brand/12 text-brand font-semibold'
                    : 'text-secondary hover:text-primary hover:bg-overlay'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 w-0.5 h-5 bg-brand rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon className={cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  isActive ? 'text-brand' : 'text-muted group-hover:text-secondary'
                )} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sign out button */}
        <div className="px-3 py-3 border-t border-subtle shrink-0">
          {/* User info */}
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1.5 rounded-xl bg-overlay">
            <div className="w-8 h-8 rounded-xl bg-brand/15 border border-brand/20 overflow-hidden shrink-0">
              {user?.photoURL
                ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-brand">{user?.email?.charAt(0).toUpperCase()}</div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary truncate">{user?.displayName || user?.email?.split('@')[0]}</p>
              <p className="text-[10px] text-muted truncate">{user?.email}</p>
            </div>
          </div>
<button
            onClick={() => setLogoutOpen(true)}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-[13px] font-medium text-muted hover:text-rose-400 hover:bg-rose-500/8 transition-all group"
          >
            <LogOut className="w-4 h-4 shrink-0 text-muted group-hover:text-rose-400 transition-colors" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-5 lg:px-8 border-b border-subtle bg-header backdrop-blur-xl z-20 shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-muted hover:text-primary transition-colors p-1">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-display font-bold text-primary tracking-tight leading-none">{currentPage}</h1>
              <p className="text-[10px] text-muted mt-0.5">
                {new Date().toLocaleDateString('en-ET', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-semibold text-secondary">{user?.displayName || user?.email?.split('@')[0]}</span>
              <span className="text-[10px] text-muted">{user?.email}</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-brand/15 border border-brand/20 overflow-hidden">
              {user?.photoURL
                ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-brand">{user?.email?.charAt(0).toUpperCase()}</div>
              }
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-5 lg:p-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </div>
      </main>

      {/* ── Floating UI ── */}
      <QuickAddWidget />
      <KeyboardShortcutsHelp />
      <AIAdvisor />

      {/* ── Modals ── */}
      <TransferModal isOpen={transferOpen} onClose={() => setTransferOpen(false)} />
      <RecurringTransactionModal isOpen={recurringOpen} onClose={() => setRecurringOpen(false)} />

      {/* ── Logout confirmation ── */}
      <AnimatePresence>
        {logoutOpen && (
          <LogoutConfirm onConfirm={handleSignOut} onCancel={() => setLogoutOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
