function validatePassword() {

            const password =
                document.getElementById("password").value;

            const confirmPassword =
                document.getElementById("confirmPassword").value;

            if (password !== confirmPassword) {

                alert("Passwords do not match");

                return false;
            }

            return true;
        }