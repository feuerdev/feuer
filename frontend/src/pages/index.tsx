import type { NextPage } from "next";
import Head from "next/head";
import Login from "../components/Login";
import { AuthProvider, useAuthContext } from "../components/AuthContext";
import { SocketProvider } from "../components/SocketContext";
import dynamic from "next/dynamic";

// Disable ssr for Game component (pixi-viewport is unable to run in node.js)
const Game = dynamic(() => import("../components/Game"), {
  ssr: false
})
const Home: NextPage = () => {
  // const hello = trpc.example.hello.useQuery({ text: "from tRPC" });

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width,height=device-height,user-scalable=no"
        />
        <link rel="icon" type="image/x-icon" href="img/favicon.png" />
        <title>feuer.io</title>
      </Head>
      <AuthProvider>
        <Main />
      </AuthProvider>
    </>
  );
};

const Main = () => {
  const { user } = useAuthContext();

  if (!user) {
    return <Login />;
  }

  return (
    <SocketProvider>
      <Game />
    </SocketProvider>
  );
};

export default Home;
