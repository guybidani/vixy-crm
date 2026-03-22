import { io, Socket } from "socket.io-client";
import { getAccessToken } from "../api/client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io("/", {
      autoConnect: false,
      auth: (cb) => {
        cb({ token: getAccessToken() });
      },
    });
  }
  return socket;
}

export function connectSocket(workspaceId: string) {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  s.emit("join-workspace", workspaceId);
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}
