import { getOrCreateIO } from "@/lib/socket-server";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req, res) {
  if (!res.socket?.server) {
    return res.status(500).end();
  }

  try {
    if (!res.socket.server.io) {
      res.socket.server.io = getOrCreateIO(res.socket.server);
    }
  } catch (error) {
    console.warn("Socket.io init failed", error);
  }

  res.end();
}
