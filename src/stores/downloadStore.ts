import { create } from 'zustand';
import { downloadManager, type EnqueueRequest } from '../services/downloads';
import type { QueueItem } from '../services/downloadMachine';

interface DownloadState {
  items: QueueItem[];
  enqueue: (req: EnqueueRequest) => void;
  cancel: (videoId: string) => void;
  retry: (videoId: string) => void;
}

export const useDownloadStore = create<DownloadState>((set) => {
  downloadManager.subscribe((items) => set({ items }));
  return {
    items: [],
    enqueue: (req) => downloadManager.enqueue(req),
    cancel: (videoId) => downloadManager.cancel(videoId),
    retry: (videoId) => downloadManager.retry(videoId),
  };
});
