'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Course = {
  id: string;
  name: string;
  year?: string | number;
};

type Material = {
  id: string;
  course_id: string;
  session_no: number | null;
  title: string;
  file_name: string | null;
  file_path: string | null;
  status: string;
  created_at: string;
};

export default function AdminMaterialsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  const [courseId, setCourseId] = useState('');
  const [sessionNo, setSessionNo] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
    loadMaterials();
  }, []);

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

  async function loadMaterials() {
    const { data, error } = await supabase
      .from('course_materials')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setMessage('資料一覧の取得に失敗しました: ' + error.message);
      return;
    }

    setMaterials(data || []);
  }

  function getCourseLabel(targetCourseId: string) {
    const course = courses.find((c) => c.id === targetCourseId);
    if (!course) return targetCourseId;

    return `${course.year ? `${course.year} ` : ''}${course.name}`;
  }

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
      const safeSessionNo = String(sessionNo).padStart(2, '0');
      const filePath = `${courseId}/session-${safeSessionNo}-${Date.now()}.pdf`;

      // PDF本体はSupabase Storageへ直接アップロード
      const { error: uploadError } = await supabase.storage
        .from('course-materials')
        .upload(filePath, file, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        throw new Error('Storageアップロード失敗: ' + uploadError.message);
      }

      // Vercel APIにはPDF本体を送らず、ファイル情報だけ送る
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

      setMessage('資料をアップロードしました。必要に応じてAI用データ作成を実行してください。');
      setSessionNo('');
      setTitle('');
      setFile(null);

      await loadMaterials();
    } catch (err: any) {
      setMessage(err.message || 'エラーが発生しました。');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleProcess(materialId: string) {
    setMessage('');
    setProcessingId(materialId);

    try {
      const res = await fetch('/api/admin/materials/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          materialId,
        }),
      });

      const text = await res.text();

      let result: any = {};
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error(
          'AI用データ作成APIがJSONではない応答を返しました。APIルートまたはデプロイ状態を確認してください。'
        );
      }

      if (!res.ok) {
        throw new Error(result.error || 'AI用データ作成に失敗しました。');
      }

      setMessage(`AI用データを作成しました。チャンク数：${result.chunks}`);
      await loadMaterials();
    } catch (err: any) {
      setMessage(err.message || 'エラーが発生しました。');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 px-4 py-2.5 rounded-lg shadow-sm hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 active:scale-95 transition-all"
          >
            ← 管理画面に戻る
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
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
                Storage上では安全な英数字ファイル名で保存し、元のファイル名はDBに保存します。
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

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold">アップロード済み資料</h2>
              <p className="text-sm text-slate-500 mt-1">
                PDFをアップロード後、AI用データ作成を実行してください。
              </p>
            </div>

            <button
              onClick={loadMaterials}
              className="text-sm font-bold border border-slate-300 rounded-lg px-4 py-2 bg-white hover:bg-slate-50"
            >
              更新
            </button>
          </div>

          {materials.length === 0 ? (
            <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-4">
              まだ資料がありません。
            </div>
          ) : (
            <div className="space-y-4">
              {materials.map((material) => (
                <div
                  key={material.id}
                  className="border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-bold bg-slate-100 border border-slate-200 rounded px-2 py-1">
                        第{material.session_no ?? '-'}回
                      </span>

                      <span
                        className={
                          material.status === 'processed'
                            ? 'text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-2 py-1'
                            : 'text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-1'
                        }
                      >
                        {material.status === 'processed' ? 'AIデータ作成済み' : '未処理'}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold">{material.title}</h3>

                    <p className="text-sm text-slate-500 mt-1">
                      {getCourseLabel(material.course_id)}
                    </p>

                    <p className="text-xs text-slate-400 mt-1">
                      元ファイル名：{material.file_name || '-'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleProcess(material.id)}
                    disabled={processingId === material.id}
                    className="bg-indigo-600 text-white font-bold rounded-lg px-5 py-3 hover:bg-indigo-700 disabled:bg-slate-300"
                  >
                    {processingId === material.id
                      ? 'AI用データ作成中...'
                      : material.status === 'processed'
                      ? 'AI用データを再作成'
                      : 'AI用データ作成'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
