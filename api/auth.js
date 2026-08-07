export default async function handler(req, res) {
  // CORS 헤더 설정
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
    const { action, studentId, studentName, emoji } = req.body;

    if (!action || !studentId || !studentName) {
      return res.status(400).json({ success: false, message: "필수 입력값이 누락되었습니다." });
    }

    // 학번 4자리 엄격 검증 (숫자 4자리)
    const idRegex = /^\d{4}$/;
    if (!idRegex.test(String(studentId))) {
      return res.status(400).json({ success: false, message: "학번은 반드시 숫자 4자리여야 합니다. 🥺" });
    }

    const gasUrl = process.env.GAS_WEB_APP_URL;
    const securityToken = process.env.GAS_SECURITY_TOKEN || "sociallms_secure_token_2026";

    if (!gasUrl) {
      return res.status(500).json({ 
        success: false, 
        message: "Vercel 환경 변수 'GAS_WEB_APP_URL'이 설정되지 않았습니다. 선생님께 문의해 주세요!" 
      });
    }

    // 구글 앱스 스크립트 웹 앱으로 브릿지 전송 (가입 시 설문/진단 정보 통째로 전달)
    const response = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        Object.assign(
          { token: securityToken },
          req.body
        )
      )
    });

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error("Auth API Error:", error);
    return res.status(500).json({ success: false, message: "서버 연결 오류가 발생했습니다: " + error.message });
  }
}
