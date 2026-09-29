import QRCode from "qrcode";
import { prepareShare } from "@/domains/share/shareUrl";
import { canShareQrFile } from "@/domains/share/shareService";
import type { SharePayload } from "@/domains/share/types";

const QR_OPTIONS = { width: 512, margin: 2, errorCorrectionLevel: "M" as const };

export async function createQrCode(payload: SharePayload): Promise<string | null> {
  const prepared = prepareShare(payload);
  if (!prepared.qrValue) return null;
  return QRCode.toDataURL(prepared.qrValue, QR_OPTIONS);
}

export function downloadQrCode(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function shareQrCode(payload: SharePayload, dataUrl: string): Promise<"shared" | "cancelled" | "unavailable"> {
  const prepared = prepareShare(payload);
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], prepared.filename, { type: "image/png" });
  if (!canShareQrFile(file)) return "unavailable";
  try {
    await navigator.share({ title: prepared.title, text: prepared.text, files: [file] });
    return "shared";
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return "cancelled";
    throw error;
  }
}
