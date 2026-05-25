import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

const ADMIN_EMAIL = 'tm99179313@gmail.com';

async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    throw new Error('ログイン情報が確認できません。');
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user || user.email !== ADMIN_EMAIL) {
    throw new Error('管理者権限がありません。');
  }

  return user;
}

export async function GET(req: Request) {
  try {
    await verifyAdmin(req);

    const { data, error } = await supabaseAdmin
      .from('ai_guidelines')
      .select('id, key, title, content, updated_at')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      guidelines: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unexpected error' },
      { status: 403 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await verifyAdmin(req);

    const body = await req.json();

    const key = String(body.key || '').trim();
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();

    if (!key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('ai_guidelines')
      .upsert(
        {
          key,
          title,
          content,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'key',
        }
      )
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      guideline: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unexpected error' },
      { status: 403 }
    );
  }
}
