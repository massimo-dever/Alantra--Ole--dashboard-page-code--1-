import { plaidClient } from '@/lib/plaid'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// ✅ Service role client — bypasses RLS for server-side writes
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { publicToken, userId } = await req.json()

    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    })

    const accessToken = response.data.access_token

    const { error } = await supabaseAdmin.from('plaid_items').upsert({
      user_id: userId,
      access_token: accessToken,
    })

    if (error) {
      console.error("Supabase upsert error:", error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Full exchange error:', error)
    return NextResponse.json({ error: 'Failed to exchange token' }, { status: 500 })
  }
}
