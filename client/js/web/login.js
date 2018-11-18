const form_login = document.getElementById("login");

if (form_login) {
    form_login.addEventListener("submit", function (e) {
        e.preventDefault(); //stop form from submitting
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const passwordRepeat = document.getElementById("passwordRepeat").value;
        const username = document.getElementById("username").value;

        if (password === passwordRepeat) {
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then(function (success) {
                    success.updateProfile({
                        displayName: username
                    }).catch(err => {
                        console.log(err);
                    });
                    console.log("User successfully logged in, redirecting");
                    window.location.replace("/");
                })
                .catch(function (error) {
                    if (error) {
                        console.log(error.code);
                        console.log(error.message);
                    } else {}
                });
        } else {
            console.log("passwords dont match");
        }
    });
}