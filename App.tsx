import React, { useState, useCallback } from 'react';
import { UploadCloud, ImagePlus, AlertCircle, Camera } from 'lucide-react';
import { Editor } from './components/Editor';
import { CompareSlider } from './components/CompareSlider';
import { Annotation } from './types';
import { downscaleImageIfNeeded, flattenAnnotations } from './utils/canvas';
import { geminiService } from './services/gemini';
import { DEFAULT_INSTRUCTION_TEMPLATE, CLEAN_UP_INSTRUCTION } from './constants';

const App: React.FC = () => {
  const [stage, setStage] = useState<'upload' | 'edit' | 'result'>('upload');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError("Please upload a valid image file.");
      return;
    }
    setError(null);
    try {
      const processedSrc = await downscaleImageIfNeeded(file);
      setImageSrc(processedSrc);
      setAnnotations([]);
      setStage('edit');
    } catch (e) {
      setError("Failed to process image. Please try again.");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const generateEdit = async (cleanup: boolean = false) => {
    if (!imageSrc) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      // 1. Flatten Image + Annotations
      // If cleanup is true, we send the PREVIOUS generated image back to the model with a cleanup prompt.
      // But the standard flow is: Annotation -> Flatten -> Send.
      // The "Clean red marks" feature implies we send the *result* back to remove artifacts.
      
      let inputImageBase64 = '';
      let instruction = '';

      if (cleanup && generatedImage) {
         inputImageBase64 = generatedImage;
         instruction = CLEAN_UP_INSTRUCTION('red'); // Assume red for now, or track dominant color
      } else {
         // Normal flow
         // Check dominant annotation color for prompt customization
         const colors = annotations.map(a => a.color);
         const dominantColor = colors.sort((a,b) => 
           colors.filter(v => v===a).length - colors.filter(v => v===b).length
         ).pop() || 'red';

         inputImageBase64 = await flattenAnnotations(imageSrc, annotations);
         instruction = DEFAULT_INSTRUCTION_TEMPLATE(dominantColor);
      }

      // 2. Send to Gemini
      const resultBase64 = await geminiService.editImage(inputImageBase64, instruction);
      setGeneratedImage(resultBase64);
      setStage('result');

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong during generation.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = 'nanobanana-edit.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col">
      {/* API Key Warning (if missing) */}
      {!process.env.API_KEY && (
         <div className="bg-amber-100 text-amber-800 text-xs p-2 text-center font-medium">
           Warning: process.env.API_KEY is missing. App will not generate results.
         </div>
      )}

      {/* Global Error Toast */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg shadow-lg flex items-center z-50 animate-in slide-in-from-top-5 fade-in">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-600">
            <span className="sr-only">Close</span>×
          </button>
        </div>
      )}

      {stage === 'upload' && (
        <div 
          className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <div className="max-w-md w-full text-center space-y-8">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center text-4xl border border-slate-100">
                🍌
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">NanoBanana Editor</h1>
              <p className="text-slate-500">Draw red boxes. Add notes. Let Gemini edit.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 transition-all hover:shadow-md group">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center group-hover:border-primary/30 group-hover:bg-slate-50/50 transition-colors">
                 <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                   <UploadCloud className="w-8 h-8" />
                 </div>
                 <p className="text-lg font-medium text-slate-700 mb-2">Drag & drop an image</p>
                 <p className="text-sm text-slate-400 mb-6">JPG, PNG, or WebP up to 10MB</p>
                 
                 <label className="cursor-pointer">
                   <input 
                     type="file" 
                     className="hidden" 
                     accept="image/*"
                     onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                   />
                   <span className="px-6 py-3 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-transform active:scale-95 inline-block">
                     Choose File
                   </span>
                 </label>
              </div>
            </div>
            
            <div className="flex justify-center space-x-8 text-xs text-slate-400">
               <span className="flex items-center"><Camera className="w-3 h-3 mr-1"/> Production Ready</span>
               <span className="flex items-center"><ImagePlus className="w-3 h-3 mr-1"/> High Res Support</span>
            </div>
          </div>
        </div>
      )}

      {stage === 'edit' && imageSrc && (
        <Editor 
          imageSrc={imageSrc}
          annotations={annotations}
          setAnnotations={setAnnotations}
          onGenerate={() => generateEdit(false)}
          isProcessing={isProcessing}
          onClose={() => { setStage('upload'); setImageSrc(null); }}
        />
      )}

      {stage === 'result' && imageSrc && generatedImage && (
        <CompareSlider 
          before={imageSrc}
          after={generatedImage}
          onReset={() => setStage('edit')}
          onDownload={downloadResult}
          onRefine={() => generateEdit(true)}
        />
      )}
    </div>
  );
};

export default App;
