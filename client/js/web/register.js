const form_register = document.getElementById("register");

if (form_register) {
  form_register.addEventListener("submit", function (e) {
    e.preventDefault(); //stop form from submitting
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    firebase.auth().createUserWithEmailAndPassword(email, password)
      .then(function () {
        console.log("User successfully registered, redirecting");
        window.location.replace("/");
      })
      .catch(function (error) {
        if (error) {
          console.log(error.code);
          console.log(error.message);
        }
      });
  });
}