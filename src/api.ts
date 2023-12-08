import express, { Request, Response, Express } from "express";
import admin from "firebase-admin";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

import { db, bucket } from "../src/index";

const router = express.Router();

type Photo = {
  photoId: string;
  collection: string;
  created: Date;
  path: string;
  url: string;
  like: boolean;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.get("/collections", async (req: Request, res: Response) => {
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

    const groupedCollectionsArray = Object.values(groupedCollections)

    res.status(200).json({ groupedCollectionsArray });
  } catch (error) {
    console.error("Error fetching photo collections:", error);
    res.status(500).json({ error: "Failed to fetch photo collections" });
  }
});

router.get("/collections/:title", async (req: Request, res: Response) => {
  try {
    const title = req.params.title;

    if (!title) {
      return res.status(400).json({ error: "Title  is required" });
    }

    const photosCollection = db.collection("photos");
    const querySnapshot = await photosCollection
      .where("collection", "==", title)
      .get();

    const matchingDocuments: Photo[] = [];
    querySnapshot.forEach((doc) => {
      const photoData = doc.data() as Photo;
      matchingDocuments.push(photoData);
    });

    res.status(200).json({ data: matchingDocuments });
  } catch (error) {
    console.error("Error retrieving collection by title:", error);
    res.status(500).json({ error: "Failed to retrieve collection by title" });
  }
});

router.post(
  "/upload",
  upload.array("photos"),
  async (req: Request, res: Response) => {
    try {
      const title = req.body.title;
      const files = req.files as Express.Multer.File[];

      if (!title || !files) {
        return res.status(400).json({ error: "Title and files are required" });
      }

      const uploadPromises = files.map(async (file: Express.Multer.File) => {
        const storageFilename = `${Date.now()}-${file.originalname}`;
        const storageFullPath = `${title}/${storageFilename}`;
        const fileUpload = bucket.file(storageFullPath);

        await fileUpload.save(file.buffer, {
          metadata: {
            contentType: file.mimetype,
          },
        });

        const [url] = await fileUpload.getSignedUrl({
          action: "read",
          expires: "01-01-2030",
        });

        const photosCollection = db.collection("photos");

        await photosCollection.add({
          url,
          name: file.originalname,
          path: storageFullPath,
          created: admin.firestore.FieldValue.serverTimestamp(),
          collection: title,
          photoId: uuidv4(),
          lile: false,
        });

        return { url, title };
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      res.status(200).json({ uploadedUrls });
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({ error: "Failed to upload files" });
    }
  }
);

router.put("/collections/:oldCollectionName", async (req, res) => {
  try {
    const { oldCollectionName } = req.params;
    const { newCollectionName } = req.body;

    if (!newCollectionName) {
      return res.status(400).json({ error: "New collection name is required" });
    }

    const querySnapshot = await db
      .collection("photos")
      .where("collection", "==", oldCollectionName)
      .get();

    const batch = db.batch();

    querySnapshot.forEach((doc) => {
      const docRef = db.collection("photos").doc(doc.id);
      batch.update(docRef, { collection: newCollectionName });
    });

  
    await batch.commit();

    return res
      .status(200)
      .json({ message: "Collection property updated successfully" });
  } catch (error) {
    console.error("Error updating collection property:", error);
    return res
      .status(500)
      .json({ error: "Failed to update collection property" });
  }
});

router.delete("/collections/:photoId", async (req: Request, res: Response) => {
  try {
    const { photoId } = req.params;

    if (!photoId) {
      return res.status(400).json({ error: "Photo ID is required" });
    }

    const photosCollectionRef = db.collection("photos");
    const querySnapshot = await photosCollectionRef.get();

    let foundPhotoId = null;
    let foundPath = null;

    querySnapshot.forEach((doc) => {
      const photoData = doc.data();
      if (photoData.photoId === photoId) {
        foundPhotoId = doc.id;
        foundPath = photoData.path;
      }
    });

    if (!foundPhotoId || !foundPath) {
      return res.status(404).json({ error: "Photo not found" });
    }


    await bucket.file(foundPath).delete();
    await db.collection("photos").doc(foundPhotoId).delete();


    return res.status(200).json({ message: "Photo deleted successfully" });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return res.status(500).json({ error: "Failed to delete photo" });
  }
});

export default router;
