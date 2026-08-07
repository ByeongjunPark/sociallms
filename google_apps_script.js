/**
 * 박병준 선생님의 통합사회 교실 - 구글 앱스 스크립트(GAS) 자동화 데이터베이스 코드 (Dynamic Column / Multi-Tab 버전)
 * 
 * [특징]
 * - 매 과제마다 전송하는 데이터의 형식(질문 개수, 항목명 등)이 100% 다르더라도
 *   그에 맞춰 구글 시트의 해당 과제 탭에 "동적 컬럼(Dynamic Columns)"이 자동으로 생성됩니다.
 * - 예를 들어 과제 A에서 {"사례": "값", "대책": "값"} 을 보내면 컬럼이 [학번, 이름, 성찰, 사례, 대책, 시간]으로 생성되고,
 *   과제 B에서 {"수익률": "값", "느낀점": "값"} 을 보내면 그 탭은 [학번, 이름, 성찰, 수익률, 느낀점, 시간]으로 자동 개설됩니다.
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
      
      if (!userSheet) {
        userSheet = sheet.insertSheet("Users");
        userSheet.appendRow(["학번 (StudentID)", "이름 (StudentName)", "캐릭터 (Emoji)", "가입시간 (CreatedAt)"]);
        userSheet.getRange("A1:D1").setFontWeight("bold").setBackground("#f1f3f5");
      }

      const studentId = String(data.studentId);
      const studentName = data.studentName;
      const emoji = data.emoji || "👧";

      const rows = userSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === studentId) {
          return createJsonResponse({ success: false, message: "이미 등록된 학번입니다. 로그인해 주세요! 🌸" });
        }
      }

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
    
    // ================= 3. 활동 제출 (과제별 맞춤형 동적 컬럼 개설 및 기록) =================
    else if (action === "submit") {
      const rawTitle = data.activityTitle || "일반활동";
      const sheetName = rawTitle.length > 28 ? rawTitle.substring(0, 25) + "..." : rawTitle;

      let actSheet = sheet.getSheetByName(sheetName);
      
      // 학생이 제출한 세부 데이터 객체 파싱 (가변 형식 데이터)
      let parsedResult = {};
      try {
        parsedResult = JSON.parse(data.result);
      } catch (e) {
        parsedResult = { "답변내용": data.result };
      }
      
      const resultKeys = Object.keys(parsedResult); // 예: ["answer1", "answer2"] 또는 ["최종자산", "reflectText"] 등

      // 탭이 아예 없으면 새로 만들고 헤더도 동적으로 자동 생성!
      if (!actSheet) {
        actSheet = sheet.insertSheet(sheetName);
        
        // 동적 헤더 구성: [기본 정보] + [과제별 고유 질문 필드] + [제출 시간]
        const header = ["학번 (StudentID)", "이름 (StudentName)", "평가/수익률 (Score)"];
        resultKeys.forEach(key => {
          header.push(key); // 학생들이 입력한 JSON 키값을 그대로 엑셀 열 이름으로 매핑!
        });
        header.push("제출시간 (Timestamp)");
        
        actSheet.appendRow(header);
        actSheet.getRange(1, 1, 1, header.length).setFontWeight("bold").setBackground("#e8f4fd");
      }

      const studentId = String(data.studentId);
      const studentName = data.studentName;
      const score = data.score || "-";

      // 현재 시트의 1행 헤더 컬럼 목록 조회
      const headers = actSheet.getRange(1, 1, 1, actSheet.getLastColumn()).getValues()[0];
      const newRowData = [];

      // 시트의 헤더 순서에 맞추어 전송된 데이터 값을 정렬해 꽂아넣음
      headers.forEach(h => {
        const headerName = String(h).trim();
        if (headerName.startsWith("학번")) {
          newRowData.push(studentId);
        } else if (headerName.startsWith("이름")) {
          newRowData.push(studentName);
        } else if (headerName.startsWith("평가/수익률")) {
          newRowData.push(score);
        } else if (headerName.startsWith("제출시간")) {
          newRowData.push(new Date().toISOString());
        } else {
          // 헤더 이름과 일치하는 JSON 키값을 찾아 값 주입 (없으면 빈 칸)
          const matchedVal = parsedResult[headerName];
          newRowData.push(matchedVal !== undefined ? matchedVal : "");
        }
      });

      // 동일 학생의 중복 제출 검사 (오버라이팅)
      const rows = actSheet.getDataRange().getValues();
      let rowIdx = -1;
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === studentId) {
          rowIdx = i + 1;
          break;
        }
      }

      if (rowIdx !== -1) {
        // 기존 행에 덮어쓰기
        const range = actSheet.getRange(rowIdx, 1, 1, newRowData.length);
        range.setValues([newRowData]);
      } else {
        // 새 행 추가
        actSheet.appendRow(newRowData);
      }

      return createJsonResponse({ success: true, message: "활동 제출이 동적 탭에 안전하게 기록되었습니다! ⭐" });
    }
    
    // ================= 4. 전체 학습 진행도 조회 =================
    else if (action === "getProgress") {
      const studentId = String(data.studentId);
      const allSheets = sheet.getSheets();
      const progress = {};

      allSheets.forEach(s => {
        const name = s.getName();
        if (name === "Users") return;

        const rows = s.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (String(rows[i][0]) === studentId) {
            progress[name] = "completed";
          }
        }
      });
      
      return createJsonResponse({ success: true, progress: progress });
    }

    return createJsonResponse({ success: false, message: "잘못된 요청입니다." });

  } catch (error) {
    return createJsonResponse({ success: false, message: "스크립트 에러: " + error.toString() });
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
