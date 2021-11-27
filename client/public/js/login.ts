import { login, registerAnonymously } from "./auth"

function startLoading() {
  document.querySelector(".loading").classList.remove("hidden")
  document.querySelector(".image").classList.add("rotate")
}

function stopLoading() {
  document.querySelector(".loading").classList.add("hidden")
  document.querySelector(".image").classList.remove("rotate")
}

// Login with Username and Password
const form_login = document.getElementById("login")
form_login.addEventListener("submit", async (e) => {
  e.preventDefault() //stop form from submitting
  startLoading()
  const email = (<HTMLFormElement>document.getElementById("email")).value
  const password = (<HTMLFormElement>document.getElementById("password")).value

  await login(email, password)
  stopLoading()
})

const playAsGuestButton = document.getElementById("play-as-guest")
playAsGuestButton.addEventListener("click", async () => {
  startLoading()
  await registerAnonymously()
  stopLoading()
})
