'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // ログイン状態をチェック
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        // すでにログインしていたら管理画面へ
        router.push('/admin');
      }
      setLoading(false);
    });
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black">読み込み中...</div>;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <div className="text-center">
        <h1 className="text-6xl font-black text-black mb-12 tracking-tighter uppercase">
          MAL+ Portal
        </h1>

        <Link href="/login">
          <button className="
            bg-black text-white 
            text-2xl font-black 
            px-12 py-6 
            border-4 border-black 
            shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] 
            hover:translate-x-1 hover:translate-y-1 hover:shadow-none 
            transition-all">
            メンバーログイン
          </button>
        </Link>
      </div>
    </main>
  );
}
// app/page.tsx のボタン部分のイメージ
<button className="
  bg-black text-white 
  text-2xl font-black 
  px-10 py-5 
  border-4 border-black 
  rounded-none 
  shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] 
  hover:translate-x-1 hover:translate-y-1 hover:shadow-none 
  transition-all">
  メンバーログイン
</button>