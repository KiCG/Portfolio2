declare module 'troika-three-text' {
  import { Mesh } from 'three';

  export class Text extends Mesh {
    text: string;
    fontSize: number;
    color: string | number;
    anchorX: 'left' | 'center' | 'right' | number;
    anchorY: 'top' | 'top-baseline' | 'middle' | 'bottom-baseline' | 'bottom' | number;
    letterSpacing: number;
    font?: string;
    maxWidth?: number;
    textAlign?: 'left' | 'right' | 'center' | 'justify';
    sync(callback?: () => void): void;
    dispose(): void;
  }
}
