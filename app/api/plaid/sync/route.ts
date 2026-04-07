import { plaidClient } from '@/lib/plaid'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()

    console.log("Syncing data for user:", userId)

    // Fetch ALL plaid items for this user
    const { data: plaidItems, error: fetchError } = await supabaseAdmin
      .from('plaid_items')
      .select('*')
      .eq('user_id', userId)

    if (fetchError || !plaidItems || plaidItems.length === 0) {
      console.error("Error fetching plaid items:", fetchError)
      return NextResponse.json({ error: 'No Plaid account linked' }, { status: 404 })
    }

    console.log(`Found ${plaidItems.length} Plaid item(s), syncing sequentially...`)

    let totalAccounts = 0
    let totalTransactions = 0

    for (const plaidItem of plaidItems) {
      try {
        const accessToken = plaidItem.access_token
        console.log(`Syncing item ${plaidItem.id}...`)

        // ✅ Wipe existing data for this user before re-syncing
        await supabaseAdmin.from('transactions').delete().eq('user_id', userId)
        await supabaseAdmin.from('accounts').delete().eq('user_id', userId)

        // Fetch accounts
        const accountsResponse = await plaidClient.accountsGet({
          access_token: accessToken,
        })

        const accounts = accountsResponse.data.accounts.map((acc) => ({
          id: acc.account_id,
          user_id: userId,
          name: acc.name,
          type: acc.type,
          subtype: acc.subtype,
          balance: acc.balances.current,
          currency: acc.balances.iso_currency_code,
        }))

        console.log(`Item ${plaidItem.id}: ${accounts.length} accounts fetched`)

        const { error: accountsError } = await supabaseAdmin
          .from('accounts')
          .upsert(accounts, { onConflict: 'id' })

        if (accountsError) {
          console.error(`Accounts upsert error for item ${plaidItem.id}:`, accountsError)
          throw accountsError
        }

        totalAccounts += accounts.length

        // Fetch transactions (last 30 days)
        const now = new Date()
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(now.getDate() - 30)

        const startDate = thirtyDaysAgo.toISOString().split('T')[0]
        const endDate = now.toISOString().split('T')[0]

        console.log(`Item ${plaidItem.id}: fetching transactions from ${startDate} to ${endDate}`)

        const txResponse = await plaidClient.transactionsGet({
          access_token: accessToken,
          start_date: startDate,
          end_date: endDate,
        })

        const transactions = txResponse.data.transactions.map((tx) => ({
          id: tx.transaction_id,
          account_id: tx.account_id,
          user_id: userId,
          amount: tx.amount,
          date: tx.date,
          name: tx.name,
          category: tx.category,
          merchant_name: tx.merchant_name ?? tx.name,
          pending: tx.pending,
        }))

        console.log(`Item ${plaidItem.id}: ${transactions.length} transactions fetched`)

        const { error: txError } = await supabaseAdmin
          .from('transactions')
          .upsert(transactions, { onConflict: 'id' })

        if (txError) {
          console.error(`Transactions upsert error for item ${plaidItem.id}:`, txError)
          throw txError
        }

        totalTransactions += transactions.length

      } catch (itemError) {
        // Log and continue — don't let one failed item block the rest
        console.error(`Error syncing item ${plaidItem.id}:`, itemError)
      }
    }

    console.log("Sync complete!")

    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/plaid/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
    })

return NextResponse.json({ success: true, accounts: totalAccounts, transactions: totalTransactions })

  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
