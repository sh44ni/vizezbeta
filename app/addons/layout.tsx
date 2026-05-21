'use client';
import { useAuth } from '@/context/AuthContext';
import LoginScreen from '@/components/LoginScreen';

export default function AddonsLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <LoginScreen />;
  return <>{children}</>;
}
