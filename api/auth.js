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

    const responseText = await response.text();
    try {
      const data = JSON.parse(responseText);
      return res.status(200).json(data);
    } catch (err) {
      console.error("GAS Response parsing failed:", responseText.substring(0, 300));
      
      let detail = "구글 연결 실패: ";
      if (responseText.includes("Sign in") || responseText.includes("login") || responseText.includes("Accounts")) {
        detail += "구글 웹 앱 배포 권한이 '모든 사용자(Anyone)'로 되어 있지 않거나, 테스트용 /dev 주소를 사용했습니다. 배포 설정을 'Anyone'으로 바꾸어 정식 /exec 주소를 적용했는지 재확인해 주세요! 🥺";
      } else if (responseText.includes("경고") || responseText.includes("Error") || responseText.includes("Exception")) {
        detail += "구글 앱스 스크립트 실행 중 내부 코드 에러가 났습니다. 구글 시트 -> 확장프로그램 -> Apps Script의 실행 프로그램 로그를 확인해 보세요.";
      } else {
        detail += "구글 서버가 비정상적인 데이터(HTML)를 보냈습니다. 입력된 GAS URL에 오타가 있는지 확인해 주세요. (응답 일부: " + responseText.substring(0, 100) + ")";
      }
      
      return res.status(502).json({ 
        success: false, 
        message: detail 
      });
    }

  } catch (error) {
    console.error("Auth API Error:", error);
    return res.status(500).json({ success: false, message: "서버 연결 오류가 발생했습니다: " + error.message });
  }
}
