import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Loader2, Move, MousePointer2, Type, Square, Trash2, Undo2, Redo2, Download, Maximize2, X, Check } from 'lucide-react';
import { Annotation, AnnotationColor, Tool, Point } from '../types';
import { COLOR_MAP } from '../constants';
import { getRelativePointerPosition } from '../utils/canvas';

interface EditorProps {
  imageSrc: string;
  annotations: Annotation[];
  setAnnotations: React.Dispatch<React.SetStateAction<Annotation[]>>;
  onGenerate: () => void;
  isProcessing: boolean;
  onClose: () => void;
}

export const Editor: React.FC<EditorProps> = ({ 
  imageSrc, 
  annotations, 
  setAnnotations,
  onGenerate,
  isProcessing,
  onClose
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const [tool, setTool] = useState<Tool>('rect');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeColor, setActiveColor] = useState<AnnotationColor>('red');
  const [history, setHistory] = useState<Annotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentRect, setCurrentRect] = useState<Partial<Annotation> | null>(null);
  
  // Dragging/Resizing state
  const [dragMode, setDragMode] = useState<'move' | 'resize-se' | null>(null);
  const [dragOffset, setDragOffset] = useState<Point | null>(null);

  // Helper to sync history
  const updateAnnotationsWithHistory = (newAnnotations: Annotation[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setAnnotations(newAnnotations);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1]);
      setSelectedId(null);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
      setSelectedId(null);
    }
  };

  const deleteSelected = () => {
    if (selectedId) {
      const next = annotations.filter(a => a.id !== selectedId);
      updateAnnotationsWithHistory(next);
      setSelectedId(null);
    }
  };

  // Key bindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch(e.key.toLowerCase()) {
        case 'v': setTool('select'); break;
        case 'r': setTool('rect'); break;
        case 't': setTool('text'); break; // Just selects the tool, doesn't auto-add
        case 'delete':
        case 'backspace': deleteSelected(); break;
        case 'z': 
          if ((e.metaKey || e.ctrlKey) && e.shiftKey) redo();
          else if (e.metaKey || e.ctrlKey) undo();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, annotations, historyIndex]);

  // Scale calculations
  const getScale = () => {
    if (!imgRef.current || !containerRef.current) return 1;
    return imgRef.current.width / imgRef.current.naturalWidth;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current || !imgRef.current) return;
    
    const scale = getScale();
    const { x, y } = getRelativePointerPosition(e, containerRef.current);
    const imgX = x / scale;
    const imgY = y / scale;

    // Hit detection for selection
    if (tool === 'select') {
      // Check resizing handle first (bottom-right of selected)
      if (selectedId) {
        const selected = annotations.find(a => a.id === selectedId);
        if (selected) {
          const handleSize = 10 / scale;
          const right = selected.x + selected.width;
          const bottom = selected.y + selected.height;
          if (Math.abs(imgX - right) < handleSize && Math.abs(imgY - bottom) < handleSize) {
            setDragMode('resize-se');
            setIsDrawing(true); // Reuse drawing flag for global move listeners
            return;
          }
        }
      }

      // Check bodies
      const clicked = annotations.slice().reverse().find(a => 
        imgX >= a.x && imgX <= a.x + a.width &&
        imgY >= a.y && imgY <= a.y + a.height
      );

      if (clicked) {
        setSelectedId(clicked.id);
        setDragMode('move');
        setDragOffset({ x: imgX - clicked.x, y: imgY - clicked.y });
        setIsDrawing(true);
      } else {
        setSelectedId(null);
      }
    } else if (tool === 'rect') {
      setSelectedId(null);
      setIsDrawing(true);
      setStartPoint({ x: imgX, y: imgY });
      setCurrentRect({ x: imgX, y: imgY, width: 0, height: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !containerRef.current || !imgRef.current) return;

    const scale = getScale();
    const { x, y } = getRelativePointerPosition(e, containerRef.current);
    const imgX = x / scale;
    const imgY = y / scale;

    if (tool === 'rect' && startPoint) {
      const width = imgX - startPoint.x;
      const height = imgY - startPoint.y;
      setCurrentRect({
        x: width > 0 ? startPoint.x : imgX,
        y: height > 0 ? startPoint.y : imgY,
        width: Math.abs(width),
        height: Math.abs(height)
      });
    } else if (tool === 'select' && selectedId) {
      if (dragMode === 'move' && dragOffset) {
        const newX = imgX - dragOffset.x;
        const newY = imgY - dragOffset.y;
        setAnnotations(prev => prev.map(a => a.id === selectedId ? { ...a, x: newX, y: newY } : a));
      } else if (dragMode === 'resize-se') {
        const selected = annotations.find(a => a.id === selectedId);
        if (selected) {
          const newW = Math.max(10, imgX - selected.x);
          const newH = Math.max(10, imgY - selected.y);
          setAnnotations(prev => prev.map(a => a.id === selectedId ? { ...a, width: newW, height: newH } : a));
        }
      }
    }
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      if (tool === 'rect' && currentRect && currentRect.width && currentRect.width > 5) {
        const newId = Math.random().toString(36).substr(2, 9);
        const newAnn: Annotation = {
          id: newId,
          x: currentRect.x!,
          y: currentRect.y!,
          width: currentRect.width!,
          height: currentRect.height!,
          text: '',
          color: activeColor
        };
        updateAnnotationsWithHistory([...annotations, newAnn]);
        setSelectedId(newId);
        // Switch to select mode automatically to allow typing
        setTool('select');
      } else if (dragMode) {
        // Commit drag to history
        updateAnnotationsWithHistory(annotations);
      }
    }
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentRect(null);
    setDragMode(null);
  };

  const handleTextChange = (id: string, text: string) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, text } : a));
  };

  // Render helpers
  const scale = getScale();

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="h-16 border-b flex items-center justify-between px-4 bg-white shrink-0 z-20">
        <div className="flex items-center space-x-2">
           <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500" title="Back to Upload">
             <X className="w-5 h-5" />
           </button>
           <div className="h-6 w-px bg-slate-200 mx-2" />
           <div className="flex bg-slate-100 rounded-lg p-1">
             <button 
               onClick={() => setTool('select')}
               className={`p-2 rounded ${tool === 'select' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
               title="Select (V)"
             >
               <MousePointer2 className="w-5 h-5" />
             </button>
             <button 
               onClick={() => setTool('rect')}
               className={`p-2 rounded ${tool === 'rect' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
               title="Rectangle (R)"
             >
               <Square className="w-5 h-5" />
             </button>
           </div>
           
           <div className="h-6 w-px bg-slate-200 mx-2" />
           
           <div className="flex items-center space-x-1">
              {(['red', 'yellow', 'cyan'] as AnnotationColor[]).map(c => (
                <button
                  key={c}
                  onClick={() => setActiveColor(c)}
                  className={`w-6 h-6 rounded-full border-2 ${activeColor === c ? 'border-slate-900' : 'border-transparent'}`}
                  style={{ backgroundColor: COLOR_MAP[c] }}
                  title={`${c.charAt(0).toUpperCase() + c.slice(1)} Annotations`}
                />
              ))}
           </div>

           <div className="h-6 w-px bg-slate-200 mx-2" />

           <button onClick={undo} disabled={historyIndex === 0} className="p-2 text-slate-500 hover:text-slate-800 disabled:opacity-30">
             <Undo2 className="w-5 h-5" />
           </button>
           <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-2 text-slate-500 hover:text-slate-800 disabled:opacity-30">
             <Redo2 className="w-5 h-5" />
           </button>
           <button onClick={deleteSelected} disabled={!selectedId} className="p-2 text-red-500 hover:bg-red-50 rounded disabled:opacity-30">
             <Trash2 className="w-5 h-5" />
           </button>
        </div>

        <div className="flex items-center space-x-4">
           <button 
             onClick={onGenerate}
             disabled={isProcessing || annotations.length === 0}
             className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-2 rounded-full hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
           >
             {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-lg">✨</span>}
             <span>Generate</span>
           </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 bg-slate-50 overflow-auto flex items-center justify-center p-8 relative">
        <div 
          ref={containerRef}
          className="relative shadow-2xl select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img 
            ref={imgRef}
            src={imageSrc} 
            alt="Editor target" 
            className="max-w-full max-h-[80vh] block pointer-events-none" 
            draggable={false}
          />
          
          {/* SVG Overlay for Annotations */}
          {imgRef.current && (
             <div className="absolute inset-0 pointer-events-none">
                {/* Render existing annotations */}
                {annotations.map(ann => {
                  const isSelected = ann.id === selectedId;
                  const style = {
                     left: ann.x * scale,
                     top: ann.y * scale,
                     width: ann.width * scale,
                     height: ann.height * scale,
                     borderColor: COLOR_MAP[ann.color],
                     color: COLOR_MAP[ann.color],
                  };

                  return (
                    <div
                      key={ann.id}
                      className={`absolute border-[3px] pointer-events-auto group ${isSelected ? 'z-10' : 'z-0'}`}
                      style={style}
                      onClick={(e) => { e.stopPropagation(); setSelectedId(ann.id); setTool('select'); }}
                    >
                      {/* Resize Handle */}
                      {isSelected && (
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-slate-400 cursor-se-resize rounded-sm shadow-sm z-20" />
                      )}
                      
                      {/* Text Input */}
                      {isSelected ? (
                         <textarea
                           autoFocus
                           value={ann.text}
                           onChange={(e) => handleTextChange(ann.id, e.target.value)}
                           onKeyDown={(e) => e.stopPropagation()} // Prevent deleting rect when deleting text
                           onBlur={() => updateAnnotationsWithHistory(annotations)} // Save to history on blur
                           className="absolute top-1 left-1 bg-white/90 border-none resize-none outline-none font-bold text-sm p-1 overflow-hidden min-w-[50px] z-20 text-black shadow-sm rounded"
                           style={{ width: 'calc(100% - 8px)', height: 'calc(100% - 8px)' }}
                           placeholder="Type instruction..."
                         />
                      ) : (
                         ann.text && (
                            <div className="absolute top-1 left-1 font-bold text-xs leading-tight pointer-events-none truncate bg-white/80 px-1 rounded" style={{ maxWidth: 'calc(100% - 8px)', color: style.color }}>
                               {ann.text}
                            </div>
                         )
                      )}
                    </div>
                  );
                })}

                {/* Current Drawing Rect */}
                {currentRect && (
                   <div 
                     className="absolute border-[3px]"
                     style={{
                       left: currentRect.x! * scale,
                       top: currentRect.y! * scale,
                       width: currentRect.width! * scale,
                       height: currentRect.height! * scale,
                       borderColor: COLOR_MAP[activeColor],
                     }}
                   />
                )}
             </div>
          )}
        </div>
        
        {/* Instructions Hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur border border-slate-200 px-4 py-2 rounded-full text-xs font-medium text-slate-600 shadow-sm pointer-events-none">
           Short notes work best. Draw tight boxes. The model removes marks after editing.
        </div>
      </div>
    </div>
  );
};
