import redis from "redis";

let REDIS_CLIENT;

export const connectRedis = async () => {
  try {
    if (!REDIS_CLIENT) {
      REDIS_CLIENT = redis.createClient({ url: process.env.REDIS_URL });
      await REDIS_CLIENT.connect();
    }
    return REDIS_CLIENT;
  } catch (e) {
    console.error("Error connecting to Redis", e);
    throw e;
  }
};
