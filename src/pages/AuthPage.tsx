import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Mail, Lock, User, Phone, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    referralCode: ''
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        toast.success("Welcome back to eflix!");
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: formData.name });

        // Generate a random referral code for the new user
        const newReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Create user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          balance: 0,
          role: 'user', // Default role
          package: 'free',
          referralCode: newReferralCode,
          referredBy: formData.referralCode || null,
          createdAt: new Date().toISOString()
        });

        // Handle Referral Bonus logic
        if (formData.referralCode) {
          const q = query(collection(db, 'users'), where('referralCode', '==', formData.referralCode));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const referrer = querySnapshot.docs[0].data();
            // Add a pending transaction for the referrer
            await addDoc(collection(db, 'transactions'), {
              userId: referrer.uid,
              amount: 1, // $1 Referral bonus example
              type: 'referral_bonus',
              status: 'pending',
              details: `Referral bonus for ${formData.name}`,
              createdAt: new Date().toISOString()
            });
          }
        }

        toast.success("Account created! Let's earn.");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user profile already exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const newReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await setDoc(userDocRef, {
          uid: user.uid,
          name: user.displayName || 'Google User',
          email: user.email,
          phone: user.phoneNumber || '',
          balance: 0,
          role: 'user',
          package: 'free',
          referralCode: newReferralCode,
          referredBy: null,
          createdAt: new Date().toISOString()
        });
        toast.success("Account created via Google!");
      } else {
        toast.success("Welcome back!");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans text-zinc-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.1),transparent_50%)]" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-block p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-4"
          >
            <div className="text-4xl font-black tracking-tighter text-orange-500">eflix</div>
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {isLogin ? 'Welcome back' : 'Join the platform'}
          </h1>
          <p className="text-zinc-500">Watch videos, earn rewards. Simple as that.</p>
        </div>

        <motion.div 
          layout
          className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-8 rounded-3xl shadow-2xl"
        >
          <form onSubmit={handleAuth} className="space-y-6">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                      <input 
                        required
                        type="text"
                        placeholder="John Doe"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-orange-500 transition-colors"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                      <input 
                        required
                        type="tel"
                        placeholder="+88017..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-orange-500 transition-colors"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                <input 
                  required
                  type="email"
                  placeholder="name@email.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-orange-500 transition-colors"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                <input 
                  required
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-orange-500 transition-colors"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Referral Code (Optional)</label>
                <input 
                  type="text"
                  placeholder="REF123"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-orange-500 transition-colors"
                  value={formData.referralCode}
                  onChange={e => setFormData({...formData, referralCode: e.target.value})}
                />
              </div>
            )}

            <button 
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900 px-2 text-zinc-500">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 font-bold py-4 rounded-2xl transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </button>

          <div className="mt-8 text-center text-sm">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-orange-500 hover:underline font-medium"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
