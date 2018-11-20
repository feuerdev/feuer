const form_login = document.getElementById("login");

if (form_login) {
    form_login.addEventListener("submit", function (e) {
        e.preventDefault(); //stop form from submitting
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        firebase.auth().signInWithEmailAndPassword(email, password)
            .then(function (success) {

                console.log("User successfully logged in, redirecting");
                window.location.replace("/");
            })
            .catch(function (error) {
                if (error) {
                    console.log(error.code);
                    console.log(error.message);
                } else {}
            });

    });
}