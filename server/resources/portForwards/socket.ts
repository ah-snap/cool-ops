import type { Server } from "socket.io";
import { portForwardManager } from "./service.ts";

const ROOM_PREFIX = "port-forward:";

export function configurePortForwardSockets(io: Server): void {
  portForwardManager.setEventHandler((event) => {
    io.to(`${ROOM_PREFIX}${event.id}`).emit("portForwards:event", event);
  });

  io.on("connection", (socket) => {
    socket.on("portForwards:subscribe", (payload: { id?: unknown }) => {
      if (!payload || typeof payload.id !== "string") {
        return;
      }

      socket.join(`${ROOM_PREFIX}${payload.id}`);
    });

    socket.on("portForwards:unsubscribe", (payload: { id?: unknown }) => {
      if (!payload || typeof payload.id !== "string") {
        return;
      }

      socket.leave(`${ROOM_PREFIX}${payload.id}`);
    });
  });
}
