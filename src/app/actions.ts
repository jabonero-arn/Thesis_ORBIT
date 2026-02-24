"use server"

import {
  aiEquipmentSuggestion,
  AiEquipmentSuggestionInput,
} from "@/ai/flows/ai-equipment-suggestion-flow"

export type FormState = {
  suggestions: string[] | null
  error: string | null
}

export async function getAiSuggestions(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const projectDescription = formData.get("projectDescription") as string

  if (!projectDescription || projectDescription.trim().length < 10) {
    return {
      suggestions: null,
      error: "Please provide a more detailed project description.",
    }
  }

  try {
    const input: AiEquipmentSuggestionInput = { projectDescription }
    const result = await aiEquipmentSuggestion(input)
    if (result.suggestions && result.suggestions.length > 0) {
      return { suggestions: result.suggestions, error: null }
    }
    return {
      suggestions: null,
      error: "The AI could not find any suggestions. Please refine your description.",
    }
  } catch (e) {
    console.error(e)
    return {
      suggestions: null,
      error: "An unexpected error occurred. Please try again later.",
    }
  }
}
