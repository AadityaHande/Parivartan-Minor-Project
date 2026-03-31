'use server';
/**
 * @fileOverview An AI agent for assessing road damage from images.
 *
 * - aiDamageAssessment - A function that handles the road damage assessment process.
 * - AIDamageAssessmentInput - The input type for the aiDamageAssessment function.
 * - AIDamageAssessmentOutput - The return type for the aiDamageAssessment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIDamageAssessmentInputSchema = z.object({
  mediaDataUri: z
    .string()
    .describe(
      "A photo of a road, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AIDamageAssessmentInput = z.infer<typeof AIDamageAssessmentInputSchema>;

const AIDamageAssessmentOutputSchema = z.object({
    damageDetected: z.boolean().describe("Whether or not the AI detected road damage in the image."),
    damageCategory: z.string().describe("The category of damage identified by the AI (e.g., Pothole, Crack, Surface failure, Water-logged damage). If no damage is detected, this should be 'None'."),
    severity: z.enum(["Low", "Medium", "High"]).describe("The estimated severity of the damage. If no damage is detected, this can default to 'Low'."),
    verificationSuggestion: z.enum(["Likely genuine", "Needs manual verification"]).describe("The AI's suggestion for how to proceed with verification. If confidence is low or the image is unclear, suggest manual verification."),
    description: z.string().describe("A concise, 20-word-max description of the damage visible in the image. If no damage is visible, describe the scene briefly."),
    suggestedDepartment: z.enum(['Engineering', 'Water Supply', 'Drainage', 'Electricity', 'Traffic', 'Unassigned']).describe("Suggest the most appropriate municipal department to handle this issue. Default to 'Unassigned' if unsure."),
    suggestedPriority: z.enum(['Low', 'Medium', 'High', 'Critical']).describe("Suggest a priority level based on the severity and potential public impact."),
    duplicateSuggestion: z.string().describe("A brief note on the likelihood of this being a duplicate report based on the provided description's specificity."),
    suggestedLocationDetails: z.string().describe("Based on visible landmarks, signage, or distinctive features in the image, suggest specific location details (e.g., 'Near Municipal Office', 'Near bus stop at corner of Main St'). If no distinctive features are visible, suggest 'Use GPS coordinates for precise location'."),
});
export type AIDamageAssessmentOutput = z.infer<typeof AIDamageAssessmentOutputSchema>;

export async function aiDamageAssessment(input: AIDamageAssessmentInput): Promise<AIDamageAssessmentOutput> {
  return aiDamageAssessmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiDamageAssessmentPrompt',
  input: {schema: AIDamageAssessmentInputSchema},
  output: {schema: AIDamageAssessmentOutputSchema},
  prompt: `You are an expert AI assistant for a municipal corporation, specializing in analyzing images of roads to detect and classify damage.

Analyze the provided image. Based on your analysis, complete the following tasks:
1.  **Damage Detection**: Determine if there is any visible road damage in the image. Set 'damageDetected' to true or false.
2.  **Category Identification**: If damage is detected, classify it into one of these categories: 'Pothole', 'Crack', 'Surface failure', 'Water-logged damage'. If no damage is detected, set 'damageCategory' to 'None'.
3.  **Severity Estimation**: Based on the visual evidence (size, depth, extent of the damage relative to the road), estimate the severity as 'Low', 'Medium', or 'High'. If no damage is detected, you can default to 'Low'.
4.  **Verification Suggestion**: Based on the clarity of the image and your confidence in the assessment, provide a verification suggestion. If the damage is clear and fits a category well, suggest 'Likely genuine'. If the image is blurry, at a bad angle, or the damage is ambiguous, suggest 'Needs manual verification'.
5.  **Description Generation**: Write a brief, factual description of the issue, suitable for a public report (max 20 words). For example: "Large pothole in the center of the lane," or "Multiple cracks across the road surface." If no damage is detected, briefly describe the road condition, like "Road surface appears clear and in good condition."
6.  **Department & Priority Suggestion**: Based on the damage category and severity, suggest an appropriate department ('Engineering', 'Water Supply', 'Drainage', 'Electricity', 'Traffic') and a priority level ('Low', 'Medium', 'High', 'Critical'). For example, a major pothole on a busy road is 'High' priority for the 'Engineering' department. A faded road marking might be 'Low' priority for 'Traffic'. Water leakage issues go to 'Water Supply', drainage problems to 'Drainage', and street light issues to 'Electricity'.
7.  **Duplicate Analysis**: Based on the provided description, analyze if this report could be a duplicate. If the description is generic (e.g., "pothole on road"), suggest "Potential duplicate, check location." If it's specific (e.g., "pothole in front of City Bank on Main St."), suggest "Likely a unique report."
8.  **Location Details Suggestion**: Carefully examine the image for any visible landmarks, signage, building names, shop names, distinctive features, street signs, or other identifying markers. Based on these visual clues, suggest specific location details that would help pinpoint the exact location of the damage (e.g., 'Near Municipal Office', 'Opposite City Hospital', 'By the red traffic signal at main intersection'). If no distinctive features or landmarks are clearly visible in the image, suggest 'Use GPS coordinates for precise location' to indicate that the reporter should rely on their device's GPS.

Analyze the following media for road damage:

{{media url=mediaDataUri}}

Provide your analysis in the required JSON format.
`,
});

const aiDamageAssessmentFlow = ai.defineFlow(
  {
    name: 'aiDamageAssessmentFlow',
    inputSchema: AIDamageAssessmentInputSchema,
    outputSchema: AIDamageAssessmentOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      return output!;
    } catch (error: any) {
      // Handle rate limit and quota errors gracefully
      if (error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
        console.error('Gemini API quota exceeded. Using fallback assessment.');
        
        // Return a safe fallback response that doesn't rely on AI
        return {
          damageDetected: false,
          damageCategory: 'None',
          severity: 'Low' as const,
          verificationSuggestion: 'Needs manual verification' as const,
          description: 'Unable to analyze image at this time due to service limits. Please describe the damage manually.',
          suggestedDepartment: 'Unassigned' as const,
          suggestedPriority: 'Low' as const,
          duplicateSuggestion: 'Manual verification required',
          suggestedLocationDetails: 'Use GPS coordinates for precise location',
        };
      }
      
      // Re-throw other errors
      throw error;
    }
  }
);
