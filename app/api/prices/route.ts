import { NextRequest, NextResponse } from 'next/server';
import { CHAIN_PRICE_IDS, CG_PLATFORM_IDS } from '@/lib/blockchain/prices';

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type')?.toLowerCase();
  const chainId = searchParams.get('chainId');
  const platformIdParam = searchParams.get('platform_id') || searchParams.get('platformId');
  const addresses = searchParams.get('addresses') || searchParams.get('contract_addresses');


  try {
    if (type === 'native') {
      const idsFromQuery = searchParams.get('ids');
      const uniqueIds = idsFromQuery 
        ? idsFromQuery.split(',') 
        : Array.from(new Set(Object.values(CHAIN_PRICE_IDS)));
      
      const idsString = uniqueIds.join(',');
      const response = await fetch(
        `${COINGECKO_API_BASE}/simple/price?ids=${idsString}&vs_currencies=usd`,
        { 
          headers: { 'User-Agent': 'Mozilla/5.0' },
          cache: 'no-store'
        }
      );
      const data = await response.json();
      return NextResponse.json(data);
    }

    if (type === 'token') {
      const platformId = platformIdParam || CG_PLATFORM_IDS[parseInt(chainId || '1')];
      if (!platformId || !addresses) {
        console.error(`[API Price Proxy] Bad Token Request: platformId=${platformId}, addresses=${addresses}`);
        return NextResponse.json({ error: 'Missing platformId or addresses' }, { status: 400 });
      }

      const cgUrl = `${COINGECKO_API_BASE}/simple/token_price/${platformId}?contract_addresses=${addresses}&vs_currencies=usd`;
      
      try {
        const response = await fetch(cgUrl, { 
          headers: { 'User-Agent': 'Mozilla/5.0' },
          cache: 'no-store'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[API Price Proxy] CoinGecko Error (${response.status}): ${errorText}`);
          return NextResponse.json({ error: `CoinGecko error ${response.status}` }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
      } catch (err: any) {
        console.error(`[API Price Proxy] Fetch exception:`, err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('API Price Proxy Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
