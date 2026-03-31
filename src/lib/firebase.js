import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBFN8fIosDVB4EBesb6HODy_Y9VRhShTfA",
  authDomain: "rendimiento-gym.firebaseapp.com",
  projectId: "rendimiento-gym",
  storageBucket: "rendimiento-gym.appspot.com",
  messagingSenderId: "1075510522670",
  appId: "1:1075510522670:web:38ec4376ba867cb2f7c0bf"
};

const app = initializeApp(firebaseConfig);
const db      = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
