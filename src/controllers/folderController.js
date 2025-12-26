const { prisma } = require("../config/prisma");
const {
  deleteMinioObjectsForFileRecord,
} = require("../controllers/fileController");

const createFolder = async (req, res) => {
  try {
    const { name, parentId } = req.body;
    const folder = await prisma.folder.create({
      data: {
        name,
        parentId: parentId || null,
      },
    });
    res.json(folder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create folder" });
  }
};

const getFolderContent = async (req, res) => {
  try {
    const { id } = req.params; // 'root' or UUID
    const parentId = id === "root" ? null : id;

    // Validate parentId if not root (optional, but good for consistency)
    if (parentId) {
      const parent = await prisma.folder.findUnique({
        where: { id: parentId },
      });
      if (!parent) return res.status(404).json({ error: "Folder not found" });
    }

    const folders = await prisma.folder.findMany({
      where: { parentId },
      orderBy: { name: "asc" },
    });

    const files = await prisma.file.findMany({
      where: { folderId: parentId },
      orderBy: { name: "asc" },
    });

    // Format for frontend
    const content = [
      ...folders.map((f) => ({ ...f, type: "folder" })),
      ...files.map((f) => ({ ...f, type: "file", mimeType: f.type })),
    ];

    res.json(content);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch folder content" });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === "root") {
      return res.status(400).json({ error: "Cannot delete root folder" });
    }

    const root = await prisma.folder.findUnique({ where: { id } });
    if (!root) return res.status(404).json({ error: "Folder not found" });

    const folderIds = [id];
    let frontier = [id];

    while (frontier.length > 0) {
      const children = await prisma.folder.findMany({
        where: { parentId: { in: frontier } },
        select: { id: true },
      });
      const childIds = children.map((c) => c.id);
      if (childIds.length === 0) break;
      folderIds.push(...childIds);
      frontier = childIds;
    }

    const files = await prisma.file.findMany({
      where: { folderId: { in: folderIds } },
      select: { id: true, url: true },
    });

    for (const file of files) {
      if (!file.url) continue;
      try {
        await deleteMinioObjectsForFileRecord(file);
      } catch (err) {
        return res.status(500).json({
          error: "Failed to delete folder media from MinIO",
          fileId: file.id,
          details: err?.message || String(err),
        });
      }
    }

    await prisma.file.deleteMany({ where: { folderId: { in: folderIds } } });
    await prisma.folder.deleteMany({ where: { id: { in: folderIds } } });

    return res.json({
      ok: true,
      deletedFolders: folderIds.length,
      deletedFiles: files.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete folder" });
  }
};

module.exports = {
  createFolder,
  getFolderContent,
  deleteFolder,
};
