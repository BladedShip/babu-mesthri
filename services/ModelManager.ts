import { createDownloadResumable, deleteAsync, documentDirectory, getInfoAsync, makeDirectoryAsync } from 'expo-file-system/legacy';

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
  sizeMB?: number;
  approxSize: string;
  memoryReq: string;
}

// These are models documented in our architecture that we officially support in the app.
export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'Llama-3.2-1B-Instruct',
    name: 'Llama 3.2 1B Instruct',
    downloadUrl: 'https://huggingface.co/unsloth/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf?download=true',
    filename: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    approxSize: '0.8 GB',
    memoryReq: '~1.2 GB'
  },
  {
    id: 'DeepSeek-R1-Distill-Qwen-1.5B',
    name: 'DeepSeek-R1-Distill-Qwen 1.5B',
    downloadUrl: 'https://huggingface.co/bartowski/DeepSeek-R1-Distill-Qwen-1.5B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf?download=true',
    filename: 'DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf',
    approxSize: '1.1 GB',
    memoryReq: '~1.5 GB'
  },
  {
    id: 'Qwen3-1.7B-Instruct',
    name: 'Qwen3 1.7B Instruct',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen3-1.7B-Instruct-GGUF/resolve/main/qwen3-1.7b-instruct-q4_k_m.gguf?download=true',
    filename: 'qwen3-1.7b-instruct-q4_k_m.gguf',
    approxSize: '1.2 GB',
    memoryReq: '~1.6 GB'
  },
  {
    id: 'Gemma-4-E2B-Instruct',
    name: 'Gemma 4 E2B Instruct',
    downloadUrl: 'https://huggingface.co/bartowski/gemma-4-e2b-it-GGUF/resolve/main/gemma-4-e2b-it-Q4_K_M.gguf?download=true',
    filename: 'gemma-4-e2b-it-Q4_K_M.gguf',
    approxSize: '1.4 GB',
    memoryReq: '~1.8 GB'
  },
  {
    id: 'Llama-3.2-3B-Instruct',
    name: 'Llama 3.2 3B Instruct',
    downloadUrl: 'https://huggingface.co/unsloth/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf?download=true',
    filename: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    approxSize: '1.9 GB',
    memoryReq: '~2.2 GB'
  },
  {
    id: 'Qwen-2.5-3B-Instruct',
    name: 'Qwen 2.5 3B Instruct',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf?download=true',
    filename: 'qwen2.5-3b-instruct-q4_k_m.gguf',
    approxSize: '1.9 GB',
    memoryReq: '~2.4 GB'
  },
  {
    id: 'Phi-3.5-mini-Instruct',
    name: 'Phi-3.5 Mini Instruct (3.8B)',
    downloadUrl: 'https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf?download=true',
    filename: 'Phi-3.5-mini-instruct-Q4_K_M.gguf',
    approxSize: '2.3 GB',
    memoryReq: '~2.6 GB'
  },
  {
    id: 'Phi-4-mini-Instruct',
    name: 'Phi-4 Mini Instruct (3.8B)',
    downloadUrl: 'https://huggingface.co/Mungert/Phi-4-mini-instruct.gguf/resolve/main/phi-4-mini-q4_k_m.gguf?download=true',
    filename: 'phi-4-mini-q4_k_m.gguf',
    approxSize: '2.3 GB',
    memoryReq: '~2.8 GB'
  },
  {
    id: 'Gemma-4-E4B-Instruct',
    name: 'Gemma 4 E4B Instruct',
    downloadUrl: 'https://huggingface.co/bartowski/gemma-4-e4b-it-GGUF/resolve/main/gemma-4-e4b-it-Q4_K_M.gguf?download=true',
    filename: 'gemma-4-e4b-it-Q4_K_M.gguf',
    approxSize: '2.6 GB',
    memoryReq: '~3.0 GB'
  },
  {
    id: 'Qwen2.5-VL-7B-Instruct',
    name: 'Qwen2.5-VL 7B Instruct',
    downloadUrl: 'https://huggingface.co/bartowski/Qwen2.5-VL-7B-Instruct-GGUF/resolve/main/qwen2.5-vl-7b-instruct-q4_k_m.gguf?download=true',
    filename: 'qwen2.5-vl-7b-instruct-q4_k_m.gguf',
    approxSize: '4.3 GB',
    memoryReq: '~4.8 GB'
  },
  {
    id: 'Qwen-2.5-7B-Instruct',
    name: 'Qwen 2.5 7B Instruct',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m.gguf?download=true',
    filename: 'qwen2.5-7b-instruct-q4_k_m.gguf',
    approxSize: '4.3 GB',
    memoryReq: '~4.8 GB'
  },
  {
    id: 'DeepSeek-R1-Distill-Llama-8B',
    name: 'DeepSeek-R1-Distill-Llama 8B',
    downloadUrl: 'https://huggingface.co/unsloth/DeepSeek-R1-Distill-Llama-8B-GGUF/resolve/main/DeepSeek-R1-Distill-Llama-8B-Q4_K_M.gguf?download=true',
    filename: 'DeepSeek-R1-Distill-Llama-8B-Q4_K_M.gguf',
    approxSize: '4.7 GB',
    memoryReq: '~5.2 GB'
  },
  {
    id: 'Llama-3.1-8B-Instruct',
    name: 'Llama 3.1 8B Instruct',
    downloadUrl: 'https://huggingface.co/unsloth/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf?download=true',
    filename: 'Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf',
    approxSize: '4.7 GB',
    memoryReq: '~5.2 GB'
  },
  {
    id: 'Qwen3-8B-Instruct',
    name: 'Qwen3 8B Instruct',
    downloadUrl: 'https://huggingface.co/bartowski/Qwen3-8B-Instruct-GGUF/resolve/main/qwen3-8b-instruct-q4_k_m.gguf?download=true',
    filename: 'qwen3-8b-instruct-q4_k_m.gguf',
    approxSize: '4.8 GB',
    memoryReq: '~5.3 GB'
  },
  {
    id: 'Gemma-2-9B-Instruct',
    name: 'Gemma 2 9B Instruct',
    downloadUrl: 'https://huggingface.co/bartowski/gemma-2-9b-it-GGUF/resolve/main/gemma-2-9b-it-Q4_K_M.gguf?download=true',
    filename: 'gemma-2-9b-it-Q4_K_M.gguf',
    approxSize: '5.4 GB',
    memoryReq: '~6.0 GB'
  },
  {
    id: 'Mistral-NeMo-12B-Instruct',
    name: 'Mistral NeMo 12B Instruct',
    downloadUrl: 'https://huggingface.co/bartowski/Mistral-Nemo-Instruct-2407-GGUF/resolve/main/Mistral-Nemo-Instruct-2407-Q4_K_M.gguf?download=true',
    filename: 'Mistral-Nemo-Instruct-2407-Q4_K_M.gguf',
    approxSize: '7.1 GB',
    memoryReq: '~8.0 GB'
  },
  {
    id: 'Phi-4-Instruct-14B',
    name: 'Phi-4 Instruct (14B)',
    downloadUrl: 'https://huggingface.co/bartowski/phi-4-GGUF/resolve/main/phi-4-Q4_K_M.gguf?download=true',
    filename: 'phi-4-Q4_K_M.gguf',
    approxSize: '8.5 GB',
    memoryReq: '~9.5 GB'
  },
  {
    id: 'Qwen-2.5-14B-Instruct',
    name: 'Qwen 2.5 14B Instruct',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-14B-Instruct-GGUF/resolve/main/qwen2.5-14b-instruct-q4_k_m.gguf?download=true',
    filename: 'qwen2.5-14b-instruct-q4_k_m.gguf',
    approxSize: '8.5 GB',
    memoryReq: '~9.5 GB'
  },
  {
    id: 'DeepSeek-R1-Distill-Qwen-14B',
    name: 'DeepSeek-R1-Distill-Qwen 14B',
    downloadUrl: 'https://huggingface.co/bartowski/DeepSeek-R1-Distill-Qwen-14B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-14B-Q4_K_M.gguf?download=true',
    filename: 'DeepSeek-R1-Distill-Qwen-14B-Q4_K_M.gguf',
    approxSize: '8.5 GB',
    memoryReq: '~9.5 GB'
  },
  {
    id: 'DeepSeek-Coder-V2-Lite',
    name: 'DeepSeek Coder V2 Lite (16B)',
    downloadUrl: 'https://huggingface.co/bartowski/DeepSeek-Coder-V2-Lite-Base-GGUF/resolve/main/DeepSeek-Coder-V2-Lite-Base-Q4_K_M.gguf?download=true',
    filename: 'DeepSeek-Coder-V2-Lite-Base-Q4_K_M.gguf',
    approxSize: '9.1 GB',
    memoryReq: '~10.0 GB'
  },
  {
    id: 'Llama-4-Scout-Instruct',
    name: 'Llama 4 Scout Instruct (17B)',
    downloadUrl: 'https://huggingface.co/bartowski/Llama-4-Scout-Instruct-GGUF/resolve/main/Llama-4-Scout-Instruct-Q4_K_M.gguf?download=true',
    filename: 'Llama-4-Scout-Instruct-Q4_K_M.gguf',
    approxSize: '9.8 GB',
    memoryReq: '~10.8 GB'
  },
  {
    id: 'Gemma-4-26B-A4B',
    name: 'Gemma 4 26B-A4B MoE',
    downloadUrl: 'https://huggingface.co/bartowski/google_gemma-4-26B-A4B-it-GGUF/resolve/main/google_gemma-4-26B-A4B-it-Q4_K_M.gguf?download=true',
    filename: 'gemma-4-26B-A4B-it-Q4_K_M.gguf',
    approxSize: '14.5 GB',
    memoryReq: '~15.5 GB'
  },
  {
    id: 'Qwen-2.5-32B-Instruct',
    name: 'Qwen 2.5 32B Instruct (3-Bit)',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-32B-Instruct-GGUF/resolve/main/qwen2.5-32b-instruct-q3_k_m.gguf?download=true',
    filename: 'qwen2.5-32b-instruct-q3_k_m.gguf',
    approxSize: '14.5 GB',
    memoryReq: '~15.8 GB'
  },
  {
    id: 'DeepSeek-R1-Distill-Qwen-32B',
    name: 'DeepSeek-R1-Distill-Qwen 32B',
    downloadUrl: 'https://huggingface.co/bartowski/DeepSeek-R1-Distill-Qwen-32B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-32B-Q3_K_M.gguf?download=true',
    filename: 'DeepSeek-R1-Distill-Qwen-32B-Q3_K_M.gguf',
    approxSize: '14.8 GB',
    memoryReq: '~16.0 GB'
  },
  {
    id: 'Command-R-v01-35B',
    name: 'Command R v01 (35B) (3-Bit)',
    downloadUrl: 'https://huggingface.co/pmysl/c4ai-command-r-v01-GGUF/resolve/main/c4ai-command-r-v01-Q3_K_M.gguf?download=true',
    filename: 'c4ai-command-r-v01-Q3_K_M.gguf',
    approxSize: '15.2 GB',
    memoryReq: '~16.2 GB'
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
