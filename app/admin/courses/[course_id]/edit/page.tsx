'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CourseEditPage({ params }: { params: Promise<{ course_id: string }> }) {
  const { course_id: courseId } = use(params);
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [year, setYear] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCourse() {
      const { data, error } = await supabase.from('courses').select('*').eq('id', courseId).single();
      if (data) {
        setName(data.name);
        setPasscode(data.passcode);
        setYear(data.year || '');
      }
      setIsLoading(false);
    }
    fetchCourse();
  }, [courseId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('courses')
      .update({ name, passcode, year })
      .eq('id', courseId);

    if (error) alert('更新に失敗しました');
    else router.push('/admin');
  };

  if (isLoading) return <div className="p-20 text-center font-bold">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-6 md:p-12 font-sans">
      <div className="max-w-2xl mx-auto">
        <header className="mb-12">
          <Link href="/admin" className="text-sm font-bold text-blue-600 hover:underline">← 管理画面へ戻る</Link>
          <h1 className="text-3xl font-black mt-2">コース設定の編集</h1>
        </header>

        <form onSubmit={handleUpdate} className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2">コース名</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-4 border-2 border-black font-bold outline-none focus:bg-yellow-50" required />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold mb-2">パスコード</label>
              <input type="text" value={passcode} onChange={(e) => setPasscode(e.target.value)} className="w-full p-4 border-2 border-black font-mono outline-none focus:bg-yellow-50" required />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">年度 (例: 2026 EDITION)</label>
              <input type="text" value={year} onChange={(e) => setYear(e.target.value)} className="w-full p-4 border-2 border-black font-bold outline-none focus:bg-yellow-50" />
            </div>
          </div>
          <button type="submit" className="w-full py-4 bg-black text-white font-black text-xl hover:bg-slate-800 transition-all">設定を保存する</button>
        </form>
      </div>
    </div>
  );
}