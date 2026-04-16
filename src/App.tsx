import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';
import { UserProfile } from './types';
import { Toaster } from './components/ui/sonner';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import HistoryPage from './pages/HistoryPage';
import Layout from './components/Layout';

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const unsubDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
        });
        return () => unsubDoc();
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-50 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl font-bold tracking-tighter text-orange-500">eflix</div>
          <div className="text-xs font-mono uppercase tracking-widest opacity-50 animate-pulse">Loading Platform...</div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/auth" element={!userProfile ? <AuthPage /> : <Navigate to="/" />} />
        
        <Route element={userProfile ? <Layout user={userProfile} /> : <Navigate to="/auth" />}>
          <Route path="/" element={<Dashboard user={userProfile} />} />
          <Route path="/history" element={<HistoryPage user={userProfile} />} />
          <Route path="/admin" element={userProfile?.role === 'admin' ? <AdminPanel user={userProfile} /> : <Navigate to="/" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
