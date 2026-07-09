const MAX_API_BASE = "https://platform-api2.max.ru";
const MAX_TIMEOUT_MS = 20_000;

export type MaxMessageInput = {
  userId?: string;
  chatId?: string;
  text: string;
  attachments?: any[];
  linkUrl?: string;
  linkText?: string;
};

export class MaxBotError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "MaxBotError";
    this.status = status;
    this.body = body;
  }
}

async function maxFetch(token: string, path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MAX_TIMEOUT_MS);
  try {
    const response = await fetch(`${MAX_API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        Authorization: token,
        ...(init.headers || {}),
      },
    });
    const text = await response.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!response.ok) {
      throw new MaxBotError("MAX API request failed", response.status, body);
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getMaxBotInfo(token: string) {
  return maxFetch(token, "/me", { method: "GET" });
}

export async function subscribeMaxWebhook(token: string, url: string, secret: string, updateTypes: string[] = ["bot_started", "message_created"]) {
  return maxFetch(token, "/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      url,
      secret,
      update_types: updateTypes,
    }),
  });
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
  return maxFetch(token, `/messages?${target}`, {
    method: "POST",
    body: JSON.stringify({
      text: input.text,
      attachments,
    }),
  });
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
