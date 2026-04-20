const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.static("public"));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Configure storage to preserve relative paths
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // file.originalname contains the webkitRelativePath (e.g., "folder/sub/file.txt")
    const relativePath = file.originalname;
    const dirname = path.dirname(relativePath);
    const fullDir = path.join(uploadsDir, dirname);
    fs.mkdirSync(fullDir, { recursive: true });
    cb(null, fullDir);
  },
  filename: (req, file, cb) => {
    cb(null, path.basename(file.originalname));
  }
});

const upload = multer({ storage });

// Upload endpoint
app.post("/upload", upload.array("files"), (req, res) => {
  res.json({ message: "Uploaded successfully!", count: req.files.length });
});

// Recursive directory walker (returns clean JSON tree)
function walk(dir, basePath = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.map(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return {
        folder: entry.name,
        children: walk(fullPath, path.join(basePath, entry.name))
      };
    } else {
      return { file: entry.name };
    }
  });
}

// API: return folder structure
app.get("/api/files", (req, res) => {
  try {
    const structure = walk(uploadsDir);
    res.json(structure);
  } catch (err) {
    res.status(500).json({ error: "Failed to read uploads directory" });
  }
});

// Optional: serve uploaded files (so you can preview them)
app.use("/uploads", express.static(uploadsDir));

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
