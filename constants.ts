import { AnnotationColor } from "./types";

export const COLOR_MAP: Record<AnnotationColor, string> = {
  red: '#FF3B30',
  yellow: '#FFCC00',
  cyan: '#5AC8FA',
};

export const DEFAULT_INSTRUCTION_TEMPLATE = (color: string) => 
  `Read and interpret all ${color} text annotations within the image. For each annotation, apply the requested modification only to the corresponding highlighted area. Do not alter or modify any other part of the image. Ensure that all edits blend naturally and look realistic, preserving original lighting, shadows, and textures. After applying all modifications, remove every ${color} text annotation and its corresponding ${color} box so that no editing marks remain visible in the final image.`;

export const CLEAN_UP_INSTRUCTION = (color: string) =>
  `Remove any remaining ${color} text and ${color} boxes without changing image content.`;

export const MAX_IMAGE_DIMENSION = 4096;
export const STROKE_WIDTH = 3;
export const FONT_SIZE_BASE = 24; // Base font size for scaling
