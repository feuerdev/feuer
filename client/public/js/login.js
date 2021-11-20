const form_login = document.getElementById("login")

function startLoading() {
  document.querySelector(".loading").classList.remove("hidden")
  document.querySelector(".image").classList.add("rotate")
}

function stopLoading() {
  document.querySelector(".loading").classList.add("hidden")
  document.querySelector(".image").classList.remove("rotate")
}

if (form_login) {
  form_login.addEventListener("submit", function (e) {
    e.preventDefault() //stop form from submitting
    const email = document.getElementById("email").value
    const password = document.getElementById("password").value

    startLoading()

    firebase
      .auth()
      .signInWithEmailAndPassword(email, password)
      .then(function (success) {
        stopLoading()
        console.log("User successfully logged in, redirecting")
        window.location.replace("/")
      })
      .catch(function (error) {
        if (error) {
          stopLoading()
          console.log(error.code)
          console.log(error.message)
        } else {
        }
      })
  })
}

function onGuestClicked() {
  startLoading()
  firebase
    .auth()
    .signInAnonymously()
    .then(function (success) {
      function waitForCookie() {
        console.log("checking if cookie is already set...")
        if (document.cookie.indexOf("__session=") >= 0) {
          console.log("cookie is set")
          const xmlhttp = new XMLHttpRequest()
          xmlhttp.open("POST", "/register")
          xmlhttp.setRequestHeader("Content-Type", "application/json")
          xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == 4) {
              if (xmlhttp.status == 200) {
                console.log("Data sent to server, redirecting")
                window.location.replace("/")
              } else {
                console.log(xmlhttp.responseText)
                window.location.replace("/logout")
              }
            }
          }
          xmlhttp.send(
            JSON.stringify({
              username: "Gast",
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
        stopLoading()
        console.log(error.code)
        console.log(error.message)
      } else {
      }
    })
}
