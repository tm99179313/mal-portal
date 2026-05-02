'use client';
import { supabase } from '@/lib/supabase';

export default function LogoutButton() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <button 
      onClick={handleLogout}
      className="bg-white text-black border-4 border-black px-4 py-2 font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-red-500 hover:text-white hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all active:shadow-none active:translate-x-1 active:translate-y-1"
    >
      ログアウト
    </button>
  );
}