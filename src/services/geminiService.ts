import { GoogleGenerativeAI } from "@google/generative-ai";
import { Interaction, Student } from "../types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateWeeklySummary(
  mentorName: string,
  weekNumber: number,
  students: Student[],
  interactions: Interaction[]
) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const summaryContext = interactions.map(interaction => {
    const student = students.find(s => s.id === interaction.studentId);
    return `Student: ${student?.name} (${student?.courseHistory}), Contact Type: ${interaction.typeContact}, Message: ${interaction.messages}, Response: ${interaction.responseType}, Notes: ${interaction.content}`;
  }).join("\n");

  const prompt = `
    You are an AI assistant for a mentor. 
    Analyze the following student interactions for Week ${weekNumber} and provide a summary for the supervisor.
    Mentor Name: ${mentorName}
    
    Interactions:
    ${summaryContext}
    
    Format the response as a JSON object with:
    - summary: A professional summary of the week's progress.
    - improvementPoints: An array of 3-4 specific points to improve or watch for next week.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    // Clean JSON from potential markdown blocks
    const jsonString = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error generating weekly summary:", error);
    return {
      summary: "Error generating summary. Please try again later.",
      improvementPoints: ["Review student engagement manually", "Check for missed interactions"]
    };
  }
}
