import { register } from "./auth"

const form_register = document.getElementById("register")

if (form_register) {
  form_register.addEventListener("submit", async (event) => {
    event.preventDefault() //stop form from submitting
    const email = (<HTMLFormElement>document.getElementById("email")).value
    const password = (<HTMLFormElement>document.getElementById("password"))
      .value
    const passwordRepeat = (<HTMLFormElement>(
      document.getElementById("passwordRepeat")
    )).value
    const username = (<HTMLFormElement>document.getElementById("username"))
      .value

    if (password !== passwordRepeat) {
      console.error("Passwords don't match")
    }

    await register(email, password, username)
  })
}
