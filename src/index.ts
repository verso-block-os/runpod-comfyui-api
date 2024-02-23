import {
  getImages,
  getWebsocketClient,
  getWorkflow,
  internalServerError,
  jsonHeaders,
  notFound,
} from "./utils";
import { v4 } from "uuid";

Bun.serve({
  port: 1337,
  fetch: async (req) => {
    if (req.method !== "POST") return new Response(null, notFound);
    try {
      const { prompt }: { prompt: string } = await req.json();

      const clientId = v4();
      const workflow = getWorkflow(prompt);
      const websocket = getWebsocketClient(clientId);

      const outputs = await getImages(websocket, workflow, clientId);

      const results: { data: string }[] = [];

      for (const nodeId in outputs) {
        const images = outputs[nodeId]!;
        for (const image of images) {
          const buffer = Buffer.from(await image.arrayBuffer());
          results.push({
            data: buffer.toString("base64"),
          });
        }
      }

      return new Response(JSON.stringify(results), jsonHeaders);
    } catch (e) {
      console.log(e);
      return new Response("Something went wrong", internalServerError);
    }
  },
});

console.log("Server running at http://localhost:1337/");
