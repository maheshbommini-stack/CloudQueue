const {
  onCall,
  HttpsError
} = require("firebase-functions/v2/https");

const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();


// ==========================================
// GET NEW TOKEN
// ==========================================

exports.getToken = onCall(async (request) => {

  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Login required."
    );
  }

  const { queueId } = request.data;

  if (!queueId) {
    throw new HttpsError(
      "invalid-argument",
      "queueId is required."
    );
  }

  const queueRef =
    db.collection("queues").doc(queueId);

  const queueDoc =
    await queueRef.get();

  if (!queueDoc.exists) {
    throw new HttpsError(
      "not-found",
      "Queue not found."
    );
  }

  const queue = queueDoc.data();

  if (queue.status !== "OPEN") {
    throw new HttpsError(
      "failed-precondition",
      "Queue is closed."
    );
  }

  const nextNumber =
    (queue.lastToken || 0) + 1;

  const tokenRef =
    db.collection("tokens").doc();

  const batch = db.batch();

  batch.set(tokenRef, {
    userId: request.auth.uid,
    queueId: queueId,
    tokenNumber: nextNumber,
    status: "WAITING",
    createdAt:
      admin.firestore.FieldValue.serverTimestamp()
  });

  batch.update(queueRef, {
    lastToken: nextNumber
  });

  await batch.commit();

  return {
    success: true,
    tokenId: tokenRef.id,
    tokenNumber: nextNumber
  };
});


// ==========================================
// CALL NEXT TOKEN
// ==========================================

exports.callNextToken = onCall(async (request) => {

  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Login required."
    );
  }

  const queueId =
    request.data.queueId;

  if (!queueId) {
    throw new HttpsError(
      "invalid-argument",
      "queueId is required."
    );
  }

  const adminDoc =
    await db
      .collection("users")
      .doc(request.auth.uid)
      .get();

  if (
    !adminDoc.exists ||
    adminDoc.data().role !== "admin"
  ) {
    throw new HttpsError(
      "permission-denied",
      "Admin access required."
    );
  }

  const snapshot =
    await db
      .collection("tokens")
      .where("queueId", "==", queueId)
      .where("status", "==", "WAITING")
      .orderBy("tokenNumber")
      .limit(1)
      .get();

  if (snapshot.empty) {
    return {
      success: false,
      message: "No waiting tokens."
    };
  }

  const tokenDoc =
    snapshot.docs[0];

  await tokenDoc.ref.update({
    status: "SERVING",
    calledAt:
      admin.firestore.FieldValue.serverTimestamp()
  });

  await db
    .collection("queues")
    .doc(queueId)
    .update({
      currentToken:
        tokenDoc.data().tokenNumber
    });

  return {
    success: true,
    tokenNumber:
      tokenDoc.data().tokenNumber
  };
});


// ==========================================
// COMPLETE TOKEN
// ==========================================

exports.completeToken = onCall(async (request) => {

  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Login required."
    );
  }

  const adminDoc =
    await db
      .collection("users")
      .doc(request.auth.uid)
      .get();

  if (
    !adminDoc.exists ||
    adminDoc.data().role !== "admin"
  ) {
    throw new HttpsError(
      "permission-denied",
      "Admin access required."
    );
  }

  const { tokenId } =
    request.data;

  if (!tokenId) {
    throw new HttpsError(
      "invalid-argument",
      "tokenId is required."
    );
  }

  await db
    .collection("tokens")
    .doc(tokenId)
    .update({
      status: "COMPLETED",
      completedAt:
        admin.firestore.FieldValue.serverTimestamp()
    });

  return {
    success: true,
    message: "Token completed."
  };
});


// ==========================================
// CANCEL TOKEN
// ==========================================

exports.cancelToken = onCall(async (request) => {

  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Login required."
    );
  }

  const { tokenId } =
    request.data;

  if (!tokenId) {
    throw new HttpsError(
      "invalid-argument",
      "tokenId is required."
    );
  }

  const tokenRef =
    db.collection("tokens").doc(tokenId);

  const tokenDoc =
    await tokenRef.get();

  if (!tokenDoc.exists) {
    throw new HttpsError(
      "not-found",
      "Token not found."
    );
  }

  if (
    tokenDoc.data().userId !==
    request.auth.uid
  ) {
    throw new HttpsError(
      "permission-denied",
      "You can only cancel your own token."
    );
  }

  await tokenRef.update({
    status: "CANCELLED",
    cancelledAt:
      admin.firestore.FieldValue.serverTimestamp()
  });

  return {
    success: true
  };
});
