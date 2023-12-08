import express from "express";
import { db } from "../src/index";

const router = express.Router();

type Photo = {
  photoId: string;
  collection: string;
  created: Date;
  path: string;
  url: string;
  like: boolean;
};

router.get("/collections", async (req, res) => {
  try {
    const querySnapshot = await db
      .collection("photos")
      .orderBy("created", "desc")
      .get();

    const collections = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ collections });
  } catch (error) {
    console.error("Error fetching photo collections:", error);
    res.status(500).json({ error: "Failed to fetch photo collections" });
  }
});

export default router;
