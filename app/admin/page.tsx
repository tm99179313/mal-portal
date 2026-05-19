'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// 🛑 ここを先生のメールアドレスに書き換えてください
const ADMIN_EMAIL = 'tm99179313@gmail.com';

export default function AdminDashboard() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editPasscode, setEditPasscode] = useState('');
  const [editIsPinned, setEditIsPinned] = useState(false);
　const [editDisplayOrder, setEditDisplayOrder] = useState(10);
  const sortCourses = (courseList: any[]) => {
  return [...courseList].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;

    const orderA = Number(a.display_order ?? 10);
    const orderB = Number(b.display_order ?? 10);

    if (orderA !== orderB) return orderA - orderB;

    return Number(b.year) - Number(a.year);
  });
};

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== ADMIN_EMAIL) {
        router.push('/login');
        return;
      }
      const { data } = await supabase
  .from('courses')
  .select('*')
  .order('is_pinned', { ascending: false })
  .order('display_order', { ascending: true })
  .order('year', { ascending: false });
      setCourses(data || []);
      setIsLoading(false);
    }
    load();
  }, [router]);

  const handleDelete = async (id: string) => {
    if (confirm('本当にこのコースを削除しますか？')) {
      await supabase.from('courses').delete().eq('id', id);
      setCourses(courses.filter(c => c.id !== id));
    }
  };

  const handleEditStart = (course: any) => {
  setEditingCourseId(course.id);
  setEditName(course.name);
  setEditYear(String(course.year));
  setEditPasscode(course.passcode);
  setEditIsPinned(course.is_pinned ?? false);
  setEditDisplayOrder(course.display_order ?? 10);
};

const handleEditSave = async (id: string) => {
  await supabase.from('courses').update({ 
    name: editName, 
    year: Number(editYear), 
    passcode: editPasscode,
    is_pinned: editIsPinned,
    display_order: Number(editDisplayOrder)
  }).eq('id', id);
  
  const updatedCourses = courses.map(c => 
  c.id === id 
    ? { 
        ...c, 
        name: editName, 
        year: Number(editYear), 
        passcode: editPasscode,
        is_pinned: editIsPinned,
        display_order: Number(editDisplayOrder)
      } 
    : c
);

setCourses(sortCourses(updatedCourses));

  setEditingCourseId(null);
};

  if (isLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-500">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 relative font-sans text-slate-800 overflow-hidden">
      <div className="relative z-10 max-w-5xl mx-auto p-8 md:p-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 border-b border-slate-200 pb-6 gap-4 md:gap-0">
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
            <div className="grid grid-cols-2 gap-[2px] opacity-80">
               <div className="w-1.5 h-1.5 bg-blue-600 rounded-sm"></div>
               <div className="w-1.5 h-1.5 bg-blue-400 rounded-sm"></div>
               <div className="w-1.5 h-1.5 bg-blue-300 rounded-sm"></div>
               <div className="w-1.5 h-1.5 bg-blue-600 rounded-sm"></div>
            </div>
            コースマネジメント
          </h1>
          
          {/* 👆 ボタンエリアを拡張し、「受講生画面を確認」ボタンを追加しました */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Link 
              href="/courses" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex-1 md:flex-none text-sm font-bold text-slate-600 bg-white border border-slate-300 px-4 py-2.5 rounded-md shadow-sm hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 active:scale-95 transition-all flex items-center justify-center gap-2 group"
            >
              <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
              受講生画面を確認
            </Link>

            <Link href="/admin/courses/new" className="flex-1 md:flex-none relative overflow-hidden bg-blue-600 text-white px-6 py-2.5 rounded-md font-semibold shadow-sm hover:bg-blue-500 hover:shadow-[0_0_15px_rgba(37,99,235,0.4)] active:scale-95 transition-all duration-300 group border border-blue-500 inline-block text-center">
              <span className="relative z-10 flex items-center justify-center gap-2">
                <span className="font-mono text-blue-200 opacity-70">+</span> 新規追加
              </span>
              <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:left-[200%] transition-all duration-700 ease-in-out"></div>
            </Link>
          </div>
        </header>

        <div className="space-y-6">
          {courses.map(course => (
            <div key={course.id} className="relative bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between shadow-sm hover:shadow-[0_0_20px_rgba(37,99,235,0.1)] hover:border-blue-300 transition-all duration-300 group overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top"></div>

              {editingCourseId === course.id ? (
                <div className="flex-grow pl-2 pr-6 mb-4 md:mb-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-500 font-bold mb-1 block">年 (EDITION)</label>
                      <input type="text" value={editYear} onChange={e=>setEditYear(e.target.value)} className="bg-slate-50 border border-blue-300 p-2 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 font-bold mb-1 block">パスコード</label>
                      <input type="text" value={editPasscode} onChange={e=>setEditPasscode(e.target.value)} className="bg-slate-50 border border-blue-300 p-2 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="text-xs text-slate-500 font-bold mb-1 block">コース名</label>
                    <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} className="bg-slate-50 border border-blue-300 p-2 rounded w-full font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
  <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
    <input
      type="checkbox"
      checked={editIsPinned}
      onChange={(e) => setEditIsPinned(e.target.checked)}
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
      value={editDisplayOrder}
      onChange={(e) => setEditDisplayOrder(Number(e.target.value))}
      className="bg-slate-50 border border-blue-300 p-2 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
    />
    <p className="text-xs text-slate-400 mt-1">
      数字が小さいほど上に表示されます
    </p>
  </div>
</div>
                </div>
              ) : (
                <div className="mb-4 md:mb-0 pl-2 flex-grow">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
  <span className="font-mono bg-slate-50 border border-slate-200 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-sm inline-flex items-center tracking-widest">
    <span className="text-blue-400 mr-1.5 opacity-60">{'/>'}</span>
    {course.year}_EDITION
  </span>

  {course.is_pinned && (
    <span className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-sm">
      📌 ピン留め中
    </span>
  )}

  <span className="bg-slate-50 border border-slate-200 text-slate-500 text-xs font-bold px-2.5 py-1 rounded-sm">
    表示順：{course.display_order ?? 10}
  </span>
</div>
                  
                  <Link href={`/admin/courses/${course.id}/sessions`} className="block group/link w-fit">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2 group-hover/link:text-blue-600 transition-colors flex items-center gap-2">
                      {course.name}
                      <svg className="w-5 h-5 text-slate-300 group-hover/link:text-blue-500 transition-colors opacity-0 group-hover/link:opacity-100 transform -translate-x-2 group-hover/link:translate-x-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </h2>
                  </Link>
                  
                  <p className="text-sm font-medium text-slate-500 flex items-center gap-2 mt-1">
                    パスコード: 
                    <span className="font-mono bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-xs tracking-widest flex items-center gap-1.5 shadow-inner">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      {course.passcode}
                    </span>
                  </p>
                </div>
              )}

              <div className="flex gap-3 relative z-10 items-end">
                {editingCourseId === course.id ? (
                  <>
                    <button onClick={() => handleEditSave(course.id)} className="bg-emerald-500 text-white border border-emerald-600 px-5 py-2 rounded-md font-bold hover:bg-emerald-600 active:scale-95 transition-all shadow-sm">
                      保存
                    </button>
                    <button onClick={() => setEditingCourseId(null)} className="bg-slate-200 text-slate-700 border border-slate-300 px-5 py-2 rounded-md font-bold hover:bg-slate-300 active:scale-95 transition-all shadow-sm">
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleEditStart(course)} className="border border-slate-300 text-slate-700 px-5 py-2 rounded-md font-semibold hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 active:scale-95 transition-all">
                      コース編集
                    </button>
                    <button onClick={() => handleDelete(course.id)} className="border border-red-200 text-red-600 px-5 py-2 rounded-md font-semibold hover:bg-red-50 hover:border-red-300 active:scale-95 transition-all">
                      削除
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
