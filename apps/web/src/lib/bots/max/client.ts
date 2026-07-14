import crypto from "node:crypto";

const MAX_API_BASE = "https://platform-api2.max.ru";
const MAX_TIMEOUT_MS = 20_000;
const MAX_API_HOST = "platform-api2.max.ru";

export type MaxSafeCode =
  | "MAX_TLS_ERROR"
  | "MAX_DNS_ERROR"
  | "MAX_TIMEOUT"
  | "MAX_CONNECTION_RESET"
  | "MAX_NETWORK_ERROR"
  | "MAX_HTTP_401"
  | "MAX_HTTP_429"
  | "MAX_HTTP_503"
  | "MAX_HTTP_ERROR";

type SafeNetworkCause = {
  code?: string;
  message?: string;
  errno?: string | number;
  syscall?: string;
  hostname?: string;
};

type MaxLogContext = {
  operation: string;
  path: string;
  requestId: string;
  startedAt: number;
};

export type MaxMessageInput = {
  userId?: string;
  chatId?: string;
  text: string;
  attachments?: any[];
  linkUrl?: string;
  linkText?: string;
  inlineKeyboardButtons?: MaxInlineKeyboardButton[][];
};

export type MaxInlineKeyboardButton =
  | { type: "link"; text: string; url: string }
  | { type: "message"; text: string; payload: string };

export class MaxBotError extends Error {
  status?: number;
  safeCode: MaxSafeCode;
  requestId: string;

  constructor(message: string, safeCode: MaxSafeCode, requestId: string, status?: number) {
    super(message);
    this.name = "MaxBotError";
    this.status = status;
    this.safeCode = safeCode;
    this.requestId = requestId;
  }
}

function pickSafeNetworkCause(error: unknown): SafeNetworkCause {
  const source = ((error as any)?.cause || error || {}) as any;
  return {
    code: typeof source.code === "string" ? source.code : undefined,
    message: typeof source.message === "string" ? source.message : (error as any)?.message,
    errno: typeof source.errno === "string" || typeof source.errno === "number" ? source.errno : undefined,
    syscall: typeof source.syscall === "string" ? source.syscall : undefined,
    hostname: typeof source.hostname === "string" ? source.hostname : undefined,
  };
}

export function safeMaxNetworkCode(error: unknown): MaxSafeCode {
  const cause = pickSafeNetworkCause(error);
  const code = cause.code || (error as any)?.name || "";
  const message = cause.message || "";
  if (
    code.includes("CERT") ||
    code.includes("TLS") ||
    [
      "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
      "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
      "DEPTH_ZERO_SELF_SIGNED_CERT",
      "SELF_SIGNED_CERT_IN_CHAIN",
      "CERT_HAS_EXPIRED",
      "ERR_TLS_CERT_ALTNAME_INVALID",
    ].includes(code)
  ) {
    return "MAX_TLS_ERROR";
  }
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "MAX_DNS_ERROR";
  if (code === "ETIMEDOUT" || code === "AbortError" || message.includes("aborted")) return "MAX_TIMEOUT";
  if (code === "ECONNRESET") return "MAX_CONNECTION_RESET";
  return "MAX_NETWORK_ERROR";
}

export function safeMaxHttpCode(status: number): MaxSafeCode {
  if (status === 401) return "MAX_HTTP_401";
  if (status === 429) return "MAX_HTTP_429";
  if (status === 503) return "MAX_HTTP_503";
  return "MAX_HTTP_ERROR";
}

function logMaxFailure(context: MaxLogContext, status: number | undefined, safeCode: MaxSafeCode) {
  console.error("[MAX API] request failed", {
    scope: "max-api",
    operation: context.operation,
    host: MAX_API_HOST,
    path: context.path,
    durationMs: Date.now() - context.startedAt,
    status,
    safeCode,
    requestId: context.requestId,
  });
}

export function maxErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof MaxBotError) {
    const message = error.safeCode === "MAX_TLS_ERROR"
      ? "Не удалось установить защищённое соединение с MAX"
      : error.safeCode === "MAX_DNS_ERROR"
        ? "Не удалось найти сервер MAX. Попробуйте позже"
        : error.safeCode === "MAX_TIMEOUT"
          ? "MAX не ответил вовремя. Попробуйте позже"
          : error.safeCode === "MAX_HTTP_401"
            ? "MAX отклонил токен. Проверьте токен бота"
            : error.safeCode === "MAX_HTTP_429"
              ? "MAX временно ограничил количество запросов. Попробуйте позже"
              : error.safeCode === "MAX_HTTP_503"
                ? "MAX временно недоступен. Попробуйте позже"
                : fallbackMessage;
    return {
      error: message,
      code: error.safeCode,
      requestId: error.requestId,
    };
  }
  return {
    error: fallbackMessage,
    code: "MAX_NETWORK_ERROR" as MaxSafeCode,
    requestId: crypto.randomUUID(),
  };
}

async function maxFetch(token: string, path: string, init: RequestInit = {}, operation = "request") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MAX_TIMEOUT_MS);
  const context = {
    operation,
    path,
    requestId: crypto.randomUUID(),
    startedAt: Date.now(),
  };
  let response: Response;
  try {
    response = await fetch(`${MAX_API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        Authorization: token,
        ...(init.headers || {}),
      },
    });
  } catch (error) {
    const safeCode = safeMaxNetworkCode(error);
    logMaxFailure(context, undefined, safeCode);
    throw new MaxBotError("MAX API network request failed", safeCode, context.requestId);
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const safeCode = safeMaxHttpCode(response.status);
    logMaxFailure(context, response.status, safeCode);
    throw new MaxBotError("MAX API request failed", safeCode, context.requestId, response.status);
  }
  return body;
}

export async function getMaxBotInfo(token: string) {
  return maxFetch(token, "/me", { method: "GET" }, "get-bot-info");
}

export async function subscribeMaxWebhook(token: string, url: string, secret: string, updateTypes: string[] = ["bot_started", "message_created"]) {
  return maxFetch(token, "/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      url,
      secret,
      update_types: updateTypes,
    }),
  }, "subscribe-webhook");
}

export async function sendMaxMessage(token: string, input: MaxMessageInput) {
  const target = input.userId
    ? `user_id=${encodeURIComponent(input.userId)}`
    : `chat_id=${encodeURIComponent(input.chatId || "")}`;
  const attachments = [...(input.attachments || [])];
  if (input.linkUrl) {
    attachments.push({
      type: "inline_keyboard",
      payload: {
        buttons: [[{ type: "link", text: input.linkText || "Открыть", url: input.linkUrl }]],
      },
    });
  }
  if (input.inlineKeyboardButtons?.length) {
    attachments.push({
      type: "inline_keyboard",
      payload: {
        buttons: input.inlineKeyboardButtons,
      },
    });
  }
  return maxFetch(token, `/messages?${target}`, {
    method: "POST",
    body: JSON.stringify({
      text: input.text,
      attachments,
    }),
  }, "send-message");
}

export function buildPayInvoiceMessage(payload: { title?: string; amount?: number; payUrl?: string }) {
  const amount = Number(payload.amount || 0).toLocaleString("ru-RU");
  return `Робокс: выставлен счёт ${payload.title || "на обучение"} на сумму ${amount} ₽.`;
}

export function buildRequestContactMessage() {
  return {
    text: "Здравствуйте! Чтобы привязать личный кабинет Робокс, отправьте контакт через кнопку ниже.",
    attachments: [
      {
        type: "inline_keyboard",
        payload: {
          buttons: [[{ type: "request_contact", text: "Отправить телефон" }]],
        },
      },
    ],
  };
}

export const maxApiBase = MAX_API_BASE;
