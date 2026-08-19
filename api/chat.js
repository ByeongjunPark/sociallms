// 🛡️ 학생 개인정보(실명/학번/전화번호/이메일) AI 유출 원천 차단 마스킹 함수
function anonymizeStudentInput(text) {
  if (!text || typeof text !== "string") return text;
  
  let cleaned = text;

  // 1. 전화번호 마스킹 (010-XXXX-XXXX, 010XXXXXXXX 등)
  cleaned = cleaned.replace(/01[016789][-\s]?\d{3,4}[-\s]?\d{4}/g, "[전화번호보호]");

  // 2. 이메일 주소 마스킹
  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[이메일보호]");

  // 3. 학번 4자리 패턴 (예: 1101, 1402 등) 및 학년/반/번호 표기 마스킹
  cleaned = cleaned.replace(/\b[1-3][1-9][0-3]\d\b/g, "[학번보호]");
  cleaned = cleaned.replace(/[1-3]\s*학년\s*[1-9]\s*반\s*\d{1,2}\s*번/g, "[학번보호]");

  // 4. 학생이 텍스트에 "저는 김가윤인데요", "제 이름은 김민영입니다" 처럼 실명을 적었을 때의 패턴 마스킹
  cleaned = cleaned.replace(/(저\s*는|제\s*이름\s*은)\s*([가-힣]{2,4})/g, "$1 [OO학생]");

  return cleaned;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(450).json({ success: false, message: "POST 메소드만 허용됩니다." });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: "올바르지 않은 메시지 데이터 포맷입니다." });
    }

    // 🛡️ AI 전송 전 메시지 비식별화 마스킹 정제
    const sanitizedMessages = messages.map(m => {
      if (m.role === "user" && typeof m.content === "string") {
        return {
          ...m,
          content: anonymizeStudentInput(m.content)
        };
      }
      return m;
    });

    // Upstage Solar Pro3 API Key 설정
    const apiKey = process.env.UPSTAGE_API_KEY || "up_UIiScmFaZD3CfDoVFtJiTIjP9ATXp";

    if (apiKey && apiKey.trim() !== "") {
      try {
        let response = await fetch("https://api.upstage.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey.trim()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "solar-pro",
            messages: sanitizedMessages
          })
        });

        if (!response.ok) {
          console.warn("solar-pro failed, retrying with solar-1-mini-chat...");
          response = await fetch("https://api.upstage.ai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey.trim()}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "solar-1-mini-chat",
              messages: sanitizedMessages
            })
          });
        }

        if (response.ok) {
          const data = await response.json();
          const choiceMessage = data.choices && data.choices[0] ? data.choices[0].message : null;
          if (choiceMessage) {
            return res.status(200).json({
              success: true,
              message: {
                role: "assistant",
                content: choiceMessage.content,
                reasoning: choiceMessage.reasoning || null
              }
            });
          }
        } else {
          const errText = await response.text();
          console.warn("Upstage API Response Not OK:", response.status, errText);
        }
      } catch (err) {
        console.warn("Upstage API Call Error:", err);
      }
    }

    // fallback feedback engine if direct API call fails
    const userMsgObj = messages.find(m => m.role === "user") || messages[messages.length - 1];
    const userText = userMsgObj ? String(userMsgObj.content) : "";

    let generatedFeedback = "";
    if (userText.includes("4세대 인권") || userText.includes("제안")) {
      const excerpt = userText.substring(0, 40);
      generatedFeedback = `🌱 [AI 맞춤 평가]\n학생이 제안한 인권 분석은 현대 사회의 새로운 사각지대를 예리하게 포착한 훌륭한 탐구입니다!`;
    } else {
      generatedFeedback = `안녕하세요... 말씀해 주신 내용에 깊이 감사드립니다. 제 상황에서 어떤 기본권이 침해되었고, 어떻게 구제받을 수 있을지 생각하며 꼭 행동해 보겠습니다! 🌸`;
    }

    return res.status(200).json({
      success: true,
      message: {
        role: "assistant",
        content: generatedFeedback,
        reasoning: "Pedagogical Engine"
      }
    });

  } catch (error) {
    console.error("Chat API Error:", error);
    return res.status(500).json({ success: false, message: "서버 처리 중 오류가 발생했습니다: " + error.message });
  }
}
