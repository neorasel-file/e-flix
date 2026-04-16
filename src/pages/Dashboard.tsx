import { useState, useEffect } from 'react';
import { UserProfile, Package, Task, Transaction } from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  increment, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { toast } from 'sonner';
import { 
  Wallet, 
  Play, 
  Zap, 
  Trophy, 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft,
  Clock,
  ExternalLink,
  Plus,
  Video,
  History
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const PACKAGES: Package[] = [
  { id: 'bronze', name: 'Bronze', price: 10, dailyEarnings: 0.5, validityDays: 30 },
  { id: 'silver', name: 'Silver', price: 50, dailyEarnings: 3, validityDays: 30 },
  { id: 'gold', name: 'Gold', price: 100, dailyEarnings: 7, validityDays: 30 },
];

export default function Dashboard({ user }: { user: UserProfile }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [timer, setTimer] = useState(0);

  const [withdrawData, setWithdrawData] = useState({ amount: '', cryptoAddress: '' });
  const [depositData, setDepositData] = useState({ amount: '', txid: '' });

  useEffect(() => {
    // Fetch tasks
    const tasksUnsub = onSnapshot(collection(db, 'tasks'), (snap) => {
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });

    // Fetch recent transactions
    const transQuery = query(
      collection(db, 'transactions'), 
      where('userId', '==', user.uid)
    );
    const transUnsub = onSnapshot(transQuery, (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });

    return () => {
      tasksUnsub();
      transUnsub();
    };
  }, [user.uid]);

  const handleStartTask = (task: Task) => {
    const today = new Date().toISOString().split('T')[0];
    if (user.lastDailyTask === today) {
      toast.error("You've already completed today's tasks!");
      return;
    }

    setActiveTask(task);
    setTimer(task.duration);
    
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          completeTask(task);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const completeTask = async (task: Task) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(task.reward),
        lastDailyTask: today
      });

      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: task.reward,
        type: 'earning',
        status: 'completed',
        details: `Task reward: ${task.title}`,
        createdAt: new Date().toISOString()
      });

      toast.success(`Earnt $${task.reward.toFixed(2)}!`);
      setActiveTask(null);
    } catch (e) {
      toast.error("Failed to process reward");
    }
  };

  const handleBuyPackage = async (pkg: Package) => {
    if (user.balance < pkg.price) {
      toast.error("Insufficient balance");
      return;
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(-pkg.price),
        package: pkg.id
      });

      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: pkg.price,
        type: 'package_purchase',
        status: 'completed',
        details: `Purchased ${pkg.name} package`,
        createdAt: new Date().toISOString()
      });

      toast.success(`${pkg.name} package activated!`);
    } catch (e) {
      toast.error("Purchase failed");
    }
  };

  const handleWithdrawRequest = async () => {
    const amount = parseFloat(withdrawData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }
    if (user.balance < amount) {
      toast.error("Insufficient balance");
      return;
    }
    if (!withdrawData.cryptoAddress) {
      toast.error("Address is required");
      return;
    }

    try {
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: amount,
        type: 'withdraw',
        status: 'pending',
        cryptoAddress: withdrawData.cryptoAddress,
        createdAt: new Date().toISOString()
      });
      // We don't deduct yet, admin will deduct on approval? 
      // Actually standard is to deduct immediately and refund on rejection.
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(-amount)
      });

      toast.success("Withdrawal request submitted!");
      setShowWithdrawModal(false);
      setWithdrawData({ amount: '', cryptoAddress: '' });
    } catch (e) {
      toast.error("Request failed");
    }
  };

  const handleDepositReport = async () => {
    const amount = parseFloat(depositData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }
    if (!depositData.txid) {
      toast.error("TXID is required");
      return;
    }

    try {
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: amount,
        type: 'deposit',
        status: 'pending',
        details: `TXID: ${depositData.txid}`,
        createdAt: new Date().toISOString()
      });
      toast.success("Deposit reported! Waiting for admin approval.");
      setShowDepositModal(false);
      setDepositData({ amount: '', txid: '' });
    } catch (e) {
      toast.error("Failed to submit deposit");
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Wallet className="w-16 h-16 text-orange-500" />
          </div>
          <p className="text-zinc-500 text-sm font-medium mb-1">Total Balance</p>
          <h3 className="text-3xl font-bold tracking-tight">${user.balance.toFixed(2)}</h3>
          <div className="mt-4 flex gap-2">
            <button 
              onClick={() => setShowWithdrawModal(true)}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-xl text-xs font-bold transition-colors"
            >
              Withdraw
            </button>
            <button 
              onClick={() => setShowDepositModal(true)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors"
            >
              Deposit
            </button>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl"
        >
          <p className="text-zinc-500 text-sm font-medium mb-1">Active Package</p>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h3 className="text-2xl font-bold uppercase">{user.package}</h3>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl"
        >
          <p className="text-zinc-500 text-sm font-medium mb-1">Referral Code</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold font-mono">{user.referralCode}</h3>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(user.referralCode);
                toast.success("Code copied!");
              }}
              className="text-orange-500 hover:text-orange-400"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl"
        >
          <p className="text-zinc-500 text-sm font-medium mb-1">Daily Task</p>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <h3 className="text-2xl font-bold">
              {user.lastDailyTask === new Date().toISOString().split('T')[0] ? 'Completed' : 'Pending'}
            </h3>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Work Area */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Video className="w-5 h-5 text-orange-500" />
                Available Tasks
              </h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {tasks.length === 0 ? (
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-12 text-center text-zinc-500 italic">
                  No tasks available from admin yet...
                </div>
              ) : tasks.map((task) => (
                <div key={task.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                    <Play className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold">{task.title}</h4>
                    <p className="text-xs text-zinc-500">{task.duration} seconds • Reward: ${task.reward.toFixed(2)}</p>
                  </div>
                  <button 
                    disabled={activeTask !== null}
                    onClick={() => handleStartTask(task)}
                    className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-xl font-bold transition-colors"
                  >
                    {activeTask?.id === task.id ? `${timer}s` : 'Start'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Upgrade Packages */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Upgrade Package
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PACKAGES.map((pkg) => (
                <div 
                  key={pkg.id} 
                  className={cn(
                    "p-6 rounded-3xl border transition-all",
                    user.package === pkg.id 
                      ? "bg-orange-500/10 border-orange-500" 
                      : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <h4 className="text-lg font-bold mb-1">{pkg.name}</h4>
                  <div className="text-2xl font-bold mb-4">${pkg.price}</div>
                  <ul className="text-sm text-zinc-400 space-y-2 mb-6">
                    <li className="flex items-center gap-2 font-medium">Daily: ${pkg.dailyEarnings}</li>
                    <li>Validity: {pkg.validityDays} Days</li>
                  </ul>
                  <button 
                    disabled={user.package === pkg.id}
                    onClick={() => handleBuyPackage(pkg)}
                    className={cn(
                      "w-full py-3 rounded-2xl font-bold transition-all",
                      user.package === pkg.id 
                        ? "bg-orange-500/20 text-orange-500 cursor-not-allowed" 
                        : "bg-zinc-800 hover:bg-white hover:text-zinc-950"
                    )}
                  >
                    {user.package === pkg.id ? 'Active' : 'Upgrade'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Recent Transactions Sidebar */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-zinc-400" />
            Recent Activity
          </h2>
          <div className="space-y-3">
            {transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  tx.type === 'deposit' || tx.type === 'earning' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                )}>
                  {tx.type === 'deposit' || tx.type === 'earning' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate capitalize">{tx.type.replace('_', ' ')}</p>
                  <p className="text-xs text-zinc-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                </div>
                <div className={cn(
                  "text-sm font-bold",
                  tx.type === 'deposit' || tx.type === 'earning' ? 'text-green-500' : 'text-red-500'
                )}>
                  {tx.type === 'deposit' || tx.type === 'earning' ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Withdraw Modal Placeholder */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 border border-zinc-800 w-full max-w-md p-8 rounded-3xl"
           >
              <h2 className="text-2xl font-bold mb-4">Withdraw Funds</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Crypto Address (USDT BEP20)</label>
                  <input 
                    type="text" 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3" 
                    placeholder="0x..." 
                    value={withdrawData.cryptoAddress}
                    onChange={e => setWithdrawData({...withdrawData, cryptoAddress: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Amount ($)</label>
                  <input 
                    type="number" 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3" 
                    placeholder="0.00" 
                    value={withdrawData.amount}
                    onChange={e => setWithdrawData({...withdrawData, amount: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowWithdrawModal(false)} className="flex-1 py-3 border border-zinc-800 rounded-xl font-bold hover:bg-zinc-800">Cancel</button>
                  <button onClick={handleWithdrawRequest} className="flex-1 py-3 bg-orange-500 rounded-xl font-bold hover:bg-orange-600">Submit Request</button>
                </div>
              </div>
           </motion.div>
        </div>
      )}

      {/* Deposit Modal Placeholder */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 border border-zinc-800 w-full max-w-md p-8 rounded-3xl"
           >
              <h2 className="text-2xl font-bold mb-4">Deposit Funds</h2>
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl mb-6">
                <p className="text-xs text-orange-500 font-bold mb-2 uppercase tracking-wider">Deposit Address (USDT BEP20)</p>
                <p className="text-sm font-mono break-all font-bold">0x71C7656EC7ab88b098defB751B7401B5f6d8976F</p>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
                    toast.success("Address copied!");
                  }}
                  className="mt-3 text-xs text-orange-500 flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3 h-3" /> Copy Address
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Amount to Deposit ($)</label>
                  <input 
                    type="number" 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3" 
                    placeholder="Min $10.00" 
                    value={depositData.amount}
                    onChange={e => setDepositData({...depositData, amount: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Transaction TXID / Hash</label>
                  <input 
                    type="text" 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3" 
                    placeholder="Enter TXID" 
                    value={depositData.txid}
                    onChange={e => setDepositData({...depositData, txid: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowDepositModal(false)} className="flex-1 py-3 border border-zinc-800 rounded-xl font-bold hover:bg-zinc-800">Cancel</button>
                  <button onClick={handleDepositReport} className="flex-1 py-3 bg-orange-500 rounded-xl font-bold hover:bg-orange-600">I have paid</button>
                </div>
              </div>
           </motion.div>
        </div>
      )}
    </div>
  );
}
