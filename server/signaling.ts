import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

interface SignalMessage {
  type: "join" | "offer" | "answer" | "ice-candidate" | "leave";
  roomId: string;
  senderId: string;
  payload?: any;
}

const rooms = new Map<string, Map<string, WebSocket>>();
const socketToRoom = new WeakMap<WebSocket, { roomId: string; peerId: string }>();

export function setupSignaling(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/signaling" });

  wss.on("connection", (ws) => {
    ws.on("message", (raw) => {
      let msg: SignalMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      const { type, roomId, senderId, payload } = msg;

      if (!roomId || !senderId) return;

      switch (type) {
        case "join": {
          const prev = socketToRoom.get(ws);
          if (prev) {
            leaveRoom(prev.roomId, prev.peerId);
          }

          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Map());
          }
          const room = rooms.get(roomId)!;
          room.set(senderId, ws);
          socketToRoom.set(ws, { roomId, peerId: senderId });

          const peers = Array.from(room.keys()).filter((id) => id !== senderId);
          ws.send(JSON.stringify({ type: "peers", peers }));

          broadcast(roomId, senderId, { type: "peer-joined", peerId: senderId });
          break;
        }

        case "offer":
        case "answer":
        case "ice-candidate": {
          if (!payload || !payload.targetId || !payload.data) return;

          const room = rooms.get(roomId);
          if (!room) return;

          const target = room.get(payload.targetId);
          if (target && target.readyState === WebSocket.OPEN) {
            target.send(
              JSON.stringify({
                type,
                senderId,
                payload: payload.data,
              })
            );
          }
          break;
        }

        case "leave": {
          leaveRoom(roomId, senderId);
          socketToRoom.delete(ws);
          break;
        }
      }
    });

    ws.on("close", () => {
      const info = socketToRoom.get(ws);
      if (info) {
        leaveRoom(info.roomId, info.peerId);
        socketToRoom.delete(ws);
      }
    });
  });

  function leaveRoom(roomId: string, peerId: string) {
    const room = rooms.get(roomId);
    if (!room) return;
    room.delete(peerId);
    broadcast(roomId, peerId, { type: "peer-left", peerId });
    if (room.size === 0) {
      rooms.delete(roomId);
    }
  }

  function broadcast(roomId: string, excludeId: string, message: any) {
    const room = rooms.get(roomId);
    if (!room) return;
    const data = JSON.stringify(message);
    room.forEach((socket, id) => {
      if (id !== excludeId && socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    });
  }
}
