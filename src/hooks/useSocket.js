import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export function useSocket({ onMessage, groupIds = [] } = {}) {
  const socketRef = useRef(null);

  useEffect(() => {
    async function init() {
      if (socketRef.current) return;
      const externalUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
      const isExternal = Boolean(externalUrl);

      if (!isExternal) {
        try {
          await fetch("/api/socket");
        } catch (error) {
          console.warn("Socket bootstrap failed", error);
        }
      }

      let token = "";
      if (isExternal) {
        try {
          const res = await fetch("/api/realtime/token", { cache: "no-store" });
          const data = await res.json();
          if (res.ok && data?.token) {
            token = data.token;
          } else {
            console.warn("Failed to fetch realtime token", data?.error || data);
          }
        } catch (error) {
          console.warn("Failed to fetch realtime token", error);
        }
      }

      const socket = isExternal
        ? io(externalUrl, {
            auth: { token },
            transports: ["websocket", "polling"],
            reconnectionAttempts: 5,
          })
        : io({
            path: "/api/socket/io",
            transports: ["websocket", "polling"],
            reconnectionAttempts: 5,
          });

      if (onMessage) {
        socket.on("chat:message", onMessage);
      }

      socket.on("connect", () => {
        const ids = Array.isArray(groupIds) ? groupIds : [];
        const payload = {
          groupIds: ids
            .map((id) => String(id || "").trim())
            .filter(Boolean),
        };
        if (payload.groupIds.length) {
          socket.emit("groups:join", payload);
        }
      });

      socket.on("connect_error", (err) => {
        console.warn("Socket connect error", err?.message || err);
      });

      socketRef.current = socket;
    }

    init();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [onMessage]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    if (!socket.connected) return;

    const ids = Array.isArray(groupIds) ? groupIds : [];
    const payload = {
      groupIds: ids.map((id) => String(id || "").trim()).filter(Boolean),
    };
    socket.emit("groups:join", payload);
  }, [groupIds]);

  return socketRef;
}
