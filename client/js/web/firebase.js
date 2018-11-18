// Initialize Firebase
console.log("initializing firebase")
firebase.initializeApp({
    apiKey: "AIzaSyDB54KU7NIyHAd_VLo2it2jSqaxB0SPass",
    authDomain: "feuer-io.firebaseapp.com",
    databaseURL: "https://feuer-io.firebaseio.com",
    projectId: "feuer-io",
    storageBucket: "feuer-io.appspot.com",
    messagingSenderId: "45127508791"
});

const COOKIE_MAXAGE = (60 * 60 * 24 * 7 * 4); //Vier Wochen

const COOKIE_NAME = "__session";

firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        console.log("User logged in, setting Cookie");
        firebase.auth().currentUser.getIdToken().then(token => {
            document.cookie = COOKIE_NAME + "=" + token + ';max-age=' + COOKIE_MAXAGE;
            console.log("Cookie set");
        });
    } else {
        document.cookie = COOKIE_NAME + "=;max-age=-99999999;";
        console.log("User not logged in");
    }
});