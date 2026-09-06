import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY || "";
    const signature = req.headers.get("x-paystack-signature");
    const rawBody = await req.text();

    if (secretKey && !secretKey.includes("your_paystack_secret")) {
      const hash = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");
      if (hash !== signature) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);

    if (event.event === "charge.success") {
      const customerEmail = event.data?.customer?.email;
      const reference = event.data?.reference;
      console.log(`[Paystack Webhook] Charge succeeded for ${customerEmail} (Ref: ${reference})`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}