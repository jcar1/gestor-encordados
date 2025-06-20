import { initializeApp } from "firebase/app";
import { getAuth, listUsers } from "firebase/auth";
import { getFirestore, collection, getCountFromServer } from "firebase/firestore";

const LIMITS = {
  AUTH: 9000,       // 90% de 10,000
  FIRESTORE: 45000, // 90% de 50,000/día
  STORAGE: 0.9      // 90% de 1GB
};

export const checkLimits = async (firebaseConfig) => {
  const app = initializeApp(firebaseConfig, 'LimitChecker');
  const auth = getAuth(app);
  const db = getFirestore(app);
  const warnings = [];

  // 1. Verificar usuarios de autenticación
  const { users } = await listUsers(auth);
  if (users.length >= LIMITS.AUTH) {
    warnings.push(`Auth: ${users.length}/${LIMITS.AUTH} usuarios`);
  }

  // 2. Verificar lecturas de Firestore (estimado)
  const collRef = collection(db, '_monitor_');
  const snapshot = await getCountFromServer(collRef);
  if (snapshot.data().count >= LIMITS.FIRESTORE) {
    warnings.push(`Firestore: ~${snapshot.data().count}/${LIMITS.FIRESTORE} lecturas`);
  }

  return warnings.length ? warnings : null;
};
