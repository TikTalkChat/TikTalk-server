import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

let waiting = null; // waiting user
const pairs = new Map(); // map of ws -> partner

function send(ws, data) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

wss.on("connection", (ws) => {
  console.log("New user connected");

  // if waiting is empty, put this user in waiting
  if (!waiting) {
    waiting = ws;
    send(ws, { type: "status", text: "Searching for a stranger..." });
  } else {
    // pair the waiting user with this new user
    const partner = waiting;
    waiting = null;

    pairs.set(ws, partner);
    pairs.set(partner, ws);

    send(ws, { type: "status", text: "Connected to a stranger ✅" });
    send(partner, { type: "status", text: "Connected to a stranger ✅" });
  }

  ws.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      data = { type: "message", text: raw.toString() };
    }

    const partner = pairs.get(ws);

    if (data.type === "typing" && partner) {
      send(partner, { type: "typing" });
      return;
    }

    if (data.type === "message" && partner) {
      send(partner, { type: "message", text: data.text ?? "" });
    }
  });

  ws.on("close", () => {
    console.log("User disconnected");
    const partner = pairs.get(ws);

    if (partner) {
      send(partner, { type: "status", text: "❌ Stranger disconnected" });
      pairs.delete(partner);
      pairs.delete(ws);
      // partner ko fir waiting me daal do naya connection ke liye
      if (partner.readyState === 1) {
        waiting = partner;
      }
    } else if (waiting === ws) {
      waiting = null;
    }
  });
});

app.get("/", (_, res) => {
  res.send("TikTalk WebSocket Server running ✅");
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("Listening on", PORT));