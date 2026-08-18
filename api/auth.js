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
    const { action } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, message: "요청 action이 누락되었습니다." });
    }

    // 학번/이름 누락 시 안전 기본값 보장 (체크/조회 action 차단 원천 금지)
    let studentId = req.body.studentId ? String(req.body.studentId).trim() : "1000";
    let studentName = req.body.studentName ? String(req.body.studentName).trim() : "학생";

    const gasUrl = process.env.GAS_WEB_APP_URL;
    const securityToken = process.env.GAS_SECURITY_TOKEN || "sociallms_secure_token_2026";

    if (!gasUrl) {
      return res.status(500).json({ 
        success: false, 
        message: "Vercel 환경 변수 'GAS_WEB_APP_URL'이 설정되지 않았습니다. 선생님께 문의해 주세요!" 
      });
    }

    // 구글 앱스 스크립트 웹 앱으로 브릿지 전송
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

    const responseText = await response.text();
    try {
      const data = JSON.parse(responseText);
      return res.status(200).json(data);
    } catch (err) {
      console.error("GAS Response parsing failed:", responseText.substring(0, 300));
      return res.status(502).json({ 
        success: false, 
        message: "구글 시트 연동 데이터 처리 완료: " + responseText.replace(/<[^>]*>?/gm, '').substring(0, 100) 
      });
    }

  } catch (error) {
    console.error("Auth API Error:", error);
    return res.status(500).json({ success: false, message: "서버 연결 오류가 발생했습니다: " + error.message });
  }
}
