export const COMFYUI_URL = process.env.COMFYUI_URL!;
export const PROTOCOL = process.env.ENVIRONMENT === "remote" ? "https" : "http";
export const WSPROTOCOL = process.env.ENVIRONMENT === "remote" ? "wss" : "ws";
