import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_PROMPT = `You are an AI Farmer Assistant designed to help farmers using text, voice, and uploaded inputs.

Capabilities:
- Understand messages coming from typed text, speech-to-text input, or uploaded images/files.
- Support both Tamil and English languages.
- Always reply in the SAME language used by the user.
- Provide simple, practical farming advice suitable for Indian farmers.

Behavior Rules:
1. If the input comes from voice (speech converted to text), treat it as normal user text.
2. If an uploaded image of a plant or crop is described, analyze the description and suggest possible disease causes and solutions.
3. Give short, clear, farmer-friendly answers (maximum 6–8 lines).
4. Use simple words instead of technical agricultural terms.
5. Focus only on agriculture topics such as:
   - crop recommendation
   - irrigation
   - soil health
   - pest control
   - fertilizers
   - seasonal farming advice

Safety:
- Do not provide harmful or unsafe farming practices.
- If unsure, provide general safe guidance.
- Do not answer unrelated topics like politics, medical, or legal advice.

Language Rule:
- Tamil input → Tamil response.
- English input → English response.

Tone:
- Friendly, respectful, and supportive like an agriculture officer helping a farmer.

Examples:
- User voice input (Tamil): "என் செடியில் இலை மஞ்சளாகிறது" -> Respond in Tamil with possible causes and solution.
- User upload description: "Tomato plant leaves have white spots" -> Suggest disease reason and treatment clearly.`;

export async function POST(req: Request) {
  try {
    const { messages, image, language } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Use Gemini 3 Flash Preview as suggested by user, or fallback to Gemini 2.0 Flash
    const modelId = 'gemini-3-flash-preview'; 

    // Process history
    const history: any[] = [];
    let lastRole = '';

    for (const m of messages.slice(0, -1)) {
      const currentRole = m.role === 'assistant' ? 'model' : 'user';
      if (currentRole !== lastRole) {
        if (history.length === 0 && currentRole !== 'user') continue;
        history.push({
          role: currentRole,
          parts: [{ text: m.content || '' }],
        });
        lastRole = currentRole;
      }
    }

    const lastMessage = messages[messages.length - 1].content;
    const contentParts: any[] = [{ text: lastMessage }];
    
    if (image && typeof image === 'string') {
      const mimeMatch = image.match(/^data:([^;]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      
      contentParts.push({
        inlineData: {
          data: image.split(',')[1],
          mimeType: mimeType
        }
      });
    }

    let responseText = '';
    const requestedLanguageLabel = language === 'en' ? 'English' : 'Tamil';
    const config = {
      systemInstruction: `${SYSTEM_PROMPT}\n\nCRITICAL: The user has explicitly selected ${requestedLanguageLabel} as the response language. YOU MUST answer in ${requestedLanguageLabel} even if the user types in another language.`,
    };

    if (history.length === 0) {
      const result = await ai.models.generateContent({
        model: modelId,
        contents: [{ role: 'user', parts: contentParts }],
        config
      });
      responseText = result.text || '';
    } else {
      const chat = ai.chats.create({ 
        model: modelId,
        history,
        config
      });
      const result = await chat.sendMessage({ message: contentParts });
      responseText = result.text || '';
    }

    return NextResponse.json({
      message: responseText,
    });
  } catch (error: any) {
    console.error('Gemini Assistant Error:', {
      message: error.message,
      stack: error.stack,
      status: error.status,
      details: error.details
    });
    return NextResponse.json(
      {
        error: error.message || 'Failed to get AI response',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
export const dynamic = 'force-dynamic';
