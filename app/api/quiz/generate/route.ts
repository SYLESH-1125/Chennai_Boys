import { NextRequest, NextResponse } from 'next/server';

// This API route generates quiz questions using Anthropic's Claude API
// Expects: { keywords: string, numQuestions: number }
// Returns: { questions: [...] }

export async function POST(req: NextRequest) {
  const { keywords, numQuestions = 5 } = await req.json();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Anthropic API key not set.' }, { status: 500 });
  }

  // Prompt for Claude: Only MCQ, True/False, or Fill in the Blanks. No descriptive.
  const prompt = `Generate ${numQuestions} quiz questions based on the following syllabus keywords: "${keywords}". 
Each question should be one of: Multiple Choice (MCQ), True or False, or Fill in the Blanks. 
For Fill in the Blanks, use ___ in the question where the blank should appear, and provide the correct answer for the blank.
Do NOT include any descriptive or open-ended questions. 
Return the result as a JSON array, where each item has: 
- type: "mcq" | "true-false" | "fill-in-the-blanks"
- question: string
- options: string[] (for MCQ)
- correctAnswer: string (for True/False and Fill in the Blanks, or index for MCQ)
`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'Failed to generate questions.' }, { status: 500 });
  }

  const data = await response.json();
  // Claude returns the text in data.content[0].text
  let questions = [];
  try {
    let text = data.content[0]?.text || '';
    // Remove code block markers if present
    text = text.trim();
    if (text.startsWith('```json')) {
      text = text.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (text.startsWith('```')) {
      text = text.replace(/^```/, '').replace(/```$/, '').trim();
    }
    // Try to extract JSON array from text
    // Extract JSON array (multi-line safe)
    const arrayStart = text.indexOf('[');
    const arrayEnd = text.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
      const jsonArray = text.substring(arrayStart, arrayEnd + 1);
      questions = JSON.parse(jsonArray);
    } else {
      questions = JSON.parse(text);
    }
  } catch (e) {
    return NextResponse.json({ error: 'Failed to parse AI response.' }, { status: 500 });
  }

  return NextResponse.json({ questions });
}
