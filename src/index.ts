import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { getImages, getWebsocketClient, getWorkflow } from "./utils";
import { v4 } from "uuid";

const app = new Hono();

app.post("/", async (c) => {
  try {
    const { prompt } = await c.req.json<{
      prompt: string;
    }>();

    const clientId = v4();
    const workflow = getWorkflow(prompt);
    const websocket = getWebsocketClient(clientId);

    const outputs = await getImages(websocket, workflow, clientId);

    const result: { data: string }[] = [];

    for (const nodeId in outputs) {
      const images = outputs[nodeId]!;
      for (const image of images) {
        const buffer = Buffer.from(await image.arrayBuffer());
        result.push({
          data: buffer.toString("base64"),
        });
      }
    }

    return c.json(result);
  } catch (e) {
    console.log(e);
    return c.text("Something went wrong.", 500);
  }
});

serve({
  fetch: app.fetch,
  port: 1337,
});
