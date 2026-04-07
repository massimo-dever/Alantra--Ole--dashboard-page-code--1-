import { plaidClient } from '@/lib/plaid';
import { Products, CountryCode } from 'plaid';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Your App Name',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],  
      language: 'en',
    });

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Error creating link token:', error);
    return NextResponse.json({ error: 'Failed to create link token' }, { status: 500 });
  }
}
