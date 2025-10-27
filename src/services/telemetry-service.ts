import { PostHog } from "posthog-node";
import * as core from '@actions/core';
import { performance } from "perf_hooks";

export class TelemetryService {
  private static instance: TelemetryService;
  private client: PostHog;

  private constructor() {
    // Initialize PostHog with your project API key
    try {
      const postHogApiKey = core.getInput('telemetry-api-key', { required: false });
      
      // If no API key is provided, create a dummy client
      if (!postHogApiKey) {
        console.log("Telemetry disabled - no API key provided");
        this.client = {
          capture: () => Promise.resolve(),
          shutdown: () => Promise.resolve(),
          flush: () => Promise.resolve(),
        } as unknown as PostHog;
        return;
      }
      
      this.client = new PostHog(
        postHogApiKey,
        {
          host: core.getInput('telemetry-api-host') || "https://eu.i.posthog.com",
          flushAt: 1, // Immediately send events in development
          flushInterval: 0, // Disable automatic flushing
        },
      );

      // Ensure cleanup on process exit
      process.on("SIGTERM", () => {
        this.client
          .shutdown()
          .catch((error) =>
            console.error("Error shutting down PostHog client:", error),
          );
      });

      console.log("Telemetry (PostHog) initialized");
    } catch (error) {
      console.error("Failed to initialize PostHog:", error);
      // Create a dummy client that does nothing to prevent crashes
      this.client = {
        capture: () => Promise.resolve(),
        shutdown: () => Promise.resolve(),
      } as unknown as PostHog;
    }
  }

  public static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  private captureEvent(eventName: string, properties: Record<string, unknown>) {
    try {
      this.client.capture({
        distinctId: "system",
        event: eventName,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || "development",
        },
      });
    } catch (error) {
      console.error(`Failed to capture event ${eventName}:`, error);
    }
  }

  logAPICall(
    endpoint: string,
    method: string,
    params?: Record<string, unknown>,
  ): void {
    this.captureEvent("api_call", {
      endpoint,
      method,
      params: params || {},
      category: "api",
    });
  }

  logAPIResponse(
    endpoint: string,
    status: number,
    duration: number,
    response?: unknown,
  ): void {
    this.captureEvent("api_response", {
      endpoint,
      status,
      duration_ms: duration,
      response: response || {},
      category: "api",
    });
  }

  logError(error: Error, context?: Record<string, unknown>): void {
    this.captureEvent("error", {
      error_message: error.message,
      error_stack: error.stack || "",
      context: context || {},
      category: "error",
    });
  }

  logAIOperation(
    operation: string,
    model: string,
    input: unknown,
    duration: number,
    success: boolean,
  ): void {
    this.captureEvent("ai_operation", {
      operation,
      model,
      input,
      duration_ms: duration,
      success,
      category: "ai",
    });
  }

  logPerformanceMetric(
    metric: string,
    value: number,
    tags?: Record<string, string>,
  ): void {
    this.captureEvent("performance_metric", {
      metric_name: metric,
      value,
      tags: tags || {},
      category: "performance",
    });
  }

  startTimer(operationName: string): () => void {
    const start = performance.now();
    const operationId = Math.random().toString(36).substring(7);

    this.captureEvent("operation_start", {
      operation: operationName,
      operation_id: operationId,
      category: "performance",
    });

    return () => {
      const duration = performance.now() - start;
      this.captureEvent("operation_end", {
        operation: operationName,
        operation_id: operationId,
        duration_ms: duration,
        category: "performance",
      });
      this.logPerformanceMetric(operationName, duration);
    };
  }

  // Method to flush events manually if needed
  async flush(): Promise<void> {
    try {
      await this.client.flush();
    } catch (error) {
      console.error("Failed to flush events:", error);
    }
  }
}

export const telemetry = TelemetryService.getInstance();
