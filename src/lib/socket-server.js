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
    socket.on("chat:send", (payload) => {
      const broadcastPayload = {
        ...payload,
        sender: {
          ...payload.sender,
          isSelf: false,
        },
      };
      socket.broadcast.emit("chat:message", broadcastPayload);
    });
  });

  return ioInstance;
}
