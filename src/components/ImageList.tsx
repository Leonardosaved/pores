import { useEffect, useState } from 'react'
import { useStore } from '../stores/useStore'
import './ImageList.css'

export default function ImageList() {
  const selectedFolder = useStore((state) => state.selectedFolder)
  const images = useStore((state) => state.images)
  const setSelectedImage = useStore((state) => state.setSelectedImage)
  const fetchImages = useStore((state) => state.fetchImages)
  const [failedThumbnails, setFailedThumbnails] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (selectedFolder) {
      fetchImages()
    }
  }, [selectedFolder, fetchImages])

  const handleThumbnailError = (filename: string) => {
    setFailedThumbnails(prev => new Set(prev).add(filename))
  }

  if (!selectedFolder) {
    return (
      <div className="image-list-empty">
        <h2>No Folder Selected</h2>
        <p>Click "Select Folder" in the toolbar to choose a folder containing TIFF images.</p>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="image-list-empty">
        <h2>No Images Found</h2>
        <p>The selected folder doesn't contain any TIFF images.</p>
      </div>
    )
  }

  // Calculate analyzed percentage
  const analyzedCount = images.filter(img => img.has_data).length;
  const analyzedPercent = Math.round((analyzedCount / images.length) * 100);

  return (
    <div className="image-list">
      <h2>Images in Folder ({images.length})</h2>

      <div className="folder-progress">
        <div className="progress-text">Analyzed: {analyzedCount}/{images.length} ({analyzedPercent}%)</div>
        <div className="progress-container" aria-hidden>
          <div className="progress-bar" style={{ width: `${analyzedPercent}%` }} />
        </div>
      </div>

      <div className="image-grid">
        {images.map((image) => (
          <div
            key={image.filename}
            className="image-item"
            onClick={() => setSelectedImage(image)}
            title={image.filename}
          >
            <div className="image-thumbnail">
              {!failedThumbnails.has(image.filename) ? (
                <img
                  src={`http://localhost:8000/api/images/${image.filename}/thumbnail?size=200`}
                  alt={image.filename}
                  loading="lazy"
                  onError={() => handleThumbnailError(image.filename)}
                />
              ) : (
                <div className="thumbnail-placeholder">
                  <span>📷</span>
                  <p>Image</p>
                </div>
              )}
            </div>
            <p className="image-filename">{image.filename}</p>
            {image.has_data && <span className="has-data-badge">✓ Has Data</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
