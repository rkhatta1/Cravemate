import { Server } from "socket.io";

let ioInstance = null;

export function getOrCreateIO(server) {
  if (ioInstance) {
    return ioInstance;
  }

  ioInstance = new Server(server, {
    path: "/api/socket/io",
    cors: {
      origin: "*",
    },
  });

  ioInstance.on("connection", (socket) => {
    socket.on("groups:join", (payload) => {
      const ids = Array.isArray(payload?.groupIds) ? payload.groupIds : [];
      ids
        .map((id) => String(id || "").trim())
        .filter(Boolean)
        .forEach((id) => socket.join(`group:${id}`));
    });

    socket.on("chat:send", (payload) => {
      const groupId = String(payload?.groupId || "").trim();
      const broadcastPayload = {
        ...payload,
        sender: {
          ...payload.sender,
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

  return ioInstance;
}
