export const MASTER_COLORS = [
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
export const LIST_KEY = "not_pixel_image";

export const convertToID = (x, y) => {
  const id = y * 1000 + (x + 1);
  return id;
};

export const convertToAbsolute = (xRel, yRel, top_left_x, top_left_y) => {
  const absoluteX = xRel + top_left_x;
  const absoluteY = yRel + top_left_y;
  return { x: absoluteX, y: absoluteY };
};

export const rgbaToHex = (r, g, b) => {
  const toHex = (value) => {
    const hex = value.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  const hexR = toHex(r);
  const hexG = toHex(g);
  const hexB = toHex(b);

  return `#${hexR}${hexG}${hexB}`.toUpperCase();
};

export const getNeighboringIds = (id) => {
  const size = 1000;

  // Tính tọa độ i, j từ id
  const i = Math.floor((id - 1) / size);
  const j = (id - 1) % size;

  const neighbors = [];

  // Duyệt qua các hàng và cột trong phạm vi từ (i-2, j-2) đến (i+2, j+2)
  for (let di = -2; di <= 2; di++) {
    for (let dj = -2; dj <= 2; dj++) {
      const ni = i + di;
      const nj = j + dj;

      // Kiểm tra xem pixel có nằm trong phạm vi hợp lệ không
      if (ni >= 0 && ni < size && nj >= 0 && nj < size) {
        const neighborId = ni * size + nj + 1; // Tính ID của pixel này
        neighbors.push(neighborId);
      }
    }
  }

  return neighbors;
};
