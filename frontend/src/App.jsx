import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import API from "./api";

export default function App() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState([]);
  const [page, setPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

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


  const loadFiles = async () => {
    const limit = 5;
    try {
      const res = await API.get(`/files?page=${page}&limit=${limit}`);
      setFiles(res.data.files);
      const total = res.data.total;
      setIsLastPage(page * limit >= total);
    } catch (err) {
      console.error(err);
    }
  };

  const getDownloadLink = async (id) => {
    const res = await API.post(`/download-link/${id}`);
    window.open(res.data.download_url, "_blank");
  };

  useEffect(() => {
    loadFiles();
  }, [page]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">File Vault</h1>
      <h4 className="text-xs font-normal mb-4">File Uploader</h4>

      <div className="border p-4 mb-6">
        <input type="file" ref={fileInputRef} onChange={(e) => setFile(e.target.files[0])} />
        <button
          onClick={uploadFile}
          className="ml-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Upload
        </button>
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
          border: `2px dashed ${isDragging ? "#2563eb" : "#999"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isDragging ? "#2563eb" : "#666",
          fontSize: "14px",
          fontWeight: "500",
          boxSizing: "border-box",
          userSelect: "none",
        }}
      >
        {file ? file.name : "Drag & drop file here"}
      </div>

      <h4 className="text-xs font-normal mb-4">File Browser</h4>

      <ul>
        {files.map((f) => (
          <li key={f.id} className="flex justify-between mb-2">
            <span>{f.filename}</span>
            <button
              onClick={() => getDownloadLink(f.id)}
              className="text-blue-500"
            >
              Download
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          className="mr-2"
        >
          Prev
        </button>
        <button
          onClick={() => setPage(page + 1)}
          disabled={isLastPage}
        >
          Next
        </button>
      </div>

      {showModal && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'white', padding: '30px', borderRadius: '12px',
            width: '300px', textAlign: 'center', color: 'black'
          }}>
            <h2 style={{ margin: '0 0 15px 0' }}>{uploading ? "Uploading..." : "Complete!"}</h2>
            <div style={{ background: '#eee', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, background: '#007bff', height: '100%', transition: 'width 0.2s' }} />
            </div>
            <p style={{ margin: '10px 0 20px 0', fontWeight: 'bold' }}>{progress}%</p>

            <button 
              disabled={uploading}
              onClick={() => { setShowModal(false); setFile(null); }}
              style={{
                width: '100%', padding: '10px', borderRadius: '6px',
                backgroundColor: uploading ? '#ccc' : '#007bff',
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