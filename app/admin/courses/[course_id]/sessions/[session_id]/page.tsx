'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

const getYouTubeId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function SessionPlayerPage({ params }: { params: Promise<{ course_id: string, session_id: string }> }) {
  const { course_id, session_id } = use(params);
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSession() {
      const { data } = await supabase
        .from('sessions')
        .select('*, courses(name)')
        .eq('id', session_id)
        .single();
      
      setSession(data);
      setIsLoading(false);
    }
    fetchSession();
  }, [session_id]);

  if (isLoading) return <div className="p-10 font-black text-3xl italic bg-black text-white min-h-screen">読み込み中...</div>;
  if (!session) return <div className="p-10 text-2xl bg-black text-white min-h-screen">セッションが見つかりません。</div>;

  const videoId = getYouTubeId(session.video_url);

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-end border-b-4 border-[#00FF00] pb-4">
          <div>
            <p className="text-[#00FF00] font-black uppercase tracking-tighter text-xl">
              {session.courses?.name}
            </p>
            <h1 className="text-4xl md:text-6xl font-black uppercase italic leading-none">
              {session.title}
            </h1>
          </div>
          <Link href={`/admin/courses/${course_id}/sessions`} className="text-sm font-bold border-2 border-white px-4 py-2 hover:bg-white hover:text-black transition-all">
            一覧に戻る
          </Link>
        </div>

        {/* Zoomリンクがある場合だけ表示される特別ボタン */}
        {session.zoom_url && (
          <div className="mb-12">
            <a 
              href={session.zoom_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block w-full text-center bg-blue-600 text-white text-3xl font-black py-6 border-4 border-white shadow-[10px_10px_0px_0px_rgba(0,255,0,1)] hover:bg-blue-500 transition-all"
            >
              🔴 今すぐZoomでライブ受講する
            </a>
          </div>
        )}

        <div className="relative w-full aspect-video border-8 border-white shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] bg-gray-900">
          {videoId ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
              className="absolute top-0 left-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          ) : (
            <div className="flex items-center justify-center h-full text-2xl font-bold italic text-gray-500">
              まだアーカイブ動画が登録されていません
            </div>
          )}
        </div>
      </div>
    </main>
  );
}