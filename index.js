import express from "express";
import cors from "cors";
import fs from "fs";
import sharp from "sharp";

import { v4 as uuidv4 } from "uuid";
import { get_pixel } from "./process_pixel.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.raw({ type: "application/octet-stream", limit: "10mb" }));
const convertWebPToPngAndProcess = async (inputFilePath, outputFilePath) => {
  try {
    console.log("Converting");
    await sharp(inputFilePath).png().toFile(outputFilePath);
    return true;
  } catch (error) {
    return false;
  }
};
const random = (min, max) => { 
  return Math.floor(Math.random() * (max - min + 1)) + min; 
};
const getRandomPixels = (queue) => { 
  let result = []; 
  const keys = Object.keys(queue[0]); 
 
  const randomKey = keys[random(0, keys.length)]; 
  const randomElement = { 
    pixelId: parseInt(randomKey), 
    newColor: queue[0][randomKey], 
  }; 
  result.push(randomElement); 
  return result; 
};
app.post("/upload", async (req, res) => {
  const binaryData = req.body;
  if (!binaryData || binaryData.length === 0) {
    return res.status(400).json({ message: "No data received" });
  }

  try {
    const filePath = `worldMap/tempfile${uuidv4()}.webp`;
    await fs.promises.writeFile(filePath, binaryData);
    console.log("File written successfully");
    const result = await convertWebPToPngAndProcess(filePath, "real_time.png");
    if (result) {
      res.json({ message: "File uploaded successfully, converted to PNG" });
    } else {
      res.status(500).json({ message: "Failed to convert file" });
    }
  } catch (err) {
    console.error("Error processing file:", err);
    res.status(500).json({ message: "Failed to upload or convert file" });
  }
});
app.post("/get_pixel", async (req, res) => {
  try {
    const { id, x, y, size } = req.body;
    const TEMP_INFO = {
      id: id,
      top_left_x: x,
      top_left_y: y,
      bottom_rigth_x: x + size - 1,
      bottom_rigth_y: y + size - 1,
      excluded_top_left_x: 0,
      excluded_top_left_y: 0,
      excluded_bottom_rigth_x: 0,
      excluded_bottom_rigth_y: 0,
    };
    let data;
    if (TEMP_INFO.id) {
      data = await get_pixel(TEMP_INFO);
      
    }
    if (data && data.length > 0) {
      res.status(200).json({ success: 1, data: data[random(0,data.length)] });
    } else {
      res.status(400).json({ success: 0, data: [] });
    }
  } catch (error) {
    console.error("Error getting pixel:", error);
    res.status(500).json({ success: 0, data: [] });
  }
});

const PORT = 7000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
