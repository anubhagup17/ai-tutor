import './App.css';
import { useState } from 'react';
import axios from 'axios';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState({
    subject: '',
    className: '',
    chapter: '',
    category: ''
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMetadata({ ...metadata, [e.target.name]: e.target.value });
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file.");
    const formData = new FormData();
    formData.append("file", file);
    Object.entries(metadata).forEach(([key, value]) => {
      formData.append(key, value);
    });

    setLoading(true);
    setProgress(0);
    try {
      const res = await axios.post("http://localhost:8000/upload", formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percent);
          }
        }
      });
      alert(res.data);
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Upload Text File with Metadata</h2>
      <input
        type="file"
        onChange={(e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files && files[0]) {
            setFile(files[0]);
          } else {
            setFile(null);
          }
        }}
      />
      <input name="subject" placeholder="Subject" onChange={handleChange} />
      <input name="className" placeholder="Class" onChange={handleChange} />
      <input name="chapter" placeholder="Chapter" onChange={handleChange} />
      <input name="category" placeholder="Category" onChange={handleChange} />
      <button onClick={handleUpload} disabled={loading}>Upload</button>
      {loading && (
        <div style={{ marginTop: 20 }}>
          <div className="spinner" style={{ marginBottom: 10 }}>
            <svg width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" stroke="#1976d2" strokeWidth="4" fill="none" strokeDasharray="90" strokeDashoffset="60">
                <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="1s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>
          <div style={{ width: 200, height: 10, background: '#eee', borderRadius: 5 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: '#1976d2', borderRadius: 5, transition: 'width 0.2s' }} />
          </div>
          <div style={{ marginTop: 5, fontSize: 12 }}>{progress}%</div>
        </div>
      )}
    </div>
  );
}

export default App;
