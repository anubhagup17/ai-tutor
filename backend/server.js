import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { generateEmbeddingsAndStore } from './uploadHandler.js';

const cors = require('cors');
app.use(cors());
const app = express();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Always save with .txt extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '.txt');
  }
});
const upload = multer({ storage: storage });

app.use(express.json());

app.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  const { subject, className, chapter, category } = req.body;

  if (!file) return res.status(400).send('No file uploaded');

  const metadata = {
    subject,
    class: className,
    chapter,
    category
  };

  try {
    console.log('Processing file:', file.path);
    //await processFile(file.path, metadata);
    await generateEmbeddingsAndStore(metadata);
    res.status(200).send('File processed and inserted into Pinecone');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error processing file');
  } finally {
    // Remove all files from uploads folder
    const uploadsDir = path.join(process.cwd(), 'uploads');
    fs.promises.readdir(uploadsDir)
      .then(files => Promise.all(
        files.map(f => fs.promises.unlink(path.join(uploadsDir, f)))
      ))
      .catch(err => console.error('Error cleaning uploads folder:', err));
  }
});

app.listen(8000, () => console.log('Server running on http://localhost:8000'));
