import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { ShieldCheck, Cpu, Lock } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-900/5 bg-white/50 backdrop-blur-sm mt-auto py-10">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Logo size={20} textClassName="font-bold text-slate-900 text-sm font-nunito" />
          <span className="text-slate-400">|</span>
          <span className="flex items-center gap-1 text-slate-600">
            <Lock className="w-3 h-3 text-emerald-600" />
            100% Private Local Conversion
          </span>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/privacy" className="hover:text-slate-900 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-slate-900 transition-colors">
            Terms of Service
          </Link>
          <Link href="/pricing" className="hover:text-slate-900 transition-colors">
            Licensing
          </Link>
          <Link href="/settings" className="hover:text-slate-900 transition-colors">
            GPU Settings
          </Link>
        </div>

        <div>
          Â© {new Date().getFullYear()} Vimora Desktop. All media processed locally on device.
        </div>
      </div>
    </footer>
  );
}