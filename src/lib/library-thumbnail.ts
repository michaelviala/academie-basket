/**
 * Génération de vignettes dans le navigateur (PDF, image, vidéo).
 * Résultat : JPEG 480 × 300, recadré en « cover » depuis le haut.
 */
const W = 480;
const H = 300;

type Source = File | string;

function toCover(
  draw: (ctx: CanvasRenderingContext2D) => void,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  draw(ctx);
  return c;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  sw: number,
  sh: number,
  anchorTop: boolean,
) {
  const scale = Math.max(W / sw, H / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(src, (W - dw) / 2, anchorTop ? 0 : (H - dh) / 2, dw, dh);
}

const toBlob = (c: HTMLCanvasElement) =>
  new Promise<Blob>((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error("blob"))), "image/jpeg", 0.82),
  );

async function thumbFromPdf(source: Source): Promise<Blob> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const doc = await pdfjs.getDocument(
    typeof source === "string"
      ? { url: source }
      : { data: new Uint8Array(await source.arrayBuffer()) },
  ).promise;
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: W / base.width });
    const page_canvas = document.createElement("canvas");
    page_canvas.width = Math.floor(viewport.width);
    page_canvas.height = Math.floor(viewport.height);
    const pctx = page_canvas.getContext("2d");
    if (!pctx) throw new Error("canvas");
    await page.render({ canvasContext: pctx, viewport }).promise;
    return await toBlob(
      toCover((ctx) =>
        drawCover(
          ctx,
          page_canvas,
          page_canvas.width,
          page_canvas.height,
          true,
        ),
      ),
    );
  } finally {
    doc.destroy();
  }
}

async function thumbFromImage(source: Source): Promise<Blob> {
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    await img.decode();
    return await toBlob(
      toCover((ctx) =>
        drawCover(ctx, img, img.naturalWidth, img.naturalHeight, false),
      ),
    );
  } finally {
    if (typeof source !== "string") URL.revokeObjectURL(url);
  }
}

async function thumbFromVideo(source: Source, at: number): Promise<Blob> {
  const url =
    typeof source === "string"
      ? source.split("#")[0]
      : URL.createObjectURL(source);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";
  video.src = url;
  try {
    await new Promise<void>((res, rej) => {
      const t = setTimeout(() => rej(new Error("timeout")), 20000);
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(
          Math.max(at, 0.1),
          Math.max((video.duration || 1) - 0.1, 0.1),
        );
      };
      video.onseeked = () => {
        clearTimeout(t);
        res();
      };
      video.onerror = () => {
        clearTimeout(t);
        rej(new Error("video"));
      };
    });
    return await toBlob(
      toCover((ctx) =>
        drawCover(ctx, video, video.videoWidth, video.videoHeight, false),
      ),
    );
  } finally {
    video.removeAttribute("src");
    video.load();
    if (typeof source !== "string") URL.revokeObjectURL(url);
  }
}

/** Retourne une vignette JPEG, ou null si le format n'est pas pris en charge (Word, Excel…). */
export async function makeThumbnail(
  source: Source,
  mime: string | null | undefined,
  name: string | null | undefined,
  videoAt = 1,
): Promise<Blob | null> {
  const ext = (name ?? "").split(".").pop()?.toLowerCase() ?? "";
  const m = mime ?? "";
  try {
    if (m === "application/pdf" || ext === "pdf")
      return await thumbFromPdf(source);
    if (m.startsWith("image/")) return await thumbFromImage(source);
    if (m.startsWith("video/")) return await thumbFromVideo(source, videoAt);
  } catch {
    return null;
  }
  return null;
}
