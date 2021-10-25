firebase
  .auth()
  .signOut()
  .then(function () {
    console.log("User successfully logged out, redirecting")
    window.location.replace("/login")
  })
  .catch(function (error) {
    if (error) {
      console.log(error.code)
      console.log(error.message)
    }
  })
