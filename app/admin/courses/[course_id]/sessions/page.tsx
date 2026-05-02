'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// 🛑 ここを先生のメールアドレスに書き換えてください
const ADMIN_EMAIL = 'tm99179313@gmail.com';

export default function SessionManagePage({ params }: { params: Promise<{ course_id: string }> }) {
  const { course_id: courseId } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newTitle, setNewTitle] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newPdfUrl, setNewPdfUrl] = useState('');
  const [newZoomUrl, setNewZoomUrl] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editPdfUrl, setEditPdfUrl] = useState('');
  const [editZoomUrl, setEditZoomUrl] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== ADMIN_EMAIL) { router.push('/login'); return; }
      
      const { data: c } = await supabase.from('courses').select('*').eq('id', courseId).single();
      setCourse(c);
      const { data: s } = await supabase.from('sessions').select('*').eq('course_id', courseId).order('order_index', { ascending: true });
      setSessions(s || []);
      setIsLoading(false);
    }
    load();
  }, [courseId, router]);

  const move = async (index: number, dir: 'up' | 'down') => {
    const newS = [...sessions];
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newS.length) return;
    [newS[index], newS[target]] = [newS[target], newS[index]];
    
    setSessions(newS);
    await supabase.from('sessions').update({ order_index: index + 1 }).eq('id', newS[index].id);
    await supabase.from('sessions').update({ order_index: target + 1 }).eq('id', newS[target].id);
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newVideoUrl && newZoomUrl) return alert("動画URLとZoomURLは同時登録できません");
    
    await supabase.from('sessions').insert([{ 
      course_id: courseId, 
      title: newTitle, 
      video_url: newVideoUrl || null, 
      pdf_url: newPdfUrl || null, 
      zoom_url: newZoomUrl || null,
      order_index: sessions.length + 1 
    }]);
    window.location.reload();
  };

  const updateSession = async (id: string) => {
    if (editVideoUrl && editZoomUrl) return alert("動画URLとZoomURLは同時登録できません");

    await supabase.from('sessions').update({ 
      title: editTitle,
      video_url: editVideoUrl || null,
      pdf_url: editPdfUrl || null,
      zoom_url: editZoomUrl || null
    }).eq('id', id);

    setSessions(sessions.map(s => s.id === id ? { 
      ...s, 
      title: editTitle,
      video_url: editVideoUrl || null,
      pdf_url: editPdfUrl || null,
      zoom_url: editZoomUrl || null
    } : s));
    setEditingId(null);
  };

  if (isLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-500">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 relative font-sans text-slate-800 overflow-hidden">
      <div className="relative z-10 max-w-5xl mx-auto p-8 md:p-12">
        <header className="mb-10">
          <Link href="/admin" className="text-blue-600 text-sm font-bold hover:underline mb-6 inline-flex items-center gap-1 active:scale-95 transition-transform">
            <span>←</span> 管理画面へ戻る
          </Link>
          <h1 className="text-xl font-bold text-slate-500 mb-1">{course?.name}</h1>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
            <div className="grid grid-cols-2 gap-[2px] opacity-80">
               <div className="w-1.5 h-1.5 bg-blue-600 rounded-sm"></div>
               <div className="w-1.5 h-1.5 bg-blue-400 rounded-sm"></div>
               <div className="w-1.5 h-1.5 bg-blue-300 rounded-sm"></div>
               <div className="w-1.5 h-1.5 bg-blue-600 rounded-sm"></div>
            </div>
            セミナー回一覧
          </h2>
        </header>

        {/* 新規追加フォーム */}
        <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm mb-12">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="text-blue-600">+</span> 新しいセッションを追加
          </h3>
          <form onSubmit={add} className="space-y-5">
            <input type="text" placeholder="タイトル (例: 第1回 アライナー矯正の基礎)" value={newTitle} onChange={e=>setNewTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium" required />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 動画URLを入力したら、Zoomの値を空にする */}
              <input type="text" placeholder="🎬 動画URL" value={newVideoUrl} onChange={e=>{ setNewVideoUrl(e.target.value); if(e.target.value) setNewZoomUrl(''); }} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-mono" />
              {/* ZoomURLを入力したら、動画の値を空にする */}
              <input type="text" placeholder="🔵 Zoom URL" value={newZoomUrl} onChange={e=>{ setNewZoomUrl(e.target.value); if(e.target.value) setNewVideoUrl(''); }} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-mono" />
            </div>
            <input type="text" placeholder="📄 資料URL（任意）" value={newPdfUrl} onChange={e=>setNewPdfUrl(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-mono" />
            <div className="pt-2">
              <button className="relative overflow-hidden w-full bg-blue-600 text-white font-bold py-4 rounded-md shadow-sm hover:bg-blue-500 active:scale-[0.98] transition-all duration-300 group border border-blue-500">
                <span className="relative z-10">セッションを登録する</span>
                <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:left-[200%] transition-all duration-700 ease-in-out"></div>
              </button>
            </div>
          </form>
        </div>

        {/* 登録済みリスト */}
        <div>
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-700">
            登録済みのセッション <span className="text-slate-400 font-normal text-sm">({sessions.length}件)</span>
          </h3>
          
          <div className="space-y-4">
            {sessions.map((s, i) => (
              <div key={s.id} className="relative bg-white border border-slate-200 rounded-lg p-5 flex items-start md:items-center gap-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 group overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top"></div>
                
                <div className="flex flex-col gap-1 pl-2 pt-1 md:pt-0">
                  <button onClick={()=>move(i, 'up')} disabled={i===0} className="p-1.5 bg-slate-50 border border-slate-200 rounded text-slate-500 hover:bg-slate-100 hover:text-blue-600 active:scale-95 disabled:opacity-30 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"></path></svg>
                  </button>
                  <button onClick={()=>move(i, 'down')} disabled={i===sessions.length-1} className="p-1.5 bg-slate-50 border border-slate-200 rounded text-slate-500 hover:bg-slate-100 hover:text-blue-600 active:scale-95 disabled:opacity-30 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                  </button>
                </div>

                <div className="flex-grow flex flex-col md:flex-row items-start md:items-center gap-4 w-full">
                  <span className="font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm font-bold tracking-widest min-w-[60px] text-center mt-1 md:mt-0">
                    #{i+1}
                  </span>
                  
                  {editingId === s.id ? (
                    <div className="flex-grow flex flex-col gap-3 w-full pr-2">
                      <input type="text" placeholder="タイトル" value={editTitle} onChange={e=>setEditTitle(e.target.value)} className="w-full bg-slate-50 border border-blue-300 p-2.5 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800" />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {/* 編集時：動画URLを入力したら、Zoomの値を空にする */}
                        <input type="text" placeholder="🎬 動画URL" value={editVideoUrl} onChange={e=>{ setEditVideoUrl(e.target.value); if(e.target.value) setEditZoomUrl(''); }} className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" />
                        {/* 編集時：ZoomURLを入力したら、動画の値を空にする */}
                        <input type="text" placeholder="🔵 Zoom URL" value={editZoomUrl} onChange={e=>{ setEditZoomUrl(e.target.value); if(e.target.value) setEditVideoUrl(''); }} className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" />
                      </div>
                      
                      <div className="flex flex-col md:flex-row gap-2">
                        <input type="text" placeholder="📄 資料URL（任意）" value={editPdfUrl} onChange={e=>setEditPdfUrl(e.target.value)} className="flex-grow bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" />
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => updateSession(s.id)} className="bg-emerald-500 text-white px-5 py-2 rounded text-sm font-bold hover:bg-emerald-600 active:scale-95 transition-all shadow-sm">保存</button>
                          <button onClick={() => setEditingId(null)} className="bg-slate-200 text-slate-700 px-5 py-2 rounded text-sm font-bold hover:bg-slate-300 active:scale-95 transition-all shadow-sm">取消</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-grow flex flex-col">
                        <span className="font-bold text-lg text-slate-800">{s.title}</span>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {s.video_url && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono border border-slate-200 flex items-center gap-1"><span className="text-slate-400">🎬</span> VIDEO</span>}
                          {s.zoom_url && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-mono border border-blue-200 flex items-center gap-1"><span className="text-blue-400">🔵</span> ZOOM</span>}
                          {s.pdf_url && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono border border-slate-200 flex items-center gap-1"><span className="text-slate-400">📄</span> PDF</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 pr-2 relative z-10 shrink-0 mt-3 md:mt-0">
                        <button onClick={() => { 
                          setEditingId(s.id); 
                          setEditTitle(s.title); 
                          setEditVideoUrl(s.video_url || '');
                          setEditZoomUrl(s.zoom_url || '');
                          setEditPdfUrl(s.pdf_url || '');
                        }} className="border border-slate-300 text-slate-600 px-4 py-2 rounded font-semibold hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 active:scale-95 transition-all text-sm">
                          編集
                        </button>
                        <button onClick={async () => { if(confirm('本当に削除しますか？')) { await supabase.from('sessions').delete().eq('id', s.id); window.location.reload(); } }} className="border border-red-200 text-red-500 px-4 py-2 rounded font-semibold hover:bg-red-50 hover:border-red-300 active:scale-95 transition-all text-sm">
                          削除
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}