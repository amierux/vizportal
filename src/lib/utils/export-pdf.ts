/**
 * Capture an HTML element and download as PDF.
 * Uses html2canvas + jsPDF for client-side rendering.
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
  options?: {
    title?: string;
    orientation?: "portrait" | "landscape";
  },
): Promise<void> {
  const [html2canvas, { default: jsPDF }] = await Promise.all([
    import("html2canvas").then((m) => m.default),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const orientation = options?.orientation ?? "landscape";
  const pdf = new jsPDF(orientation, "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;

  if (options?.title) {
    pdf.setFontSize(16);
    pdf.text(options.title, margin, margin + 6);
    pdf.setFontSize(10);
    pdf.text(new Date().toLocaleDateString(), margin, margin + 14);
  }

  const topOffset = options?.title ? margin + 20 : margin;
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - topOffset - margin;

  const imgWidth = availableWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (imgHeight <= availableHeight) {
    pdf.addImage(imgData, "PNG", margin, topOffset, imgWidth, imgHeight);
  } else {
    const scale = availableHeight / imgHeight;
    pdf.addImage(
      imgData,
      "PNG",
      margin,
      topOffset,
      imgWidth * scale,
      availableHeight,
    );
  }

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
