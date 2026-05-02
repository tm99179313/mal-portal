'use server';

import { supabase } from '../supabase'
import { redirect } from 'next/navigation';

export async function createCourse(formData: FormData) {
  // 画面から入力されたデータを受け取る
  const name = formData.get('name')?.toString();
  const year = parseInt(formData.get('year')?.toString() || '0', 10);
  const description = formData.get('description')?.toString();
  const passcode = formData.get('passcode')?.toString();
  const is_published = formData.get('is_published') === 'true';

  // 必須項目が入っているかチェック
  if (!name || !year || !passcode) {
    throw new Error('必須項目が入力されていません');
  }

  // Supabase（データベース）にデータを保存
  const { error } = await supabase
    .from('courses')
    .insert([
      { name, year, description, passcode, is_published }
    ]);

  if (error) {
    console.error('保存エラー:', error);
    throw new Error('コースの作成に失敗しました');
  }

  // 保存に成功したら、後で作る管理画面トップへ移動させる
  redirect(`/admin`);
}