
// CHATTR LOGIN JAVASCRIPT

document.addEventListener("DOMContentLoaded", () => {

    const passwordInput = document.getElementById("password");
    const passwordToggle = document.getElementById("passwordToggle");

    if (!passwordInput || !passwordToggle) {
        return;
    }

    const toggleIcon = passwordToggle.querySelector("i");

    passwordToggle.addEventListener("click", () => {

        const isPasswordHidden =
            passwordInput.type === "password";

        if (isPasswordHidden) {

            passwordInput.type = "text";

            passwordToggle.setAttribute(
                "aria-label",
                "Hide password"
            );

            passwordToggle.setAttribute(
                "aria-pressed",
                "true"
            );

            toggleIcon.classList.remove("bi-eye");
            toggleIcon.classList.add("bi-eye-slash");

        } else {

            passwordInput.type = "password";

            passwordToggle.setAttribute(
                "aria-label",
                "Show password"
            );

            passwordToggle.setAttribute(
                "aria-pressed",
                "false"
            );

            toggleIcon.classList.remove("bi-eye-slash");
            toggleIcon.classList.add("bi-eye");

        }

    });

});
