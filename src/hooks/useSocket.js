import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export function useSocket({ onMessage } = {}) {
  const socketRef = useRef(null);

  useEffect(() => {
    async function init() {
      if (socketRef.current) return;
      await fetch("/api/socket");
      const socket = io({
        path: "/api/socket/io",
      });

      if (onMessage) {
        socket.on("chat:message", onMessage);
      }

      socketRef.current = socket;
    }

    init();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [onMessage]);

  return socketRef;
}
