import React, { useState } from 'react';

const UploadData: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('');
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !category || !className || !subject || !chapter) {
      setMessage('Please fill all fields and select a file.');
      return;
    }
    setLoading(true);
    setMessage('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    formData.append('class', className);
    formData.append('subject', subject);
    formData.append('chapter', chapter);
    try {
      const response = await fetch('http://localhost:8000/save-data', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        setMessage('File uploaded and data stored successfully!');
        setFile(null);
        setCategory('');
        setClassName('');
        setSubject('');
        setChapter('');
      } else {
        const data = await response.json();
        setMessage(data.message || 'Upload failed.');
      }
    } catch (err) {
      setMessage('Error uploading file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>Upload Text File with Metadata</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Text File:</label>
          <input type="file" accept=".txt" onChange={handleFileChange} />
        </div>
        <div>
          <label>Category:</label>
          <input type="text" value={category} onChange={e => setCategory(e.target.value)} />
        </div>
        <div>
          <label>Class:</label>
          <input type="text" value={className} onChange={e => setClassName(e.target.value)} />
        </div>
        <div>
          <label>Subject:</label>
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)} />
        </div>
        <div>
          <label>Chapter:</label>
          <input type="text" value={chapter} onChange={e => setChapter(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} style={{ marginTop: 12 }}>
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      {message && <div style={{ marginTop: 16 }}>{message}</div>}
    </div>
  );
};

export default UploadData;
