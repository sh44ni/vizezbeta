'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ManualRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/addons/rop-evisa'); }, [router]);
  return null;
}
