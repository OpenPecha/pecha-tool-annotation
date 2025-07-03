import { apiClient } from "./utils";
import type {
  TextResponse,
  TextCreate,
  TextUpdate,
  TextFilters,
  TextWithAnnotations,
  TextStats,
  SearchParams,
  TextStatus,
} from "./types";

// Text API client
export const textApi = {
  // Get all texts with optional filtering
  getTexts: async (filters: TextFilters = {}): Promise<TextResponse[]> => {
    return apiClient.get<TextResponse[]>("/texts", filters);
  },

  // Get single text by ID
  getText: async (id: number): Promise<TextResponse> => {
    return apiClient.get<TextResponse>(`/texts/${id}`);
  },

  // Get text with annotations
  getTextWithAnnotations: async (id: number): Promise<TextWithAnnotations> => {
    return apiClient.get<TextWithAnnotations>(`/texts/${id}/with-annotations`);
  },

  // Create new text
  createText: async (data: TextCreate): Promise<TextResponse> => {
    return apiClient.post<TextResponse>("/texts", data);
  },

  // Update text
  updateText: async (id: number, data: TextUpdate): Promise<TextResponse> => {
    return apiClient.put<TextResponse>(`/texts/${id}`, data);
  },

  // Update text status
  updateTextStatus: async (
    id: number,
    status: TextStatus
  ): Promise<TextResponse> => {
    return apiClient.put<TextResponse>(`/texts/${id}/status`, status);
  },

  // Delete text
  deleteText: async (id: number): Promise<void> => {
    return apiClient.delete<void>(`/texts/${id}`);
  },

  // Get texts for annotation (status: initialized)
  getTextsForAnnotation: async (
    filters: { skip?: number; limit?: number } = {}
  ): Promise<TextResponse[]> => {
    return apiClient.get<TextResponse[]>("/texts/for-annotation", filters);
  },

  // Get texts for review (status: annotated)
  getTextsForReview: async (
    filters: { skip?: number; limit?: number } = {}
  ): Promise<TextResponse[]> => {
    return apiClient.get<TextResponse[]>("/texts/for-review", filters);
  },

  // Search texts
  searchTexts: async (params: SearchParams): Promise<TextResponse[]> => {
    return apiClient.get<TextResponse[]>("/texts/search", params);
  },

  // Get text statistics
  getTextStats: async (): Promise<TextStats> => {
    return apiClient.get<TextStats>("/texts/stats");
  },
};
