import { ReactNode } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { UserProfile } from '../types';
import { Home, History, ShieldCheck as Shield, LogOut, User, Video, CreditCard } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Layout({ user }: { user: UserProfile }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/auth');
  };

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Video, label: 'Watch & Earn', path: '/' }, // For now same as home
    { icon: History, label: 'History', path: '/history' },
    { icon: CreditCard, label: 'Wallet', path: '/' }, // Wallet sections on home
  ];

  if (user.role === 'admin') {
    navItems.push({ icon: Shield, label: 'Admin', path: '/admin' });
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col md:flex-row">
      {/* Sidebar for desktop */}
      <aside className="hidden md:flex w-64 border-r border-zinc-900 flex-col sticky top-0 h-screen">
        <div className="p-6 border-bottom border-zinc-900">
          <Link to="/" className="text-2xl font-bold tracking-tighter text-orange-500">eflix</Link>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                location.pathname === item.path 
                  ? "bg-zinc-900 text-orange-500" 
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-900">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-zinc-500 truncate">${user.balance.toFixed(2)}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-900/10 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
           <Outlet />
        </div>
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden sticky bottom-0 bg-zinc-950 border-t border-zinc-900 px-6 py-3 flex justify-between items-center z-50">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "p-2 rounded-lg transition-colors",
              location.pathname === item.path ? "text-orange-500" : "text-zinc-500"
            )}
          >
            <item.icon className="w-6 h-6" />
          </Link>
        ))}
        <button onClick={handleLogout} className="p-2 text-red-500">
          <LogOut className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
}
