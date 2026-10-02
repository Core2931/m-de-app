// Browser only: reads a slip image with tesseract.js, entirely on the device —
// the image is never uploaded.

import type { Worker } from "tesseract.js";
import { mergeSlipReads, parseSlipText, type SlipRead } from "@/lib/slipParse";

// Values from the desktop trial: K+ slips carry a building watermark that
// swallowed the amount on 2 of 3 until the image was binarized at this level.
const THRESHOLD = 120;
const UPSCALE = 2;
const MAX_WIDTH = 2400;

export interface SlipResult {
  read: SlipRead;
  ms: number;
  blackWhiteText: string;
  rawText: string;
}

let workerPromise: Promise<Worker> | null = null;

/** Downloads the OCR engine and Thai/English models on first call (~9 MB,
 *  cached by the browser afterwards) and reuses the worker from then on. */
export function loadSlipReader(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = import("tesseract.js")
      .then(({ createWorker }) => createWorker(["tha", "eng"]))
      .catch((err) => {
        // Let the next attempt retry instead of replaying a failed download.
        workerPromise = null;
        throw err;
      });
  }
  return workerPromise;
}

async function toBlackAndWhite(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(UPSCALE, MAX_WIDTH / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = image.data;
  for (let i = 0; i < px.length; i += 4) {
    const luma = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
    const value = luma >= THRESHOLD ? 255 : 0;
    px[i] = value;
    px[i + 1] = value;
    px[i + 2] = value;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/**
 * Two passes, because the two layouts seen so far want opposite treatment:
 * K+ only reads cleanly in black and white, เป๋าตัง reads best untouched.
 * Black-and-white goes first in the merge since it won on amounts.
 */
export async function readSlip(file: File): Promise<SlipResult> {
  const worker = await loadSlipReader();
  const { PSM } = await import("tesseract.js");
  const start = performance.now();

  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
  const blackWhite = await worker.recognize(await toBlackAndWhite(file));

  await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
  const raw = await worker.recognize(file);

  return {
    read: mergeSlipReads(parseSlipText(blackWhite.data.text), parseSlipText(raw.data.text)),
    ms: Math.round(performance.now() - start),
    blackWhiteText: blackWhite.data.text,
    rawText: raw.data.text,
  };
}
