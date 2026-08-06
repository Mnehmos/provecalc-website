/**
 * Server-side proxy for OpenRouter API calls.
 * Keeps the API key on the server and avoids browser CORS / auth issues.
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  getRequestBodyError,
  readJsonBody,
} from '../_lib/request';

export const dynamic = 'force-dynamic';

const MAX_CHAT_BODY_BYTES = 256 * 1024;
const MAX_MESSAGE_CONTENT_BYTES = 128 * 1024;
const MAX_COMPLETION_TOKENS = 8192;

type ChatMessage = {
  role: string;
  content: unknown;
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: { message: 'Authentication required', code: 401 } }, { status: 401 });
    }

    const body = await readJsonBody<{
      apiKey?: unknown;
      model?: unknown;
      messages?: unknown;
      max_tokens?: unknown;
    }>(req, MAX_CHAT_BODY_BYTES);
    const { apiKey, model, messages, max_tokens } = body;

    if (
      typeof apiKey !== 'string' ||
      apiKey.length < 8 ||
      apiKey.length > 512 ||
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > 64 ||
      typeof model !== 'string' ||
      model.length === 0 ||
      model.length > 200
    ) {
      return NextResponse.json({ error: { message: 'API key is required', code: 400 } }, { status: 400 });
    }

    const normalizedMessages = messages as ChatMessage[];
    if (
      normalizedMessages.some((message) => {
        if (!message || typeof message !== 'object') return true;
        if (!['system', 'user', 'assistant'].includes(message.role)) return true;
        if (typeof message.content === 'string') {
          return new TextEncoder().encode(message.content).byteLength > MAX_MESSAGE_CONTENT_BYTES;
        }
        return !Array.isArray(message.content);
      })
    ) {
      return NextResponse.json({ error: { message: 'Invalid message payload', code: 400 } }, { status: 400 });
    }

    const completionTokens = max_tokens === undefined ? 4096 : max_tokens;
    if (
      typeof completionTokens !== 'number' ||
      !Number.isInteger(completionTokens) ||
      completionTokens < 1 ||
      completionTokens > MAX_COMPLETION_TOKENS
    ) {
      return NextResponse.json({ error: { message: 'Invalid max_tokens value', code: 400 } }, { status: 400 });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(20_000),
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://provecalc.com',
        'X-Title': 'ProveCalc',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: completionTokens,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    const bodyError = getRequestBodyError(err);
    if (bodyError) {
      return NextResponse.json(
        { error: { message: bodyError.message, code: bodyError.status } },
        { status: bodyError.status },
      );
    }
    return NextResponse.json(
      { error: { message: err instanceof Error ? err.message : String(err), code: 500 } },
      { status: 500 },
    );
  }
}
