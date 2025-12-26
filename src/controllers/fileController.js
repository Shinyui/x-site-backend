const { prisma } = require("../config/prisma");
const Minio = require("minio");

function createMinioClient() {
  const rawEndpoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;

  if (!rawEndpoint || !accessKey || !secretKey) return null;

  let endPoint = String(rawEndpoint).trim();
  let inferredPort;
  let inferredUseSSL;

  try {
    const u = new URL(endPoint);
    endPoint = u.hostname;
    inferredPort = u.port ? Number(u.port) : undefined;
    inferredUseSSL = u.protocol === "https:";
  } catch {
    endPoint = endPoint.replace(/^[a-z]+:\/\//i, "");
    endPoint = endPoint.split("/")[0];
  }

  if (endPoint.includes(":") && !endPoint.startsWith("[")) {
    const [host, portStr] = endPoint.split(":");
    const parsedPort = Number(portStr);
    if (host) endPoint = host;
    if (Number.isFinite(parsedPort)) inferredPort = parsedPort;
  }

  const useSSL =
    String(process.env.MINIO_USE_SSL || "").toLowerCase() === "true" ||
    inferredUseSSL === true;

  const envPort = process.env.MINIO_PORT
    ? Number(process.env.MINIO_PORT)
    : undefined;
  const port =
    (Number.isFinite(envPort) && envPort) ||
    (Number.isFinite(inferredPort) && inferredPort) ||
    (useSSL ? 443 : 9000);

  return new Minio.Client({
    endPoint,
    port,
    useSSL,
    accessKey,
    secretKey,
  });
}

function parseBucketAndKeyFromUrl(fileUrl, defaultBucket) {
  const value = String(fileUrl || "").trim();
  if (!value) return { bucket: "", key: "" };

  let pathname = value;
  try {
    pathname = new URL(value).pathname;
  } catch {
    pathname = value;
  }

  const normalized = pathname.replace(/^\/+/, "");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length < 2) {
    const bucket = String(defaultBucket || "").trim();
    if (!bucket) return { bucket: "", key: "" };
    if (!normalized) return { bucket: "", key: "" };
    return { bucket, key: normalized };
  }

  return { bucket: parts[0], key: parts.slice(1).join("/") };
}

function listObjectNames(client, bucket, prefix) {
  return new Promise((resolve, reject) => {
    const names = [];
    const stream = client.listObjectsV2(bucket, prefix, true);
    stream.on("data", (obj) => {
      if (obj?.name) names.push(obj.name);
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(names));
  });
}

function removeObjects(client, bucket, objectNames) {
  return new Promise((resolve, reject) => {
    client.removeObjects(bucket, objectNames, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function removeObject(client, bucket, objectName) {
  return new Promise((resolve, reject) => {
    client.removeObject(bucket, objectName, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function deleteMinioObjectsForFileRecord(fileRecord) {
  const client = createMinioClient();
  if (!client) {
    throw new Error(
      "MinIO is not configured. Missing MINIO_ENDPOINT/MINIO_ACCESS_KEY/MINIO_SECRET_KEY."
    );
  }

  const { bucket, key } = parseBucketAndKeyFromUrl(
    fileRecord?.url,
    process.env.MINIO_BUCKET
  );
  if (!bucket || !key) {
    throw new Error("Cannot derive bucket/key from file url.");
  }

  const fileId = String(fileRecord?.id || "");
  const firstSegment = key.split("/")[0] || "";
  const shouldDeletePrefix =
    firstSegment && fileId && firstSegment === fileId && key.includes("/");

  if (shouldDeletePrefix) {
    const prefix = `${firstSegment}/`;
    const names = await listObjectNames(client, bucket, prefix);
    if (names.length === 0) return { deleted: 0 };
    await removeObjects(client, bucket, names);
    return { deleted: names.length, prefix };
  }

  await removeObject(client, bucket, key);
  return { deleted: 1, key };
}

// Init upload (Create metadata)
const initUpload = async (req, res) => {
  try {
    const { name, size, type, folderId } = req.body;

    const file = await prisma.file.create({
      data: {
        name,
        size: parseInt(size) || 0,
        type,
        folderId: folderId === "root" ? null : folderId,
        status: "PENDING",
      },
    });

    // We return the file ID, which will be used as the path in MinIO
    // e.g. {file.id}/index.m3u8
    res.json({
      fileId: file.id,
      ...file,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to initialize upload" });
  }
};

// Update status (Called by Video Service)
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, url } = req.body;

    const file = await prisma.file.update({
      where: { id },
      data: {
        status,
        url,
      },
    });

    res.json(file);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update file status" });
  }
};

const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;

    const file = await prisma.file.findUnique({
      where: { id },
    });

    if (!file) return res.status(404).json({ error: "File not found" });

    if (file.url) {
      try {
        await deleteMinioObjectsForFileRecord(file);
      } catch (err) {
        return res.status(500).json({
          error: "Failed to delete file from MinIO",
          details: err?.message || String(err),
        });
      }
    }

    await prisma.file.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete file" });
  }
};

module.exports = {
  initUpload,
  updateStatus,
  deleteFile,
  deleteMinioObjectsForFileRecord,
};
