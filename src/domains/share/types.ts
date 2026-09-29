export type SharePayload = {
  title: string;
  text?: string;
  url?: string;
  qrValue?: string;
  filename?: string;
  privacy?: "public" | "external" | "private";
  source?: "bookmark" | "question" | "project" | "note" | "calendar" | "other";
};

export type PreparedShare = {
  title: string;
  text?: string;
  url?: string;
  qrValue?: string;
  filename: string;
  remote: boolean;
  privateConfirm: boolean;
  canCopyLink: boolean;
  canCopyText: boolean;
  canShowQr: boolean;
  rejectedUrl: boolean;
};
