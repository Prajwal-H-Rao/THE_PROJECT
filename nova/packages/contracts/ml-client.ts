/** ML Service Client - Client for the ML service (embeddings, classification, skill extraction). */

import { EmbeddingRequest, EmbeddingResponse } from "./ml.js";
import { ClassificationRequest, ClassificationResponse } from "./ml.js";
import { SkillExtractionRequest, SkillExtractionResponse } from "./ml.js";

/** Configuration for the ML service client. */
export interface MLServiceClientConfig {
  /** Base URL of the ML service. */
  baseUrl: string;
  /** Service JWT for authentication. */
  serviceJWT: string;
  /** Audience for the service token. */
  audience: string;
  /** Request timeout in milliseconds. */
  timeout?: number;
}

/** ML Service Client for calling embeddings, classification, and skill extraction. */
export class MLServiceClient {
  private config: MLServiceClientConfig;
  
  constructor(config: MLServiceClientConfig) {
    this.config = {
      timeout: 60000, // 60 seconds for ML operations
      ...config,
    };
  }
  
  /** Generate embeddings for texts. */
  async embed(texts: string[], model: string = "all-MiniLM-L6-v2"): Promise<number[][]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.serviceJWT}`,
        },
        body: JSON.stringify({
          texts: texts,
          model: model,
          normalize: true,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Embedding failed: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json();
      return data.embeddings;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        throw new Error("Embedding request timed out");
      }
      throw e;
    }
  }
  
  /** Classify text (zero-shot or standard). */
  async classify(text: string, labels?: string[], model: string = "distilbert-base-uncased"): Promise<{ label: string; score: number }[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/classify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.serviceJWT}`,
        },
        body: JSON.stringify({
          text,
          model,
          labels,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Classification failed: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json();
      return data.classifications;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        throw new Error("Classification request timed out");
      }
      throw e;
    }
  }
  
  /** Extract skills from text. */
  async extractSkills(text: string, model: string = "skill-extractor-v1"): Promise<{ skill: string; category: string | null; confidence: number; source_span?: { char_start: number; char_end: number } }[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/skills/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.serviceJWT}`,
        },
        body: JSON.stringify({
          text,
          model,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Skill extraction failed: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json();
      return data.skills;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        throw new Error("Skill extraction request timed out");
      }
      throw e;
    }
  }
}

/** Create an ML service client from environment variables. */
export function createMLServiceClientFromEnv(): MLServiceClient {
  return new MLServiceClient({
    baseUrl: process.env.NOVA_ML_SERVICE_URL || "http://ml-service:8080",
    serviceJWT: process.env.NOVA_SERVICE_JWT!,
    audience: process.env.NOVA_SERVICE_TOKEN_AUDIENCE || "nova-ml",
    timeout: parseInt(process.env.NOVA_ML_TIMEOUT || "60000", 10)
  })
}