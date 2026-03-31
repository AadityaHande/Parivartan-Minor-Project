'use server';
/**
 * @fileOverview A Genkit flow for the Parivartan AI chatbot.
 *
 * - chatbotFlow - A function that generates a response based on conversation history.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ChatbotInputSchema = z.object({
    history: z.array(z.object({
        role: z.enum(['user', 'model']),
        content: z.string(),
    })),
});

const ChatbotOutputSchema = z.object({
    response: z.string(),
});

const quickAnswers: Record<string, string> = {
    'How do I report a problem?': `You can report a problem by navigating to the **Report a Problem** page from the dashboard. Here are the steps:
1.  **Open Camera**: Use the camera to take a clear photo of the road damage.
2.  **Get Location**: Use the location button to automatically fetch your precise GPS coordinates.
3.  **AI Assist**: Our AI will analyze the photo and suggest a problem category and description for you.
4.  **Submit**: Review the details and press 'Submit Report'.`,
    'How can I track my reports?': `You can track all your submissions on the **My Complaints** page.
- You will see a list of every report you've made.
- Each report shows its current status (like 'Submitted', 'In Progress', or 'Resolved').
- Click on any report to view its full details, including a timeline of all actions taken.`,
    'What do the different report statuses mean?': `Here's a breakdown of what each status means:
*   **Submitted**: Your report has been successfully received by our system.
*   **Under Verification**: A PMC official is currently reviewing your report's validity.
*   **Assigned**: The task has been assigned to a specific field worker or team for resolution.
*   **In Progress**: Work has started on resolving the issue on-site.
*   **Resolved**: The issue has been fixed! You can often see an "after" photo as proof.
*   **Rejected**: The report was deemed invalid or a duplicate by an official.`
};

export const chatbotFlow = ai.defineFlow(
  {
    name: 'chatbotFlow',
    inputSchema: ChatbotInputSchema,
    outputSchema: ChatbotOutputSchema,
  },
  async (input) => {
    // Replaced findLast with a more compatible method to get the last user message.
    const userMessages = input.history.filter((m) => m.role === 'user');
    const lastUserMessageContent = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : undefined;

    if (lastUserMessageContent && quickAnswers[lastUserMessageContent]) {
        return { response: quickAnswers[lastUserMessageContent] };
    }

    const systemPrompt = `You are "Roadie," a friendly and helpful AI assistant for the Pune Municipal Corporation's Parivartan platform.
- Your goal is to assist citizens with their questions about reporting road damage, tracking complaints, and understanding the platform.
- Be conversational, polite, and clear in your responses. Use markdown for formatting like lists and bold text to improve readability.
- You have knowledge of the following topics:
    - **Reporting a problem:** Citizens can report issues like potholes, cracks, and water logging through the "Report a Problem" page. They need to take a photo, which automatically gets location and time, and write a description.
    - **Tracking reports:** Citizens can see the status of all their reports on the "My Complaints" page.
    - **Report Statuses:** The statuses are 'Submitted' (report received), 'Under Verification' (SMC official is reviewing), 'Assigned' (a team is assigned to fix it), 'In Progress' (work has started), 'Resolved' (work is complete), and 'Rejected' (report was not valid).
    - **Leaderboard:** Citizens earn points for reporting valid issues and can see their rank on the leaderboard.
- If a user asks something you don't know, politely say you don't have that information and suggest they contact SMC through official channels for specific inquiries. Do not make up answers.
`;

    const historyForGenkit = input.history.map(msg => ({
      role: msg.role,
      content: [{ text: msg.content }],
    }));

    const llmResponse = await ai.generate({
      messages: historyForGenkit,
      model: 'googleai/gemini-2.5-flash',
      config: {
        temperature: 0.7,
      },
      system: systemPrompt,
    });
    
    return { response: llmResponse.text || "I'm sorry, I couldn't generate a response." };
  }
);
