import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 60;

type MatchedChunk = {
  id: string;
  material_id: string;
  course_id: string;
  session_no: number | null;
  page_start: number | null;
  page_end: number | null;
  content: string;
  summary: string | null;
  similarity: number;
};

async function createEmbedding(text: string) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing');
  }

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || 'Embedding作成に失敗しました。');
  }

  return data.data[0].embedding;
}

async function createAnswer(question: string, chunks: MatchedChunk[]) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing');
  }

  const context = chunks
    .map((chunk, index) => {
      const sessionLabel =
        chunk.session_no !== null && chunk.session_no !== undefined
          ? `第${chunk.session_no}回`
          : '回数不明';

      const pageLabel =
        chunk.page_start && chunk.page_end
          ? `p.${chunk.page_start}-${chunk.page_end}`
          : 'ページ不明';

      return [
        `【資料${index + 1}】`,
        `回：${sessionLabel}`,
        `ページ：${pageLabel}`,
        `関連度：${chunk.similarity}`,
        `本文：`,
        chunk.content,
      ].join('\n');
    })
    .join('\n\n---\n\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.15,
      messages: [
        {
          role: 'system',
          content: [
            'あなたはMake A Line Plusの受講者向けAIアシスタントです。',
            '対象は歯科医師・アライナー矯正ビギナー〜中級者です。',
            '',
            '必ず、与えられたセミナー資料抜粋を主根拠に回答してください。',
            '資料に書かれていないことを、あたかも資料にあるように断定してはいけません。',
            'ただし、歯科医学的に一般的な補足が必要な場合は、「補足」と明示して簡潔に説明してかまいません。',
            '',
            '回答は以下の形式を基本にしてください。',
            '',
            '1. 結論',
            '2. 資料に基づく説明',
            '3. 臨床での使い方・見るポイント',
            '4. 注意点',
            '5. 参照資料',
            '',
            '回答は日本語で、専門家向けだがわかりやすくしてください。',
            '箇条書きを多めに使い、長すぎる文章は避けてください。',
            '治療方針を断定せず、最終判断は担当歯科医師が行う前提で表現してください。',
            '',
            '資料内で十分に確認できない場合は、',
            '「この点は今回の資料抜粋だけでは明確に確認できません」と正直に述べてください。',
          ].join('\n'),
        },
        {
          role: 'user',
          content: [
            '以下のセミナー資料抜粋をもとに、受講者の質問へ回答してください。',
            '',
            '【受講者の質問】',
            question,
            '',
            '【セミナー資料抜粋】',
            context,
            '',
            '【回答時の追加ルール】',
            '- まず短く結論を出してください。',
            '- 資料に基づく内容と、一般的な補足を混ぜないでください。',
            '- 患者説明に使える言い回しがあれば入れてください。',
            '- 最後に参照した回・ページを必ず示してください。',
          ].join('\n'),
        },
      ],
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || '回答生成に失敗しました。');
  }

  return data.choices?.[0]?.message?.content || '';
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'course AI ask API is working',
  });
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'ログイン情報が確認できません。再ログインしてください。' },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user || !user.email) {
      return NextResponse.json(
        { error: 'ユーザー確認に失敗しました。再ログインしてください。' },
        { status: 401 }
      );
    }

    const body = await req.json();

    const courseId = String(body.courseId || '');
    const question = String(body.question || '').trim();

    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId is required' },
        { status: 400 }
      );
    }

    if (!question) {
      return NextResponse.json(
        { error: '質問を入力してください。' },
        { status: 400 }
      );
    }

    if (question.length > 2000) {
      return NextResponse.json(
        { error: '質問が長すぎます。2000文字以内にしてください。' },
        { status: 400 }
      );
    }

    // 受講権限チェック
    const { data: accessRows, error: accessError } = await supabaseAdmin
      .from('course_access')
      .select('id, email, course_id, status')
      .eq('email', user.email)
      .eq('course_id', courseId);

    if (accessError) {
      return NextResponse.json(
        { error: accessError.message },
        { status: 500 }
      );
    }

    const hasAccess = (accessRows || []).some((row) => {
      const status = String(row.status || '').toLowerCase();

      // 明確に無効化されたものだけ弾く。status運用が固まっていなくても動くようにする。
      if (status === 'revoked') return false;
      if (status === 'disabled') return false;
      if (status === 'inactive') return false;
      if (status === '停止') return false;
      if (status === '無効') return false;

      return true;
    });

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'このコースのAI質問箱を利用する権限がありません。' },
        { status: 403 }
      );
    }

    const questionEmbedding = await createEmbedding(question);

    const { data: matchedChunks, error: matchError } = await supabaseAdmin.rpc(
      'match_material_chunks',
      {
        query_embedding: questionEmbedding,
        match_course_id: courseId,
        match_count: 10,
      }
    );

    if (matchError) {
      return NextResponse.json(
        { error: matchError.message },
        { status: 500 }
      );
    }

    const chunks = (matchedChunks || []) as MatchedChunk[];

    if (chunks.length === 0) {
      return NextResponse.json(
        {
          error:
            'このコースには、まだAI用データが作成された資料がありません。',
        },
        { status: 400 }
      );
    }

    const answer = await createAnswer(question, chunks);

    await supabaseAdmin.from('ai_question_logs').insert({
      user_id: user.id,
      email: user.email,
      course_id: courseId,
      question,
      answer,
    });

    return NextResponse.json({
      ok: true,
      answer,
      references: chunks.map((chunk) => ({
        material_id: chunk.material_id,
        session_no: chunk.session_no,
        page_start: chunk.page_start,
        page_end: chunk.page_end,
        similarity: chunk.similarity,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
