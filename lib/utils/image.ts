/**
 * Klient-side bildebehandling for "gjenkjenn vin fra bilde"-funksjonen
 * (se components/recipe/WineSection.tsx). Skalerer ned og komprimerer til
 * JPEG FØR opplasting – holder Server Action-payloaden liten (unngår
 * treffe body-størrelsesgrensen) og normaliserer eksotiske kildeformater
 * (f.eks. HEIC fra iPhone-kamera) til noe alle nettlesere og Anthropic sitt
 * API forstår, uansett hva brukeren faktisk valgte.
 */

export interface ResizedImage {
  base64Data: string;
  mediaType: "image/jpeg";
}

type ImageSource = ImageBitmap | HTMLImageElement;

function loadHtmlImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Kunne ikke lese bildet."));
    };
    img.src = url;
  });
}

async function loadImageSource(file: File): Promise<ImageSource> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Noen kildeformater/nettlesere feiler her – faller tilbake til <img>.
    }
  }
  return loadHtmlImage(file);
}

export async function resizeImageFileToJpegBase64(
  file: File,
  maxDimension = 1280,
  quality = 0.82,
): Promise<ResizedImage> {
  const image = await loadImageSource(file);
  const width = image.width;
  const height = image.height;
  if (!width || !height) {
    throw new Error("Kunne ikke lese bildet.");
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Kunne ikke behandle bildet i denne nettleseren.");
  }
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64Data = dataUrl.split(",")[1] ?? "";
  if (!base64Data) {
    throw new Error("Kunne ikke behandle bildet.");
  }

  if ("close" in image && typeof image.close === "function") {
    image.close();
  }

  return { base64Data, mediaType: "image/jpeg" };
}
