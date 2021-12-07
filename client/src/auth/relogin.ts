import { getAuth } from "@firebase/auth"
import { app, invalidateCookie, invalidateUid, setCookie } from "./auth"

getAuth(app).onIdTokenChanged(async (user) => {
  if (!user) {
    invalidateCookie()
    invalidateUid()
    window.location.replace("/login")
    return
  }

  const token = await user.getIdToken()
  await setCookie(token)
  window.location.replace("/")
})
