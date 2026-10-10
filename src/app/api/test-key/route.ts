/**
 * Server-side proxy for OpenRouter key validation.
 * Tests the key by making a minimal chat completion request.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ valid: false, error: 'API key is required' });
    }

    // Use auth/key endpoint for validation
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({ valid: true, label: data?.data?.label });
    }

    // Fallback: try a minimal completion to validate
    const chatResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://provecalc.com',
        'X-Title': 'ProveCalc',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4.5',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      }),
    });

    if (chatResponse.ok) {
      return NextResponse.json({ valid: true });
    }

    const errorData = await chatResponse.json().catch(() => null);
    return NextResponse.json({
      valid: false,
      error: errorData?.error?.message || `HTTP ${chatResponse.status}`,
    });
  } catch (err) {
    return NextResponse.json({
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
