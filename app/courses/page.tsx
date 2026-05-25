'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StudentCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkingCourseId, setCheckingCourseId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // 🔒 ログインしているかチェック
      const { data: { user } } = await supabase.auth.getUser();

      // ログインしていなければ、強制的にログイン画面へ飛ばす
      if (!user) {
        router.push('/login');
        return;
      }

      // ログインが確認できたら、コース一覧を取得
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('display_order', { ascending: true })
        .order('year', { ascending: false });

      if (error) {
        console.error('コース取得エラー:', error);
        alert('コース一覧の取得に失敗しました。');
        setIsLoading(false);
        return;
      }

      setCourses(data || []);
      setIsLoading(false);
    }

    load();
  }, [router]);

  const handleCourseClick = async (course: any) => {
    setCheckingCourseId(course.id);

    try {
      // ログインユーザーを取得
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user || !user.email) {
        alert('ログイン情報を確認できませんでした。再度ログインしてください。');
        router.push('/login');
        return;
      }

      const userEmail = user.email.toLowerCase();

      // course_access に許可があるか確認
      const { data: access, error: accessError } = await supabase
        .from('course_access')
        .select('*')
        .eq('email', userEmail)
        .eq('course_id', course.id)
        .eq('status', 'active')
        .maybeSingle();

      if (accessError) {
        console.error('受講権限確認エラー:', accessError);
        alert('受講権限の確認中にエラーが発生しました。');
        return;
      }

      // 許可がない場合は入れない
      if (!access) {
        alert('このコースの受講権限がありません。事務局までお問い合わせください。');
        return;
      }

      // 許可があればコースページへ進む
      router.push(`/courses/${course.id}`);
    } finally {
      setCheckingCourseId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-500">
        認証情報を確認中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <div className="grid grid-cols-2 gap-[2px] opacity-80">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-sm"></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-sm"></div>
              <div className="w-1.5 h-1.5 bg-blue-300 rounded-sm"></div>
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-sm"></div>
            </div>
            MAL+ PORTAL
          </h1>

          <div className="flex items-center gap-4">
            <Link
    href="/case-ai"
    title="Hidden Case Room"
    className="mr-3 text-xl opacity-35 hover:opacity-100 hover:scale-110 transition-all"
  >
    🥷
  </Link>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full tracking-widest">
              STUDENT
            </span>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/login');
              }}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 md:p-12">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">コース一覧</h2>
          <p className="text-slate-500 font-medium">
            参加しているセミナーを選択し、パスコードを入力して学習を開始してください。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map(course => {
            const isChecking = checkingCourseId === course.id;

            return (
              <button
                key={course.id}
                type="button"
                onClick={() => handleCourseClick(course)}
                disabled={isChecking}
                className="group block text-left relative bg-white border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-lg hover:border-blue-400 transition-all duration-300 overflow-hidden active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait"
              >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100 group-hover:bg-blue-500 transition-colors duration-300"></div>

                <div className="flex justify-between items-start mb-6">
                  <span className="font-mono bg-slate-50 border border-slate-200 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-sm tracking-widest">
                    {course.year}_EDITION
                  </span>

                  <svg
                    className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z"
                    />
                  </svg>
                </div>

                <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                  {course.name}
                </h3>

                <div className="mt-8 flex items-center justify-between text-sm font-bold text-slate-400 group-hover:text-blue-600 transition-colors">
                  <span>{isChecking ? '受講権限を確認中...' : '学習ページへ進む'}</span>
                  <span className="transform translate-x-0 group-hover:translate-x-2 transition-transform duration-300 text-lg">
                    →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
