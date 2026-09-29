"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { ShareQrCode } from "@/components/share/ShareQrCode";
import type { PreparedShare } from "@/domains/share/types";

export function ShareSheet({
  prepared,
  notice,
  canNative,
  canShareFile,
  confirming,
  qrSrc,
  onClose,
  onConfirm,
  onNative,
  onCopyLink,
  onCopyText,
  onOpenQr,
  onDownload,
  onShareQr,
  onCloseQr,
}: {
  prepared: PreparedShare;
  notice: string | null;
  canNative: boolean;
  canShareFile: boolean;
  confirming: boolean;
  qrSrc: string | null;
  onClose: () => void;
  onConfirm: () => void;
  onNative: () => void;
  onCopyLink: () => void;
  onCopyText: () => void;
  onOpenQr: () => void;
  onDownload: () => void;
  onShareQr: () => void;
  onCloseQr: () => void;
}) {
  const t = useTranslations("app.share");
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = panel.current;
    if (!root) return;
    const focusable = () =>
      [...root.querySelectorAll<HTMLElement>("button, a[href], input, [tabindex]:not([tabindex='-1'])")].filter(
        (node) => !node.hasAttribute("disabled"),
      );
    focusable()[0]?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (qrSrc) onCloseQr();
        else onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming, qrSrc, onClose, onCloseQr]);

  const title = confirming ? t("privateWarning") : qrSrc ? t("qrTitle") : t("title");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/10 p-3 sm:items-center" onClick={onClose}>
      <section
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm space-y-4 rounded-[1.05rem] bg-paper p-5 shadow-[var(--shadow-now)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        {confirming ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="pill pill-now" onClick={onConfirm}>
              {t("anyway")}
            </button>
            <button type="button" className="pill pill-muted" onClick={onClose}>
              {t("cancel")}
            </button>
          </div>
        ) : qrSrc ? (
          <>
            <ShareQrCode src={qrSrc} alt={t("qrAlt", { title: prepared.title })} />
            <p className="text-base font-medium">{prepared.title}</p>
            {prepared.url ? <p className="break-all text-sm text-muted">{prepared.url}</p> : null}
            {prepared.text && !prepared.url ? <p className="text-sm text-muted">{prepared.text}</p> : null}
            <div className="flex flex-wrap gap-2">
              {prepared.canCopyLink ? (
                <button type="button" className="pill pill-muted" onClick={onCopyLink}>
                  {t("copyLink")}
                </button>
              ) : null}
              <button type="button" className="pill pill-muted" onClick={onDownload}>
                {t("download")}
              </button>
              {canShareFile ? (
                <button type="button" className="pill pill-muted" onClick={onShareQr}>
                  {t("shareQr")}
                </button>
              ) : null}
            </div>
            <div className="flex justify-end">
              <button type="button" className="pill pill-now" onClick={onCloseQr}>
                {t("done")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="font-medium">{prepared.title}</p>
              {prepared.url ? <p className="mt-1 break-all text-sm text-muted">{prepared.url}</p> : null}
            </div>
            {prepared.rejectedUrl ? <p className="text-sm text-muted">{t("localUrl")}</p> : null}
            <div className="flex flex-col gap-1">
              {canNative ? (
                <button type="button" className="min-h-11 rounded-2xl px-3 text-left font-medium ring-1 ring-line" onClick={onNative}>
                  {t("with")}
                </button>
              ) : null}
              {prepared.canCopyLink ? (
                <button type="button" className="min-h-11 rounded-2xl px-3 text-left ring-1 ring-line" onClick={onCopyLink}>
                  {t("copyLink")}
                </button>
              ) : null}
              {prepared.canCopyText ? (
                <button type="button" className="min-h-11 rounded-2xl px-3 text-left ring-1 ring-line" onClick={onCopyText}>
                  {t("copyText")}
                </button>
              ) : null}
              {prepared.canShowQr ? (
                <button type="button" className="min-h-11 rounded-2xl px-3 text-left ring-1 ring-line" onClick={onOpenQr}>
                  {t("qr")}
                </button>
              ) : null}
            </div>
            <div className="flex justify-end">
              <button type="button" className="pill pill-muted" onClick={onClose}>
                {t("close")}
              </button>
            </div>
          </>
        )}
        <p role="status" className="min-h-5 text-sm text-ok">
          {notice}
        </p>
      </section>
    </div>
  );
}
