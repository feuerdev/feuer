import { io } from "socket.io-client";
import { useStore } from "./state";
import { randomName, skipAuth } from "./utils";
import { Clerk } from "@clerk/clerk-js";

export const initializeSocket = async () => {
  const localUid = new URLSearchParams(window.location.search).get("user") || randomName();
  let auth: {
    user?: string;
    token?: string;
  } = {
    user: localUid,
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
    const userId = clerkInstance.user?.id;
    if (!userId) {
      console.error("user id not found");
      return null;
    }
    useStore.getState().setUserId(userId);

    auth = {
      token: token || undefined,
    };
  } else {
    if (!window.location.search.includes('user=')) {
      const url = new URL(window.location.href);
      url.searchParams.set('user', localUid);
      window.history.replaceState({}, '', url.toString());
    }
    useStore.getState().setUserId(localUid);
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
