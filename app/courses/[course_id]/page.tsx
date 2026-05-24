'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CourseAiBox from '@/components/CourseAiBox';

function getYouTubeEmbedUrl(url: string) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}?rel=0`;
  }
  return null;
}

export default function CourseStudyPage({ params }: { params: Promise<{ course_id: string }> }) {
  const { course_id: courseId } = use(params);
  const router = useRouter();

  const [course, setCourse] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [inputPasscode, setInputPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [activeSession, setActiveSession] = useState<any>(null);

  useEffect(() => {
    if (activeSession) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [activeSession]);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: c } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (!c) {
        router.push('/courses');
        return;
      }

      setCourse(c);

      const unlocked = localStorage.getItem(`mal_unlocked_${courseId}`);

      if (unlocked === 'true') {
        setIsUnlocked(true);
        fetchSessions(courseId);
      }

      setIsLoading(false);
    }

    load();
  }, [courseId, router]);

  const fetchSessions = async (id: string) => {
    const { data: s } = await supabase
      .from('sessions')
      .select('*')
      .eq('course_id', id)
      .order('order_index', { ascending: true });

    setSessions(s || []);
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();

    if (inputPasscode === course?.passcode) {
      setIsUnlocked(true);
      setErrorMsg('');
      localStorage.setItem(`mal_unlocked_${courseId}`, 'true');
      fetchSessions(courseId);
    } else {
      setErrorMsg('パスコードが正しくありません');
      setInputPasscode('');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-500">
        読み込み中...
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100 rounded-full blur-[100px] opacity-40 pointer-events-none"></div>

        <div className="bg-white border border-slate-200 rounded-2xl p-10 max-w-md w-full shadow-xl relative z-10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center shadow-inner">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z"></path>
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
            {course?.name}
          </h2>

          <p className="text-sm text-center text-slate-500 mb-8">
            このコースを学習するにはパスコードを入力してください。
          </p>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <input
                type="text"
                value={inputPasscode}
                onChange={(e) => setInputPasscode(e.target.value)}
                placeholder="パスコードを入力"
                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center tracking-widest transition-all"
                required
              />
            </div>

            {errorMsg && (
              <p className="text-red-500 text-xs font-bold text-center bg-red-50 py-2 rounded">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-lg hover:bg-blue-500 active:scale-[0.98] transition-all shadow-md flex justify-center items-center gap-2"
            >
              ロックを解除
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/courses" className="text-sm text-slate-400 hover:text-slate-600 font-bold transition-colors">
              ← コース一覧に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/courses" className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
            <span>←</span> コース一覧へ
          </Link>

          <span className="text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full tracking-widest">
            {course?.year}_EDITION
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 md:p-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
            {course?.name}
          </h1>
          <p className="text-slate-500 font-medium">
            学習するセッションを選択してください
          </p>
        </div>

        <div className="mb-10">
          <CourseAiBox courseId={courseId} />
        </div>

        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-sm">
              <p className="text-slate-400 font-bold">
                まだセッションが登録されていません。
              </p>
            </div>
          ) : (
            sessions.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActiveSession({ ...s, index: i + 1 })}
                className="w-full text-left bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-6 hover:border-blue-400 hover:shadow-md transition-all group active:scale-[0.99]"
              >
                <div className="bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 font-mono font-bold text-xl px-4 py-3 rounded-lg text-center min-w-[70px] transition-colors">
                  #{i + 1}
                </div>

                <div className="flex-grow">
                  <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {s.title}
                  </h3>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {s.video_url && (
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        🎬 動画収録あり
                      </span>
                    )}

                    {s.zoom_url && (
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        🔵 Zoomライブ
                      </span>
                    )}

                    {s.pdf_url && (
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        📄 配布資料あり
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-slate-300 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </div>
              </button>
            ))
          )}
        </div>
      </main>

      {activeSession && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-slate-900/95 backdrop-blur-sm transition-opacity duration-300">
          <div className="w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[95vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 shrink-0">
              <h3 className="text-white font-bold text-lg flex items-center gap-3">
                <span className="text-blue-500 font-mono">#{activeSession.index}</span>
                {activeSession.title}
              </h3>

              <button
                onClick={() => setActiveSession(null)}
                className="text-slate-500 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full p-2 transition-all active:scale-90"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-grow bg-black">
              {getYouTubeEmbedUrl(activeSession.video_url) ? (
                <div className="relative w-full pb-[56.25%] bg-black">
                  <iframe
                    src={`${getYouTubeEmbedUrl(activeSession.video_url)}&autoplay=1`}
                    className="absolute top-0 left-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              ) : activeSession.zoom_url ? (
                <div className="w-full aspect-video bg-slate-900 flex flex-col items-center justify-center p-10 text-center border-b border-slate-800">
                  <div className="w-20 h-20 bg-blue-900/50 border border-blue-700 rounded-full flex items-center justify-center mb-6">
                    <span className="text-4xl">🔵</span>
                  </div>

                  <h4 className="text-2xl font-bold text-white mb-3">
                    Zoom ライブセッション
                  </h4>

                  <p className="text-slate-400 mb-8 max-w-md leading-relaxed">
                    この回はZoomでのリアルタイム配信となります。
                    <br />
                    お時間になりましたら、下のボタンから参加してください。
                  </p>

                  <a
                    href={activeSession.zoom_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-500 active:scale-95 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                  >
                    Zoomを起動する
                  </a>
                </div>
              ) : (
                <div className="w-full aspect-video bg-slate-900 flex items-center justify-center border-b border-slate-800">
                  <p className="text-slate-600 font-bold">
                    コンテンツが準備中です
                  </p>
                </div>
              )}

              <div className="p-6 md:p-8 bg-slate-950 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h4 className="text-slate-300 font-bold text-sm mb-1">
                    セッション配布資料
                  </h4>
                  <p className="text-slate-500 text-xs">
                    動画やライブ配信に合わせてご活用ください。
                  </p>
                </div>

                <div>
                  {activeSession.pdf_url ? (
                    <a
                      href={activeSession.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-800 border border-slate-700 text-white px-6 py-3 rounded-lg font-bold hover:bg-slate-700 hover:border-slate-500 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <span>📄</span> 資料 (PDF) を開く
                    </a>
                  ) : (
                    <span className="text-slate-600 font-bold text-sm bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                      現在資料はありません
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 z-[-1] cursor-pointer" onClick={() => setActiveSession(null)}></div>
        </div>
      )}
    </div>
  );
}
