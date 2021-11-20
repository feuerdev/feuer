const form_register = document.getElementById("register")

if (form_register) {
  form_register.addEventListener("submit", function (e) {
    e.preventDefault() //stop form from submitting
    const email = document.getElementById("email").value
    const password = document.getElementById("password").value
    const passwordRepeat = document.getElementById("passwordRepeat").value
    const username = document.getElementById("username").value

    if (password === passwordRepeat) {
      firebase
        .auth()
        .createUserWithEmailAndPassword(email, password)
        .then(function () {
          console.log("User successfully registered, sending data to server")

          function waitForCookie() {
            console.log("checking if cookie is already set...")
            if (document.cookie.indexOf("__session=") >= 0) {
              console.log("cookie is set")
              const xmlhttp = new XMLHttpRequest()
              xmlhttp.open("POST", "/register")
              xmlhttp.setRequestHeader("Content-Type", "application/json")
              xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                  console.log("Data sent to server, redirecting")
                  window.location.replace("/")
                }
              }
              xmlhttp.send(
                JSON.stringify({
                  username: username,
                })
              )
            } else {
              console.log("cookie is not set yet. trying again...")
              setTimeout(waitForCookie, 200)
            }
          }
          waitForCookie()
        })
        .catch(function (error) {
          if (error) {
            console.log(error.code)
            console.log(error.message)
          }
        })
    } else {
      console.log("passwords dont match")
    }
  })
}
