# Earnings Data Sources Explanation

## Why Dashboard and Earnings Show Different Values

The dashboard and earnings screens show different but **correct** values because they represent different aspects of your business:

### Dashboard (£479)
- **Source**: `bookings` table → `useProviderStats` hook
- **What it shows**: Total completed booking revenue
- **Includes**: All bookings marked as "completed" regardless of payout status
- **Purpose**: Shows your total business revenue/sales

### Earnings Screen (£180.90)
- **Source**: `provider_payouts` table → `useProviderEarnings` hook  
- **What it shows**: Actual processed payouts through Stripe
- **Includes**: Only payouts that have been processed (paid, pending, processing)
- **Purpose**: Shows your actual earnings available for withdrawal

## This Is Expected Behavior

The difference means:
- £479 worth of bookings have been completed
- £180.90 has been processed through the payout system
- £298.10 may still be pending processing or in upcoming payouts

## Currency Consistency Fixed

All screens now use **£ (British Pound)** consistently via the centralized `formatCurrency` utility in `src/lib/utils.ts`.