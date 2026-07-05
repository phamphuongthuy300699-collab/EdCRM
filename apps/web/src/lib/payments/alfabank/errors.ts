export class AlfaBankError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly details?: unknown;

  constructor(message: string, options: { code?: string; status?: number; details?: unknown } = {}) {
    super(message);
    this.name = "AlfaBankError";
    this.code = options.code || "ALFABANK_ERROR";
    this.status = options.status;
    this.details = options.details;
  }
}

export function alfaErrorMessage(error: unknown) {
  if (error instanceof AlfaBankError) return error.message;
  if (error instanceof Error) return error.message;
  return "Не удалось создать платеж в Альфа-Банке";
}
