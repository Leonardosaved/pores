import './App.css'
import { useStore } from './stores/useStore'
import Toolbar from './components/Toolbar'
import ImageList from './components/ImageList'
import { ImageViewer } from './components/ImageViewer'

function App() {
  const selectedImage = useStore((state) => state.selectedImage)

  return (
    <div className="app-container">
      <Toolbar />
      <div className="main-content">
        {selectedImage ? (
          <ImageViewer />
        ) : (
          <ImageList />
        )}
      </div>
    </div>
  )
}

export default App
