
import * as admin from 'firebase-admin';
import * as db from "./db";

export function isAuthenticated(req, res, next) {
  if (req.cookies) {
    const idToken = req.cookies.__session;
    if (idToken) {
      admin.auth().verifyIdToken(idToken)
        .then(decodedToken => {
          req.user = decodedToken;
          next();
        })
        .catch(error => {
          //TODO: Fange hier nur den Token expired Error ab.
          res.redirect("/relogin");
        });
    } else {
      res.redirect("/login");
    }
  } else {
    res.redirect("/login");
  }
}

export function deserializeAuth(req, res, next) {
  if (req.cookies) {
    const idToken = req.cookies.__session;
    if (idToken) {
      admin.auth().verifyIdToken(idToken)
        .then(decodedToken => {
          console.log(decodedToken);
          console.log("IdToken is valid");
          req.user = decodedToken;
          next();
        })
        .catch(error => {
          console.log(error);
        });
    } 
  }
}

export function deserializeAuthGame(req, res, next) {
  if (req.user) {
    const uid = req.user.uid;
    db.queryWithValues("SELECT username FROM users WHERE uid LIKE (?)", [uid], function (error, results, fields) {
      if (error) {
        console.log(error);
        res.send(error);
      } else {
        console.log(results);
        if(results.length > 0) {
          if(!req.user.game) {
            req.user.game = {};
          }
          req.user.game.username = results[0].username;
          next();
        } else {
          res.send("error: no user with uid:"+uid);
        }
      }
    });
  }
}
