'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SessionPlayerPage({ params }: { params: Promise<{ course_id: string, session_id: string }> }) {
  const { course_id: courseId, session_id: sessionId } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    async function fetchSession() {
      const { data } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
      setSession(data);
    }
    fetchSession();
  }, [sessionId]);

  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?rel=0` : url;
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <nav className="border-b-4 border-black p-4 flex justify-between items-center bg-white sticky top-0 z-50">
        <Link href={`/courses/${courseId}`} className="text-sm font-bold border-2 border-black px-4 py-2 hover:bg-slate-50">← 目次へ戻る</Link>
        <span className="font-black italic text-xl tracking-tighter">MAL+ PORTAL</span>
      </nav>

      <main className="max-w-5xl mx-auto p-6 md:p-12">
        <h1 className="text-4xl font-black mb-10 leading-tight border-l-8 border-black pl-4">{session?.title}</h1>

        {session?.zoom_url && (
          <div className="mb-12 bg-blue-600 border-4 border-black p-8 text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
            <h2 className="text-2xl font-black mb-4 italic tracking-widest">LIVE BROADCAST</h2>
            <a href={session.zoom_url} target="_blank" rel="noreferrer" className="inline-block bg-yellow-400 text-black px-12 py-5 border-4 border-black font-black text-2xl hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">Zoom で受講する</a>
          </div>
        )}

        {session?.video_url && (
          <div className="aspect-video w-full bg-black border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <iframe src={getEmbedUrl(session.video_url)} className="w-full h-full" allowFullScreen></iframe>
          </div>
        )}

        {session?.pdf_url && (
          <div className="mt-12">
            <a href={session.pdf_url} target="_blank" rel="noreferrer" className="inline-block border-4 border-black px-10 py-4 font-black text-xl hover:bg-slate-50 transition-all">📄 セミナー資料(PDF)を表示</a>
          </div>
        )}
      </main>
    </div>
  );
}