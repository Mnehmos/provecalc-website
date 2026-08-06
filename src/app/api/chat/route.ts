/**
 * Server-side proxy for OpenRouter API calls.
 * Keeps the API key on the server and avoids browser CORS / auth issues.
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: { message: 'Authentication required', code: 401 } }, { status: 401 });
    }

    const body = await req.json();
    const { apiKey, model, messages, max_tokens } = body;

    if (
      typeof apiKey !== 'string' ||
      apiKey.length < 8 ||
      apiKey.length > 512 ||
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > 64
    ) {
      return NextResponse.json({ error: { message: 'API key is required', code: 400 } }, { status: 400 });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://provecalc.com',
        'X-Title': 'ProveCalc',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: max_tokens || 4096,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: { message: err instanceof Error ? err.message : String(err), code: 500 } },
      { status: 500 },
    );
  }
}
