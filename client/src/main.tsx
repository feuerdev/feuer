import "./globals.css";
import Game from "./components/Game";
import { createRoot } from "react-dom/client";
import { ClerkProvider, SignedIn, SignedOut, SignIn } from "@clerk/clerk-react";
import { skipAuth } from "./lib/utils";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey && !import.meta.env.DEV) {
  throw new Error("Missing Clerk publishable key");
}

createRoot(document.getElementById("root")!).render(
  skipAuth() ? (
    <Game />
  ) : (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <SignedIn>
        <Game />
      </SignedIn>
      <SignedOut>
        <SignIn />
      </SignedOut>
    </ClerkProvider>
  )
);
