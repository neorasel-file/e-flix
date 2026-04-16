export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  balance: number;
  role: UserRole;
  package: string;
  referralCode: string;
  referredBy?: string;
  createdAt: string;
  lastDailyTask?: string;
}

export interface Package {
  id: string;
  name: string;
  price: number;
  dailyEarnings: number;
  validityDays: number;
}

export interface Task {
  id: string;
  title: string;
  reward: number;
  videoUrl: string;
  duration: number; // in seconds
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdraw' | 'earning' | 'package_purchase' | 'referral_bonus';
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  method?: string;
  details?: string;
  cryptoAddress?: string;
  createdAt: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredEmail: string;
  bonus: number;
  createdAt: string;
}
