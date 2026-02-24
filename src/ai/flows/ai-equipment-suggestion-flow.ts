'use server';
/**
 * @fileOverview An AI agent that provides intelligent recommendations for lab equipment.
 *
 * - aiEquipmentSuggestion - A function that handles the equipment suggestion process.
 * - AiEquipmentSuggestionInput - The input type for the aiEquipmentSuggestion function.
 * - AiEquipmentSuggestionOutput - The return type for the aiEquipmentSuggestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiEquipmentSuggestionInputSchema = z.object({
  projectDescription: z
    .string()
    .describe(
      'A detailed description of the student\'s project or teacher\'s learning objectives.'
    ),
});
export type AiEquipmentSuggestionInput = z.infer<
  typeof AiEquipmentSuggestionInputSchema
>;

const AiEquipmentSuggestionOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of suggested lab equipment.'),
});
export type AiEquipmentSuggestionOutput = z.infer<
  typeof AiEquipmentSuggestionOutputSchema
>;

export async function aiEquipmentSuggestion(
  input: AiEquipmentSuggestionInput
): Promise<AiEquipmentSuggestionOutput> {
  return aiEquipmentSuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiEquipmentSuggestionPrompt',
  input: {schema: AiEquipmentSuggestionInputSchema},
  output: {schema: AiEquipmentSuggestionOutputSchema},
  prompt: `You are an intelligent assistant designed to recommend suitable lab equipment.
Based on the provided project description or learning objectives, suggest a list of relevant lab equipment.

Project Description: {{{projectDescription}}}

Provide the suggestions as a JSON array of strings. Each string should be an equipment name.`,
});

const aiEquipmentSuggestionFlow = ai.defineFlow(
  {
    name: 'aiEquipmentSuggestionFlow',
    inputSchema: AiEquipmentSuggestionInputSchema,
    outputSchema: AiEquipmentSuggestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
