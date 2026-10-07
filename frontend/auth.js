import {
  auth,
  db
} from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const nameInput =
  document.getElementById("name");

const emailInput =
  document.getElementById("email");

const passwordInput =
  document.getElementById("password");

const message =
  document.getElementById("message");


// REGISTER

document
  .getElementById("registerBtn")
  .addEventListener("click", async () => {

    try {

      const name =
        nameInput.value.trim();

      const email =
        emailInput.value.trim();

      const password =
        passwordInput.value;

      if (!name || !email || !password) {
        message.textContent =
          "Please fill all fields.";
        return;
      }

      const result =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      await setDoc(
        doc(db, "users", result.user.uid),
        {
          name: name,
          email: email,
          role: "user",
          createdAt: serverTimestamp()
        }
      );

      window.location.href =
        "dashboard.html";

    } catch (error) {

      message.textContent =
        error.message;
    }
  });


// LOGIN

document
  .getElementById("loginBtn")
  .addEventListener("click", async () => {

    try {

      const email =
        emailInput.value.trim();

      const password =
        passwordInput.value;

      const result =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      window.location.href =
        "dashboard.html";

    } catch (error) {

      message.textContent =
        error.message;
    }
  });
