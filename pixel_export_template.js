import "dotenv/config";

import { Jimp, intToRGBA } from "jimp";
import fs from "fs";

import {
  MASTER_COLORS,
  convertToID,
  convertToAbsolute,
  rgbaToHex,
} from "./image/helper.js";
import { getTemplates } from "./image/notpixel.js";
import { logger } from "./helper/logger.js";
const MASTER_COLORS_SET = new Set(MASTER_COLORS);
const findClosestColor = (r, g, b) => {
  let closestColor = null;
  let minDistance = Infinity;

  MASTER_COLORS.forEach((hexColor) => {
    const { r: masterR, g: masterG, b: masterB } = hexToRgb(hexColor);
    const distance = colorDistance(
      { r, g, b },
      { r: masterR, g: masterG, b: masterB }
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestColor = hexColor;
    }
  });

  return closestColor;
};
const colorDistance = (color1, color2) => {
  return Math.sqrt(
    Math.pow(color1.r - color2.r, 2) +
      Math.pow(color1.g - color2.g, 2) +
      Math.pow(color1.b - color2.b, 2)
  );
};
const _exportPixel = async (url, temp_x, temp_y) => {
  let pixels = {};
  const image = await Jimp.read(url);
  const width = image.bitmap.width;
  const height = image.bitmap.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = image.getPixelColor(x, y);
      const rgba = intToRGBA(color);
      const hex = rgbaToHex(rgba.r, rgba.g, rgba.b);
      let finalHex;
      if (!MASTER_COLORS_SET.has(hex)) {
        // Nếu không có trong danh sách, tìm màu gần nhất
        finalHex = findClosestColor(rgba.r, rgba.g, rgba.b);
      } else {
        finalHex = hex;
      }
      const abso = convertToAbsolute(x, y, temp_x, temp_y);
      const id = convertToID(abso.x, abso.y);
      pixels[id] = finalHex;
    }
  }
  return pixels;
};

const exportTemplateToPixel = async () => {
  try {
    let pixels = [],
      temp = "GOLOBAL & USER";
    let user_pixels = {},
      global_pixels = {};

    if (process.env.USE_TEMPLATE != "2") {
      global_pixels = await _exportPixel(
        `https://app.notpx.app/assets/${process.env.MAIN_TEMP_ID}.png`,
        parseInt(process.env.MAIN_TEMP_X),
        parseInt(process.env.MAIN_TEMP_Y)
      );
    }

    if (process.env.USE_TEMPLATE != "1") {
      const templates = await getTemplates(
        process.env.USER_TEMP_IDS.split(",")
      );
      if (!templates.every((r) => r.id)) {
        logger.error("Get template failed");
        logger.error(templates);
        return;
      }
      for await (const temp of templates) {
        const pixels = await _exportPixel(temp.url, temp.x, temp.y);
        user_pixels[temp.id] = pixels;
        logger.info(`Read teamplate ${temp.id} done`);
      }
    }
    if (process.env.USE_TEMPLATE == "1") {
      pixels = Object.assign({}, { global: global_pixels });
      temp = "GLOBAL";
    } else if (process.env.USE_TEMPLATE == "2") {
      pixels = Object.assign({}, user_pixels);
      temp = "USER";
    } else {
      pixels = Object.assign({}, { global: global_pixels }, user_pixels);
    }

    let list_positions = [];
    for (const [temp, list_pixels] of Object.entries(pixels)) {
      for (const [pos, _] of Object.entries(list_pixels)) {
        if (!list_positions.includes(pos)) {
          list_positions.push(pos);
        }
      }
    }
    const position_content = `export const POSITIONS = ${JSON.stringify(
      list_positions,
      null,
      2
    )};\n`;
    fs.writeFile("image/positions.js", position_content, (err) => {
      if (err) {
        logger.error("Error writing to file:", err);
      } else {
        logger.info(`Export positions success.`);
      }
    });

    const template_content = `export const TEMPLATES = ${JSON.stringify(
      pixels,
      null,
      2
    )};\n`;
    fs.writeFile("image/templates.js", template_content, (err) => {
      if (err) {
        logger.error("Error writing to file:", err);
      } else {
        logger.info(`Export template ${temp} to pixel success.`);
      }
    });
  } catch (e) {
    logger.error(e.message);
    logger.error("Catch export template to pixel");
  }
};

exportTemplateToPixel();
