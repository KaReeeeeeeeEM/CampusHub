"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiDownload, FiFileText, FiLoader, FiZoomIn, FiZoomOut } from "react-icons/fi";
import * as pdfjsLib from "pdfjs-dist";

import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

type ViewerDocument = {
  title: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
};

type PdfPage = {
  getViewport: (options: { scale: number }) => {
    width: number;
    height: number;
  };
  render: (options: {
    canvas: HTMLCanvasElement;
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }) => {
    promise: Promise<void>;
  };
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
};

type ViewerKind = "pdf" | "docx" | "image" | "unsupported";

function getViewerKind(document: ViewerDocument): ViewerKind {
  const fileName = document.fileName.toLowerCase();
  const fileType = document.fileType.toLowerCase();

  if (fileType.includes("pdf") || fileName.endsWith(".pdf")) return "pdf";
  if (
    fileType.includes("wordprocessingml.document") ||
    fileName.endsWith(".docx")
  ) {
    return "docx";
  }
  if (fileType.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(fileName)) {
    return "image";
  }

  return "unsupported";
}

function sanitizeDocumentHtml(html: string) {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");

  document
    .querySelectorAll("script, iframe, object, embed, link, meta, style")
    .forEach((node) => node.remove());
  document.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      if (
        attribute.name.toLowerCase().startsWith("on") ||
        attribute.value.toLowerCase().startsWith("javascript:")
      ) {
        node.removeAttribute(attribute.name);
      }
    });
  });

  return document.body.innerHTML;
}

async function fetchArrayBuffer(fileUrl: string) {
  const response = await fetch(fileUrl);

  if (!response.ok) {
    throw new Error("Unable to load this document.");
  }

  return response.arrayBuffer();
}

function downloadDocument(document: ViewerDocument) {
  const anchor = window.document.createElement("a");
  anchor.href = document.fileUrl;
  anchor.download = document.fileName;
  anchor.click();
}

function PdfCanvasViewer({ document }: { document: ViewerDocument }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdf, setPdf] = useState<PdfDocument | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      setLoading(true);
      setError("");
      setPdf(null);
      setPageNumber(1);

      try {
        const arrayBuffer = await fetchArrayBuffer(document.fileUrl);
        const loadedPdf = (await pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
        }).promise) as unknown as PdfDocument;

        if (!cancelled) {
          setPdf(loadedPdf);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to preview this PDF.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPdf();

    return () => {
      cancelled = true;
    };
  }, [document.fileUrl]);

  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      const canvas = canvasRef.current;

      if (!canvas || !pdf) return;

      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;

      const viewport = page.getViewport({ scale });
      const context = canvas.getContext("2d");

      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvas, canvasContext: context, viewport }).promise;
    }

    void renderPage();

    return () => {
      cancelled = true;
    };
  }, [pageNumber, pdf, scale]);

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
        <FiLoader className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span className="ml-2 text-sm">Loading PDF preview...</span>
      </div>
    );
  }

  if (error || !pdf) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border border-border bg-background p-8 text-center">
        <FiFileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="mt-4 text-sm font-semibold">PDF preview unavailable</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {error || "Download the file to view it on your device."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Page {pageNumber} of {pdf.numPages}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            type="button"
            variant="secondary"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((current) => current - 1)}
          >
            Previous
          </Button>
          <Button
            size="sm"
            type="button"
            variant="secondary"
            disabled={pageNumber >= pdf.numPages}
            onClick={() => setPageNumber((current) => current + 1)}
          >
            Next
          </Button>
          <Button
            aria-label="Zoom out"
            size="icon"
            title="Zoom out"
            type="button"
            variant="secondary"
            onClick={() => setScale((current) => Math.max(0.75, current - 0.15))}
          >
            <FiZoomOut className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            aria-label="Zoom in"
            size="icon"
            title="Zoom in"
            type="button"
            variant="secondary"
            onClick={() => setScale((current) => Math.min(2, current + 0.15))}
          >
            <FiZoomIn className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="max-h-[65vh] overflow-auto rounded-lg border border-border bg-background p-4">
        <canvas
          ref={canvasRef}
          className="mx-auto max-w-full rounded-md bg-white shadow-sm"
        />
      </div>
    </div>
  );
}

function DocxViewer({ document }: { document: ViewerDocument }) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDocx() {
      setLoading(true);
      setError("");
      setHtml("");

      try {
        const [{ convertToHtml }, arrayBuffer] = await Promise.all([
          import("mammoth/mammoth.browser"),
          fetchArrayBuffer(document.fileUrl),
        ]);
        const result = await convertToHtml({ arrayBuffer });

        if (!cancelled) {
          setHtml(sanitizeDocumentHtml(result.value));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to preview this DOCX file.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDocx();

    return () => {
      cancelled = true;
    };
  }, [document.fileUrl]);

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
        <FiLoader className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span className="ml-2 text-sm">Loading DOCX preview...</span>
      </div>
    );
  }

  if (error) {
    return (
      <UnsupportedViewer
        title="DOCX preview unavailable"
        description={error}
        document={document}
      />
    );
  }

  return (
    <div className="max-h-[65vh] overflow-auto rounded-lg border border-border bg-white p-8 text-slate-950">
      <div
        className={cn(
          "mx-auto max-w-3xl space-y-4 leading-7",
          "[&_a]:text-primary [&_h1]:text-2xl [&_h1]:font-semibold",
          "[&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg",
          "[&_li]:ml-5 [&_ol]:list-decimal [&_p]:min-h-4 [&_ul]:list-disc",
          "[&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2",
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function ImageViewer({ document }: { document: ViewerDocument }) {
  return (
    <div className="max-h-[65vh] overflow-auto rounded-lg border border-border bg-background p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={document.title}
        className="mx-auto max-h-[60vh] max-w-full rounded-md object-contain"
        src={document.fileUrl}
      />
    </div>
  );
}

function UnsupportedViewer({
  title = "Preview unavailable",
  description = "This file type cannot be previewed in the document viewer yet.",
  document,
}: {
  title?: string;
  description?: string;
  document: ViewerDocument;
}) {
  return (
    <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border border-border bg-background p-8 text-center">
      <FiFileText className="h-9 w-9 text-muted-foreground" aria-hidden="true" />
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <Button
        className="mt-6"
        type="button"
        variant="secondary"
        onClick={() => downloadDocument(document)}
      >
        <FiDownload className="h-4 w-4" aria-hidden="true" />
        Download file
      </Button>
    </div>
  );
}

export function DocumentViewer({
  document,
  open,
  onOpenChange,
}: {
  document: ViewerDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const viewerKind = useMemo(
    () => (document ? getViewerKind(document) : "unsupported"),
    [document],
  );

  if (!document) return null;

  return (
    <Modal
      open={open}
      title={document.title}
      description={`${document.fileName} · ${viewerKind.toUpperCase()} preview`}
      className="max-w-6xl"
      footer={
        <Button
          type="button"
          variant="secondary"
          onClick={() => downloadDocument(document)}
        >
          <FiDownload className="h-4 w-4" aria-hidden="true" />
          Download
        </Button>
      }
      onOpenChange={onOpenChange}
    >
      {viewerKind === "pdf" ? <PdfCanvasViewer document={document} /> : null}
      {viewerKind === "docx" ? <DocxViewer document={document} /> : null}
      {viewerKind === "image" ? <ImageViewer document={document} /> : null}
      {viewerKind === "unsupported" ? (
        <UnsupportedViewer document={document} />
      ) : null}
    </Modal>
  );
}
