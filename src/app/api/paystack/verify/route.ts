import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get("reference");

  if (!reference) {
    return NextResponse.json({ error: "Transaction reference is required" }, { status: 400 });
  }

  // Handle mock references for testing
  if (reference.startsWith("vim_mock_")) {
    return NextResponse.json({
      status: true,
      message: "Simulated Paystack Verification Succeeded",
      data: {
        status: "success",
        reference,
        amount: 450000,
        customer: { email: "customer@vimora.app" },
      },
    });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Paystack secret key is unconfigured" }, { status: 500 });
  }

  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Verification request failed" }, { status: 500 });
  }
}