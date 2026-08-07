/**
 * 박병준 선생님의 통합사회 교실 - 구글 앱스 스크립트(GAS) 데이터베이스 코드
 * 
 * [설치 방법]
 * 1. 구글 시트(1Pl9VWzxAIDzWZBt0XicoPacOzJvmpPH-xTeWeVL2qhc)에 접속합니다.
 * 2. 상단 메뉴에서 [확장 프로그램] -> [Apps Script]를 클릭합니다.
 * 3. 기존 코드를 모두 지우고 이 스크립트 전체를 붙여넣습니다.
 * 4. 시트에 두 개의 탭을 생성하고 각 첫 줄에 아래 헤더 컬럼명을 그대로 적어주세요.
 *    - 'Users' 탭 헤더: StudentID | StudentName | Emoji | CreatedAt
 *    - 'Results' 탭 헤더: StudentID | StudentName | ActivityID | ActivityTitle | Score | Result | Timestamp
 * 5. 상단 우측 [배포] -> [새 배포]를 클릭합니다.
 * 6. 유형 선택(톱니바퀴)에서 [웹 앱]을 선택합니다.
 *    - 설명: 통합사회 백엔드 연동
 *    - 다음 사용자 권한으로 실행: 나 (선생님 구글 계정)
 *    - 액세스 권한이 있는 사용자: 모든 사용자 (Vercel 백엔드가 원격으로 접근하기 위함)
 * 7. [배포] 버튼을 누르고 권한 승인을 완료한 뒤, 생성된 "웹 앱 URL"을 복사합니다.
 * 8. Vercel의 환경 변수에 'GAS_WEB_APP_URL' 키로 이 복사한 주소를 입력합니다.
 */

// 보안 토큰 (아무나 시트 데이터를 수정할 수 없도록 방지)
// Vercel의 환경 변수 'GAS_SECURITY_TOKEN' 과 값이 일치해야 합니다.
const SECURITY_TOKEN = "sociallms_secure_token_2026";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // 보안 토큰 확인
    if (data.token !== SECURITY_TOKEN) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "인증 실패: 유효하지 않은 보안 토큰입니다."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const action = data.action;
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === "signup") {
      const userSheet = sheet.getSheetByName("Users");
      const studentId = String(data.studentId);
      const studentName = data.studentName;
      const emoji = data.emoji || "👧";

      // 학번 중복 검사
      const rows = userSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === studentId) {
          return createJsonResponse({ success: false, message: "이미 등록된 학번입니다. 로그인해 주세요! 🌸" });
        }
      }

      // 등록 실행
      userSheet.appendRow([studentId, studentName, emoji, new Date().toISOString()]);
      return createJsonResponse({ success: true, message: "가입 완료! 반가워요 💕" });
    }
    
    else if (action === "login") {
      const userSheet = sheet.getSheetByName("Users");
      const studentId = String(data.studentId);
      const studentName = data.studentName;

      const rows = userSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === studentId && rows[i][1] === studentName) {
          return createJsonResponse({
            success: true,
            student: {
              gradeClass: studentId.substring(0, 2), // 앞 2자리(예: 1401 -> 14반으로 임시 분류)
              name: studentName,
              emoji: rows[i][2]
            }
          });
        }
      }
      return createJsonResponse({ success: false, message: "학번 또는 이름이 일치하지 않습니다. 학번 4자리를 다시 확인해 주세요. 🥺" });
    }
    
    else if (action === "submit") {
      const resultSheet = sheet.getSheetByName("Results");
      resultSheet.appendRow([
        String(data.studentId),
        data.studentName,
        data.activityId,
        data.activityTitle,
        data.score,
        data.result,
        new Date().toISOString()
      ]);
      return createJsonResponse({ success: true, message: "배움 기록이 구글 시트에 안전하게 제출되었습니다! ⭐" });
    }
    
    else if (action === "getProgress") {
      const resultSheet = sheet.getSheetByName("Results");
      const studentId = String(data.studentId);
      const rows = resultSheet.getDataRange().getValues();
      const progress = {};

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === studentId) {
          const actId = rows[i][2];
          progress[actId] = "completed"; // 이미 기록이 있다면 완료로 처리
        }
      }
      return createJsonResponse({ success: true, progress: progress });
    }

    return createJsonResponse({ success: false, message: "올바르지 않은 작업 정의입니다." });

  } catch (error) {
    return createJsonResponse({ success: false, message: "서버 오류: " + error.toString() });
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
