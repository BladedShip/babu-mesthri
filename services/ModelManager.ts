import { getInfoAsync, makeDirectoryAsync, deleteAsync, createDownloadResumable, documentDirectory } from 'expo-file-system/legacy';
import { useAppStore } from '../store/appStore';

export interface ModelDownloadProgress {
  totalBytesWritten: number;
  totalBytesExpectedToWrite: number;
  jobId: number | null;
}

export interface ModelConfig {
  id: string;
  name: string;
  downloadUrl: string;
  filename: string;
  sizeMB: number;
}

// These are models documented in our architecture that we officially support in the app.
export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'Qwen3-0.5B',
    name: 'Qwen 2.5 0.5B (Edge)',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
    filename: 'qwen3-0.5b-q4.gguf',
    sizeMB: 398
  },
  {
    id: 'Llama-3.2-1B-Instruct',
    name: 'Llama 3.2 1B Instruct',
    downloadUrl: 'https://huggingface.co/hugging-quants/Llama-3.2-1B-Instruct-Q4_K_M-GGUF/resolve/main/llama-3.2-1b-instruct-q4_k_m.gguf',
    filename: 'llama-3.2-1b-instruct-q4_k_m.gguf',
    sizeMB: 790
  }
];

class ModelManagerService {
  private activeDownloads: Record<string, ReturnType<typeof createDownloadResumable>> = {};

  getModelsDirectory() {
    return `${documentDirectory}models/`;
  }

  async initDirectory() {
    const dir = this.getModelsDirectory();
    const info = await getInfoAsync(dir);
    if (!info.exists) {
      await makeDirectoryAsync(dir, { intermediates: true });
    }
  }

  getModelPath(filename: string) {
    return `${this.getModelsDirectory()}${filename}`;
  }

  async isModelDownloaded(filename: string): Promise<boolean> {
    const path = this.getModelPath(filename);
    const info = await getInfoAsync(path);
    return info.exists;
  }

  async getDownloadedSize(filename: string): Promise<number> {
    const path = this.getModelPath(filename);
    const info = await getInfoAsync(path);
    if (info.exists && !info.isDirectory) {
      return info.size;
    }
    return 0;
  }

  async startDownload(modelId: string, onProgress: (progress: number) => void) {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!model) throw new Error('Model configuration not found.');

    await this.initDirectory();
    const destPath = this.getModelPath(model.filename);

    const downloadResumable = createDownloadResumable(
      model.downloadUrl,
      destPath,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        onProgress(progress);
      }
    );

    this.activeDownloads[modelId] = downloadResumable;

    try {
      const result = await downloadResumable.downloadAsync();
      delete this.activeDownloads[modelId];
      return result;
    } catch (e) {
      console.error('Download error:', e);
      delete this.activeDownloads[modelId];
      throw e;
    }
  }

  async pauseDownload(modelId: string) {
    const download = this.activeDownloads[modelId];
    if (download) {
      await download.pauseAsync();
    }
  }

  async resumeDownload(modelId: string) {
    const download = this.activeDownloads[modelId];
    if (download) {
      await download.resumeAsync();
    }
  }

  async deleteModel(filename: string) {
    const path = this.getModelPath(filename);
    const info = await getInfoAsync(path);
    if (info.exists) {
      await deleteAsync(path);
    }
  }
}

export const ModelManager = new ModelManagerService();
