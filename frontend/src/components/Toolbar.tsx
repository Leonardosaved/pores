import { useStore } from '../stores/useStore'

export default function Toolbar() {
  const selectedFolder = useStore((state) => state.selectedFolder)
  const selectedImage = useStore((state) => state.selectedImage)
  const isDrawing = useStore((state) => state.isDrawing)
  const error = useStore((state) => state.error)
  const toggleIsDrawing = useStore((state) => state.toggleIsDrawing)
  const selectFolder = useStore((state) => state.selectFolder)
  const setSelectedImage = useStore((state) => state.setSelectedImage)

  const handleSelectFolder = async () => {
    console.log('Select folder clicked')
    try {
      await selectFolder()
      console.log('Folder selected')
    } catch (err) {
      console.error('Error selecting folder:', err)
    }
  }

  const getFolderName = () => {
    if (!selectedFolder) return ''
    const parts = selectedFolder.split(/[\/\\]/)
    return parts[parts.length - 1]
  }

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <button onClick={handleSelectFolder} className="primary-btn">
          📁 Select Folder
        </button>
        {selectedFolder && (
          <span className="folder-path">
            📂 {getFolderName()}
          </span>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {selectedImage && (
        <div className="toolbar-section">
          <button onClick={() => setSelectedImage(null)} className="secondary-btn">
            ← Back to Images
          </button>
          <button
            onClick={toggleIsDrawing}
            className={isDrawing ? 'active-btn' : 'secondary-btn'}
          >
            {isDrawing ? '✓ Drawing Mode ON' : '○ Start Drawing'}
          </button>
        </div>
      )}
    </div>
  )
}
