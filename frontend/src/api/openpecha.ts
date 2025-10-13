import { apiClient } from "./utils";

// ============================================================================
// OpenPecha API Types
// ============================================================================

export interface OpenPechaText {
  id: string;
  title: Record<string, string>; // e.g., { "sa": "bhagavatī prajñāpāramitā hṛdaya" }
  language: string;
}

export interface OpenPechaAnnotation {
  id: string;
  type: string;
  aligned_to: string | null;
}

export interface OpenPechaInstance {
  id: string;
  expression_id: string | null;
  annotation: OpenPechaAnnotation[];
  type: string;
}

export interface OpenPechaSegment {
  id: string;
  index: number;
  span: {
    start: number;
    end: number;
  };
}

export interface OpenPechaTextContent {
  annotations: {
    [key: string]: OpenPechaSegment[]; // key is the annotation type (e.g., "segmentation")
  };
  base: string;
}

// ============================================================================
// OpenPecha API Client
// ============================================================================

export const openPechaApi = {
  /**
   * Get all texts filtered by type (root, commentary, translations)
   */
  getTexts: async (type?: string): Promise<OpenPechaText[]> => {
    const params = type ? { type } : {};
    return apiClient.get<OpenPechaText[]>("/openpecha/texts", params);
  },

  /**
   * Get instances/versions for a specific text ID
   */
  getInstances: async (textId: string): Promise<OpenPechaInstance[]> => {
    return apiClient.get<OpenPechaInstance[]>(
      `/openpecha/texts/${textId}/instances`
    );
  },

  /**
   * Get the actual text content with segmentation for an instance ID
   */
  getInstanceContent: async (
    instanceId: string
  ): Promise<OpenPechaTextContent> => {
    return apiClient.get<OpenPechaTextContent>(
      `/openpecha/instances/${instanceId}`
    );
  },
};

