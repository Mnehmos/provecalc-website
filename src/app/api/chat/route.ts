/**
 * Server-side proxy for OpenRouter API calls.
 * Keeps the API key on the server and avoids browser CORS / auth issues.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey, model, messages, max_tokens } = body;

    if (!apiKey) {
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
