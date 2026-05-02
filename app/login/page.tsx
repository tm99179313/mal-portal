'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// 🛑 管理者のメールアドレス（これと一致した場合は /admin へ飛ぶ）
const ADMIN_EMAIL = 'tm99179313@gmail.com';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // ログインモードか、新規登録モードかを切り替えるフラグ
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isSignUp) {
      // 📝 新規登録の処理
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        // 登録成功したらそのままコース一覧へ
        router.push('/courses');
      }
    } else {
      // 🔑 ログインの処理
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg('ログインに失敗しました。メールアドレスかパスワードが間違っています。');
      } else {
        // 管理者のメアドなら管理画面へ、それ以外なら受講生画面へ
        if (email === ADMIN_EMAIL) {
          router.push('/admin');
        } else {
          router.push('/courses');
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl p-10 max-w-md w-full shadow-xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center justify-center gap-2 mb-2">
            <div className="grid grid-cols-2 gap-[2px] opacity-80">
               <div className="w-2 h-2 bg-blue-600 rounded-sm"></div>
               <div className="w-2 h-2 bg-blue-400 rounded-sm"></div>
               <div className="w-2 h-2 bg-blue-300 rounded-sm"></div>
               <div className="w-2 h-2 bg-blue-600 rounded-sm"></div>
            </div>
            <span className="italic">MAL+ PORTAL</span>
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            {isSignUp ? '新しいアカウントを作成します' : 'アカウント情報を入力してログイン'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">EMAIL ADDRESS</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full bg-slate-50 border-2 border-slate-200 p-3 rounded-md focus:outline-none focus:border-blue-500 transition-colors"
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">PASSWORD</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full bg-slate-50 border-2 border-slate-200 p-3 rounded-md focus:outline-none focus:border-blue-500 transition-colors"
              required 
            />
            {isSignUp && <p className="text-[10px] text-slate-400 mt-1">※パスワードは6文字以上で設定してください。</p>}
          </div>
          
          {errorMsg && <p className="text-red-500 text-xs font-bold text-center">{errorMsg}</p>}
          
          <button type="submit" className="w-full bg-black text-white font-bold py-4 rounded-md hover:bg-slate-800 active:scale-[0.98] transition-all tracking-widest mt-4">
            {isSignUp ? 'アカウントを作成する' : 'ログインする'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          <button 
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg(''); // 切り替えたらエラーメッセージを消す
            }} 
            className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
          >
            {isSignUp ? 'すでにアカウントをお持ちの方はこちら (ログイン)' : '初めての方はこちら (新規登録)'}
          </button>
        </div>
      </div>
    </div>
  );
}