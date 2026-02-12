import { z } from "zod"

export const transactionCategoryValues = [
  "payroll", "marketing", "software", "office", "travel", "professional-services",
  "utilities", "insurance", "rent", "revenue", "subscription", "other",
] as const

export const transactionTypeValues = ["expense", "income", "transfer"] as const

export const transactionFiltersSchema = z.object({
  category: z.enum(transactionCategoryValues).optional(),
  type: z.enum(transactionTypeValues).optional(),
  department: z.string().optional(),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  sortBy: z.enum(["date", "amount", "merchant", "category"]).optional().default("date"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
})

export type TransactionFilters = z.infer<typeof transactionFiltersSchema>

export function parseTransactionFilters(searchParams: URLSearchParams): TransactionFilters {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })
  return transactionFiltersSchema.parse(raw)
}
