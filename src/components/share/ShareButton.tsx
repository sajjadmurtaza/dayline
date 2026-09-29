"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DaylineIcon } from "@/components/icons";
import { ShareSheet } from "@/components/share/ShareSheet";
import { createQrCode, downloadQrCode, shareQrCode } from "@/domains/share/qrService";
import { copyShareLink, copyShareText, qrFileSharingSupported, shareNative } from "@/domains/share/shareService";
import { prepareShare } from "@/domains/share/shareUrl";
import type { SharePayload } from "@/domains/share/types";

export function ShareButton({ payload, className }: { payload: SharePayload; className?: string }) {
  const t = useTranslations("app.share");
  const prepared = prepareShare(payload);
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const canNative = typeof navigator !== "undefined" && typeof navigator.share === "function";

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2000);
  }

  function onOpen() {
    setNotice(null);
    setQrSrc(null);
    setConfirmed(!prepared.privateConfirm);
    setOpen(true);
  }

  return (
    <>
      <button type="button" className={className ?? "inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-medium"} aria-label={t("aria")} onClick={() => void onOpen()}>
        <DaylineIcon name="share" className="h-4 w-4" />
        {t("title")}
      </button>
      {open ? (
        <ShareSheet
          prepared={prepared}
          notice={notice}
          canNative={canNative}
          canShareFile={qrFileSharingSupported()}
          confirming={prepared.privateConfirm && !confirmed}
          qrSrc={qrSrc}
          onClose={() => {
            setOpen(false);
            setQrSrc(null);
          }}
          onConfirm={() => setConfirmed(true)}
          onNative={() => void shareNative(payload)}
          onCopyLink={() => {
            void copyShareLink(payload).then((ok) => {
              if (ok) flash(t("linkCopied"));
            });
          }}
          onCopyText={() => {
            void copyShareText(payload).then((ok) => {
              if (ok) flash(t("copied"));
            });
          }}
          onOpenQr={() => {
            void createQrCode(payload).then((src) => setQrSrc(src));
          }}
          onDownload={() => {
            if (qrSrc) downloadQrCode(qrSrc, prepared.filename);
          }}
          onShareQr={() => {
            if (qrSrc) void shareQrCode(payload, qrSrc);
          }}
          onCloseQr={() => setQrSrc(null)}
        />
      ) : null}
    </>
  );
}
