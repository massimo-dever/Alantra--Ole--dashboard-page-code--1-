export function getInvestmentPortfolioData() {
  return {
    kpis: {
      totalValue: 2200000,
      dayChange: 11000,
      dayChangePercent: 0.50,
      totalReturn: 245000,
      totalReturnPercent: 12.5,
      dividendYield: 2.1,
    },
    assetAllocation: [
      { name: "Stocks", value: 1200000, color: "var(--color-chart-1)" },
      { name: "Bonds", value: 500000, color: "var(--color-chart-2)" },
      { name: "Cash", value: 300000, color: "var(--color-chart-4)" },
      { name: "Crypto", value: 200000, color: "var(--color-chart-5)" },
    ],
    portfolioHistory: [
      { date: "Jan", value: 2000000 },
      { date: "Feb", value: 2050000 },
      { date: "Mar", value: 2100000 },
      { date: "Apr", value: 2080000 },
      { date: "May", value: 2150000 },
      { date: "Jun", value: 2200000 },
    ],
    holdings: [
      { ticker: "AAPL", name: "Apple Inc.", quantity: 100, costBasis: 150, currentPrice: 175, pnl: 2500, dayChange: 2.5 },
      { ticker: "GOOGL", name: "Alphabet Inc.", quantity: 50, costBasis: 120, currentPrice: 140, pnl: 1000, dayChange: 1.8 },
      { ticker: "MSFT", name: "Microsoft Corp.", quantity: 75, costBasis: 300, currentPrice: 320, pnl: 1500, dayChange: -0.5 },
      { ticker: "TSLA", name: "Tesla Inc.", quantity: 200, costBasis: 200, currentPrice: 180, pnl: -4000, dayChange: -3.2 },
      { ticker: "AMZN", name: "Amazon.com Inc.", quantity: 30, costBasis: 140, currentPrice: 178, pnl: 1140, dayChange: 1.2 },
    ],
    isMockData: true,
  }
}
