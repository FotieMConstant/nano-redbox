export type Tool = 'select' | 'rect' | 'text';

export type AnnotationColor = 'red' | 'yellow' | 'cyan';

export interface Annotation {
  id: string;
  x: number; // Image coordinates (pixels)
  y: number;
  width: number;
  height: number;
  text: string;
  color: AnnotationColor;
}

export interface HistoryItem {
  thumbnail: string;
  originalImage: string; // Base64 or Object URL
  generatedImage: string; // Base64 or Object URL
  annotations: Annotation[];
  timestamp: number;
}

export interface EditorState {
  image: HTMLImageElement | null; // The loaded image object
  imageSrc: string | null; // The source URL
  width: number; // Natural width
  height: number; // Natural height
  scale: number; // Display scale factor
}

export interface Point {
  x: number;
  y: number;
}