import { getAuth } from "firebase/auth";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { useAuthState } from "react-firebase-hooks/auth";
import { initFirebase } from "../utils/firebase";

const Game: NextPage = () => {
  const auth = getAuth(initFirebase())
  const [user, loading] = useAuthState(auth)
  const router = useRouter()

  const signOut = async () => {
    await auth.signOut()
    router.push("/")
  }

  if (loading) {
    return <div>loading</div>
  }

  if (!user) {
    return <div>How did you get here?</div>
  }

  

  return <div>
    <div>Hello {user.displayName}! You're in game!</div>
    <button onClick={signOut}>Logout</button>
  </div>

}
export default Game;