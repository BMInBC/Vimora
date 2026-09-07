// Paystack Client Utilities

export const PAYSTACK_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_live_7db85883d4aa91177ae1950dfc5a603c555a2e13";

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    customer: {
      email: string;
    };
    metadata?: any;
  };
}