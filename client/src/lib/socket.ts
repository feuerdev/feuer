import { io } from "socket.io-client";
import { useStore } from "./state";
import { uid } from "./state";
import { skipAuth } from "./utils";
import { Clerk } from "@clerk/clerk-js";

export const initializeSocket = async () => {
  let auth: {
    user?: string;
    token?: string;
  } = {
    user: uid,
  };

  if (!skipAuth()) {
    const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.error("Missing Clerk publishable key");
      return null;
    }

    const clerkInstance = new Clerk(publishableKey);
    await clerkInstance.load();
    const token = await clerkInstance.session?.getToken();

    auth = {
      token: token || undefined,
    };
  }

  const socket = io(
    import.meta.env.VITE_SERVER_URL || "http://localhost:5001",
    {
      withCredentials: true,
      auth,
    }
  );

  socket.on("connect", () => {
    useStore.getState().setConnected(true);
  });

  socket.on("disconnect", () => {
    useStore.getState().setConnected(false);
  });

  useStore.getState().setSocket(socket);

  return socket;
};
