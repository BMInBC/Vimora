import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, amount, planCode, callbackUrl } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const origin = req.headers.get("origin") || "http://localhost:3000";

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
        email,
        amount: (amount || 4500) * 100, // Paystack operates in kobo (100 kobo = 1 NGN)
        callback_url: callbackUrl || `${origin}/pricing/verify`,
        metadata: {
          product: "Vimora Pro",
          plan: planCode || "monthly_pro",
        },
      }),
    });

    const data = await paystackRes.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to initialize transaction" }, { status: 500 });
  }
}