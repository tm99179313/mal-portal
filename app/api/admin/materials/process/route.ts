import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Material = {
  id: string;
  course_id: string;
  session_no: number | null;
  title: string;
  file_name: string | null;
  file_path: string;
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

function chunkPages(pages: string[], pagesPerChunk = 5) {
  const chunks: {
    pageStart: number;
    pageEnd: number;
    content: string;
  }[] = [];

  for (let i = 0; i < pages.length; i += pagesPerChunk) {
    const pageGroup = pages.slice(i, i + pagesPerChunk);
    const content = pageGroup.join('\n\n').trim();

    if (!content) continue;

    chunks.push({
      pageStart: i + 1,
      pageEnd: i + pageGroup.length,
      content,
    });
  }

  return chunks;
}

function chunkTextFallback(text: string, chunkSize = 3500) {
  const chunks: {
    pageStart: number;
    pageEnd: number;
    content: string;
  }[] = [];

  for (let i = 0; i < text.length; i += chunkSize) {
    const content = text.slice(i, i + chunkSize).trim();

    if (!content) continue;

    chunks.push({
      pageStart: 1,
      pageEnd: 1,
      content,
    });
  }

  return chunks;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'materials process API is working',
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const materialId = String(body.materialId || '');

    if (!materialId) {
      return NextResponse.json(
        { error: 'materialId is required' },
        { status: 400 }
      );
    }

    const { data: material, error: materialError } = await supabaseAdmin
      .from('course_materials')
      .select('*')
      .eq('id', materialId)
      .single();

    if (materialError || !material) {
      return NextResponse.json(
        { error: materialError?.message || '資料が見つかりません。' },
        { status: 404 }
      );
    }

    const targetMaterial = material as Material;

    if (!targetMaterial.file_path) {
      return NextResponse.json(
        { error: 'file_path が空です。' },
        { status: 400 }
      );
    }

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('course-materials')
      .download(targetMaterial.file_path);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: downloadError?.message || 'PDFの取得に失敗しました。' },
        { status: 500 }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pdfParseModule = await import('pdf-parse');
    const pdfParse = pdfParseModule.default || pdfParseModule;

    const pages: string[] = [];

    const parsed = await pdfParse(buffer, {
      pagerender: async (pageData: any) => {
        const textContent = await pageData.getTextContent();

        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        pages.push(pageText);

        return pageText;
      },
    });

    let chunks = chunkPages(pages, 5);

    if (chunks.length === 0 && parsed.text) {
      chunks = chunkTextFallback(parsed.text, 3500);
    }

    if (chunks.length === 0) {
      return NextResponse.json(
        {
          error:
            'PDFからテキストを抽出できませんでした。画像だけのPDFかもしれません。',
        },
        { status: 400 }
      );
    }

    await supabaseAdmin
      .from('material_chunks')
      .delete()
      .eq('material_id', targetMaterial.id);

    const rows = [];

    for (const chunk of chunks) {
      const embedding = await createEmbedding(chunk.content);

      rows.push({
        material_id: targetMaterial.id,
        course_id: targetMaterial.course_id,
        session_no: targetMaterial.session_no,
        page_start: chunk.pageStart,
        page_end: chunk.pageEnd,
        content: chunk.content,
        summary: null,
        keywords: [],
        embedding,
      });
    }

    const { error: insertError } = await supabaseAdmin
      .from('material_chunks')
      .insert(rows);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await supabaseAdmin
      .from('course_materials')
      .update({ status: 'processed' })
      .eq('id', targetMaterial.id);

    return NextResponse.json({
      ok: true,
      materialId: targetMaterial.id,
      chunks: rows.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
