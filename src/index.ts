import express, { Express } from "express";
import { config } from "dotenv";
import apiRouter from "./api";
import cors from "cors";
import admin from "firebase-admin";
import * as serviceAccount from "../serviceAccountKey.json";

config();

const firebaseConfig = {
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  storageBacket: process.env.BACKET_URL
};

admin.initializeApp(firebaseConfig);

export const db = admin.firestore();
export const storage = admin.storage();
export const bucket = admin.storage().bucket(process.env.BACKET_URL);

const app: Express = express();
const port = 3001;

app.use(express.json());
app.use(cors());
app.use("/api", apiRouter);

app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);