import { useAuthContext } from "./AuthContext"

const Login = () => {
  const { loading, signInAsGuest, signInWithGoogle } = useAuthContext()

  return (
    <main className="font-monospace h-screen w-screen bg-black bg-login-cover bg-no-repeat bg-cover bg-center">
      <div className="grid h-screen place-items-center">
        <div className="p-8 bg-black/90 text-center font-bold">
          <img
            className={loading ? "mx-auto animate-spin-slow" : "mx-auto"}
            src="img/login_title.png"
          />
          <p className="text-2xl text-primary">feuer.io</p>
          <div className="p-2" />
          <button
            className="p-1 w-full bg-white text-black"
            onClick={signInWithGoogle}
          >
            Sign In
          </button>
          <div className="p-2" />
          <button
            className="p-1 w-full bg-white text-black"
            onClick={signInAsGuest}
          >
            Play as guest
          </button>
        </div>
      </div>
    </main>
  )
}
export default Login
