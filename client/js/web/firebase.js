// Initialize Firebase
console.log("initializing firebase")
firebase.initializeApp({
  apiKey: "AIzaSyBJFITLUMkRyVvG8CH3m9waEEyweGhTS84",
  authDomain: "feuer-io.firebaseapp.com",
  databaseURL: "https://feuer-io.firebaseio.com",
  projectId: "feuer-io",
  storageBucket: "feuer-io.appspot.com",
  messagingSenderId: "45127508791",
})

const COOKIE_MAXAGE = 60 * 60 * 24 * 7 * 4 //Vier Wochen

const COOKIE_NAME = "__session"
let currentUid = null

firebase.auth().onAuthStateChanged(function (user) {
  if (user) {
    currentUid = user.uid
    console.log("User logged in, setting Cookie")
    firebase
      .auth()
      .currentUser.getIdToken()
      .then((token) => {
        document.cookie =
          COOKIE_NAME + "=" + token + ";max-age=" + COOKIE_MAXAGE
        console.log("Cookie set")
        console.log(window.location.href)
        function redirect() {
          if (window.location.href.endsWith("relogin")) {
            //Nutzer ist gerade beim relogin. Nachdem setzten des aktuellen cookies auf die startseite weiterleiten
            window.location.replace("/")
          }
        }
        window.setTimeout(redirect, 500)
      })
  } else {
    document.cookie = COOKIE_NAME + "=;max-age=-99999999;"
    console.log("User not logged in")
    if (window.location.href.endsWith("relogin")) {
      //Nutzer ist gerade beim relogin. Nachdem setzten des aktuellen cookies auf die startseite weiterleiten
      window.location.replace("/")
    }
  }
})
