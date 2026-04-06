import { initLlama, LlamaContext } from 'llama.rn';
import { ModelManager, AVAILABLE_MODELS } from './ModelManager';
import { AppTools } from './ToolRegistry';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string; // used for tool responses
}

class InferenceEngine {
  private context: LlamaContext | null = null;
  private currentModelId: string | null = null;

  async loadModel(modelId: string, progressCallback?: (progress: number) => void) {
    if (this.currentModelId === modelId && this.context) {
      return; // already loaded
    }

    if (this.context) {
      await this.context.release();
      this.context = null;
    }

    const modelConfig = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!modelConfig) throw new Error('Model config not found');

    const isDownloaded = await ModelManager.isModelDownloaded(modelConfig.filename);
    if (!isDownloaded) {
      throw new Error('Model is not downloaded yet.');
    }

    const path = ModelManager.getModelPath(modelConfig.filename);

    this.context = await initLlama({
      model: path,
      use_mlock: true,
      n_ctx: 2048,
      n_gpu_layers: 99, // Offload as much as possible to Metal/Vulkan
    });
    this.currentModelId = modelId;
  }

  private buildSystemPrompt(): string {
    const toolsDocs = Object.values(AppTools)
      .map(tool => `- ${tool.name}: ${tool.description} \nParameters: ${JSON.stringify(tool.parameters)}`)
      .join('\n\n');

    const today = new Date();

    return `You are Babu Mesthri, a private offline AI assistant.

Current Date & Time: ${today.toString()}

Available Tools:
${toolsDocs}

CRITICAL RULES FOR TOOLS:
1. If the user asks you to do something that requires a tool (like checking the calendar or finding contacts), YOU MUST CALL THE TOOL IMMEDIATELY.
2. NEVER ask the user for missing parameters like dates, names, or permissions. If you need a parameter, GUESS it based on the current date or leave it blank "".
3. TO CALL A TOOL, output EXACTLY the following JSON format and absolutely no other text:
\`\`\`json
{
  "tool": "tool_name",
  "parameters": { "param_name": "value" }
}
\`\`\`
4. If the user just says "hello" or asks a general knowledge question, respond normally in plain text.`;
  }

  private formatPrompt(messages: ChatMessage[]): string {
    // Basic ChatML formatting fallback. In production, we'd use Jinja template from GGUF metadata or specific prompt templates.
    let prompt = `<|im_start|>system\n${this.buildSystemPrompt()}<|im_end|>\n`;
    for (const msg of messages) {
      if (msg.role === 'tool') {
        prompt += `<|im_start|>tool (${msg.name})\n${msg.content}<|im_end|>\n`;
      } else {
        prompt += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`;
      }
    }
    prompt += `<|im_start|>assistant\n`;
    return prompt;
  }

  async runChatTurn(messages: ChatMessage[], onToken?: (token: string) => void): Promise<ChatMessage[]> {
    if (!this.context) throw new Error('Model not loaded');

    const promptString = this.formatPrompt(messages);

    let generatedText = '';

    const result = await this.context.completion(
      {
        prompt: promptString,
        n_predict: 512,
        stop: ['<|im_end|>', '<|im_start|>'],
        temperature: 0.1, // low temperature for better tool calling
      },
      (data) => {
        generatedText += data.token;
        if (onToken) onToken(data.token);
      }
    );

    const text = result.text.trim();

    // Check if it's a tool call request
    if (text.startsWith('```json') && text.includes('"tool":')) {
      try {
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);

        if (parsed.tool && AppTools[parsed.tool]) {
          // Append assistant tool intent
          messages.push({ role: 'assistant', content: text });

          // Execute the tool
          const toolResult = await AppTools[parsed.tool].execute(parsed.parameters || {});

          // Append tool response
          messages.push({ role: 'tool', name: parsed.tool, content: toolResult });

          // Run the loop again to get natural language answer
          return this.runChatTurn(messages, onToken);
        }
      } catch (e) {
        console.warn('Failed to parse purported tool block', text, e);
      }
    }

    // Default response
    messages.push({ role: 'assistant', content: text });
    return messages;
  }

  async unload() {
    if (this.context) {
      await this.context.release();
      this.context = null;
      this.currentModelId = null;
    }
  }
}

export const InferenceService = new InferenceEngine();
