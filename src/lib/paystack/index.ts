// Paystack Client Utilities

export const PAYSTACK_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_sample_paystack_key";
export const PAYSTACK_SECRET_KEY =
  process.env.PAYSTACK_SECRET_KEY || "sk_test_sample_paystack_secret";

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