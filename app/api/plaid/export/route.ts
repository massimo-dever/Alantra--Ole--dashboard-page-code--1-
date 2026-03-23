import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()

    console.log("Exporting data for user:", userId)

    // Fetch accounts
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('user_id', userId)

    if (accountsError) {
      console.error("Error fetching accounts:", accountsError)
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }

    // Fetch transactions
    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('user_id', userId)

    if (transactionsError) {
      console.error("Error fetching transactions:", transactionsError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    const output = {
      exportedAt: new Date().toISOString(),
      userId,
      accounts,
      transactions,
    }

    // Ensure /data directory exists
    const dir = path.join(process.cwd(), 'data')
    await mkdir(dir, { recursive: true })

    // Write to /data/plaid-api-response.json
    const filePath = path.join(dir, 'plaid_api_response.json')
    await writeFile(filePath, JSON.stringify(output, null, 2), 'utf-8')

    console.log(`Exported ${accounts.length} accounts and ${transactions.length} transactions to ${filePath}`)

    return NextResponse.json({
      success: true,
      accounts: accounts.length,
      transactions: transactions.length,
      path: filePath,
    })

  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
