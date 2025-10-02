import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

serve(async (req: Request) => {
  // Enable CORS for all requests
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const type = url.searchParams.get("type")
    const redirectParam = url.searchParams.get("redirect")

    console.log("🔗 [Stripe Redirect] Public request received:", {
      type,
      redirectParam,
      method: req.method,
      url: req.url,
      userAgent: req.headers.get("user-agent"),
      referer: req.headers.get("referer")
    })

    const isDesktop = url.searchParams.get("desktop") === "true"

    // Handle desktop onboarding initiation
    if (type === "onboard" && isDesktop) {
      const accountId = url.searchParams.get("account")
      if (!accountId) {
        return new Response("Account ID required for onboarding", { status: 400 })
      }

      try {
        // Import Stripe
        const Stripe = (await import("https://esm.sh/stripe@14.21.0")).default
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!)

        // Create a fresh onboarding URL for desktop
        const accountLink = await stripe.accountLinks.create({
          account: accountId,
          refresh_url: `https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/stripe-redirect?type=refresh&desktop=true`,
          return_url: `https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/stripe-redirect?type=return&desktop=true`,
          type: 'account_onboarding',
          collect: 'eventually_due'
        })

        console.log("🔗 [Stripe Redirect] Desktop onboarding URL created:", accountLink.url)

        // Redirect to the Stripe onboarding URL
        return new Response(null, {
          status: 302,
          headers: {
            "Location": accountLink.url
          }
        })
      } catch (error) {
        console.error("❌ [Stripe Redirect] Error creating desktop onboarding URL:", error)
        return new Response("Failed to create onboarding URL", { status: 500 })
      }
    }

    // For desktop users, show appropriate web pages
    if (isDesktop) {
      if (type === "return") {
        // Successful onboarding completion
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Setup Complete - ZOVA</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: #f8fafc;
                margin: 0;
                padding: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
              }
              .container {
                background: white;
                border-radius: 12px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                max-width: 400px;
              }
              .success-icon {
                width: 64px;
                height: 64px;
                background: #10b981;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 24px;
                color: white;
                font-size: 32px;
              }
              h1 {
                color: #1f2937;
                margin: 0 0 16px;
                font-size: 24px;
              }
              p {
                color: #6b7280;
                margin: 0 0 24px;
                line-height: 1.5;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success-icon">✓</div>
              <h1>Setup Complete!</h1>
              <p>Your Stripe account has been successfully set up. You can now accept payments through ZOVA.</p>
              <p>Please return to the ZOVA app to continue.</p>
            </div>
          </body>
          </html>
        `, {
          headers: { "Content-Type": "text/html" }
        })
      } else if (type === "refresh") {
        // User refreshed or navigated away during onboarding
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Continue Setup - ZOVA</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: #f8fafc;
                margin: 0;
                padding: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
              }
              .container {
                background: white;
                border-radius: 12px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                max-width: 400px;
              }
              .warning-icon {
                width: 64px;
                height: 64px;
                background: #f59e0b;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 24px;
                color: white;
                font-size: 32px;
              }
              h1 {
                color: #1f2937;
                margin: 0 0 16px;
                font-size: 24px;
              }
              p {
                color: #6b7280;
                margin: 0 0 24px;
                line-height: 1.5;
              }
              .button {
                background: #3b82f6;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                text-decoration: none;
                display: inline-block;
                margin: 8px;
              }
              .button:hover {
                background: #2563eb;
              }
              .secondary-button {
                background: #6b7280;
              }
              .secondary-button:hover {
                background: #4b5563;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="warning-icon">⚠</div>
              <h1>Setup Incomplete</h1>
              <p>It looks like you navigated away during the setup process or the link has expired. Please return to the ZOVA app to restart the payment setup process.</p>
              <p>If you're having trouble with the mobile app, you can try opening this link on your mobile device instead.</p>
            </div>
          </body>
          </html>
        `, {
          headers: { "Content-Type": "text/html" }
        })
      }
    }

    // For mobile users, redirect to the app
    if (type === "return") {
      // Successful completion - redirect to app
      const appRedirectUrl = redirectParam || "zova://provider-verification/payment?status=success"
      console.log("🔗 [Stripe Redirect] Mobile return redirect to:", appRedirectUrl)
      return new Response(null, {
        status: 302,
        headers: {
          "Location": appRedirectUrl
        }
      })
    } else if (type === "refresh") {
      // User refreshed during onboarding - redirect back to payment setup
      const appRedirectUrl = redirectParam || "zova://provider-verification/payment?status=refresh"
      console.log("🔗 [Stripe Redirect] Mobile refresh redirect to:", appRedirectUrl)
      return new Response(null, {
        status: 302,
        headers: {
          "Location": appRedirectUrl
        }
      })
    }

    // Default fallback
    return new Response("Invalid request", { status: 400 })

  } catch (error) {
    console.error("❌ [Stripe Redirect] Error:", error)
    return new Response("Internal server error", { status: 500 })
  }
})
