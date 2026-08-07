/**
 * 박병준 선생님의 통합사회 교실 - 구글 앱스 스크립트(GAS) 자동화 데이터베이스 코드 (Self-Healing 버전)
 * 
 * [설치 방법]
 * 1. 구글 시트(1Pl9VWzxAIDzWZBt0XicoPacOzJvmpPH-xTeWeVL2qhc)에 접속합니다.
 * 2. 상단 메뉴에서 [확장 프로그램] -> [Apps Script]를 클릭합니다.
 * 3. 기존 코드를 모두 지우고 이 스크립트 전체를 붙여넣습니다.
 * 4. 상단 우측 [배포] -> [새 배포]를 클릭하고 [웹 앱]으로 설정하여 배포합니다.
 * 
 * ★ 중요: 이제 시트에 탭을 수동으로 미리 만들 필요가 전혀 없습니다!
 * 첫 번째 학생이 등록되거나 활동을 제출하면, 프로그램이 시트에 알아서 탭을 생성하고 
 * 헤더 열(Columns)도 완벽하게 자동으로 써 줍니다! 🌸
 */

// 보안 토큰 (Vercel 환경 변수 'GAS_SECURITY_TOKEN' 과 일치해야 함)
const SECURITY_TOKEN = "sociallms_secure_token_2026";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // 보안 토큰 확인
    if (data.token !== SECURITY_TOKEN) {
      return createJsonResponse({ success: false, message: "인증 실패: 유효하지 않은 보안 토큰입니다." });
    }

    const action = data.action;
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // ================= 1. 회원가입 (Users 탭 자동 개설 및 기록) =================
    if (action === "signup") {
      let userSheet = sheet.getSheetByName("Users");
      
      // Users 탭이 없으면 알아서 자동 생성 및 헤더 개설 (Self-Healing)
      if (!userSheet) {
        userSheet = sheet.insertSheet("Users");
        userSheet.appendRow(["학번 (StudentID)", "이름 (StudentName)", "캐릭터 (Emoji)", "가입시간 (CreatedAt)"]);
        // 첫 행 헤더 스타일링 (회색 배경에 볼드체)
        userSheet.getRange("A1:D1").setFontWeight("bold").setBackground("#f1f3f5");
      }

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
      return createJsonResponse({ success: true, message: "가입 완료! 대시보드로 이동합니다 💕" });
    }
    
    // ================= 2. 로그인 검증 =================
    else if (action === "login") {
      let userSheet = sheet.getSheetByName("Users");
      if (!userSheet) {
        return createJsonResponse({ success: false, message: "아직 등록된 학생 정보가 없습니다. 회원등록을 먼저 진행해 주세요! 🥺" });
      }

      const studentId = String(data.studentId);
      const studentName = data.studentName;

      const rows = userSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === studentId && rows[i][1] === studentName) {
          return createJsonResponse({
            success: true,
            student: {
              gradeClass: studentId.substring(0, 2),
              name: studentName,
              emoji: rows[i][2]
            }
          });
        }
      }
      return createJsonResponse({ success: false, message: "학번 또는 이름이 일치하지 않습니다. 다시 확인해 주세요. 🥺" });
    }
    
    // ================= 3. 활동 제출 (활동별 동적 탭 개설 및 개별 답변 분리 입력) =================
    else if (action === "submit") {
      // 탭 이름을 활동 제목(Title)으로 지정하여 자동으로 분리 저장!
      const rawTitle = data.activityTitle || "일반활동";
      // 구글시트 탭 이름 제한(31자)을 방지하기 위해 정돈
      const sheetName = rawTitle.length > 28 ? rawTitle.substring(0, 25) + "..." : rawTitle;

      let actSheet = sheet.getSheetByName(sheetName);
      
      // 해당 활동 탭이 없으면 자동으로 탭 개설! (Self-Healing)
      if (!actSheet) {
        actSheet = sheet.insertSheet(sheetName);
        
        // 헤더 세팅
        // 답변이 배열/객체 형태인 경우 각 답변 컬럼을 따로 분리해 줍니다.
        const header = ["학번 (StudentID)", "이름 (StudentName)", "자기성찰 점수", "답변 1", "답변 2", "제출시간 (Timestamp)"];
        actSheet.appendRow(header);
        actSheet.getRange("A1:F1").setFontWeight("bold").setBackground("#e8f4fd");
      }

      const studentId = String(data.studentId);
      const studentName = data.studentName;
      const score = data.score || "-";
      
      // result 데이터 파싱 (JSON 포맷의 답변 쪼개기)
      let ans1 = "";
      let ans2 = "";
      
      try {
        const parsedResult = JSON.parse(data.result);
        ans1 = parsedResult.answer1 || parsedResult.reflectText || data.result;
        ans2 = parsedResult.answer2 || "";
      } catch (e) {
        ans1 = data.result;
      }

      // 동일 학생의 중복 제출이 있을 경우 덮어쓰거나 새 줄 추가
      const rows = actSheet.getDataRange().getValues();
      let rowIdx = -1;
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === studentId) {
          rowIdx = i + 1; // 1-based index로 변환
          break;
        }
      }

      const newRowData = [studentId, studentName, score, ans1, ans2, new Date().toISOString()];

      if (rowIdx !== -1) {
        // 이미 낸 적이 있다면 기존 행 갱신 (오버라이트)
        const range = actSheet.getRange(rowIdx, 1, 1, 6);
        range.setValues([newRowData]);
      } else {
        // 처음 내는 거라면 맨 밑에 추가
        actSheet.appendRow(newRowData);
      }

      return createJsonResponse({ success: true, message: "배움 기록이 시트에 제출 완료되었습니다! ⭐" });
    }
    
    // ================= 4. 전체 학습 진행도 조회 =================
    else if (action === "getProgress") {
      const studentId = String(data.studentId);
      const allSheets = sheet.getSheets();
      const progress = {};

      // Users 탭을 제외한 각 활동 탭을 돌며 이 학생이 낸 기록이 있는지 전수조사
      allSheets.forEach(s => {
        const name = s.getName();
        if (name === "Users") return;

        const rows = s.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (String(rows[i][0]) === studentId) {
            // 활동 ID 매핑을 위해, 탭 이름을 기반으로 완료 상태 전달
            // 프론트엔드에서 탭 이름과 활동의 매핑 처리가 가능하도록 함
            progress[name] = "completed";
          }
        }
      });
      
      return createJsonResponse({ success: true, progress: progress });
    }

    return createJsonResponse({ success: false, message: "잘못된 작업 요청입니다." });

  } catch (error) {
    return createJsonResponse({ success: false, message: "스크립트 실행 에러: " + error.toString() });
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
