'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CourseSessionsPage({ params }: { params: Promise<{ course_id: string }> }) {
  const { course_id: courseId } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: c } = await supabase.from('courses').select('*').eq('id', courseId).single();
      setCourse(c);
      const { data: s } = await supabase.from('sessions').select('*').eq('course_id', courseId).order('order_index', { ascending: true });
      setSessions(s || []);
      if (s && s.length > 0) setSelectedSession(s[0]);
      setIsLoading(false);
    }
    fetchData();
  }, [courseId, router]);

  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?rel=0` : url;
  };

  if (isLoading) return <div className="p-20 text-center font-bold">LOADING...</div>;

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <nav className="border-b-4 border-black p-4 flex justify-between items-center sticky top-0 bg-white z-50">
        <Link href="/courses" className="font-black text-2xl italic">MAL+ PORTAL</Link>
        <Link href="/courses" className="text-sm font-bold border-2 border-black px-4 py-2 hover:bg-slate-100 transition-all">← BACK</Link>
      </nav>
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row">
        <main className="flex-grow p-6 lg:p-12">
          {selectedSession?.zoom_url && (
            <div className="mb-8 bg-blue-600 border-4 border-black p-6 text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center">
              <div><h3 className="text-2xl font-black">LIVE SESSION</h3><p className="font-bold">当日のリンクが設定されています</p></div>
              <a href={selectedSession.zoom_url} target="_blank" rel="noreferrer" className="bg-yellow-400 text-black px-8 py-3 border-4 border-black font-black hover:bg-yellow-300">Zoomで参加</a>
            </div>
          )}
          <div className="aspect-video w-full bg-black border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            {selectedSession?.video_url ? (
              <iframe key={selectedSession.id} src={getEmbedUrl(selectedSession.video_url)} className="w-full h-full" allowFullScreen></iframe>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">アーカイブ準備中</div>
            )}
          </div>
          <div className="mt-8">
            <h1 className="text-3xl font-black mb-1 leading-tight">{selectedSession?.title}</h1>
            <p className="text-slate-500 font-bold">{course?.name}</p>
          </div>
          {selectedSession?.pdf_url && (
            <div className="mt-6">
              <a href={selectedSession.pdf_url} target="_blank" rel="noreferrer" className="inline-block border-4 border-black px-8 py-3 font-black hover:bg-slate-100">📄 資料(PDF)を表示</a>
            </div>
          )}
        </main>
        <aside className="w-full lg:w-[400px] border-l-4 border-black p-6 bg-white overflow-y-auto">
          <h2 className="text-xl font-black mb-6 border-b-2 border-black pb-2 uppercase tracking-widest">Session List</h2>
          <div className="space-y-4">
            {sessions.map((s, i) => (
              <button key={s.id} onClick={() => setSelectedSession(s)} className={`w-full text-left p-4 border-4 border-black font-bold transition-all ${selectedSession?.id === s.id ? 'bg-black text-white' : 'bg-white hover:bg-slate-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
                <div className="text-[10px] opacity-60 mb-1">SESSION {i + 1}</div>
                <div>{s.title}</div>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}