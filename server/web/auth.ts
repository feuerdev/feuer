import { Request } from "express"
import * as admin from "firebase-admin"
import Log from "../util/log"

export async function isAuthenticated(req: Request, res, next) {
  if (!req.cookies) {
    Log.warn("No cookies found")
    res.redirect("/login")
    return
  }

  const idToken = req.cookies.__session
  if (!idToken) {
    Log.warn("No idToken found")
    res.redirect("/login")
    return
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken)

    const editedRequest: any = req
    editedRequest.user = decodedToken
    next()
    return
  } catch (error) {
    Log.error(error)
    //TODO: Fange hier nur den Token expired Error ab.
    res.redirect("/relogin.html")
  }
}

export async function deserializeAuth(req, res, next) {
  if (!req.cookies) {
    Log.warn("No cookies found")
    //TODO: should we stop here?
  }

  const idToken = req.cookies.__session
  if (!idToken) {
    Log.warn("No idToken found")
    //TODO: should we stop here?
  }

  const decodedToken = await admin.auth().verifyIdToken(idToken)
  req.user = decodedToken
  next()
}
