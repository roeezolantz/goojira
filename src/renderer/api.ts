import type { PreloadApi } from '@shared/types';

declare global {
  interface Window {
    api: PreloadApi;
  }
}

export const api: PreloadApi = window.api;
