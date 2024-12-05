import { LIST_KEY } from "../image/helper.js";
import { TEMPLATES } from "../image/templates.js";
import { logger } from "./logger.js";
import { connectRedis } from "../connections/redis.js";

let REDIS_CLIENT;

const _getRandomElements = (arr, count) => {
  const shuffled = arr.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const _getPositions = async (
  template,
  target = 30,
  selected_positions = [],
  attemp = 0
) => {
  const remain_count = target - selected_positions.length;
  if (remain_count <= 0 || attemp >= 10) return selected_positions;

  const random_pos = _getRandomElements(Object.keys(template), remain_count);
  let list_keys = [];
  random_pos.forEach((pos) => {
    list_keys.push([LIST_KEY, pos].join("_"));
  });
  const list_current_colors = await REDIS_CLIENT.mGet(list_keys);
  random_pos.forEach((pos, index) => {
    const current_color = list_current_colors[index];
    const master_color = template[pos];
    if (current_color != null && current_color != master_color) {
      selected_positions.push(pos);
    }
  });
  return _getPositions(template, target, selected_positions, attemp++);
};

export const getPixel = async (template_id, count = 30) => {
  try {
    // const CLIENT = redis.createClient({ url: process.env.REDIS_URL })
    // await CLIENT.connect()
    REDIS_CLIENT = await connectRedis();
    const template = TEMPLATES[template_id];
    if (!template) {
      logger.error(`Not have template ${template_id}`);
      return [];
    }
    const positions = await _getPositions(template, count);
    const list_pixels = [];
    positions.forEach((pos) => {
      list_pixels.push({ pixelId: parseInt(pos), newColor: template[pos] });
    });
    // if (CLIENT) {
    // }
    // await CLIENT.disconnect()
    return list_pixels;
  } catch (e) {
    logger.error("Catch get pixel");
    logger.error(e.message);
    // if (CLIENT) {
    //     await CLIENT.disconnect()
    // }
    return [];
  }
};
