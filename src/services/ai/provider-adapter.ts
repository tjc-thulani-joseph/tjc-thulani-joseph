/**
 * TJC AI Provider Adapter Contract
 *
 * Every AI provider must communicate with TJC AI through this interface.
 *
 * Provider-specific SDKs, HTTP requests, authentication, request mapping,
 * response mapping, retries, and provider quirks belong inside the adapter.
 *
 * TJC OS must never depend directly on those provider implementations.
 */

import type {
  AICapability,
  AIModelDescriptor,
  AIRequest,
  AIResponse,
  AIResult,
  AIProviderId,
} from "./types";

/**
 * Provider runtime health information.
 */
export interface AIProviderHealth {
  available: boolean;
  message: string | null;
}

/**
 * Every provider adapter must implement this contract.
 */
export interface AIProviderAdapter {
  /**
   * Stable TJC provider identifier.
   */
  readonly providerId: AIProviderId;

  /**
   * Human-readable provider name.
   */
  readonly label: string;

  /**
   * Capabilities supported by this adapter.
   *
   * Individual models may support fewer capabilities.
   */
  readonly capabilities: AICapability[];

  /**
   * Generate a provider-neutral AI response.
   */
  generate(request: AIRequest): Promise<AIResult<AIResponse>>;

  /**
   * Return models currently available to TJC through this adapter.
   *
   * The implementation may eventually obtain this dynamically
   * from the provider.
   */
  listModels(): Promise<AIResult<AIModelDescriptor[]>>;

  /**
   * Check whether the adapter can currently communicate
   * with its provider.
   */
  health(): Promise<AIResult<AIProviderHealth>>;
}
