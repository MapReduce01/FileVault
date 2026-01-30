import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import API from "./api";

export default function App() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState([]);
  const [page, setPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalFiles, setTotalFiles] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const uploadFile = async () => {
    if (!file) return;

    setUploading(true);
    setShowModal(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      await API.post("/upload", formData, {
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      setProgress(100);
      loadFiles();
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed. Please try again.");
      setShowModal(false); 
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (uploading) {
        e.preventDefault();
        e.returnValue =
          "File upload is in progress.";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () =>
      window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [uploading]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    setFile(droppedFile);

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(droppedFile);

    if (fileInputRef.current) {
      fileInputRef.current.files = dataTransfer.files;
    }
  };

  const loadFiles = async () => {
    const limit = 5;
    try {
      const res = await API.get(`/files?page=${page}&limit=${limit}`);
      setFiles(res.data.files);
      const total = res.data.total;
      setTotalFiles(total);
      setIsLastPage(page * limit >= total);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [page]);

  const getDownloadLink = async (id) => {
    const res = await API.post(`/download-link/${id}`);
    window.open(res.data.download_url, "_blank");
  };

  return (
    <div>
      <h1>File Vault</h1>
      <h4>File Uploader</h4>
      
      <div>
        <input type="file" ref={fileInputRef} onChange={(e) => setFile(e.target.files[0])} />
        <button onClick={uploadFile}> Upload </button>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          width: "240px",
          height: "240px",
          marginTop: "8px",
          marginBottom: "32px",
          border: `2px dashed ${isDragging ? "#2e98c2" : "#727171"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isDragging ? "#2e98c2" : "#727171",
          fontSize: "14px",
          fontWeight: "500",
          boxSizing: "border-box",
          userSelect: "none",
          borderRadius: "16px",
        }}
      >
        {file ? file.name : "Drag & drop file here"}
      </div>

      <h4>File Browser</h4>

      <ul>
        {files.map((f) => (
          <li key={f.id} style={{ marginBottom: '4px' }}>
          <button onClick={() => getDownloadLink(f.id)}> {f.filename} </button>
          </li>
        ))}
      </ul>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => setPage(page - 1)} disabled={page === 1}> Prev </button>
        <input 
          type="number" 
          value={page} 
          onChange={(e) => {
            setPage(e.target.value === '' ? '' : parseInt(e.target.value) || page);
          }}
          style={{ 
            width: '50px', 
            padding: '4px', 
            fontSize: '14px',
            textAlign: 'center',
            border: '1px solid #eee',
            borderRadius: '4px'
          }}
        />
        <span style={{ fontSize: '14px' }}> / {Math.ceil(totalFiles / 5) || 1} </span>
        <button onClick={() => setPage(page + 1)} disabled={isLastPage}> Next </button>
      </div>

      {showModal && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'white', padding: '30px', borderRadius: '16px',
            width: '300px', textAlign: 'center', color: 'black'
          }}>
            <h2 style={{ margin: '0 0 15px 0' }}>{uploading ? "Uploading..." : "Complete!"}</h2>
            <div style={{ background: '#eee', height: '10px', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, background: '#2e98c2', height: '100%', transition: 'width 0.1s' }} />
            </div>
            <p style={{ margin: '10px 0 20px 0', fontWeight: 'bold' }}>{progress}%</p>
            <button 
              disabled={uploading}
              onClick={() => { setShowModal(false); setFile(null); }}
              style={{
                width: '100%', padding: '10px', borderRadius: '16px',
                backgroundColor: uploading ? '#ccc' : '#2e98c2',
                color: 'white', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer'
              }}
            >
              {uploading ? "Please wait..." : "OK"}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}