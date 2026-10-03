import { useState, useCallback } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

export default function ImageUploader({ label, onImageSelect, image, onClear }) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      onImageSelect(e.dataTransfer.files[0]);
    }
  }, [onImageSelect]);

  const handleChange = useCallback((e) => {
    if (e.target.files?.[0]) {
      onImageSelect(e.target.files[0]);
    }
  }, [onImageSelect]);

  if (image) {
    return (
      <div className="drop-zone has-image relative">
        <button
          onClick={onClear}
          className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-md hover:bg-red-50 transition-colors"
          aria-label="Remove image"
        >
          <X className="w-4 h-4 text-slate-600" />
        </button>
        <img
          src={URL.createObjectURL(image)}
          alt={label}
          className="w-full h-56 object-cover rounded-xl"
        />
        <p className="text-sm text-slate-500 mt-2 font-medium">{image.name}</p>
      </div>
    );
  }

  return (
    <div
      className={`drop-zone ${dragActive ? 'active' : ''}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={() => document.getElementById(`file-${label}`)?.click()}
    >
      <input
        id={`file-${label}`}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
          {label.toLowerCase().includes('previous') ? (
            <ImageIcon className="w-6 h-6 text-emerald-500" />
          ) : (
            <Upload className="w-6 h-6 text-emerald-500" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">{label}</p>
          <p className="text-xs text-slate-400 mt-1">Drag & drop or click to browse</p>
        </div>
      </div>
    </div>
  );
}
