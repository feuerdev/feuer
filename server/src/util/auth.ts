import * as admin from "firebase-admin"

export function isAuthenticated(req, res, next) {
  if (req.cookies) {
    const idToken = req.cookies.__session
    if (idToken) {
      admin
        .auth()
        .verifyIdToken(idToken)
        .then((decodedToken) => {
          req.user = decodedToken
          next()
        })
        .catch((error) => {
          //TODO: Fange hier nur den Token expired Error ab.
          res.redirect("/relogin")
        })
    } else {
      res.redirect("/login")
    }
  } else {
    res.redirect("/login")
  }
}

export function deserializeAuth(req, res, next) {
  if (req.cookies) {
    const idToken = req.cookies.__session
    if (idToken) {
      admin
        .auth()
        .verifyIdToken(idToken)
        .then((decodedToken) => {
          console.log(decodedToken)
          console.log("IdToken is valid")
          req.user = decodedToken
          next()
        })
        .catch((error) => {
          console.log(error)
        })
    }
  }
}
