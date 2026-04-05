import { NextRequest, NextResponse } from 'next/server';

const ONE_INCH_BASE_URL = 'https://api.1inch.dev/swap/v6.0';
const API_KEY = process.env.ONE_INCH_API_KEY;

/**
 * 1inch API Proxy Route
 * Handles multiple 1inch endpoints (quote, swap, approve)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const { searchParams } = new URL(request.url);
  
  if (!path || path.length < 2) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const [chainId, ...methodParts] = path;
  const method = methodParts.join('/');
  
  if (!API_KEY) {
    console.error('ONE_INCH_API_KEY is not set');
    return NextResponse.json({ 
      error: 'API Key missing', 
      message: 'Please set ONE_INCH_API_KEY in your .env.local file.' 
    }, { status: 500 });
  }

  const url = `${ONE_INCH_BASE_URL}/${chainId}/${method}?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('1inch Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to fetch from 1inch', details: error.message }, { status: 500 });
  }
}
