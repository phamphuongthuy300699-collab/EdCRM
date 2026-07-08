export type AlfaMode = "test" | "production";
export type AlfaPaymentStage = "one_step" | "two_step";

export type AlfaGatewayConfig = {
  mode: AlfaMode;
  gatewayUrl: string;
  registerEndpoint?: string;
  apiLogin: string;
  apiPassword: string;
  currencyCode?: string | null;
  paymentStage?: AlfaPaymentStage;
  timeoutMs?: number;
};

export type CreateAlfaOrderInput = {
  invoiceId: string;
  amount: number;
  currency: "RUB";
  currencyCode?: string | null;
  description: string;
  returnUrl: string;
  failUrl: string;
  dynamicCallbackUrl?: string;
  orderNumber: string;
};

export type AlfaRegisterRequest = {
  userName: string;
  password: string;
  orderNumber: string;
  amount: string;
  currency?: string;
  returnUrl: string;
  failUrl: string;
  dynamicCallbackUrl?: string;
  description: string;
};

export type SafeAlfaRegisterRequest = Omit<AlfaRegisterRequest, "password"> & {
  password: "[redacted]";
};

export type AlfaRegisterResponse = {
  orderId?: string;
  formUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  [key: string]: unknown;
};

export type CreateAlfaOrderResult = {
  providerOrderId: string;
  paymentUrl: string;
  rawRequest: SafeAlfaRegisterRequest;
  rawResponse: AlfaRegisterResponse;
  endpoint: string;
};

export type AlfaOrderStatusResponse = {
  orderStatus?: number;
  errorCode?: string;
  errorMessage?: string;
  amount?: number;
  orderNumber?: string;
  actionCode?: number;
  actionCodeDescription?: string;
  [key: string]: unknown;
};
