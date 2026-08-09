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
    return res.status(405).json({ success: false, message: "POST 메소드만 허용됩니다." });
  }

  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: "교사 비밀번호가 입력되지 않았습니다." });
    }

    // 교사 패스워드 검증
    if (password !== "qkrqudwns1!") {
      return res.status(401).json({ success: false, message: "올바르지 않은 교사 비밀번호입니다. 🔒" });
    }

    const gasUrl = process.env.GAS_WEB_APP_URL;
    const securityToken = process.env.GAS_SECURITY_TOKEN || "sociallms_secure_token_2026";

    if (!gasUrl) {
      return res.status(500).json({
        success: false,
        message: "Vercel 환경 변수 'GAS_WEB_APP_URL'이 설정되지 않았습니다."
      });
    }

    // 구글 앱스 스크립트로 융합 데이터 조회 요청
    const response = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: securityToken,
        action: "getAllStudents"
      })
    });

    const responseText = await response.text();
    try {
      const data = JSON.parse(responseText);
      return res.status(200).json(data);
    } catch (err) {
      console.error("GAS teacher fetch failed to parse JSON:", responseText.substring(0, 300));
      return res.status(502).json({
        success: false,
        message: "구글 시트 응답 파싱에 실패했습니다. (응답 일부: " + responseText.substring(0, 100) + ")"
      });
    }

  } catch (error) {
    console.error("Teacher API Error:", error);
    return res.status(500).json({ success: false, message: "서버 내부 오류가 발생했습니다: " + error.message });
  }
}
