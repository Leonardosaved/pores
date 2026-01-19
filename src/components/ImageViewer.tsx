import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle } from 'react-konva';
import Konva from 'konva';
import { useStore } from '../stores/useStore';
import './ImageViewer.css';

const API_BASE_URL = 'http://localhost:8000';

const calculatePolygonArea = (points: { x: number, y: number }[]) => {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return Math.abs(area / 2);
};

const calculateMinPerimeterDistance = (roi1: { points: { x: number, y: number }[] }, roi2: { points: { x: number, y: number }[] }) => {
    if (roi1.points.length < 2 || roi2.points.length < 2) return null;
    
    let minDistance = Infinity;
    
    // Check distance from each point in roi1 to each edge in roi2
    for (let i = 0; i < roi1.points.length; i++) {
        const p1 = roi1.points[i];
        for (let j = 0; j < roi2.points.length; j++) {
            const p2 = roi2.points[j];
            const p3 = roi2.points[(j + 1) % roi2.points.length];
            
            // Calculate distance from p1 to line segment p2-p3
            const A = p1.x - p2.x;
            const B = p1.y - p2.y;
            const C = p3.x - p2.x;
            const D = p3.y - p2.y;
            
            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            let param = -1;
            if (lenSq !== 0) param = dot / lenSq;
            
            let xx, yy;
            if (param < 0) {
                xx = p2.x;
                yy = p2.y;
            } else if (param > 1) {
                xx = p3.x;
                yy = p3.y;
            } else {
                xx = p2.x + param * C;
                yy = p2.y + param * D;
            }
            
            const dx = p1.x - xx;
            const dy = p1.y - yy;
            const distance = Math.sqrt(dx * dx + dy * dy);
            minDistance = Math.min(minDistance, distance);
        }
    }
    
    // Check distance from each point in roi2 to each edge in roi1
    for (let i = 0; i < roi2.points.length; i++) {
        const p1 = roi2.points[i];
        for (let j = 0; j < roi1.points.length; j++) {
            const p2 = roi1.points[j];
            const p3 = roi1.points[(j + 1) % roi1.points.length];
            
            // Calculate distance from p1 to line segment p2-p3
            const A = p1.x - p2.x;
            const B = p1.y - p2.y;
            const C = p3.x - p2.x;
            const D = p3.y - p2.y;
            
            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            let param = -1;
            if (lenSq !== 0) param = dot / lenSq;
            
            let xx, yy;
            if (param < 0) {
                xx = p2.x;
                yy = p2.y;
            } else if (param > 1) {
                xx = p3.x;
                yy = p3.y;
            } else {
                xx = p2.x + param * C;
                yy = p2.y + param * D;
            }
            
            const dx = p1.x - xx;
            const dy = p1.y - yy;
            const distance = Math.sqrt(dx * dx + dy * dy);
            minDistance = Math.min(minDistance, distance);
        }
    }
    
    return minDistance === Infinity ? null : minDistance;
};

export const ImageViewer: React.FC = () => {
    const {
        selectedImage, scaleBar, setScaleBar, scaleUm, setScaleUm,
        isDrawing, toggleIsDrawing, currentRoiPoints, addCurrentRoiPoint,
        clearCurrentRoi, confirmCurrentRoi, completedRois, setSelectedImage,
        images, startModifyingRoi, cancelModifyingRoi, modifyingRoiId, deleteAnalysis,
        pendingRoiNotes, updateRoiNotesLocal, saveRoiNotes, setStageWidth, stageWidth,
        saveFailedRoiNoteIds
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

    // Auto-save notes with Enter key - only if content has changed
    const handleRoiNotesChange = (roiId: number, value: string) => {
        updateRoiNotesLocal(roiId, value);
    };
    
    // Save notes when Enter is pressed
    const handleRoiNotesKeyDown = (roiId: number, value: string, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            saveRoiNotes(roiId, value);
        }
    };

    // Retry saving failed notes
    const handleRetryNoteSave = (roiId: number) => {
        const roi = completedRois.find(r => r.id === roiId);
        if (roi && roi.notes) {
            saveRoiNotes(roiId, roi.notes);
        }
    };

    const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!isDrawing) return;
        const stage = e.target.getStage();
        if (!stage) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;

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
        const container = containerRef.current.querySelector('.konva-container') as HTMLDivElement;
        if (!container) return;
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        const scaleX = containerWidth / image.width;
        const scaleY = containerHeight / image.height;
        const scale = Math.min(scaleX, scaleY) * 0.95;
        setStageScale(scale);
        const newX = (containerWidth - image.width * scale) / 2;
        const newY = (containerHeight - image.height * scale) / 2;
        setStagePos({ x: newX, y: newY });
    };

    useEffect(() => {
        fitToScreen();
        const handleResize = () => fitToScreen();
        window.addEventListener('resize', handleResize);
        
        // Calculate stage width based on whether ROIs exist
        if (containerRef.current) {
            const containerWidth = containerRef.current.offsetWidth;
            const width = completedRois.length > 0 ? containerWidth - 250 : containerWidth;
            setStageWidth(width);
        }
        
        return () => window.removeEventListener('resize', handleResize);
    }, [image, completedRois.length]);

    const handleScaleBarHandleDrag = (handle: 'p1' | 'p2', e: Konva.KonvaEventObject<DragEvent>) => {
        if (!scaleBar || !image) return;
        const newPos = e.target.position();
        const updatedBar = { ...scaleBar };
        
        // Clamp coordinates to image bounds
        const clampedX = Math.max(0, Math.min(newPos.x, image.width));
        const clampedY = Math.max(0, Math.min(newPos.y, image.height));
        
        if (handle === 'p1') {
            updatedBar.x1 = clampedX;
            updatedBar.y1 = clampedY;
        } else {
            updatedBar.x2 = clampedX;
            updatedBar.y2 = clampedY;
        }
        
        // Keep scale bar approximately horizontal (within 10 degrees tolerance)
        // Calculate angle and auto-correct if needed
        const dx = updatedBar.x2 - updatedBar.x1;
        const dy = updatedBar.y2 - updatedBar.y1;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        // If angle is too steep, force y-values to be equal
        if (Math.abs(angle) > 10) {
            const avgY = (updatedBar.y1 + updatedBar.y2) / 2;
            updatedBar.y1 = avgY;
            updatedBar.y2 = avgY;
        }
        
        setScaleBar(updatedBar);
    };

    const handleNodeDrag = (index: number, e: Konva.KonvaEventObject<DragEvent>) => {
        const newPos = e.target.position();
        const newPoints = [...currentRoiPoints];
        newPoints[index] = { x: newPos.x, y: newPos.y };
        useStore.setState({ currentRoiPoints: newPoints });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Backspace' && currentRoiPoints.length > 0 && isDrawing) {
            e.preventDefault();
            const newPoints = currentRoiPoints.slice(0, -1);
            useStore.setState({ currentRoiPoints: newPoints });
        }
        if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            fitToScreen();
        }
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDrawing, currentRoiPoints]);

    const barPixelLength = scaleBar ? Math.sqrt((scaleBar.x2 - scaleBar.x1)**2 + (scaleBar.y2 - scaleBar.y1)**2) : 0;
    const pxPerUm = scaleUm > 0 ? barPixelLength / scaleUm : 0;
    const currentAreaPx2 = currentRoiPoints.length > 2 ? calculatePolygonArea(currentRoiPoints) : 0;
    const currentAreaUm2 = pxPerUm > 0 ? currentAreaPx2 / (pxPerUm * pxPerUm) : 0;

    const currentImageIndex = images.findIndex(img => img.filename === selectedImage?.filename) ?? -1;
    const handlePrevImage = () => {
        if (currentImageIndex > 0) {
            setSelectedImage(images[currentImageIndex - 1]);
        }
    };
    const handleNextImage = () => {
        if (currentImageIndex < images.length - 1) {
            setSelectedImage(images[currentImageIndex + 1]);
        }
    };

    if (!selectedImage) {
        return <div className="image-viewer-placeholder">Select an image to view</div>;
    }

    return (
        <div className="image-viewer-container" ref={containerRef}>
            <div className="toolbar">
                <button className="primary-btn" onClick={fitToScreen}>Fit (F)</button>
                <div className="zoom-controls">
                    <button className="zoom-btn" onClick={() => setStageScale(stageScale / 1.1)} title="Zoom out">−</button>
                    <span className="zoom-percentage">{(stageScale * 100).toFixed(0)}%</span>
                    <button className="zoom-btn" onClick={() => setStageScale(stageScale * 1.1)} title="Zoom in">+</button>
                </div>
                <div className="scale-input-group">
                    <label>Scale (µm):</label>
                    <input 
                        type="number" 
                        value={scaleUm} 
                        onChange={(e) => setScaleUm(parseFloat(e.target.value) || 0)}
                        style={{ width: '80px' }}
                    />
                    {pxPerUm > 0 && <span>{pxPerUm.toFixed(2)} px/µm</span>}
                </div>
                {!isDrawing ? (
                    <button className="secondary-btn" onClick={toggleIsDrawing}>+ Add ROI</button>
                ) : (
                    <div className="roi-controls">
                        <button className="confirm-btn" onClick={confirmCurrentRoi}>✓ Confirm</button>
                        <button className="cancel-btn" onClick={clearCurrentRoi}>✗ Clear</button>
                        <button className="cancel-btn" onClick={modifyingRoiId !== null ? cancelModifyingRoi : toggleIsDrawing}>
                            {modifyingRoiId !== null ? 'Cancel Edit' : 'Cancel'}
                        </button>
                    </div>
                )}
                {isDrawing && currentRoiPoints.length > 0 && (
                    <div className="area-readout">
                        Area: {currentAreaPx2.toFixed(2)} px² ({currentAreaUm2.toFixed(2)} µm²)
                    </div>
                )}
            </div>

            <div className="viewer-content">
                <div className="konva-container">
                    {image && containerRef.current && (
                        <Stage
                            width={stageWidth || containerRef.current.offsetWidth}
                            height={containerRef.current.offsetHeight}
                            x={stagePos.x}
                            y={stagePos.y}
                            scaleX={stageScale}
                            scaleY={stageScale}
                            onWheel={handleWheel}
                            onClick={handleStageClick}
                        >
                            <Layer>
                                <KonvaImage image={image} width={image.width} height={image.height} />

                                {/* Draw scale bar */}
                                {scaleBar && (
                                    <>
                                        <Line 
                                            points={[scaleBar.x1, scaleBar.y1, scaleBar.x2, scaleBar.y2]} 
                                            stroke="yellow" 
                                            strokeWidth={2} 
                                        />
                                        <Circle 
                                            x={scaleBar.x1} 
                                            y={scaleBar.y1} 
                                            radius={4} 
                                            fill="yellow" 
                                            draggable 
                                            onDragMove={(e) => handleScaleBarHandleDrag('p1', e)}
                                        />
                                        <Circle 
                                            x={scaleBar.x2} 
                                            y={scaleBar.y2} 
                                            radius={4} 
                                            fill="yellow" 
                                            draggable 
                                            onDragMove={(e) => handleScaleBarHandleDrag('p2', e)}
                                        />
                                    </>
                                )}

                                {/* Draw completed ROIs - highlight if modifying */}
                                {completedRois.map(roi => (
                                    roi.points.length > 0 && (
                                      <Line 
                                        key={roi.id} 
                                        points={[...roi.points.flatMap(p => [p.x, p.y]), roi.points[0].x, roi.points[0].y]} 
                                        stroke={modifyingRoiId === roi.id ? "cyan" : "red"}
                                        strokeWidth={modifyingRoiId === roi.id ? 3 : 2}
                                        fill={modifyingRoiId === roi.id ? "rgba(0, 255, 255, 0.2)" : "rgba(255, 0, 0, 0.1)"}
                                        closed
                                      />
                                    )
                                ))}

                                {/* Draw current ROI - only show lines if 2+ points */}
                                {currentRoiPoints.length > 1 && (
                                  <Line 
                                    points={[...currentRoiPoints.flatMap(p => [p.x, p.y]), currentRoiPoints.length > 2 ? currentRoiPoints[0].x : 0, currentRoiPoints.length > 2 ? currentRoiPoints[0].y : 0]} 
                                    stroke="lime" 
                                    strokeWidth={2}
                                    fill={currentRoiPoints.length > 2 ? "rgba(0, 255, 0, 0.1)" : undefined}
                                  />
                                )}

                                {/* Draw and allow dragging of ROI nodes - render nodes for current drawing OR for edited ROI */}
                                {currentRoiPoints.length > 0 && currentRoiPoints.map((point, i) => (
                                    <Circle 
                                        key={`node-${i}`}
                                        x={point.x} 
                                        y={point.y} 
                                        radius={6} 
                                        fill="white"
                                        stroke="lime"
                                        strokeWidth={2}
                                        draggable
                                        onDragMove={(e) => handleNodeDrag(i, e)}
                                    />
                                ))}

                                {/* Draw nodes for edited ROI when modifying */}
                                {modifyingRoiId !== null && completedRois
                                    .filter(roi => roi.id === modifyingRoiId)
                                    .flatMap(roi => roi.points.map((point, i) => (
                                        <Circle 
                                            key={`edit-node-${roi.id}-${i}`}
                                            x={point.x} 
                                            y={point.y} 
                                            radius={6} 
                                            fill="white"
                                            stroke="cyan"
                                            strokeWidth={2}
                                            draggable
                                            onDragMove={(e) => handleNodeDrag(i, e)}
                                        />
                                    )))}

                            </Layer>
                        </Stage>
                    )}
                </div>

                {/* ROI List Sidebar */}
                {completedRois.length > 0 && (
                    <div className="roi-sidebar">
                        <div className="roi-sidebar-header">
                            <h3>ROIs ({completedRois.length})</h3>
                            {selectedImage && (
                                <button 
                                    className="delete-analysis-btn"
                                    onClick={() => {
                                        if (window.confirm('Delete all analysis data for this image? This cannot be undone.')) {
                                            deleteAnalysis(selectedImage.filename);
                                        }
                                    }}
                                    title="Delete all ROI data for this image"
                                >
                                    🗑 Clear
                                </button>
                            )}
                        </div>
                        <div className="roi-list">
                            {completedRois.map(roi => {
                                const areaUm = roi.areaUm2 ?? null;
                                const areaText = areaUm !== null ? `${areaUm.toFixed(2)} µm²` : 'N/A';
                                const sqrtText = areaUm && areaUm > 0 ? `√${Math.sqrt(areaUm).toFixed(2)} µm` : 'N/A';
                                const minDistancePx = completedRois.reduce<number | null>((min, otherRoi) => {
                                    if (otherRoi.id === roi.id) return min;
                                    const dist = calculateMinPerimeterDistance(roi, otherRoi);
                                    if (dist === null) return min;
                                    if (min === null) return dist;
                                    return Math.min(min, dist);
                                }, null);
                                const minDistanceUm = minDistancePx !== null && pxPerUm > 0
                                    ? minDistancePx / pxPerUm
                                    : null;
                                const minDistanceText = minDistanceUm !== null ? `${minDistanceUm.toFixed(2)} um` : 'N/A';
                                const currentNotes = roi.notes ?? "";
                                const isNotesDirty = Object.prototype.hasOwnProperty.call(pendingRoiNotes, roi.id);
                                return (
                                    <div key={roi.id} className={`roi-item ${modifyingRoiId === roi.id ? 'active' : ''}`}>
                                        <div className="roi-info">
                                            <strong>ROI {roi.id}</strong>
                                            <span className="roi-version">v{roi.version}</span>
                                            <div className="roi-area">
                                                {areaText}<br/>
                                                <span className="roi-sqrt">{sqrtText}</span>
                                            </div>
                                            <div className="roi-distance">
                                                Min distance: {minDistanceText}
                                            </div>
                                            <label className="roi-notes-label" htmlFor={`roi-notes-${roi.id}`}>
                                                Notes
                                                {isNotesDirty && <span className="note-unsaved-indicator">●</span>}
                                                {Object.prototype.hasOwnProperty.call(saveFailedRoiNoteIds, roi.id) && saveFailedRoiNoteIds.has(roi.id) && (
                                                    <span className="note-save-failed">⚠</span>
                                                )}
                                            </label>
                                            <textarea
                                                className={`roi-notes ${isNotesDirty ? 'pending' : ''} ${saveFailedRoiNoteIds.has(roi.id) ? 'error' : ''}`}
                                                id={`roi-notes-${roi.id}`}
                                                placeholder="ROI notes... (press Ctrl+Enter to save)"
                                                value={currentNotes}
                                                onChange={(e) => handleRoiNotesChange(roi.id, e.target.value)}
                                                onKeyDown={(e) => handleRoiNotesKeyDown(roi.id, currentNotes, e)}
                                            />
                                            {saveFailedRoiNoteIds.has(roi.id) && (
                                                <button
                                                    className="roi-notes-retry"
                                                    type="button"
                                                    onClick={() => handleRetryNoteSave(roi.id)}
                                                    title="Click to retry saving notes"
                                                >
                                                    ⟲ Retry
                                                </button>
                                            )}
                                        </div>
                                        <button 
                                            className="modify-btn"
                                            onClick={() => startModifyingRoi(roi.id)}
                                            disabled={isDrawing && modifyingRoiId !== roi.id}
                                        >
                                            ✎ Edit
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Image Navigation Arrows */}
            {currentImageIndex > 0 && (
                <button className="nav-arrow nav-left" onClick={handlePrevImage}>
                    ◀ Prev
                </button>
            )}
            {currentImageIndex < images.length - 1 && (
                <button className="nav-arrow nav-right" onClick={handleNextImage}>
                    Next ▶
                </button>
            )}
        </div>
    );
};
