import express from "express";
import http from "http";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import crypto from "crypto";

const PORT = Number(process.env.PORT || 3001);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const REALTIME_SOCKET_SECRET = process.env.REALTIME_SOCKET_SECRET;

const parseOrigins = (value) => {
  if (!value) return ["*"];
  if (value === "*") return ["*"];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const allowedOrigins = parseOrigins(CORS_ORIGIN);

const app = express();
app.use(
  cors({
    origin: allowedOrigins.includes("*") ? true : allowedOrigins,
    credentials: true,
  })
);
app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins.includes("*") ? "*" : allowedOrigins,
    credentials: true,
  },
});

const base64urlToJson = (value) => {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const text = Buffer.from(padded, "base64").toString("utf8");
  return JSON.parse(text);
};

const base64urlEncode = (input) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const verifyJwtHs256 = (token, secret) => {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, signature] = parts;
  let header;
  let payload;
  try {
    header = base64urlToJson(encodedHeader);
    payload = base64urlToJson(encodedPayload);
  } catch {
    return null;
  }
  if (header?.alg !== "HS256") return null;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expected = base64urlEncode(
    crypto.createHmac("sha256", secret).update(signingInput).digest()
  );
  const match = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!match) return null;
  const now = Math.floor(Date.now() / 1000);
  if (payload?.exp && now >= payload.exp) return null;
  return payload;
};

io.on("connection", (socket) => {
  const token = socket.handshake?.auth?.token;
  const claims = REALTIME_SOCKET_SECRET
    ? verifyJwtHs256(token, REALTIME_SOCKET_SECRET)
    : null;

  if (!REALTIME_SOCKET_SECRET) {
    socket.emit("error", "Server missing REALTIME_SOCKET_SECRET");
    socket.disconnect(true);
    return;
  }

  if (!claims?.sub) {
    socket.emit("error", "Unauthorized");
    socket.disconnect(true);
    return;
  }

  const allowedGroupIds = new Set(
    Array.isArray(claims.groups) ? claims.groups.map((g) => String(g)) : []
  );
  socket.data.userId = String(claims.sub);
  socket.data.allowedGroupIds = allowedGroupIds;

  socket.on("groups:join", (payload) => {
    const ids = Array.isArray(payload?.groupIds) ? payload.groupIds : [];
    ids
      .map((id) => String(id || "").trim())
      .filter(Boolean)
      .filter((id) => allowedGroupIds.has(id))
      .forEach((id) => socket.join(`group:${id}`));
  });

  socket.on("chat:send", (payload) => {
    const groupId = String(payload?.groupId || "").trim();
    if (groupId && !allowedGroupIds.has(groupId)) {
      return;
    }
    const broadcastPayload = {
      ...payload,
      sender: {
        ...payload?.sender,
        isSelf: false,
      },
    };

    if (groupId) {
      socket.to(`group:${groupId}`).emit("chat:message", broadcastPayload);
      return;
    }

    socket.broadcast.emit("chat:message", broadcastPayload);
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Cravemate realtime server listening on :${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`CORS_ORIGIN=${CORS_ORIGIN}`);
});
