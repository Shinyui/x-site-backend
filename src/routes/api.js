const express = require("express");
const router = express.Router();
const folderController = require("../controllers/folderController");
const fileController = require("../controllers/fileController");

// Folder Routes
router.post("/folders", folderController.createFolder);
router.get("/folders/:id/content", folderController.getFolderContent);
router.delete("/folders/:id", folderController.deleteFolder);

// File Routes
router.post("/files/init", fileController.initUpload);
router.patch("/files/:id/status", fileController.updateStatus);
router.delete("/files/:id", fileController.deleteFile);

module.exports = router;
