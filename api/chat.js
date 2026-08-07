export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(450).json({ success: false, message: "POST 메소드만 허용됩니다." });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: "올바르지 않은 메시지 데이터 포맷입니다." });
    }

    // Upstage Solar API Key 설정 (환경 변수 우선, 없을 시 예비용 디폴트 키 사용)
    const apiKey = process.env.UPSTAGE_API_KEY || "up_8n84t1USbP93gILYJ4x7w7QRHkhYX";
    
    // Upstage Chat Completion API 호출
    const response = await fetch("https://api.upstage.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "solar-pro4",
        messages: messages,
        reasoning_effort: "medium" // 업스테이지 솔라 추론 성능 활성화
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Upstage API Error Status:", response.status, errorText);
      return res.status(response.status).json({ 
        success: false, 
        message: `Upstage API 오류가 발생했습니다: ${response.statusText} (${response.status})` 
      });
    }

    const data = await response.json();
    
    // AI의 대답과 추론 로그 추출
    const choiceMessage = data.choices[0].message;
    const content = choiceMessage.content;
    const reasoning = choiceMessage.reasoning || null;

    return res.status(200).json({
      success: true,
      message: {
        role: "assistant",
        content: content,
        reasoning: reasoning
      }
    });

  } catch (error) {
    console.error("Chat API Error:", error);
    return res.status(500).json({ success: false, message: "서버 연결 오류가 발생했습니다: " + error.message });
  }
}
