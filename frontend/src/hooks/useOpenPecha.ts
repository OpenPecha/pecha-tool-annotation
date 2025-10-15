import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { openPechaApi } from "@/api/openpecha";
import { textApi } from "@/api/text";
import { queryKeys } from "@/constants/queryKeys";
import type {
  OpenPechaText,
  OpenPechaInstance,
  OpenPechaTextContent,
} from "@/api/openpecha";
import type { TextCreate } from "@/api/types";

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get all OpenPecha texts filtered by type (root, commentary, translations)
 */
export const useOpenPechaTexts = (type?: string) => {
  return useQuery<OpenPechaText[]>({
    queryKey: queryKeys.openPecha.texts(type),
    queryFn: () => openPechaApi.getTexts(type),
    staleTime: 1000 * 60 * 10, // 10 minutes - external data changes less frequently
  });
};

/**
 * Get instances/versions for a specific text ID
 */
export const useOpenPechaInstances = (textId: string, enabled = true) => {
  return useQuery<OpenPechaInstance[]>({
    queryKey: queryKeys.openPecha.instances(textId),
    queryFn: () => openPechaApi.getInstances(textId),
    enabled: enabled && !!textId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Get the actual text content with segmentation for an instance ID
 */
export const useOpenPechaContent = (instanceId: string, enabled = true) => {
  return useQuery<OpenPechaTextContent>({
    queryKey: queryKeys.openPecha.content(instanceId),
    queryFn: () => openPechaApi.getInstanceContent(instanceId),
    enabled: enabled && !!instanceId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Load OpenPecha text into the application
 * This combines fetching content and creating a new text in the system
 */
export const useLoadOpenPechaText = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      instanceId,
      title,
      language,
    }: {
      instanceId: string;
      title: string;
      language: string;
    }) => {
      // First, get the content
      const content = await openPechaApi.getInstanceContent(instanceId);
      
      // Then create a text with that content
      const textData: TextCreate = {
        title,
        content: content.base,
        language,
        source: `OpenPecha:${instanceId}`,
      };
      
      return textApi.createText(textData);
    },
    onSuccess: () => {
      // Invalidate texts list after loading new text
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.texts.forAnnotation });
    },
  });
};

