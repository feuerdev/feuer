import * as admin from "firebase-admin"
import Log from "./log"

export async function isAuthenticated(req, res, next) {
  if (!req.cookies) {
    Log.warn("No cookies found")
    res.redirect("/login")
  }

  const idToken = req.cookies.__session
  if (!idToken) {
    Log.warn("No idToken found")
    res.redirect("/login")
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken)
    req.user = decodedToken
    next()
  } catch (error) {
    //TODO: Fange hier nur den Token expired Error ab.
    res.redirect("/relogin")
  }
}

export async function deserializeAuth(req, res, next) {
  if (!req.cookies) {
    Log.warn("No cookies found")
  }

  const idToken = req.cookies.__session
  if (!idToken) {
    Log.warn("No idToken found")
  }

  const decodedToken = await admin.auth().verifyIdToken(idToken)
  req.user = decodedToken
  next()
}
