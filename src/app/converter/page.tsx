"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ConverterRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/convert');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#070a12] flex items-center justify-center text-slate-400 text-xs">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-[#0B6FFB] animate-spin" />
        <span>Redirecting to Vimora Converter...</span>
      </div>
    </div>
  );
}