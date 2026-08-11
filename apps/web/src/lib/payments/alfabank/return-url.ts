import { AlfaBankError } from "./errors";

const blockedProductionHosts = new Set(["0.0.0.0", "localhost", "127.0.0.1"]);

export function buildPaymentReturnUrl(pathOrUrl: string | null | undefined, input: {
  requestOrigin: string;
  invoiceId: string;
  paymentId: string;
  publicAppUrl?: string;
  appUrl?: string;
  nodeEnv?: string;
}) {
  const configuredOrigin = input.publicAppUrl?.trim() || input.appUrl?.trim() || "";
  const origin = configuredOrigin || input.requestOrigin;
  const originUrl = new URL(origin);
  const assertPublicProductionUrl = (url: URL) => {
    if (input.nodeEnv === "production" && blockedProductionHosts.has(url.hostname)) {
      throw new AlfaBankError("Для онлайн-оплаты в production задайте NEXT_PUBLIC_APP_URL или APP_URL с публичным доменом", {
        code: "PUBLIC_APP_URL_NOT_CONFIGURED",
      });
    }
  };
  assertPublicProductionUrl(originUrl);
  const fallbackPath = "/payments/success";
  const raw = pathOrUrl?.trim() || fallbackPath;
  const url = raw.startsWith("http://") || raw.startsWith("https://")
    ? new URL(raw)
    : new URL(raw.startsWith("/") ? raw : `/${raw}`, originUrl);
  assertPublicProductionUrl(url);
  if (input.nodeEnv === "production" && url.origin !== originUrl.origin) {
    throw new AlfaBankError("Payment return URL must use the configured application origin", { code: "PAYMENT_RETURN_ORIGIN_REJECTED" });
  }

  url.searchParams.set("invoiceId", input.invoiceId);
  url.searchParams.set("paymentId", input.paymentId);
  return url.toString();
}
