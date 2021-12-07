import { signOut } from "./auth"
;(async () => {
  await signOut()
  window.location.replace("./login")
})()
