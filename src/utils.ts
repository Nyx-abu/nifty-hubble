/**
 * Utility functions for pattern coordinates, seeded generation, and calculations.
 */

import type { Pattern } from './types';

// Human-friendly labels for dot indices (0 to 8 in reading order)
export const DOT_LABELS = [
  'Top-Left',   'Top-Center',    'Top-Right',
  'Middle-Left', 'Center',        'Middle-Right',
  'Bottom-Left', 'Bottom-Center', 'Bottom-Right'
];

export const DOT_SHORTS = [
  'TL', 'TC', 'TR',
  'ML', 'C',  'MR',
  'BL', 'BC', 'BR'
];

/**
 * Returns human-readable label for a dot index.
 */
export function getDotLabel(index: number): string {
  return DOT_LABELS[index] || `Dot ${index}`;
}

/**
 * Seeded PRNG based on tile X and Y coordinates.
 * Generates values in [0, 1).
 */
export function seededRandom(x: number, y: number, salt: number = 1): number {
  const sinInput = (x * 12.9898 + y * 78.233 + salt * 43758.5453123);
  const sinVal = Math.sin(sinInput);
  return (sinVal * 43758.5453123) % 1;
}

/**
 * Generates a consistent, unique procedurally generated name for a tile coordinate.
 * E.g., "Sector Alpha-12", "Delta-9", etc.
 */
export function getTileName(x: number, y: number): string {
  const prefixes = ['Sector', 'Zone', 'Node', 'Grid', 'Area', 'Hub', 'Nexus', 'Terminal'];
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  // Seeded indices
  const pIndex = Math.abs(Math.floor(seededRandom(x, y, 10) * prefixes.length));
  const letterIndex = Math.abs(Math.floor(seededRandom(x, y, 20) * alphabet.length));
  const number = Math.abs(Math.floor(seededRandom(x, y, 30) * 100));
  
  return `${prefixes[pIndex]} ${alphabet[letterIndex]}-${number} (${x}, ${y})`;
}

/**
 * Generates customized styling options for a specific tile (colored nodes, background grid lines).
 * Returns consistent styling using the tile X,Y as seed.
 */
export interface TileStyle {
  hue: number;
  bgColor: string;
  dotColor: string;
  lineColor: string;
  ambientOpacity: number;
  patternStyle: 'classic' | 'circuit' | 'tech';
}

export function getTileStyle(x: number, y: number): TileStyle {
  // Base hue from 0 to 360
  const randomVal = seededRandom(x, y, 100);
  const hue = Math.floor(Math.abs(randomVal) * 360);
  
  // Deterministic patterns: classic, circuit, tech
  const styleRandom = seededRandom(x, y, 200);
  const styles: ('classic' | 'circuit' | 'tech')[] = ['classic', 'circuit', 'tech'];
  const patternStyle = styles[Math.floor(Math.abs(styleRandom) * styles.length)];

  return {
    hue,
    bgColor: `hsla(${hue}, 40%, 12%, 0.15)`,
    dotColor: `hsla(${hue}, 85%, 65%, 0.8)`,
    lineColor: `hsla(${hue}, 80%, 55%, 0.55)`,
    ambientOpacity: 0.05 + (Math.abs(seededRandom(x, y, 300)) * 0.12),
    patternStyle
  };
}

/**
 * Generates a list of all connections in a pattern's dot sequence.
 * E.g., [0, 4, 8] -> [[0, 4], [4, 8]]
 */
export function getPatternSegments(sequence: number[]): [number, number][] {
  const segments: [number, number][] = [];
  for (let i = 0; i < sequence.length - 1; i++) {
    segments.push([sequence[i], sequence[i + 1]]);
  }
  return segments;
}

/**
 * Calculates a relative rating or difficulty score of a sequence based on direction changes and length.
 */
export function calculateComplexity(sequence: number[]): {
  score: number;
  label: 'Simple' | 'Moderate' | 'Complex' | 'Expert';
} {
  if (sequence.length <= 1) return { score: 10, label: 'Simple' };
  
  let score = sequence.length * 10; // Length contribution
  let directionChanges = 0;
  
  // Calculate relative coordinate direction changes
  for (let i = 2; i < sequence.length; i++) {
    const prevDot = sequence[i - 2];
    const currDot = sequence[i - 1];
    const nextDot = sequence[i];
    
    const prevX = prevDot % 3;
    const prevY = Math.floor(prevDot / 3);
    const currX = currDot % 3;
    const currY = Math.floor(currDot / 3);
    const nextX = nextDot % 3;
    const nextY = Math.floor(nextDot / 3);
    
    // Vectors
    const dx1 = currX - prevX;
    const dy1 = currY - prevY;
    const dx2 = nextX - currX;
    const dy2 = nextY - currY;
    
    // Cross product or dot product to determine angles
    const dotProduct = dx1 * dx2 + dy1 * dy2;
    const mag1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const mag2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    
    if (mag1 > 0 && mag2 > 0) {
      const cosine = dotProduct / (mag1 * mag2);
      if (cosine < 0.9) { // Significant turn
        directionChanges++;
        score += 15;
      }
      if (cosine < -0.1) { // Sharp reverse/pivot
        score += 25;
      }
    }
  }

  let label: 'Simple' | 'Moderate' | 'Complex' | 'Expert' = 'Simple';
  if (score >= 80) label = 'Expert';
  else if (score >= 50) label = 'Complex';
  else if (score >= 30) label = 'Moderate';
  
  return { score, label };
}

/**
 * Exports patterns to JSON file.
 */
export function triggerDownloadJSON(patterns: Pattern[]) {
  const jsonString = JSON.stringify(patterns, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `pattern_lock_history_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
