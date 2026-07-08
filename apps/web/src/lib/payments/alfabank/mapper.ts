import type {
  AlfaGatewayConfig,
  AlfaRegisterRequest,
  AlfaRegisterResponse,
  CreateAlfaOrderInput,
  SafeAlfaRegisterRequest,
} from "./types";

export function normalizeGatewayUrl(gatewayUrl: string) {
  const trimmed = gatewayUrl.trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

export function resolveRegisterEndpoint(config: Pick<AlfaGatewayConfig, "registerEndpoint" | "paymentStage">) {
  if (config.registerEndpoint?.trim()) return config.registerEndpoint.trim().replace(/^\/+/, "");
  return config.paymentStage === "two_step" ? "registerPreAuth.do" : "register.do";
}

export function toMinorUnits(amount: number) {
  return Math.round(amount * 100).toString();
}

export function mapCreateOrderToAlfaRequest(
  input: CreateAlfaOrderInput,
  config: Pick<AlfaGatewayConfig, "apiLogin" | "apiPassword" | "currencyCode">,
): AlfaRegisterRequest {
  const currencyCode = input.currencyCode || config.currencyCode || "";
  const request: AlfaRegisterRequest = {
    userName: config.apiLogin,
    password: config.apiPassword,
    orderNumber: input.orderNumber,
    amount: toMinorUnits(input.amount),
    returnUrl: input.returnUrl,
    failUrl: input.failUrl,
    description: input.description.slice(0, 512),
  };
  if (currencyCode.trim()) request.currency = currencyCode.trim();
  if (input.dynamicCallbackUrl) request.dynamicCallbackUrl = input.dynamicCallbackUrl;
  return request;
}

export function sanitizeAlfaRequest(request: AlfaRegisterRequest): SafeAlfaRegisterRequest {
  return { ...request, password: "[redacted]" };
}

export function extractAlfaPaymentUrl(response: AlfaRegisterResponse) {
  return typeof response.formUrl === "string" ? response.formUrl : "";
}

export function extractAlfaOrderId(response: AlfaRegisterResponse) {
  return typeof response.orderId === "string" ? response.orderId : "";
}

export function mapAlfaStatusToCrmStatus(orderStatus: number | undefined): string {
  if (orderStatus === 0) return "pending";
  if (orderStatus === 1) return "authorized";
  if (orderStatus === 2) return "paid";
  if (orderStatus === 3) return "cancelled";
  if (orderStatus === 4) return "refunded";
  if (orderStatus === 6) return "failed";
  return "unknown";
}

export function redactSensitivePaymentPayload(payload: any): any {
  if (!payload || typeof payload !== "object") return payload;
  
  // Create deep copy
  const copy = JSON.parse(JSON.stringify(payload));
  const sensitiveKeys = [
    "password", 
    "token", 
    "secret", 
    "api_password_secret", 
    "apipassword", 
    "username",
    "api_login",
    "terminal_id",
    "merchant_id",
    "pan",
    "maskedpan",
    "cardholder",
    "cardholdername",
    "ip",
    "user_agent",
    "useragent",
    "browser",
    "authrefnum",
    "approvalcode",
    "bindingid",
    "sig",
    "signature"
  ];
  
  const recurse = (current: any) => {
    for (const key in current) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        current[key] = "[redacted]";
      } else if (typeof current[key] === "object" && current[key] !== null) {
        recurse(current[key]);
      }
    }
  };
  
  recurse(copy);
  return copy;
}
