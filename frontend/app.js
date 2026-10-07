import {
  auth,
  db,
  functions
} from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  httpsCallable
} from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";


let currentUser = null;
let currentTokenId = null;


// AUTH CHECK

onAuthStateChanged(auth, user => {

  if (!user) {

    window.location.href =
      "index.html";

    return;
  }

  currentUser = user;

  loadMyToken();
});


// GET TOKEN

document
  .getElementById("getTokenBtn")
  .addEventListener("click", async () => {

    try {

      const queueId =
        document.getElementById(
          "queueSelect"
        ).value;

      const getToken =
        httpsCallable(
          functions,
          "getToken"
        );

      const result =
        await getToken({
          queueId
        });

      currentTokenId =
        result.data.tokenId;

      document.getElementById(
        "tokenResult"
      ).innerHTML = `
        <h1>
          ${result.data.tokenNumber}
        </h1>

        <p>
          Your token number
        </p>
      `;

      loadMyToken();

    } catch (error) {

      alert(error.message);
    }
  });


// LOAD USER TOKEN

function loadMyToken() {

  if (!currentUser) return;

  const tokenQuery =
    query(
      collection(db, "tokens"),
      where(
        "userId",
        "==",
        currentUser.uid
      ),
      orderBy(
        "createdAt",
        "desc"
      ),
      limit(1)
    );

  onSnapshot(
    tokenQuery,
    snapshot => {

      if (snapshot.empty) {

        document.getElementById(
          "myToken"
        ).textContent = "-";

        document.getElementById(
          "myStatus"
        ).textContent = "-";

        return;
      }

      const documentData =
        snapshot.docs[0];

      const data =
        documentData.data();

      currentTokenId =
        documentData.id;

      document.getElementById(
        "myToken"
      ).textContent =
        data.tokenNumber;

      document.getElementById(
        "myStatus"
      ).textContent =
        data.status;
    }
  );
}


// CANCEL TOKEN

document
  .getElementById("cancelBtn")
  .addEventListener("click", async () => {

    if (!currentTokenId) {
      alert("No token found.");
      return;
    }

    try {

      const cancelToken =
        httpsCallable(
          functions,
          "cancelToken"
        );

      await cancelToken({
        tokenId: currentTokenId
      });

      alert("Token cancelled.");

    } catch (error) {

      alert(error.message);
    }
  });


// LOGOUT

document
  .getElementById("logoutBtn")
  .addEventListener("click", async () => {

    await signOut(auth);

    window.location.href =
      "index.html";
  });
