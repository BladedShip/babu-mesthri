import { initLlama, LlamaContext } from 'llama.rn';
import { ModelManager, AVAILABLE_MODELS } from './ModelManager';
import { AppTools } from './ToolRegistry';
import { ToolConsentService } from './ToolConsentService';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string; // used for tool responses
  isError?: boolean; // marks messages that are error notices
  isToolAction?: boolean; // marks messages that describe a tool being executed
}

// Maximum number of recursive tool calls before forcing a text response
const MAX_TOOL_DEPTH = 3;

// Timeout for individual tool execution (ms)
const TOOL_EXECUTION_TIMEOUT_MS = 10000;

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
    if (!modelConfig) throw new Error(`Model "${modelId}" not found in the available models registry.`);

    const isDownloaded = await ModelManager.isModelDownloaded(modelConfig.filename);
    if (!isDownloaded) {
      throw new Error('Model file not found on disk. Please download it from the Models tab first.');
    }

    const path = ModelManager.getModelPath(modelConfig.filename);

    try {
      this.context = await initLlama({
        model: path,
        use_mlock: true,
        n_ctx: 2048,
        n_gpu_layers: 99, // Offload as much as possible to Metal/Vulkan
      });
      this.currentModelId = modelId;
    } catch (e: any) {
      this.context = null;
      this.currentModelId = null;
      throw new Error(`Failed to initialize model: ${e.message || 'Unknown error'}`);
    }
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
      // Skip error/status messages from being fed to the LLM
      if (msg.isError || msg.isToolAction) continue;

      if (msg.role === 'tool') {
        prompt += `<|im_start|>tool (${msg.name})\n${msg.content}<|im_end|>\n`;
      } else {
        prompt += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`;
      }
    }
    prompt += `<|im_start|>assistant\n`;
    return prompt;
  }

  /**
   * Execute a tool with a timeout guard.
   */
  private async executeToolWithTimeout(toolName: string, params: Record<string, any>): Promise<string> {
    const tool = AppTools[toolName];
    if (!tool) {
      return JSON.stringify({ error: `Unknown tool "${toolName}". Available tools: ${Object.keys(AppTools).join(', ')}` });
    }

    // Request user consent before execution
    const decision = await ToolConsentService.requestConsent(toolName, params);
    
    if (decision === 'deny') {
      return JSON.stringify({ 
        error: `User denied permission to execute tool "${toolName}". Inform the user that the action was blocked by their choice.` 
      });
    }

    return Promise.race([
      tool.execute(params || {}),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error(`Tool "${toolName}" timed out after ${TOOL_EXECUTION_TIMEOUT_MS / 1000}s`)), TOOL_EXECUTION_TIMEOUT_MS)
      ),
    ]);
  }

  async runChatTurn(
    messages: ChatMessage[],
    onToken?: (token: string) => void,
    onToolAction?: (toolName: string) => void,
    _depth: number = 0
  ): Promise<ChatMessage[]> {
    if (!this.context) throw new Error('No model loaded. Please select and load a model first.');

    // Recursion guard: prevent infinite tool-call loops
    if (_depth >= MAX_TOOL_DEPTH) {
      messages.push({
        role: 'assistant',
        content: 'I attempted to use tools multiple times but could not resolve your request. Please try rephrasing your question.',
        isError: true,
      });
      return messages;
    }

    const promptString = this.formatPrompt(messages);

    const result = await this.context.completion(
      {
        prompt: promptString,
        n_predict: 512,
        stop: ['<|im_end|>', '<|im_start|>'],
        temperature: 0.1, // low temperature for better tool calling
      },
      (data) => {
        if (onToken) onToken(data.token);
      }
    );

    const text = result.text.trim();

    // Check if it's a tool call request
    if (text.startsWith('```json') && text.includes('"tool":')) {
      let parsed: any;
      try {
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(jsonStr);
      } catch (parseError: any) {
        // JSON parse failed — append error and return
        messages.push({ role: 'assistant', content: text }); // record the raw attempt
        messages.push({
          role: 'assistant',
          content: `I tried to call a tool but generated invalid JSON. Let me try to answer directly instead.\n\nParse error: ${parseError.message}`,
          isError: true,
        });
        return messages;
      }

      if (parsed.tool) {
        // Append assistant's tool intent (hidden from UI by the filter)
        messages.push({ role: 'assistant', content: text });

        // Notify UI which tool is being executed
        if (onToolAction) onToolAction(parsed.tool);

        // Execute the tool with error handling and timeout
        let toolResult: string;
        try {
          toolResult = await this.executeToolWithTimeout(parsed.tool, parsed.parameters);
        } catch (execError: any) {
          toolResult = JSON.stringify({ error: `Tool execution failed: ${execError.message}` });
        }

        // Append tool response
        messages.push({ role: 'tool', name: parsed.tool, content: toolResult });

        // Run the loop again to get natural language answer (with depth tracking)
        return this.runChatTurn(messages, onToken, onToolAction, _depth + 1);
      }
    }

    // Default: normal text response
    messages.push({ role: 'assistant', content: text });
    return messages;
  }

  isLoaded(): boolean {
    return this.context !== null && this.currentModelId !== null;
  }

  getLoadedModelId(): string | null {
    return this.currentModelId;
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
