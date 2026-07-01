import type {
  AlfaGatewayConfig,
  AlfaRegisterRequest,
  AlfaRegisterResponse,
  CreateAlfaOrderInput,
  SafeAlfaRegisterRequest,
} from "./types";

const rubIso4217 = "643";

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
  config: Pick<AlfaGatewayConfig, "apiLogin" | "apiPassword">,
): AlfaRegisterRequest {
  return {
    userName: config.apiLogin,
    password: config.apiPassword,
    orderNumber: input.orderNumber,
    amount: toMinorUnits(input.amount),
    currency: rubIso4217,
    returnUrl: input.returnUrl,
    failUrl: input.failUrl,
    description: input.description.slice(0, 512),
  };
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
