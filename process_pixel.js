import { exportImageToPixel } from "./process_image.js";
import { TEMPLATES } from "./image/templates.js";
import { logger } from "./helper/logger.js";

export const get_pixel = async (IMAGE_INFO) => {
  try {
    const template = TEMPLATES[IMAGE_INFO.id];
    if (template) {
      const data = await exportImageToPixel(IMAGE_INFO, "real_time.png");
      const diff_point = findMismatchesWithLimit(data, template);
      const list_pixels = [];
      Object.keys(diff_point).forEach((pos) => {
        list_pixels.push({ pixelId: parseInt(pos), newColor: template[pos] });
      });
      return list_pixels;
    } else {
      logger.error(`Template not found for ID: ${IMAGE_INFO.id}`);
      return [];
    }
  } catch (error) {}
};
const findMismatchesWithLimit = (posRealTime, posOriginal, limit = 24) => {
  const mismatchedPositions = {};
  let count = 0;
  for (const key in posRealTime) {
    if (posRealTime[key] !== posOriginal[key]) {
      mismatchedPositions[key] = posOriginal[key];
      count++;
      if (count >= limit) {
        break;
      }
    }
  }

  return mismatchedPositions; // Trả về danh sách điểm khác nhau
};
