const form_register = document.getElementById("register");

if (form_register) {
  form_register.addEventListener("submit", function (e) {
    e.preventDefault(); //stop form from submitting
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const passwordRepeat = document.getElementById("passwordRepeat").value;
    const username = document.getElementById("username").value;

    if (password === passwordRepeat) {
      firebase.auth().createUserWithEmailAndPassword(email, password)
        .then(function (success) {
          console.log("User successfully registered, redirecting");
          success.updateProfile({
            displayName: username
          }).catch(err => {
            console.log(err);
          });
          window.location.replace("/");
        })
        .catch(function (error) {
          if (error) {
            console.log(error.code);
            console.log(error.message);
          }
        });
    } else {
      console.log("passwords dont match");
    }
  });
}