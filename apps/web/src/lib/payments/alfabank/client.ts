import { AlfaBankError } from "./errors";
import {
  extractAlfaOrderId,
  extractAlfaPaymentUrl,
  mapCreateOrderToAlfaRequest,
  normalizeGatewayUrl,
  resolveRegisterEndpoint,
  sanitizeAlfaRequest,
} from "./mapper";
import type { AlfaGatewayConfig, AlfaRegisterResponse, CreateAlfaOrderInput, CreateAlfaOrderResult, AlfaOrderStatusResponse } from "./types";

export async function createAlfaOrder(input: CreateAlfaOrderInput, config: AlfaGatewayConfig): Promise<CreateAlfaOrderResult> {
  const gatewayUrl = normalizeGatewayUrl(config.gatewayUrl);
  const endpoint = resolveRegisterEndpoint(config);

  if (!gatewayUrl) {
    throw new AlfaBankError("Не настроен gateway URL Альфа-Банка", { code: "ALFABANK_GATEWAY_NOT_CONFIGURED" });
  }

  if (!config.apiLogin || !config.apiPassword) {
    throw new AlfaBankError("Не настроены API login/password Альфа-Банка", { code: "ALFABANK_CREDENTIALS_NOT_CONFIGURED" });
  }

  if (input.currency !== "RUB") {
    throw new AlfaBankError("Для онлайн-оплаты сейчас поддерживается только RUB", { code: "ALFABANK_UNSUPPORTED_CURRENCY" });
  }

  const request = mapCreateOrderToAlfaRequest(input, config);
  const safeRequest = sanitizeAlfaRequest(request);
  const body = new URLSearchParams();
  Object.entries(request).forEach(([key, value]) => {
    if (value !== undefined) body.set(key, value);
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 15000);

  let response: Response;
  let payload: AlfaRegisterResponse;

  try {
    response = await fetch(new URL(endpoint, gatewayUrl).toString(), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    throw new AlfaBankError("Альфа-Банк не ответил на запрос регистрации заказа", {
      code: "ALFABANK_NETWORK_ERROR",
      details: error instanceof Error ? error.message : error,
    });
  } finally {
    clearTimeout(timeout);
  }

  try {
    payload = (await response.json()) as AlfaRegisterResponse;
  } catch (error) {
    throw new AlfaBankError("Альфа-Банк вернул некорректный ответ", {
      code: "ALFABANK_BAD_RESPONSE",
      status: response.status,
      details: error instanceof Error ? error.message : error,
    });
  }

  const providerOrderId = extractAlfaOrderId(payload);
  const paymentUrl = extractAlfaPaymentUrl(payload);

  if (!response.ok || payload.errorCode || !providerOrderId || !paymentUrl) {
    throw new AlfaBankError(payload.errorMessage || "Альфа-Банк отклонил регистрацию платежа", {
      code: payload.errorCode || "ALFABANK_REGISTER_FAILED",
      status: response.status,
      details: payload,
    });
  }

  return {
    providerOrderId,
    paymentUrl,
    rawRequest: safeRequest,
    rawResponse: payload,
    endpoint,
  };
}

export async function getAlfaOrderStatus(
  providerOrderId: string,
  config: AlfaGatewayConfig
): Promise<AlfaOrderStatusResponse> {
  const gatewayUrl = normalizeGatewayUrl(config.gatewayUrl);
  const endpoint = "getOrderStatusExtended.do";

  if (!gatewayUrl) {
    throw new AlfaBankError("Не настроен gateway URL Альфа-Банка", { code: "ALFABANK_GATEWAY_NOT_CONFIGURED" });
  }

  if (!config.apiLogin || !config.apiPassword) {
    throw new AlfaBankError("Не настроены API login/password Альфа-Банка", { code: "ALFABANK_CREDENTIALS_NOT_CONFIGURED" });
  }

  const requestParams = {
    userName: config.apiLogin,
    password: config.apiPassword,
    orderId: providerOrderId,
  };

  const body = new URLSearchParams(requestParams);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 15000);

  let response: Response;
  let payload: AlfaOrderStatusResponse;

  try {
    response = await fetch(new URL(endpoint, gatewayUrl).toString(), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    throw new AlfaBankError("Альфа-Банк не ответил на запрос статуса заказа", {
      code: "ALFABANK_NETWORK_ERROR",
      details: error instanceof Error ? error.message : error,
    });
  } finally {
    clearTimeout(timeout);
  }

  try {
    payload = (await response.json()) as AlfaOrderStatusResponse;
  } catch (error) {
    throw new AlfaBankError("Альфа-Банк вернул некорректный ответ при запросе статуса", {
      code: "ALFABANK_BAD_RESPONSE",
      status: response.status,
      details: error instanceof Error ? error.message : error,
    });
  }

  if (!response.ok || (payload.errorCode && payload.errorCode !== "0")) {
    throw new AlfaBankError(payload.errorMessage || "Ошибка при запросе статуса платежа в Альфа-Банке", {
      code: payload.errorCode || "ALFABANK_STATUS_FAILED",
      status: response.status,
      details: payload,
    });
  }

  return payload;
}
