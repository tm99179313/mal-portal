'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewCoursePage() {
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  // ★ パスコード用のステートを追加
  const [passcode, setPasscode] = useState('');

　const [isPinned, setIsPinned] = useState(false);
　const [displayOrder, setDisplayOrder] = useState(10);
 
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    // 1. 入力チェック（パスコードも必須にする）
    if (!title || !year || !passcode) {
      setErrorMsg('コース名、年度、パスコードはすべて必須です。');
      setIsSubmitting(false);
      return;
    }

    // 2. Supabaseに登録（passcode も追加）
    const { error } = await supabase.from('courses').insert([
      { 
        name: title,
        year: parseInt(year, 10),
        passcode: passcode, // ★ ここでパスコードを送信
      }
    ]);

    if (error) {
      setErrorMsg(`登録エラー: ${error.message}`);
      setIsSubmitting(false);
    } else {
      router.push('/admin');
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen bg-[#F0F0F0] p-8">
      <div className="max-w-3xl mx-auto">
        
        <div className="mb-8">
          <Link href="/admin" className="text-xl font-black text-black hover:underline decoration-4">
            ← キャンセルして戻る
          </Link>
        </div>

        <h1 className="text-5xl font-black text-black tracking-tighter uppercase mb-12 border-b-8 border-black pb-4">
          新規コース作成
        </h1>

        {errorMsg && (
          <div className="bg-white border-4 border-red-500 p-4 mb-8 shadow-[6px_6px_0px_0px_rgba(255,0,0,1)]">
            <p className="text-2xl font-black text-red-500">⚠ {errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border-4 border-black p-8 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
          
          <div className="mb-8">
            <label className="block text-3xl font-black text-black mb-4 uppercase">
              コース名
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: Make A Line Plus Basic"
              className="w-full text-2xl font-bold text-black border-4 border-black p-4 focus:outline-none focus:bg-[#FFFFE0] transition-colors"
            />
          </div>

          <div className="mb-8">
            <label className="block text-3xl font-black text-black mb-4 uppercase">
              年度 (西暦)
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2025"
              className="w-full md:w-1/2 text-2xl font-bold text-black border-4 border-black p-4 focus:outline-none focus:bg-[#FFFFE0] transition-colors"
            />
          </div>

          {/* ★ パスコードの入力欄を追加 */}
          <div className="mb-12">
            <label className="block text-3xl font-black text-black mb-4 uppercase">
              パスコード（受講生用）
            </label>
              <input
  type="text"
  value={passcode}
  onChange={(e) => setPasscode(e.target.value)}
  className="bg-slate-50 border border-blue-300 p-2 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
/>

<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
  <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
    <input
      type="checkbox"
      checked={isPinned}
      onChange={(e) => setIsPinned(e.target.checked)}
      className="w-4 h-4"
    />
    上部にピン留め
  </label>

  <div>
    <label className="text-xs text-slate-500 font-bold mb-1 block">
      表示順
    </label>
    <input
      type="number"
      value={displayOrder}
      onChange={(e) => setDisplayOrder(Number(e.target.value))}
      className="bg-slate-50 border border-blue-300 p-2 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
    />
    <p className="text-xs text-slate-400 mt-1">
      数字が小さいほど上に表示されます
    </p>
  </div>
</div>
              
            <p className="mt-2 font-bold text-gray-600">※ 受講生がこのコースを登録する際に入力する合言葉です</p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full text-3xl font-black py-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all ${
              isSubmitting 
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed shadow-none translate-x-1 translate-y-1' 
                : 'bg-[#00FF00] text-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:shadow-none active:translate-x-1 active:translate-y-1'
            }`}
          >
            {isSubmitting ? '登録中...' : 'コースを作成する！'}
          </button>
        </form>

      </div>
    </main>
  );
}
