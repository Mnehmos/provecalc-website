/**
 * Server-side proxy for OpenRouter key validation.
 * Tests the key by making a minimal chat completion request.
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  getRequestBodyError,
  readJsonBody,
} from '../_lib/request';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ valid: false, error: 'Authentication required' }, { status: 401 });
    }

    const { apiKey } = await readJsonBody<{ apiKey?: unknown }>(req, 8 * 1024);

    if (typeof apiKey !== 'string' || apiKey.length < 8 || apiKey.length > 512) {
      return NextResponse.json({ valid: false, error: 'API key is required' });
    }

    // Use auth/key endpoint for validation
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      signal: AbortSignal.timeout(10_000),
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({ valid: true, label: data?.data?.label });
    }

    return NextResponse.json({
      valid: false,
      error: `HTTP ${response.status}`,
    });
  } catch (err) {
    const bodyError = getRequestBodyError(err);
    if (bodyError) {
      return NextResponse.json(
        { valid: false, error: bodyError.message },
        { status: bodyError.status },
      );
    }
    return NextResponse.json({
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
