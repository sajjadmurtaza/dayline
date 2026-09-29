"use client";

export function ShareQrCode({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="mx-auto w-fit rounded-2xl bg-white p-4">
      {/* Generated data URL. next/image does not optimize these. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={256} height={256} className="h-64 w-64" />
    </div>
  );
}
