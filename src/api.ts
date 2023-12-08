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
      ...doc.data(),
    }));


   const groupedCollections = collections.reduce((acc, photo) => {
    const { collection } = photo;
    if (!acc[collection]) {
      acc[collection] = [];
    }
    acc[collection].push(photo);
    return acc;
  }, {});
         
    res.status(200).json({ groupedCollections });
  } catch (error) {
    console.error("Error fetching photo collections:", error);
    res.status(500).json({ error: "Failed to fetch photo collections" });
  }
});

export default router;
