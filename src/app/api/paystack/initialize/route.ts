import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, amount, planCode, callbackUrl } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const origin = req.headers.get("origin") || `${proto}://${host}`;

    // If no secret key is set yet or using placeholder, return simulated checkout URL for testing
    if (!secretKey || secretKey.includes("your_paystack_secret") || secretKey.startsWith("sk_live_your")) {
      const mockRef = `vim_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      return NextResponse.json({
        status: true,
        message: "Paystack simulation initialized",
        data: {
          authorization_url: `${origin}/pricing/verify?reference=${mockRef}&status=success`,
          reference: mockRef,
        },
      });
    }

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        amount: Math.round((amount || 4500) * 100), // Paystack operates in kobo (100 kobo = 1 NGN)
        callback_url: callbackUrl || `${origin}/pricing/verify`,
        channels: ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer"],
        metadata: {
          product: "Vimora Pro",
          plan: planCode || "pro_monthly",
          customer_email: email,
          cancel_action: `${origin}/pricing`,
        },
      }),
    });

    const data = await paystackRes.json();
    return NextResponse.json(data, { status: paystackRes.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to initialize transaction" }, { status: 500 });
  }
}