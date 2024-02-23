import { COMFYUI_URL, PROTOCOL, WSPROTOCOL } from "./constants";
import WaifuWorkflow from "./workflow.json";
import WebSocket from "ws";

export async function queuePrompt(
  prompt: string,
  clientId: string,
): Promise<{
  prompt_id: string;
}> {
  const url = `${PROTOCOL}://${COMFYUI_URL}/prompt`;
  const body = JSON.stringify({ prompt, client_id: clientId });
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function getHistory(promptId: string): Promise<{
  [key: string]: {
    images: {
      filename: string;
      subfolder: string;
      type: string;
    }[];
  };
}> {
  const url = `${PROTOCOL}://${COMFYUI_URL}/history/${promptId}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const output = await response.json();
  return output[promptId]["outputs"];
}

export async function getImage(
  filename: string,
  subfolder: string,
  folderType: string,
): Promise<Blob> {
  const queryParams = new URLSearchParams({
    filename,
    subfolder,
    type: folderType,
  }).toString();
  const url = `${PROTOCOL}://${COMFYUI_URL}/view?${queryParams}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.blob();
}

export async function getImages(
  ws: WebSocket,
  prompt: string,
  clientId: string,
): Promise<Record<string, Blob[]>> {
  // Queue the prompt and get the prompt_id
  const promptResponse = await queuePrompt(prompt, clientId);
  const promptId = promptResponse.prompt_id;
  const outputImages: Record<string, Blob[]> = {};

  return new Promise((resolve, reject) => {
    ws.onmessage = async (event) => {
      if (typeof event.data === "string") {
        const message = JSON.parse(event.data);
        if (message.type === "executing") {
          const data = message.data;

          if (data.node === null && data.prompt_id === promptId) {
            const history = await getHistory(promptId);

            for (const node_id in history) {
              const nodeOutput = history[node_id]!;
              if (nodeOutput.images) {
                const imagesOutput: Blob[] = [];
                for (const image of nodeOutput.images) {
                  const imageData = await getImage(
                    image.filename,
                    image.subfolder,
                    image.type,
                  );
                  imagesOutput.push(imageData);
                }
                outputImages[node_id] = imagesOutput;
              }
            }

            resolve(outputImages);
          }
        }
      }
    };

    ws.onerror = () => {
      reject(new Error("WebSocket error"));
    };
  });
}

export const getWorkflow = (prompt: string) => {
  return JSON.parse(
    JSON.stringify(WaifuWorkflow)
      .replace("{{prompt}}", prompt)
      .replace(
        "{{seed}}",
        (Math.floor(Math.random() * 1000000) + 1).toString(),
      ),
  );
};

export const getWebsocketClient = (clientId: string) => {
  return new WebSocket(
    `${WSPROTOCOL}://${COMFYUI_URL}/ws?clientId=${clientId}`,
  );
};
