import type { NextPage } from "next";
import Head from "next/head";
import { initFirebase } from "../utils/firebase";
import { trpc } from "../utils/trpc";
import {getAuth, GoogleAuthProvider, signInWithPopup} from "firebase/auth"
import { useAuthState } from "react-firebase-hooks/auth"
import { useRouter } from "next/router";

const Home: NextPage = () => {
  const hello = trpc.example.hello.useQuery({ text: "from tRPC" });
  const auth = getAuth(initFirebase())
  const [user, loading] = useAuthState(auth)
  const router = useRouter()

  initFirebase()

  const signIn = async () => {
    const provider = new GoogleAuthProvider()
    
    const result = await signInWithPopup(auth, provider)
    console.log(result.user)
  }

  if(loading) {
    return <div>loading...</div>
  }

  if(user) {
    router.push("/game")
  }

  return (
    <>
      <Head>
        <title>feuer.io</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto flex min-h-screen flex-col items-center justify-center p-4">
        <div className="flex w-full items-center justify-center pt-6 text-2xl text-blue-500">
          <div>{hello.data ? <p>{hello.data.greeting}</p> : <p>Loading..</p>}</div>

          

        </div>
        <button onClick={signIn}>Sign In</button>
      </main>
    </>
  );
};

export default Home;