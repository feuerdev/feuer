import { cert, initializeApp } from "firebase-admin/app";
import * as admin from "firebase-admin"
import Config from "./environment";
import { DecodedIdToken } from "firebase-admin/lib/auth/token-verifier";

// load api keys from environment and initialize firebase admin app
initializeApp({
  credential: cert({
    projectId: Config.firebaseProjectId,
    clientEmail: Config.firebaseClientEmail,
    privateKey: Config.fbKey?.replace(/\\n/g, "\n"),
  })
});

export const isAuthenticated = async (
  token: string
): Promise<[boolean, DecodedIdToken?]> => {
  // try {
  const decodedToken = await admin.auth().verifyIdToken(token);
  return [true, decodedToken];
  // } catch(error) {
  //   console.error(error)
  //   return ([false, undefined])
  // }
};
