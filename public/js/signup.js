
/* =====================================
   CHATTR SIGNUP JAVASCRIPT
===================================== */

document.addEventListener("DOMContentLoaded", () => {

    const signupForm = document.getElementById("signupForm");

    const passwordInput = document.getElementById("password");

    const confirmPasswordInput =
        document.getElementById("confirmPassword");

    const passwordMessage =
        document.getElementById("passwordMessage");


    // =====================================
    // PASSWORD VISIBILITY TOGGLE
    // =====================================

    const passwordToggleButtons =
        document.querySelectorAll(".password-toggle");

    passwordToggleButtons.forEach((button) => {

        button.addEventListener("click", () => {

            const targetId =
                button.getAttribute("data-password-target");

            const targetInput =
                document.getElementById(targetId);

            const icon = button.querySelector("i");

            if (!targetInput || !icon) {
                return;
            }

            const isPasswordHidden =
                targetInput.type === "password";

            if (isPasswordHidden) {

                targetInput.type = "text";

                button.setAttribute(
                    "aria-label",
                    "Hide password"
                );

                button.setAttribute(
                    "aria-pressed",
                    "true"
                );

                icon.classList.remove("bi-eye");
                icon.classList.add("bi-eye-slash");

            } else {

                targetInput.type = "password";

                button.setAttribute(
                    "aria-label",
                    "Show password"
                );

                button.setAttribute(
                    "aria-pressed",
                    "false"
                );

                icon.classList.remove("bi-eye-slash");
                icon.classList.add("bi-eye");

            }

        });

    });


    // =====================================
    // PASSWORD MATCH VALIDATION
    // =====================================

    function validatePassword() {

        const password = passwordInput.value;

        const confirmPassword =
            confirmPasswordInput.value;


        // Reset previous feedback

        passwordMessage.textContent = "";

        passwordMessage.classList.remove(
            "error",
            "success"
        );

        confirmPasswordInput.setCustomValidity("");


        // Wait until confirm password is entered

        if (confirmPassword === "") {
            return true;
        }


        // Password mismatch

        if (password !== confirmPassword) {

            passwordMessage.textContent =
                "Passwords do not match.";

            passwordMessage.classList.add("error");

            confirmPasswordInput.setCustomValidity(
                "Passwords do not match."
            );

            return false;
        }


        // Passwords match

        passwordMessage.textContent =
            "Passwords match.";

        passwordMessage.classList.add("success");

        confirmPasswordInput.setCustomValidity("");

        return true;

    }


    // =====================================
    // LIVE VALIDATION
    // =====================================

    passwordInput.addEventListener(
        "input",
        validatePassword
    );

    confirmPasswordInput.addEventListener(
        "input",
        validatePassword
    );


    // =====================================
    // FORM SUBMISSION
    // =====================================

    signupForm.addEventListener("submit", (event) => {

        const passwordsMatch = validatePassword();

        if (!passwordsMatch) {

            event.preventDefault();

            confirmPasswordInput.reportValidity();

            confirmPasswordInput.focus();

        }

    });

});
