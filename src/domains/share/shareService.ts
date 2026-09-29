import { prepareShare } from "@/domains/share/shareUrl";
import type { SharePayload } from "@/domains/share/types";

type ShareNavigator = Pick<Navigator, "share" | "clipboard" | "canShare">;

export async function shareNative(payload: SharePayload, nav: ShareNavigator = navigator): Promise<"shared" | "cancelled" | "unavailable"> {
  if (typeof nav.share !== "function") return "unavailable";
  const prepared = prepareShare(payload);
  try {
    await nav.share({ title: prepared.title, text: prepared.text, url: prepared.url });
    return "shared";
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return "cancelled";
    throw error;
  }
}

export async function copyShareLink(payload: SharePayload, nav: ShareNavigator = navigator): Promise<boolean> {
  const prepared = prepareShare(payload);
  if (!prepared.url) return false;
  await nav.clipboard.writeText(prepared.url);
  return true;
}

export async function copyShareText(payload: SharePayload, nav: ShareNavigator = navigator): Promise<boolean> {
  const prepared = prepareShare(payload);
  if (!prepared.text) return false;
  await nav.clipboard.writeText(prepared.text);
  return true;
}

export function canShareQrFile(file: File, nav: ShareNavigator = navigator): boolean {
  return typeof nav.share === "function" && typeof nav.canShare === "function" && nav.canShare({ files: [file] });
}

export function qrFileSharingSupported(nav: ShareNavigator = typeof navigator === "undefined" ? ({} as ShareNavigator) : navigator): boolean {
  if (typeof nav.share !== "function" || typeof nav.canShare !== "function") return false;
  try {
    return nav.canShare({ files: [new File([""], "share-qr.png", { type: "image/png" })] });
  } catch {
    return false;
  }
}
