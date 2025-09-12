// src/services/firebase.ts
import { getApps, initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Configuração do Firebase para desenvolvimento
const firebaseConfig = {
  apiKey: "AIzaSyCdiQJBz7--aJMoCfh7HJ7_QV-KN1eidYQ",
  authDomain: "piauiticketsdevelopment.firebaseapp.com",
  databaseURL: "https://piauiticketsdevelopment-default-rtdb.firebaseio.com",
  projectId: "piauiticketsdevelopment",
  storageBucket: "piauiticketsdevelopment.appspot.com", // Corrigido aqui
  messagingSenderId: "690254869200",
  appId: "1:690254869200:web:797f8d96a154e419fc24d5"
};


// Inicializa o app Firebase apenas se ainda não existir uma instância
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log('[Firebase] App principal inicializado.');
} else {
  app = getApps()[0];
  console.log('[Firebase] Usando instância existente do App principal.');
}

// Exporta os serviços que vamos usar
export const database = getDatabase(app);
export const storage = getStorage(app);
console.log('[Firebase] Database e Storage do app principal exportados.');
