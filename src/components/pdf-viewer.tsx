"use client";

import { useEffect, useRef, useState } from "react";
import type {
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * Affiche un PDF page par page dans la page (pdf.js). Le lecteur intégré des navigateurs
 * est bloqué pour les fichiers du stockage et absent sur la plupart des téléphones.
 */
export default function PdfViewer({
  url,
  title,
  fullscreen = false,
}: {
  url: string;
  title: string;
  fullscreen?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [width, setWidth] = useState(0);
  const [error, setError] = useState(false);
  const [rendered, setRendered] = useState(0);

  // Chargement du document
  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const task = pdfjs.getDocument({ url });
        loaded = await task.promise;
        if (cancelled) return void loaded.destroy();
        setDoc(loaded);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
      loaded?.destroy();
    };
  }, [url]);

  // Largeur disponible (suit le redimensionnement, avec un léger délai)
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout>;
    const measure = () => setWidth(Math.floor(el.clientWidth));
    measure();
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(measure, 150);
    });
    ro.observe(el);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      className={`rounded-lg ${fullscreen ? "flex h-full flex-col" : ""}`}
      style={{ background: "var(--surf-2)" }}
    >
      <div
        ref={boxRef}
        className={`overflow-y-auto overflow-x-hidden rounded-lg p-2 ${fullscreen ? "min-h-0 flex-1" : "max-h-[70vh]"}`}
      >
        {error && (
          <p
            className="p-6 text-center text-sm"
            style={{ color: "var(--text-dim)" }}
          >
            Impossible d&apos;afficher ce PDF ici. Utilise « Télécharger /
            ouvrir » ci-dessous.
          </p>
        )}
        {!error && !doc && (
          <p
            className="p-6 text-center text-sm"
            style={{ color: "var(--text-faint)" }}
          >
            Chargement du PDF…
          </p>
        )}
        {doc && width > 0 && (
          <div className="flex flex-col gap-2" aria-label={title}>
            {Array.from({ length: doc.numPages }, (_, i) => (
              <PdfPage
                key={`${i}-${width}`}
                doc={doc}
                pageNumber={i + 1}
                width={width - 16}
                onDone={() => setRendered((n) => n + 1)}
              />
            ))}
          </div>
        )}
      </div>
      {doc && (
        <p
          className="px-3 py-1.5 text-right text-[11px]"
          style={{ color: "var(--text-faint)" }}
        >
          {doc.numPages} page{doc.numPages > 1 ? "s" : ""}
          {rendered < doc.numPages ? " · chargement…" : ""}
        </p>
      )}
    </div>
  );
}

function PdfPage({
  doc,
  pageNumber,
  width,
  onDone,
}: {
  doc: PDFDocumentProxy;
  pageNumber: number;
  width: number;
  onDone: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = useState(1.414);

  useEffect(() => {
    let task: RenderTask | null = null;
    let cancelled = false;
    (async () => {
      try {
        const page = await doc.getPage(pageNumber);
        const base = page.getViewport({ scale: 1 });
        const scale = Math.max(width, 100) / base.width;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: scale * dpr });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        setRatio(base.height / base.width);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        task = page.render({ canvasContext: ctx, viewport });
        await task.promise;
        if (!cancelled) onDone();
      } catch {
        /* rendu interrompu (fermeture ou redimensionnement) */
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, pageNumber, width]);

  return (
    <canvas
      ref={canvasRef}
      className="mx-auto block rounded bg-white shadow"
      style={{ width, aspectRatio: `1 / ${ratio}`, maxWidth: "100%" }}
    />
  );
}
