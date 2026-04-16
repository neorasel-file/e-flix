import React, { useState, useEffect } from 'react';
import { UserProfile, Task, Transaction } from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  increment, 
  addDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { toast } from 'sonner';
import { 
  Users, 
  Video, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  ShieldCheck, 
  Plus,
  ArrowUpRight,
  Search
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function AdminPanel({ user: currentUser }: { user: UserProfile }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'tasks' | 'tx'>('tx');
  
  const [newTask, setNewTask] = useState({ title: '', videoUrl: '', reward: '', duration: '' });

  useEffect(() => {
    const usersUnsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => ({ ...doc.data() } as UserProfile)));
    });
    const tasksUnsub = onSnapshot(collection(db, 'tasks'), (snap) => {
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });
    const txUnsub = onSnapshot(collection(db, 'transactions'), (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });

    return () => {
      usersUnsub();
      tasksUnsub();
      txUnsub();
    };
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'tasks'), {
        title: newTask.title,
        videoUrl: newTask.videoUrl,
        reward: parseFloat(newTask.reward),
        duration: parseInt(newTask.duration),
        createdAt: new Date().toISOString()
      });
      setNewTask({ title: '', videoUrl: '', reward: '', duration: '' });
      toast.success("Task created!");
    } catch (e) {
      toast.error("Failed to create task");
    }
  };

  const handleDeleteTask = async (id: string) => {
    await deleteDoc(doc(db, 'tasks', id));
    toast.success("Task deleted");
  };

  const handleApproveTx = async (tx: Transaction) => {
    try {
      // Update transaction status
      await updateDoc(doc(db, 'transactions', tx.id), { status: 'approved' });
      
      // If it's a deposit, add to user's balance
      if (tx.type === 'deposit') {
        await updateDoc(doc(db, 'users', tx.userId), {
          balance: increment(tx.amount)
        });
      }

      toast.success("Transaction approved");
    } catch (e) {
      toast.error("Error approving transaction");
    }
  };

  const handleRejectTx = async (tx: Transaction) => {
    try {
      await updateDoc(doc(db, 'transactions', tx.id), { status: 'rejected' });
      
      // If it's a withdrawal, refund the balance
      if (tx.type === 'withdraw') {
        await updateDoc(doc(db, 'users', tx.userId), {
          balance: increment(tx.amount)
        });
      }
      
      toast.info("Transaction rejected (refunded if withdrawal)");
    } catch (e) {
      toast.error("Error rejecting transaction");
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-3xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Control Room</h1>
            <p className="text-zinc-500 text-sm">Manage users, approve withdrawals, and add tasks.</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl w-fit">
        {[
          { id: 'tx', label: 'Requests', icon: ArrowUpRight },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'tasks', label: 'Tasks', icon: Video },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all",
              activeTab === tab.id 
                ? "bg-zinc-800 text-orange-500 shadow-lg shadow-black/20" 
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === 'tx' && (
          <section className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="font-bold text-lg">Pending Transactions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-950/50 text-zinc-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold border-b border-zinc-800">User / Method</th>
                    <th className="px-6 py-4 font-bold border-b border-zinc-800">Type</th>
                    <th className="px-6 py-4 font-bold border-b border-zinc-800">Amount</th>
                    <th className="px-6 py-4 font-bold border-b border-zinc-800 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {transactions.filter(t => t.status === 'pending').map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-sm truncate max-w-[150px]">{tx.userId}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-1">{tx.cryptoAddress || tx.details}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border",
                          tx.type === 'deposit' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                        )}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-zinc-300">
                        ${tx.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleRejectTx(tx)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleApproveTx(tx)}
                            className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.filter(t => t.status === 'pending').length === 0 && (
                <div className="p-12 text-center text-zinc-500 italic">No pending requests.</div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'users' && (
          <section className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
             <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="font-bold text-lg">Platform Users</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input type="text" placeholder="Search..." className="bg-zinc-950 border border-zinc-800 rounded-xl py-1.5 pl-9 pr-4 text-xs" />
              </div>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-950/50 text-zinc-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold border-b border-zinc-800">User Details</th>
                    <th className="px-6 py-4 font-bold border-b border-zinc-800">Package</th>
                    <th className="px-6 py-4 font-bold border-b border-zinc-800">Wallet</th>
                    <th className="px-6 py-4 font-bold border-b border-zinc-800 text-right">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {users.map((u) => (
                    <tr key={u.uid} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4">
                        <div className="font-bold text-sm">{u.name}</div>
                        <div className="text-xs text-zinc-500">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono uppercase bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">{u.package}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-orange-500">${u.balance.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          u.role === 'admin' ? "bg-purple-500/10 text-purple-500 border border-purple-500/20" : "bg-zinc-700 text-zinc-400"
                        )}>
                          {u.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'tasks' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 h-fit">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-500" />
                Add New Video Task
              </h3>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Task Title</label>
                  <input 
                    required 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:border-orange-500 outline-none" 
                    value={newTask.title}
                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Video URL (Embed Link)</label>
                  <input 
                    required 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:border-orange-500 outline-none" 
                    placeholder="https://youtube.com/embed/..."
                    value={newTask.videoUrl}
                    onChange={e => setNewTask({...newTask, videoUrl: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Reward ($)</label>
                    <input 
                      required 
                      type="number" step="0.01" 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:border-orange-500 outline-none" 
                      value={newTask.reward}
                      onChange={e => setNewTask({...newTask, reward: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Duration (Sec)</label>
                    <input 
                      required 
                      type="number" 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 focus:border-orange-500 outline-none" 
                      value={newTask.duration}
                      onChange={e => setNewTask({...newTask, duration: e.target.value})}
                    />
                  </div>
                </div>
                <button className="w-full py-4 bg-orange-500 rounded-2xl font-bold hover:bg-orange-600 transition-all mt-4">Create Task</button>
              </form>
            </section>

            <section className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
               <div className="p-6 border-b border-zinc-800">
                <h3 className="font-bold">Active Tasks</h3>
              </div>
              <div className="divide-y divide-zinc-800">
                {tasks.map((t) => (
                  <div key={t.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div>
                      <h4 className="font-bold text-sm">{t.title}</h4>
                      <p className="text-[10px] text-zinc-500">${t.reward} • {t.duration}s</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteTask(t.id)}
                      className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
