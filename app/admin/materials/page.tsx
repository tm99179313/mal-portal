'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Course = {
  id: string;
  name: string;
  year?: string | number;
};

export default function AdminMaterialsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState('');
  const [sessionNo, setSessionNo] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    async function loadCourses() {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, year')
        .order('year', { ascending: false });

      if (error) {
        setMessage('コース一覧の取得に失敗しました: ' + error.message);
        return;
      }

      setCourses(data || []);
    }

    loadCourses();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');

    if (!courseId) {
      setMessage('コースを選択してください。');
      return;
    }

    if (!sessionNo) {
      setMessage('回数を入力してください。');
      return;
    }

    if (!title) {
      setMessage('資料タイトルを入力してください。');
      return;
    }

    if (!file) {
      setMessage('PDFファイルを選択してください。');
      return;
    }

    if (file.type !== 'application/pdf') {
      setMessage('PDFファイルを選択してください。');
      return;
    }

    setIsUploading(true);

    try {
      const safeFileName = file.name.replace(/[^\w.\-ぁ-んァ-ン一-龥]/g, '_');

      const filePath = `${courseId}/session-${String(sessionNo).padStart(
        2,
        '0'
      )}-${Date.now()}-${safeFileName}`;

      // 1. PDF本体はSupabase Storageへ直接アップロード
      const { error: uploadError } = await supabase.storage
        .from('course-materials')
        .upload(filePath, file, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        throw new Error('Storageアップロード失敗: ' + uploadError.message);
      }

      // 2. Vercel APIにはPDF本体を送らず、ファイル情報だけ送る
      const res = await fetch('/api/admin/materials/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          sessionNo,
          title,
          fileName: file.name,
          filePath,
        }),
      });

      const text = await res.text();

      let result: any = {};
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error(
          'APIがJSONではない応答を返しました。APIルートまたはデプロイ状態を確認してください。'
        );
      }

      if (!res.ok) {
        throw new Error(result.error || 'DB登録に失敗しました。');
      }

      setMessage('資料をアップロードしました。次にAI用データ作成へ進めます。');
      setSessionNo('');
      setTitle('');
      setFile(null);
    } catch (err: any) {
      setMessage(err.message || 'エラーが発生しました。');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8">
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold mb-2">資料管理</h1>

        <p className="text-sm text-slate-500 mb-8">
          セミナー資料PDFをアップロードし、AI質問箱用のデータを作成します。
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2">コース</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-3"
            >
              <option value="">選択してください</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.year ? `${course.year} ` : ''}
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">回数</label>
            <input
              type="number"
              value={sessionNo}
              onChange={(e) => setSessionNo(e.target.value)}
              placeholder="例：1"
              className="w-full border border-slate-300 rounded-lg p-3"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">資料タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：アライナー矯正の全体像"
              className="w-full border border-slate-300 rounded-lg p-3"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">PDFファイル</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full border border-slate-300 rounded-lg p-3"
            />

            <p className="text-xs text-slate-400 mt-2">
              PDFはVercel APIを通さず、Supabase Storageへ直接アップロードします。
            </p>
          </div>

          <button
            type="submit"
            disabled={isUploading}
            className="w-full bg-blue-600 text-white font-bold rounded-lg py-3 hover:bg-blue-700 disabled:bg-slate-300"
          >
            {isUploading ? 'アップロード中...' : 'PDFをアップロード'}
          </button>
        </form>

        {message && (
          <div className="mt-6 rounded-lg bg-slate-100 border border-slate-200 p-4 text-sm font-bold">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
