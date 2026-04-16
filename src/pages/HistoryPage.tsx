import { useState, useEffect } from 'react';
import { UserProfile, Transaction } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';

export default function HistoryPage({ user }: { user: UserProfile }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const txs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    return () => unsub();
  }, [user.uid]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Transaction History</h1>
        <p className="text-zinc-500">Track all your earnings, deposits, and withdrawals.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-950/50 text-zinc-500 text-xs uppercase tracking-widest">
                <th className="px-6 py-5 font-bold border-b border-zinc-800">Date & Time</th>
                <th className="px-6 py-5 font-bold border-b border-zinc-800">Type</th>
                <th className="px-6 py-5 font-bold border-b border-zinc-800">Amount</th>
                <th className="px-6 py-5 font-bold border-b border-zinc-800">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                        <Clock className="w-4 h-4 text-zinc-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{new Date(tx.createdAt).toLocaleDateString()}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">{new Date(tx.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                       <span className="text-sm font-bold uppercase tracking-tight text-zinc-300">
                        {tx.type.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className={cn(
                      "flex items-center gap-1 font-black text-sm",
                      tx.type === 'deposit' || tx.type === 'earning' || tx.type === 'referral_bonus' 
                        ? "text-emerald-500" 
                        : "text-rose-500"
                    )}>
                      {tx.type === 'deposit' || tx.type === 'earning' || tx.type === 'referral_bonus' ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                      tx.status === 'completed' || tx.status === 'approved' 
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                        : tx.status === 'pending' 
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                        : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                    )}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <div className="p-20 text-center">
              <div className="bg-zinc-800/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                 <History className="w-8 h-8 text-zinc-800" />
              </div>
              <p className="text-zinc-500 italic">No transactions found yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
