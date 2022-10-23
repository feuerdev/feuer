import { getAuth } from "firebase/auth";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { initFirebase } from "../utils/firebase";
import { io } from "socket.io-client";

/**
 * Main gameplay page
 */
const Game: NextPage = () => {
  const auth = getAuth(initFirebase());
  const [user, loading, error] = useAuthState(auth);
  const [idToken, setIdToken] = useState("");
  const router = useRouter();

  // Connect and authenticate to the socket server
  const connect = () => {
    console.log("initialize game and websockets");

    const socket = io("localhost:3001", {
      auth: { token: idToken },
    });

    socket.on("connect", () => {
      socket.onAny((eventName: string, data:any) => {
        console.log("mesage received", eventName, data);
      });
    });

    return () => {
      socket.disconnect();
    };
  };

  // get the id token when a user is set
  useEffect(() => {
    if (user) {
      (async () => {
        const token = await user.getIdToken();
        setIdToken(token);
      })();
    }
  }, [user]);

  // connect to the game server when the user is authenticated
  useEffect(() => {
    if (idToken) {
      return connect();
    }
  }, [idToken]);

  // Logout
  const signOut = async () => {
    await auth.signOut();
  };

  if (loading) {
    return <div>loading</div>;
  }

  if (error) {
    return (
      <div>
        <p>Error: {error.toString()}</p>
      </div>
    );
  }

  if (!user) {
    router.replace("/");
    return <div>Not logged in, redirecting</div>;
  }

  return (
    <div>
      <div>Hello {user.displayName}! You're in game!</div>
      <button onClick={signOut}>Logout</button>
    </div>
  );
};

export default Game;
