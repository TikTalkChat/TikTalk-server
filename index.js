import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

let waiting = null; // ek banda wait karega

wss.on("connection", (ws) => {
  ws.partner = null;

  if (waiting) {
    // Agar koi wait kar raha hai to connect karo
    ws.partner = waiting;
    waiting.partner = ws;

    ws.send(JSON.stringify({ type: "system", text: "connected" }));
    waiting.send(JSON.stringify({ type: "system", text: "connected" }));

    waiting = null;
  } else {
    // Warna wait me daal do
    waiting = ws;
    ws.send(JSON.stringify({ type: "system", text: "waiting" }));
  }

  ws.on("message", (raw) => {
    const data = raw.toString();
    if (ws.partner && ws.partner.readyState === 1) {
      ws.partner.send(data);
    }
  });

  ws.on("close", () => {
    if (ws.partner && ws.partner.readyState === 1) {
      ws.partner.send(JSON.stringify({ type: "system", text: "disconnected" }));
      ws.partner.partner = null;
    }
    if (waiting === ws) waiting = null;
  });
});

app.get("/", (_, res) => {
  res.send("✅ TikTalk WebSocket Server is running");
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("Listening on", PORT));