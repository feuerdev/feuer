import { NextFunction, Request, Response } from "express"
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
    Log.warn("Token invalid")
    res.redirect("/relogin.html")
  }
}

export async function deserializeAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies) {
    res.status(401).send("You have no cookies, my man")
  }

  const idToken = req.cookies.__session
  if (!idToken) {
    res.status(401).send("You have no idToken, my man")
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken)
    req["user"] = decodedToken
  } catch (e) {
    res.status(403).send("Your idToken couldn't be verified, my man")
  }
  next()
}
