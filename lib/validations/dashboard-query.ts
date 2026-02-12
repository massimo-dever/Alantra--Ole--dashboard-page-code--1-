import { z } from "zod"

export const scenarioValues = ["actuals", "budget", "forecast", "what-if"] as const
export const timePeriodValues = [
  "all", "ytd", "mtd", "qtd", "q1", "q2", "q3", "q4",
  "l12m", "last-30", "last-90", "custom",
] as const
export const currencyValues = ["USD", "EUR", "GBP", "CAD"] as const
export const accountTypeValues = ["bank", "credit-card", "investment", "payroll", "other"] as const

export const dashboardQuerySchema = z.object({
  scenario: z.enum(scenarioValues).optional().default("actuals"),
  timePeriod: z.enum(timePeriodValues).optional().default("ytd"),
  year: z.coerce.number().int().min(2020).max(2030).optional().default(new Date().getFullYear()),
  entity: z.string().optional(),
  department: z.string().optional(),
  accountType: z.enum(accountTypeValues).optional(),
  currency: z.enum(currencyValues).optional().default("USD"),
  from: z.string().optional(),
  to: z.string().optional(),
})

export type DashboardQueryParams = z.infer<typeof dashboardQuerySchema>

export function parseDashboardQuery(searchParams: URLSearchParams): DashboardQueryParams {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })
  return dashboardQuerySchema.parse(raw)
}
