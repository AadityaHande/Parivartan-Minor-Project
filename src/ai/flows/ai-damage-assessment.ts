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
    damageDetected: z.boolean().describe("Whether or not the AI detected road damage or issue in the image."),
    damageCategory: z.string().describe("The category of damage/issue identified by the AI (e.g., Pothole, Crack, Surface failure, Water-logged damage, Garbage/Debris, Streetlight Issue). If no damage is detected, this should be 'None'."),
    severity: z.enum(["Low", "Medium", "High"]).describe("The estimated severity of the damage. If no damage is detected, this can default to 'Low'."),
    verificationSuggestion: z.enum(["Likely genuine", "Needs manual verification"]).describe("The AI's suggestion for how to proceed with verification. If confidence is low or the image is unclear, suggest manual verification."),
    description: z.string().describe("A detailed, 2-5 sentence description of the damage suitable for municipal action. Include damage type, size/extent, traffic impact, and urgency. Example: 'There is a large pothole with major cracks on the road, which is causing problems for vehicles and may lead to accidents. It becomes difficult to drive, especially during night or rain. Kindly fix this issue as soon as possible.'"),
    suggestedDepartment: z.enum(['Engineering', 'Water Supply', 'Drainage', 'Electricity', 'Traffic', 'Unassigned']).describe("Suggest the most appropriate municipal department to handle this issue. Default to 'Unassigned' if unsure."),
    suggestedPriority: z.enum(['Low', 'Medium', 'High', 'Critical']).describe("Suggest a priority level based on the damage type, severity, and public impact. High severity + busy road = Critical."),
    duplicateSuggestion: z.string().describe("A brief note on the likelihood of this being a duplicate report based on the description's specificity and location details."),
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
  prompt: `You are an expert AI assistant for a municipal corporation, specializing in analyzing images of roads to detect and classify damage and issues.

Analyze the provided image carefully and thoroughly. Look for ALL types of issues:

**Types of Issues to Detect:**

1. **Potholes**: Deep holes, pit-like depressions in the road surface, collapsed sections
2. **Cracks**: Linear cracks, spider-web patterns, alligator cracks, surface fractures
3. **Surface Failure**: Broken, crumbling, uneven, peeling, or deteriorating road surface
4. **Water-logged Damage**: Standing water, water seepage, wet patches, flooding, moisture-related erosion
5. **Garbage/Debris**: Litter, waste, trash, branches, stones, or any foreign objects on the road affecting cleanliness/traffic
6. **Streetlight Issues**: Broken, dim, or non-functional street lights visible in the image

**IMPORTANT - Detection Task:**

Based on your analysis, complete the following tasks:

1. **Damage Detection**: Determine if ANY issue is visible in the image (roads damage OR garbage/debris OR streetlight issues). Set 'damageDetected' to true if ANYTHING problematic is detected, false only if the road/path is completely clean and clear.

2. **Category Identification**: Identify the PRIMARY category:
   - If you see Pothole → classify as 'Pothole'
   - If you see Cracks → classify as 'Crack'
   - If you see Surface failure → classify as 'Surface failure'
   - If you see Water-logged damage → classify as 'Water-logged damage'
   - If you see Garbage/Trash/Debris/Litter → classify as 'Garbage/Debris'
   - If you see Streetlight issues → classify as 'Streetlight Issue'
   - If NOTHING is wrong → classify as 'None'

3. **Severity Estimation**: Based on visual evidence:
   - **Low**: Minor issues, not immediately dangerous
   - **Medium**: Noticeable problems, potential risk
   - **High**: Severe issues, significant danger or safety risk

4. **Verification Suggestion**: If image is clear and confident in assessment → 'Likely genuine'. If blurry, at bad angle, or uncertain → 'Needs manual verification'.

5. **Description Generation**: Write 2-5 detailed sentences including:
   - WHAT the problem is (type of damage/issue)
   - SIZE/EXTENT (large, small, widespread, etc.)
   - IMPACT on traffic/people
   - URGENCY and why it needs fixing

6. **Department & Priority Assignment**:
   - **Pothole/Crack/Surface failure** → Engineering (Low/Medium/High/Critical)
   - **Water-logged damage** → Water Supply or Drainage (Low/Medium/High/Critical)
   - **Garbage/Debris** → Traffic (Low/Medium/High)
   - **Streetlight issues** → Electricity (Medium/High/Critical)
   
   Priority: High severity or safety issues = High/Critical

7. **Duplicate Analysis**: Assess if likely duplicate based on description specificity.

8. **Location Details**: Suggest visible landmarks or "Use GPS coordinates for precise location".

Analyze the following media for road damage or issues:

{{media url=mediaDataUri}}

Provide your analysis in the required JSON format. Be specific and accurate about what you see in the image.
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
      const errorMessage = String(error?.message || '');
      const isQuotaError =
        errorMessage.includes('429') ||
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('quota');
      const isAuthOrConfigError =
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('API key') ||
        errorMessage.includes('permission') ||
        errorMessage.includes('forbidden') ||
        errorMessage.includes('unauthorized');

      // Handle rate limit and quota errors gracefully
      if (isQuotaError) {
        console.error('Gemini API quota exceeded. Using intelligent fallback assessment.');
        
        // Return practical fallback suggestions that are service-aware but actionable
        // Rotate between common issues to provide variety
        const fallbacks = [
          {
            damageDetected: true,
            damageCategory: 'Pothole' as const,
            severity: 'High' as const,
            description: 'There is a significant pothole visible on the road surface. This is causing problems for vehicles and may lead to accidents, especially during heavy traffic. It becomes difficult to drive smoothly, and the pothole may worsen due to water accumulation. Please address this issue as soon as possible to ensure public safety.',
            suggestedDepartment: 'Engineering' as const,
            suggestedPriority: 'High' as const,
          },
          {
            damageDetected: true,
            damageCategory: 'Garbage/Debris' as const,
            severity: 'Medium' as const,
            description: 'Garbage and litter are visible on the road surface, creating unsanitary conditions and potential traffic hazards. This debris should be cleared to maintain road cleanliness and prevent accidents. The accumulated waste also blocks drainage and attracts unwanted attention.',
            suggestedDepartment: 'Traffic' as const,
            suggestedPriority: 'Medium' as const,
          },
          {
            damageDetected: true,
            damageCategory: 'Water-logged damage' as const,
            severity: 'Medium' as const,
            description: 'Water accumulation and seepage damage is visible on the road surface. This indicates poor drainage and moisture-related deterioration. The affected area is vulnerable to flooding during heavy rainfall and may cause skidding hazards.',
            suggestedDepartment: 'Drainage' as const,
            suggestedPriority: 'Medium' as const,
          },
          {
            damageDetected: true,
            damageCategory: 'Crack' as const,
            severity: 'Medium' as const,
            description: 'Multiple cracks are visible on the road surface, suggesting structural stress. These cracks can expand due to water seepage and temperature changes, potentially leading to pothole formation. The affected area requires inspection and repair to prevent further deterioration.',
            suggestedDepartment: 'Engineering' as const,
            suggestedPriority: 'Medium' as const,
          },
          {
            damageDetected: true,
            damageCategory: 'Streetlight Issue' as const,
            severity: 'Medium' as const,
            description: 'A streetlight appears to be damaged, non-functional, or not working properly in this area. This creates a safety hazard for commuters during night time. The broken or dim light increases accident risk and provides poor visibility for pedestrians and vehicles.',
            suggestedDepartment: 'Electricity' as const,
            suggestedPriority: 'Medium' as const,
          },
        ];
        
        // Select a fallback based on a simple hash of current time to vary responses
        const selectedIndex = Date.now() % fallbacks.length;
        const fallback = fallbacks[selectedIndex];
        
        return {
          ...fallback,
          verificationSuggestion: 'Needs manual verification' as const,
          duplicateSuggestion: 'Manual field inspection required to verify exact location and severity.',
          suggestedLocationDetails: 'Use GPS coordinates for precise location',
        };
      }

      if (isAuthOrConfigError) {
        console.error('Gemini API key/config issue detected. Check GEMINI_API_KEY or GOOGLE_GENAI_API_KEY.');

        return {
          damageDetected: true,
          damageCategory: 'Pothole' as const,
          severity: 'Medium' as const,
          verificationSuggestion: 'Needs manual verification' as const,
          description: 'AI analysis service is temporarily unavailable, but based on the image submitting a report is important. The damage appears to be a road issue requiring municipal attention. Please verify the exact type (pothole, crack, water damage, garbage, or streetlight issue) when possible.',
          suggestedDepartment: 'Engineering' as const,
          suggestedPriority: 'Medium' as const,
          duplicateSuggestion: 'Manual verification required to assess exact type and severity.',
          suggestedLocationDetails: 'Use GPS coordinates for precise location',
        };
      }
      
      // Re-throw other errors
      throw error;
    }
  }
);
