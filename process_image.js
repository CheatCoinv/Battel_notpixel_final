import { Jimp, intToRGBA } from "jimp";
const MASTER_COLORS = [
  "#E46E6E",
  "#FFD635",
  "#7EED56",
  "#00CCC0",
  "#51E9F4",
  "#94B3FF",
  "#E4ABFF",
  "#FF99AA",
  "#FFB470",
  "#FFFFFF",
  "#BE0039",
  "#FF9600",
  "#00CC78",
  "#009EAA",
  "#3690EA",
  "#6A5CFF",
  "#B44AC0",
  "#FF3881",
  "#9C6926",
  "#898D90",
  "#6D001A",
  "#BF4300",
  "#00A368",
  "#00756F",
  "#2450A4",
  "#493AC1",
  "#811E9F",
  "#A00357",
  "#6D482F",
  "#000000",
];
const MASTER_COLORS_SET = new Set(MASTER_COLORS);
//#region function helper
const colorDistance = (color1, color2) => {
  return Math.sqrt(
    Math.pow(color1.r - color2.r, 2) +
      Math.pow(color1.g - color2.g, 2) +
      Math.pow(color1.b - color2.b, 2)
  );
};

// Hàm tìm màu gần nhất trong MASTER_COLORS
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
// Chuyển đổi từ RGB thành mã màu hexadecimal
const rgbaToHex = (r, g, b) => {
  const toHex = (value) => {
    const hex = value.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

// Chuyển mã màu hexadecimal thành RGB
const hexToRgb = (hex) => {
  const bigint = parseInt(hex.slice(1), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

// Chuyển tọa độ thành ID
const convertToID = (x, y) => {
  return y * 1000 + (x + 1);
};

//#endregion

export const exportImageToPixel = async (IMAGE_INFO, path_image) => {
  // đọc màu của temp
  const IMAGE_COLORS = {};
  try {
    const image = await Jimp.read(path_image);
    const top_left_x = IMAGE_INFO.top_left_x;
    const top_left_y = IMAGE_INFO.top_left_y;
    const bottom_right_x = IMAGE_INFO.bottom_rigth_x;
    const bottom_right_y = IMAGE_INFO.bottom_rigth_y;

    for (let y = top_left_y; y <= bottom_right_y; y++) {
      for (let x = top_left_x; x <= bottom_right_x; x++) {
        const color = image.getPixelColor(x, y);
        const rgba = intToRGBA(color);
        const hex = rgbaToHex(rgba.r, rgba.g, rgba.b);
        let finalHex;
        if (!MASTER_COLORS_SET.has(hex)) {
          finalHex = findClosestColor(rgba.r, rgba.g, rgba.b);
        } else {
          finalHex = hex;
        }
        const id = convertToID(x, y);
        if (
          x >= IMAGE_INFO.excluded_top_left_x &&
          x <= IMAGE_INFO.excluded_bottom_rigth_x &&
          y >= IMAGE_INFO.excluded_top_left_y &&
          y <= IMAGE_INFO.excluded_bottom_rigth_y
        )
          continue;
        IMAGE_COLORS[id] = finalHex;
      }
    }
    return IMAGE_COLORS;
  } catch (error) {
    console.log(`Error reading image ${path_image}:`, error);
    return null;
  }
};
