import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const clients = new Set();

function heartbeat() { this.isAlive = true; }

wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", heartbeat);
  clients.add(ws);

  ws.on("message", (raw) => {
    let out = raw.toString();
    try {
      const data = JSON.parse(out);
      if (data.type === "typing") {
        clients.forEach(c => {
          if (c !== ws && c.readyState === 1) {
            c.send(JSON.stringify({ type: "typing" }));
          }
        });
        return;
      }
      if (data.type === "message") {
        out = JSON.stringify({ type: "message", text: data.text ?? "" });
      }
    } catch {
      out = JSON.stringify({ type: "message", text: raw.toString() });
    }

    clients.forEach(c => {
      if (c !== ws && c.readyState === 1) c.send(out);
    });
  });

  ws.on("close", () => clients.delete(ws));
});

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on("close", () => clearInterval(interval));

app.get("/", (_, res) => {
  res.send("TikTalk WebSocket Server running ✅");
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("Listening on", PORT));
