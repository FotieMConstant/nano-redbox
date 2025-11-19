import React, { useState, useRef, useEffect } from 'react';
import { Download, RefreshCw } from 'lucide-react';

interface CompareSliderProps {
  before: string;
  after: string;
  onReset: () => void;
  onDownload: () => void;
  onRefine: () => void;
}

export const CompareSlider: React.FC<CompareSliderProps> = ({ before, after, onReset, onDownload, onRefine }) => {
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  };

  useEffect(() => {
    const up = () => setIsDragging(false);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchend', up);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="h-16 border-b flex items-center justify-between px-6 bg-white shrink-0">
        <h2 className="text-lg font-bold text-slate-800">Result</h2>
        <div className="flex space-x-3">
          <button onClick={onReset} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            New Edit
          </button>
          <button onClick={onRefine} className="flex items-center px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Re-run with clean up prompt">
             <RefreshCw className="w-4 h-4 mr-2" />
             Clean Marks
          </button>
          <button onClick={onDownload} className="flex items-center px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
            <Download className="w-4 h-4 mr-2" />
            Download
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
        <div 
          ref={containerRef}
          className="relative max-w-full max-h-[80vh] aspect-auto shadow-2xl rounded-lg overflow-hidden cursor-col-resize select-none group"
          onMouseDown={() => setIsDragging(true)}
          onTouchStart={() => setIsDragging(true)}
          onMouseMove={onMouseMove}
          onTouchMove={onTouchMove}
        >
          {/* After Image (Background) */}
          <img src={after} alt="After" className="block max-h-[80vh] w-auto object-contain" draggable={false} />
          
          {/* Before Image (Clipped) */}
          <div 
            className="absolute inset-0 overflow-hidden border-r-2 border-white"
            style={{ width: `${position}%` }}
          >
            <img src={before} alt="Before" className="block max-h-[80vh] w-auto object-contain max-w-none" style={{ width: containerRef.current?.getBoundingClientRect().width }} draggable={false} />
          </div>

          {/* Slider Handle */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.3)] flex items-center justify-center"
            style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
          >
            <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
               <div className="w-1 h-4 bg-slate-300 rounded-full mx-0.5" />
               <div className="w-1 h-4 bg-slate-300 rounded-full mx-0.5" />
            </div>
          </div>
          
          {/* Labels */}
          <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-sm pointer-events-none">ORIGINAL</div>
          <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-sm pointer-events-none">EDITED</div>
        </div>
      </div>
    </div>
  );
};
