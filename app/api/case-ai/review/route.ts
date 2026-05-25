import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 60;

type CaseImageInput = {
  name: string;
  type: string;
  dataUrl: string;
};

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

async function fileToImageInput(file: File): Promise<CaseImageInput> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      '対応していない画像形式があります。jpg, png, webp を使用してください。'
    );
  }

  // Vercel APIを通るので大きすぎる画像は避ける。
  // まずは1枚2MB以内・合計4MB以内を目安にする。
  const maxSize = 2 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error(
      `画像「${file.name}」が大きすぎます。1枚2MB以内にしてください。`
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  return {
    name: file.name,
    type: file.type,
    dataUrl: `data:${file.type};base64,${base64}`,
  };
}

async function createCaseReview(input: {
  patientAge: string;
  patientSex: string;
  chiefComplaint: string;
  caseSummary: string;
  findings: string;
  records: string;
  userPlan: string;
  images?: CaseImageInput[];
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing');
  }

  const malCasePolicy = await getMalCasePolicy();

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
    '【添付画像】',
    input.images && input.images.length > 0
      ? input.images.map((image, index) => `${index + 1}. ${image.name}`).join('\n')
      : 'なし',
    '',
    '【投稿者が考えている治療方針】',
    input.userPlan || '未記入',
  ].join('\n');

  const userText = [
    '以下の症例情報をもとに、症例検討を行ってください。',
    '診断確定ではなく、問題点整理と治療計画の方向性の提示をしてください。',
    '必ずMAL+の基本思想を優先し、顔貌評価を起点に考えてください。',
    '治療計画は必ず、本命・対抗・大穴の3案で提示してください。',
    '画像資料が添付されている場合は、顔貌・側貌・スマイル・口腔内・X線/CTスクショの所見を優先的に確認してください。',
    'ただし画像だけで断定せず、確認できない内容は「確認困難」または「追加資料が必要」と明記してください。',
    '',
    prompt,
  ].join('\n');

  const imageContents =
    input.images?.map((image) => ({
      type: 'image_url' as const,
      image_url: {
        url: image.dataUrl,
      },
    })) || [];

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
            '【MAL+の基本思想】',
            malCasePolicy,
            '',
            '対象は矯正歯科、特にアライナー矯正に関心のある歯科医師です。',
            '回答は専門家向けに、臨床で使える粒度で整理してください。',
            '',
            '重要なルール：',
            '- 医療判断を断定しないでください。',
            '- 顔貌評価を最初に行い、顔貌情報が不足する場合は必ずその限界を明記してください。',
            '- 情報が不足している場合は、必ず「追加で確認したい資料・所見」を挙げてください。',
            '- 患者固有の診断名や治療方針を確定しないでください。',
            '- 抜歯/非抜歯、外科/非外科、アライナー適応などは「検討ポイント」として整理してください。',
            '- 口腔内写真、セファロ、パノラマ、CT、模型などが未提示なら、その限界を明記してください。',
            '- 画像が添付されている場合も、画像から確認できる範囲と確認困難な範囲を分けてください。',
            '',
            '回答形式：',
            '1. 顔貌から見たこの症例の第一印象',
            '2. 顔貌・側貌・スマイル上の問題点',
            '3. 顎位の変化可能性',
            '4. 舌房・上顎歯列幅径・機能咬合の問題',
            '5. 口腔内・咬合・歯列から見た問題',
            '6. 骨格・歯軸・歯周・補綴から見た問題',
            '7. この症例で最も重要な診断上の分岐点',
            '8. 治療ゴール',
            '   - 顔貌上の理想ゴール',
            '   - 機能上の理想ゴール',
            '   - 現実的なゴール',
            '9. 本命プラン',
            '   - 方針',
            '   - 顔貌への影響',
            '   - 顎位への影響',
            '   - 舌房・機能への影響',
            '   - メリット',
            '   - デメリット',
            '   - リスク',
            '   - 患者説明',
            '10. 対抗プラン',
            '   - 方針',
            '   - 顔貌への影響',
            '   - 顎位への影響',
            '   - 舌房・機能への影響',
            '   - メリット',
            '   - デメリット',
            '   - リスク',
            '   - 患者説明',
            '11. 大穴プラン',
            '   - 方針',
            '   - 顔貌への影響',
            '   - 選びにくい理由',
            '   - 成立条件',
            '   - リスク',
            '12. MAL+的コメント',
            '13. 追加で必要な資料・確認事項',
            '',
            '回答は日本語で、箇条書きを中心にしてください。',
            '量はしっかり出してよいですが、各項目の見出しを明確にし、だらだらした文章にしないでください。',
          ].join('\n'),
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userText,
            },
            ...imageContents,
          ],
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

    const formData = await req.formData();

    const patientAge = String(formData.get('patientAge') || '').trim();
    const patientSex = String(formData.get('patientSex') || '').trim();
    const chiefComplaint = String(formData.get('chiefComplaint') || '').trim();
    const caseSummary = String(formData.get('caseSummary') || '').trim();
    const findings = String(formData.get('findings') || '').trim();
    const records = String(formData.get('records') || '').trim();
    const userPlan = String(formData.get('userPlan') || '').trim();

    const uploadedFiles = formData
      .getAll('files')
      .filter((item): item is File => item instanceof File)
      .slice(0, 8);

    if (!chiefComplaint && !caseSummary && !findings && uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: '主訴・症例概要・所見・画像のいずれかを入力してください。' },
        { status: 400 }
      );
    }

    const totalTextLength =
      patientAge.length +
      patientSex.length +
      chiefComplaint.length +
      caseSummary.length +
      findings.length +
      records.length +
      userPlan.length;

    if (totalTextLength > 8000) {
      return NextResponse.json(
        { error: '入力内容が長すぎます。少し要約して入力してください。' },
        { status: 400 }
      );
    }

    const totalFileSize = uploadedFiles.reduce((sum, file) => sum + file.size, 0);
    const maxTotalFileSize = 4 * 1024 * 1024;

    if (totalFileSize > maxTotalFileSize) {
      return NextResponse.json(
        {
          error:
            '画像の合計サイズが大きすぎます。合計4MB以内にしてください。必要なら画像を圧縮してから添付してください。',
        },
        { status: 400 }
      );
    }

    const imageInputs = await Promise.all(
      uploadedFiles.map((file) => fileToImageInput(file))
    );

    const aiResponse = await createCaseReview({
      patientAge,
      patientSex,
      chiefComplaint,
      caseSummary,
      findings,
      records,
      userPlan,
      images: imageInputs,
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
        records:
          imageInputs.length > 0
            ? [
                records,
                '',
                '【添付画像】',
                ...imageInputs.map((image, index) => `${index + 1}. ${image.name}`),
              ]
                .filter(Boolean)
                .join('\n')
            : records,
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
