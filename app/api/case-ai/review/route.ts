import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 60;
async function getMalCasePolicy() {
  const { data, error } = await supabaseAdmin
    .from('ai_guidelines')
    .select('content')
    .eq('key', 'mal_case_core_policy')
    .single();

  if (error || !data?.content) {
    return [
      'MAL+では、顔貌評価を診断の神髄とする。',
      '治療計画は歯列からではなく、顔貌・側貌・スマイル・顎位から逆算して立案する。',
      '顔貌から下顎偏位、口唇突出、バッカルコリドー、スマイルライン、顎位の変化可能性を読み取る。',
      '最終的な治療ゴールは、舌が上顎歯列の中に収まり、下顎が無理なく機能し、長期的に噛める状態を作ることである。',
      '第一選択は原則として非抜歯で検討する。',
      'ただし、無理な非抜歯で顔貌・口唇突出・歯周・咬合が悪化する場合は限界を明示する。',
      '抜歯を検討する場合は、失活歯、補綴歯、予後不良歯、咬合上価値が低い歯を優先的に評価する。',
      '治療計画は必ず本命・対抗・大穴で整理する。',
    ].join('\n');
  }

  return data.content;
}

async function createCaseReview(input: {
  patientAge: string;
  patientSex: string;
  chiefComplaint: string;
  caseSummary: string;
  findings: string;
  records: string;
  userPlan: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing');
  }

  const prompt = [
    '【年齢】',
    input.patientAge || '未記入',
    '',
    '【性別】',
    input.patientSex || '未記入',
    '',
    '【主訴】',
    input.chiefComplaint || '未記入',
    '',
    '【症例概要】',
    input.caseSummary || '未記入',
    '',
    '【口腔内・咬合・顔貌・セファロなどの所見】',
    input.findings || '未記入',
    '',
    '【取得済み資料】',
    input.records || '未記入',
    '',
    '【投稿者が考えている治療方針】',
    input.userPlan || '未記入',
  ].join('\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: [
            'あなたは歯科医師向けの症例検討AIです。',
            '目的は、診断確定ではなく、症例の問題点・診断上の論点・治療計画の方向性を整理することです。',
            '',
            '対象は矯正歯科、特にアライナー矯正に関心のある歯科医師です。',
            '回答は専門家向けに、臨床で使える粒度で整理してください。',
            '',
            '重要なルール：',
            '- 医療判断を断定しないでください。',
            '- 情報が不足している場合は、必ず「追加で確認したい資料・所見」を挙げてください。',
            '- 患者固有の診断名や治療方針を確定しないでください。',
            '- 抜歯/非抜歯、外科/非外科、アライナー適応などは「検討ポイント」として整理してください。',
            '- 口腔内写真、セファロ、パノラマ、CT、模型などが未提示なら、その限界を明記してください。',
            '',
            '回答形式：',
            '1. 症例の一言要約',
            '2. 問題点リスト',
            '3. 診断として整理すべき項目',
            '4. 治療計画の方向性',
            '5. アライナー矯正で見るべきポイント',
            '6. リスク・注意点',
            '7. 追加で必要な資料・確認事項',
            '8. 患者説明で使える言い回し',
            '',
            '回答は日本語で、箇条書きを中心にしてください。',
            '長さは目安として1200〜1800字程度にしてください。',
          ].join('\n'),
        },
        {
          role: 'user',
          content: [
            '以下の症例情報をもとに、症例検討を行ってください。',
            '診断確定ではなく、問題点整理と治療計画の方向性の提示をしてください。',
            '',
            prompt,
          ].join('\n'),
        },
      ],
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || '症例AIの回答生成に失敗しました。');
  }

  return data.choices?.[0]?.message?.content || '';
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'case AI review API is working',
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

    // ポータル登録者か確認
    const { data: accessRows, error: accessError } = await supabaseAdmin
      .from('course_access')
      .select('id, status')
      .eq('email', user.email);

    if (accessError) {
      return NextResponse.json({ error: accessError.message }, { status: 500 });
    }

    const hasAnyAccess = (accessRows || []).some((row) => {
      const status = String(row.status || '').toLowerCase();

      if (status === 'revoked') return false;
      if (status === 'disabled') return false;
      if (status === 'inactive') return false;
      if (status === '停止') return false;
      if (status === '無効') return false;

      return true;
    });

    if (!hasAnyAccess) {
      return NextResponse.json(
        { error: '症例相談AIを利用する権限がありません。' },
        { status: 403 }
      );
    }

    const body = await req.json();

    const patientAge = String(body.patientAge || '').trim();
    const patientSex = String(body.patientSex || '').trim();
    const chiefComplaint = String(body.chiefComplaint || '').trim();
    const caseSummary = String(body.caseSummary || '').trim();
    const findings = String(body.findings || '').trim();
    const records = String(body.records || '').trim();
    const userPlan = String(body.userPlan || '').trim();

    if (!chiefComplaint && !caseSummary && !findings) {
      return NextResponse.json(
        { error: '主訴・症例概要・所見のいずれかを入力してください。' },
        { status: 400 }
      );
    }

    const totalLength =
      patientAge.length +
      patientSex.length +
      chiefComplaint.length +
      caseSummary.length +
      findings.length +
      records.length +
      userPlan.length;

    if (totalLength > 8000) {
      return NextResponse.json(
        { error: '入力内容が長すぎます。少し要約して入力してください。' },
        { status: 400 }
      );
    }

    const aiResponse = await createCaseReview({
      patientAge,
      patientSex,
      chiefComplaint,
      caseSummary,
      findings,
      records,
      userPlan,
    });

    const { error: insertError } = await supabaseAdmin
      .from('case_reviews')
      .insert({
        user_id: user.id,
        email: user.email,
        patient_age: patientAge,
        patient_sex: patientSex,
        chief_complaint: chiefComplaint,
        case_summary: caseSummary,
        findings,
        records,
        user_plan: userPlan,
        ai_response: aiResponse,
      });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      answer: aiResponse,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
