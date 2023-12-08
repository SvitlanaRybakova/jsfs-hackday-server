import express, { Express } from "express";
import cors from "cors";
import apiRouter from "./api";



const app: Express = express();
const port = 3001;

app.use(express.json());
app.use(cors());
app.use("/api", apiRouter);

app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);
