import { useAppStore, ToolConsentDecision } from '../store/appStore';

/**
 * ToolConsentService
 * 
 * Intercepts tool execution to prompt the user for consent before any tool runs.
 * - If the tool is in the "always allowed" list, resolves immediately.
 * - Otherwise, sets a pending consent in the Zustand store, which triggers
 *   the ToolConsentModal in the UI.
 * - Returns the user's decision: 'allow_once', 'allow_always', or 'deny'.
 */
class ToolConsentEngine {
  /**
   * Request user consent before executing a tool.
   * Returns a promise that resolves with the user's decision.
   */
  async requestConsent(toolName: string, params: Record<string, any>): Promise<ToolConsentDecision> {
    const store = useAppStore.getState();

    // Fast path: tool is permanently allowed
    if (store.toolAlwaysAllowed.includes(toolName)) {
      return 'allow_once'; // treat as allowed, no modal needed
    }

    // Slow path: show the consent modal and wait for user decision
    return new Promise<ToolConsentDecision>((resolve) => {
      store.setPendingToolConsent({
        toolName,
        params,
        resolve: (decision: ToolConsentDecision) => {
          // If user chose "allow always", persist the preference
          if (decision === 'allow_always') {
            useAppStore.getState().addAlwaysAllowedTool(toolName);
          }

          // Clear the pending consent
          useAppStore.getState().setPendingToolConsent(null);

          // Resolve the promise with the decision
          resolve(decision);
        },
      });
    });
  }
}

export const ToolConsentService = new ToolConsentEngine();
