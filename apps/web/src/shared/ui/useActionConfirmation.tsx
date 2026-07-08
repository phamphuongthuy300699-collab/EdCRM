"use client";

import React, { useState } from "react";
import { ConfirmActionModal } from "./ConfirmActionModal";

type AskOptions = {
  title: string;
  description: string;
  dangerLevel?: "safe" | "warning" | "danger";
  confirmText?: string;
  expectedText?: string;
  requireTypedConfirmation?: boolean;
};

type PendingState = AskOptions & {
  resolve: (value: boolean) => void;
};

export function useActionConfirmation() {
  const [pending, setPending] = useState<PendingState | null>(null);

  const askAction = (options: AskOptions) => new Promise<boolean>((resolve) => {
    setPending({ ...options, resolve });
  });

  const modal = (
    <ConfirmActionModal
      open={Boolean(pending)}
      title={pending?.title || ""}
      description={pending?.description || ""}
      dangerLevel={pending?.dangerLevel || "warning"}
      confirmText={pending?.confirmText || "Подтвердить"}
      expectedText={pending?.expectedText}
      requireTypedConfirmation={pending?.requireTypedConfirmation}
      onCancel={() => {
        pending?.resolve(false);
        setPending(null);
      }}
      onConfirm={() => {
        pending?.resolve(true);
        setPending(null);
      }}
    />
  );

  return { askAction, modal };
}
