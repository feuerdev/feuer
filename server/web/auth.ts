import { Request, Response } from "express"
import * as admin from "firebase-admin"
import Log from "../util/log"

export async function isAuthenticated(req: Request, res: Response, next) {
  const idToken = req.cookies?.__session

  if (!idToken) {
    Log.warn("No cookies found")
    res.redirect("/login")
    return
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken)
    req["user"] = decodedToken
    next()
    return
  } catch (error) {
    if (error.code === "auth/id-token-expired") {
      Log.debug("redirected on expired")
      res.redirect("/relogin.html")
    } else {
      res.sendStatus(500)
      Log.error(error)
    }
  }
}

export async function deserializeAuth(req, _res, next) {
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
