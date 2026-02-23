import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeFoodImage(base64Image: string, age: number, condition: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    당신은 노인 영양 전문가입니다. 사용자의 나이는 ${age}세이며, 앓고 있는 질환은 "${condition}"입니다.
    첨부된 음식 사진을 분석하여 다음 정보를 JSON 형식으로 제공해주세요:
    1. foodName: 음식 이름
    2. isSafe: 당뇨 환자가 먹기에 안전한지 여부 (boolean)
    3. analysis: 왜 안전한지 또는 주의해야 하는지에 대한 상세 설명 (할머니가 이해하기 쉽게 따뜻하고 친절한 말투로)
    4. tips: 더 건강하게 먹을 수 있는 팁
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1] || base64Image,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          foodName: { type: Type.STRING },
          isSafe: { type: Type.BOOLEAN },
          analysis: { type: Type.STRING },
          tips: { type: Type.STRING },
        },
        required: ["foodName", "isSafe", "analysis", "tips"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function getDailyRecommendation(logs: any[], age: number, condition: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    사용자의 최근 식사 기록: ${JSON.stringify(logs)}
    사용자 정보: ${age}세, 질환: ${condition}
    
    사용자의 식사 패턴을 분석하여 오늘 추천하는 식단이나 건강 조언을 한 문장으로 따뜻하게 알려주세요.
    예: "어제는 고기를 많이 드셨으니 오늘은 신선한 나물 비빔밥을 드셔보시는 건 어떨까요?"
    형식: JSON { "recommendation": "..." }
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          recommendation: { type: Type.STRING },
        },
        required: ["recommendation"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}
