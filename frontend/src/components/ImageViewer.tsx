import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle, Polygon } from 'react-konva';
import Konva from 'konva';
import { useStore } from '../stores/useStore';
import './ImageViewer.css';

const API_BASE_URL = 'http://localhost:8000';

// Shoelace formula for polygon area
const calculatePolygonArea = (points: { x: number, y: number }[]) => {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return Math.abs(area / 2);
};

export const ImageViewer: React.FC = () => {
    const {
        selectedImage, scaleBar, setScaleBar, scaleUm, setScaleUm,
        isDrawing, toggleIsDrawing, currentRoiPoints, addCurrentRoiPoint,
        clearCurrentRoi, confirmCurrentRoi, completedRois
    } = useStore();

    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
    const [stageScale, setStageScale] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!selectedImage) {
            setImage(null);
            return;
        }
        const imageUrl = `${API_BASE_URL}/api/images/${selectedImage.filename}`;
        const img = new window.Image();
        img.src = imageUrl;
        img.onload = () => setImage(img);
    }, [selectedImage]);

    const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!isDrawing) return;
        const stage = e.target.getStage();
        if (!stage) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;

        // Transform screen coordinates to image coordinates
        const imageX = (pos.x - stage.x()) / stage.scaleX();
        const imageY = (pos.y - stage.y()) / stage.scaleY();
        addCurrentRoiPoint({ x: imageX, y: imageY });
    };

    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        const scaleBy = 1.1;
        const stage = e.target.getStage();
        if (!stage) return;
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        const mousePointTo = {
          x: (pointer.x - stage.x()) / oldScale,
          y: (pointer.y - stage.y()) / oldScale,
        };
        const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
        setStageScale(newScale);
        const newPos = {
          x: pointer.x - mousePointTo.x * newScale,
          y: pointer.y - mousePointTo.y * newScale,
        };
        setStagePos(newPos);
      };

      const fitToScreen = () => {
          if (!image || !containerRef.current) return;
          const container = containerRef.current;
          const containerWidth = container.offsetWidth;
          const containerHeight = container.offsetHeight;
          const scaleX = containerWidth / image.width;
          const scaleY = containerHeight / image.height;
          const scale = Math.min(scaleX, scaleY) * 0.95;
          setStageScale(scale);
          const newX = (containerWidth - image.width * scale) / 2;
          const newY = (containerHeight - image.height * scale) / 2;
          setStagePos({ x: newX, y: newY });
      }

      useEffect(() => {
        fitToScreen();
      }, [image])

      const handleHandleDrag = (handle: 'p1' | 'p2', e: Konva.KonvaEventObject<DragEvent>) => {
        if (!scaleBar) return;
        const newPos = e.target.position();
        const updatedBar = { ...scaleBar };
        if (handle === 'p1') {
          updatedBar.x1 = newPos.x;
        } else {
          updatedBar.x2 = newPos.x;
        }
        setScaleBar(updatedBar);
      }

      const barPixelLength = scaleBar ? Math.sqrt((scaleBar.x2 - scaleBar.x1)**2 + (scaleBar.y2 - scaleBar.y1)**2) : 0;
      const pxPerUm = scaleUm > 0 ? barPixelLength / scaleUm : 0;
      const currentAreaPx2 = currentRoiPoints.length > 2 ? calculatePolygonArea(currentRoiPoints) : 0;
      const currentAreaUm2 = pxPerUm > 0 ? currentAreaPx2 / (pxPerUm * pxPerUm) : 0;

    if (!selectedImage) {
        return <div className="image-viewer-placeholder">Select an image to view</div>;
    }

    return (
        <div className="image-viewer-container" ref={containerRef}>
            <div className="toolbar">
                <button onClick={fitToScreen}>Fit</button>
                <div className="scale-input-group">
                    <label>Scale (µm):</label>
                    <input type="number" value={scaleUm} onChange={(e) => setScaleUm(parseFloat(e.target.value) || 0)} />
                    {pxPerUm > 0 && <span>{pxPerUm.toFixed(2)} px/µm</span>}
                </div>
                {!isDrawing ? (
                    <button onClick={toggleIsDrawing}>+ Add ROI</button>
                ) : (
                    <div className="roi-controls">
                        <button onClick={confirmCurrentRoi}>✓ Confirm</button>
                        <button onClick={clearCurrentRoi}>✗ Clear</button>
                        <button onClick={toggleIsDrawing}>Cancel</button>
                    </div>
                )}
                 {isDrawing && currentRoiPoints.length > 0 && (
                    <div className="area-readout">
                        Area: {currentAreaPx2.toFixed(2)} px² ({currentAreaUm2.toFixed(2)} µm²)
                    </div>
                )}
            </div>
            {image && containerRef.current && (
                <Stage
                    width={containerRef.current.offsetWidth}
                    height={containerRef.current.offsetHeight}
                    onWheel={handleWheel}
                    onMouseDown={handleStageClick}
                    scaleX={stageScale}
                    scaleY={stageScale}
                    x={stagePos.x}
                    y={stagePos.y}
                    draggable
                >
                    <Layer>
                        <KonvaImage image={image} />
                        {scaleBar && (
                          <>
                            <Line points={[scaleBar.x1, scaleBar.y1, scaleBar.x2, scaleBar.y2]} stroke="yellow" strokeWidth={2} />
                            <Circle x={scaleBar.x1} y={scaleBar.y1} radius={8} fill="yellow" draggable onDragMove={(e) => handleHandleDrag('p1', e)} dragBoundFunc={(pos) => ({ x: pos.x, y: scaleBar.y1 })} />
                            <Circle x={scaleBar.x2} y={scaleBar.y2} radius={8} fill="yellow" draggable onDragMove={(e) => handleHandleDrag('p2', e)} dragBoundFunc={(pos) => ({ x: pos.x, y: scaleBar.y2 })} />
                          </>
                        )}
                        {/* Draw completed ROIs */}
                        {completedRois.map(roi => (
                            <Polygon key={roi.id} points={roi.points.flatMap(p => [p.x, p.y])} fill="rgba(255, 0, 0, 0.3)" stroke="red" strokeWidth={2} closed />
                        ))}
                        {/* Draw current ROI */}
                        <Line points={currentRoiPoints.flatMap(p => [p.x, p.y])} stroke="lime" strokeWidth={2} />
                        {currentRoiPoints.map((point, i) => (
                            <Circle key={i} x={point.x} y={point.y} radius={5} fill="lime" />
                        ))}
                    </Layer>
                </Stage>
            )}
        </div>
    );
};
