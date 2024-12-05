import fs from "fs";
import { jwtDecode } from "jwt-decode";
import { SocksProxyAgent } from "socks-proxy-agent";

import { logger } from "../helper/logger.js";
import { getIframeUrl } from "../helper/tele.js";

const TOKEN_FILE = "./image/token.txt";
const USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";
let TELE_DATA;

const sleep = (delay) => {
  return new Promise((resolve) => setTimeout(resolve, delay));
};

const _loginTele = async () => {
  const iframe_url = await getIframeUrl(
    process.env.TELE_APP_ID,
    process.env.TELE_APP_HASH,
    process.env.TELE_SESSION,
    process.env.TELE_SOCKS_PROXY_URL,
    logger
  );
  if (!iframe_url) return "";
  const web_app_data = Object.fromEntries(
    new URLSearchParams(iframe_url.replace(/.*tgWebAppData/, "tgWebAppData"))
  );
  TELE_DATA = `initData ${web_app_data.tgWebAppData}`;
  console.log(TELE_DATA);
};
const _requestGet = async (url) => {
  try {
    let headers = {
      Accept: "*/*",
      "Accept-Language": "vi,en-US;q=0.7,en;q=0.3",
      "User-Agent": USER_AGENT,
      authorization: TELE_DATA,
    };
    let options = {
      headers: headers,
      referrer: process.env.REFFER_URL,
      method: "GET",
    };
    if (process.env.TELE_SOCKS_PROXY_URL) {
      options["agent"] = new SocksProxyAgent(process.env.TELE_SOCKS_PROXY_URL);
    }

    let response = await fetch(url, options).then((r) => {
      const contentType = r.headers.get("Content-Type");
      if (contentType.includes("application/json")) {
        return r.json();
      } else {
        return r.text();
      }
    });
    return response;
  } catch (e) {
    logger.error(e);
    return { status: 500, message: e };
  }
};

function calculateOverlap(r1, r2) {
  const x1 = r1.x;
  const y1 = r1.y;
  const width1 = r2.imageSize;
  const height1 = r2.imageSize;

  const x2 = r2.x;
  const y2 = r2.y;
  const width2 = r2.imageSize;
  const height2 = r2.imageSize;

  // Tìm tọa độ vùng giao nhau
  const left = Math.max(x1, x2);
  const right = Math.min(x1 + width1, x2 + width2);
  const top = Math.max(y1, y2);
  const bottom = Math.min(y1 + height1, y2 + height2);

  // Kiểm tra xem có giao nhau không
  if (left < right && top < bottom) {
    const intersectionWidth = right - left;
    const intersectionHeight = bottom - top;
    const intersectionArea = intersectionWidth * intersectionHeight;

    // Diện tích hình 1
    const area1 = width1 * height1;

    // Tính phần trăm diện tích hình 1 bị đè
    const percentageCovered = (intersectionArea / area1) * 100;
    return percentageCovered;
  } else {
    // Không có vùng giao nhau
    return 0;
  }
}

const areOverlapping = (rect1, rect2) => {
  // Lấy tọa độ của hai hình
  const x1 = rect1.x;
  const y1 = rect1.y;
  const x2 = rect2.x;
  const y2 = rect2.y;

  // Tính tọa độ của góc dưới phải
  const rect1Right = x1 + 128;
  const rect1Bottom = y1 + 128;
  const rect2Right = x2 + 128;
  const rect2Bottom = y2 + 128;

  // Tính toán phần giao nhau
  const intersectionWidth = Math.min(rect1Right, rect2Right) - Math.max(x1, x2);
  const intersectionHeight =
    Math.min(rect1Bottom, rect2Bottom) - Math.max(y1, y2);

  // Nếu không có giao nhau, trả về 0
  if (intersectionWidth <= 0 || intersectionHeight <= 0) {
    return 0;
  }

  // Diện tích giao nhau
  const intersectionArea = intersectionWidth * intersectionHeight;

  // Diện tích của hai hình chữ nhật
  const rect1Area = 128 * 128;
  const rect2Area = 128 * 128;

  // Diện tích nhỏ hơn
  const smallerRectArea = Math.min(rect1Area, rect2Area);

  // Phần trăm chồng chéo
  const overlapPercentage = (intersectionArea / smallerRectArea) * 100;

  return overlapPercentage;
};

export const checkTemplate = async () => {
  try {
    if (!TELE_DATA) {
      await _loginTele();
    }

    let temp_promise = [];
    process.env.USER_TEMP_IDS.split(",").forEach((id) => {
      temp_promise.push(
        _requestGet(`https://notpx.app/api/v1/image/template/${id}`)
      );
    });
    let results = await Promise.all(temp_promise);
    results = results.sort((a, b) => {
      return a.subscribers - b.subscribers;
    });

    for (const r1 of results) {
      if (!r1.overlap) r1.overlap = [];
      for (const r2 of results) {
        if (r1.id == r2.id) continue;
        let percent;
        if ((percent = areOverlapping(r1, r2))) {
          if (r1.overlap) {
            r1.overlap.push({ id: r2.id, percent: percent });
          } else {
            r1.overlap = [{ id: r2.id, percent: percent }];
          }
        }
      }
    }

    results.forEach((r) => {
      const over = r.overlap
        .filter((o) => {
          return o.percent > 50;
        })
        .sort((a, b) => {
          return b.percent - a.percent;
        })
        .map((o) => `${o.id}(${o.percent})`);
      console.log(
        `${r.id}: (${r.x},${r.y}) subscribers: ${r.subscribers} replaint: ${r.hits} overlap: ${over}`
      );
    });
  } catch (e) {
    logger.error(e.message);
    logger.error("Catch get template list");
    return;
  }
};

export const getTemplatesList = async (start, end) => {
  try {
    if (!TELE_DATA) {
      await _loginTele();
    }
    const list_promise = [];
    for (let i = start; i <= end; i++) {
      list_promise.push(
        _requestGet(
          `https://notpx.app/api/v1/image/template/list?limit=12&offset=${
            i * 12
          }`
        )
      );
    }
    let results = await Promise.all(list_promise);

    let temp_promise = [];

    // for await (const r of results) {
    //     for await (const t of r) {
    //         await sleep(500)
    //         temp_promise.push(await _requestGet(`https://notpx.app/api/v1/image/template/${t.templateId}`))
    //     }

    // }
    // results = temp_promise.sort((a, b) => { return a.subscribers - b.subscribers })

    results.forEach((r) => {
      r.forEach((t) => {
        temp_promise.push(
          _requestGet(`https://notpx.app/api/v1/image/template/${t.templateId}`)
        );
      });
    });
    results = await Promise.all(temp_promise);
    results = results.sort((a, b) => {
      return a.subscribers - b.subscribers;
    });

    for (const r1 of results) {
      if (!r1.overlap) r1.overlap = [];
      for (const r2 of results) {
        if (r1.id == r2.id) continue;
        let percent;
        if ((percent = calculateOverlap(r1, r2))) {
          if (r1.overlap) {
            r1.overlap.push({ id: r2.id, percent: percent });
          } else {
            r1.overlap = [{ id: r2.id, percent: percent }];
          }
        }
      }
    }

    results.forEach((r) => {
      const over = r.overlap
        .filter((o) => {
          return o.percent > 50;
        })
        .sort((a, b) => {
          return b.percent - a.percent;
        })
        .map((o) => `${o.id}(${o.percent})`);
      console.log(
        `${r.id}: (${r.x},${r.y})(${r.imageSize}) subscribers: ${r.subscribers} replaint: ${r.hits} overlap: ${over}`
      );
    });
  } catch (e) {
    logger.error(e.message);
    logger.error("Catch get template list");
    return;
  }
};

export const getTemplates = async (temp_ids) => {
  try {
    //https://notpx.app/api/v1/tournament/template/460127790
    await _loginTele();
    const results = await Promise.all(
      temp_ids.map((id) => {
        return _requestGet(
          `https://notpx.app/api/v1/tournament/template/${id}`
        );
      })
    );

    return results;
  } catch (e) {
    logger.error(e.message);
    logger.error("Catch get template");
    return [];
  }
};

export const getToken = async () => {
  logger.info("GET TOKEN");
  try {
    let need_login = true;
    let token = "";
    if (fs.existsSync(TOKEN_FILE)) {
      token = fs.readFileSync(TOKEN_FILE, "utf8");
      const token_data = jwtDecode(token);

      if (new Date(parseInt(token_data.exp) * 1000 - 600000) > new Date()) {
        need_login = false;
      }
    }
    if (!need_login) {
      logger.info("Don't need login");
      logger.info(token);
      return token;
    }
    logger.info("Need login");
    await _loginTele();
    const response = await _requestGet(`https://notpx.app/api/v1/users/me`);
    if (response.websocketToken) {
      fs.writeFileSync(TOKEN_FILE, response.websocketToken, "utf8");
      return response.websocketToken;
    }
    return response.websocketToken;
  } catch (e) {
    logger.error(e.message);
    logger.error("Catch get token");
    return "";
  }
};
