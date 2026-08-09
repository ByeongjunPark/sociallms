/**
 * 박병준 선생님의 통합사회 교실 - 구글 앱스 스크립트(GAS) 자동화 데이터베이스 코드 (Dynamic Column / Multi-Tab 버전)
 * 
 * [특징]
 * - 매 과제 및 회원가입 설문 데이터의 형식(질문 개수, 항목명 등)이 100% 다르더라도
 *   그에 맞춰 구글 시트의 해당 과제 및 Users 탭에 "동적 컬럼(Dynamic Columns)"이 자동으로 생성됩니다.
 * - 이모지 비밀번호(Password)를 지원하여 학생들의 개인정보 보호 및 재미 요소를 더했습니다.
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
    
    // ================= 0. 학번 중복 사전 체크 =================
    if (action === "checkDuplicate") {
      const userSheet = sheet.getSheetByName("Users");
      if (!userSheet) {
        return createJsonResponse({ success: true, message: "가입 가능한 첫 학번입니다. 🌸" });
      }
      const studentId = String(data.studentId);
      const rows = userSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === studentId) {
          return createJsonResponse({ success: false, message: "이미 가입 완료된 학번입니다. 로그인 탭을 이용해 주세요! 🌸" });
        }
      }
      return createJsonResponse({ success: true, message: "가입 가능한 학번입니다." });
    }

    // ================= 1. 회원가입 및 진단평가 기록 (동적 컬럼 개설) =================
    if (action === "signup") {
      let userSheet = sheet.getSheetByName("Users");
      
      // 회원가입용 페이로드 파싱 (학번, 이름, 이모지, 비번 제외한 모든 데이터)
      const payloadKeys = Object.keys(data).filter(key => 
        !["token", "action", "studentId", "studentName", "emoji", "password"].includes(key)
      );

      // Users 시트가 아예 없으면 기본 헤더로 새로 만들기
      if (!userSheet) {
        userSheet = sheet.insertSheet("Users");
        const defaultHeader = ["학번 (StudentID)", "이름 (StudentName)", "비밀번호 (Password)", "캐릭터 (Emoji)", "가입시간 (CreatedAt)"];
        userSheet.appendRow(defaultHeader);
        userSheet.getRange("A1:E1").setFontWeight("bold").setBackground("#f1f3f5");
      }

      const studentId = String(data.studentId);
      const studentName = data.studentName;
      const emoji = data.emoji || "👧";
      const password = data.password || ""; // 이모지 비밀번호 4자리

      // 중복 학번 체크
      const rows = userSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === studentId) {
          return createJsonResponse({ success: false, message: "이미 등록된 학번입니다. 로그인해 주세요! 🌸" });
        }
      }

      // 현재 시트의 1행 헤더 조회 및 신규 설문 항목 동적 컬럼 추가
      let currentHeaders = userSheet.getRange(1, 1, 1, userSheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
      
      payloadKeys.forEach(key => {
        if (!currentHeaders.includes(key)) {
          // 헤더에 없는 설문이 있으면 컬럼 맨 끝에 동적 추가
          userSheet.getRange(1, userSheet.getLastColumn() + 1).setValue(key)
            .setFontWeight("bold").setBackground("#f1f3f5");
        }
      });

      // 갱신된 최신 헤더 정보 다시 가져오기
      currentHeaders = userSheet.getRange(1, 1, 1, userSheet.getLastColumn()).getValues()[0].map(h => String(h).trim());

      // 정렬된 한 행의 데이터 조립
      const newRowData = [];
      currentHeaders.forEach(h => {
        if (h.startsWith("학번")) {
          newRowData.push(studentId);
        } else if (h.startsWith("이름")) {
          newRowData.push(studentName);
        } else if (h.startsWith("비밀번호")) {
          newRowData.push(password);
        } else if (h.startsWith("캐릭터")) {
          newRowData.push(emoji);
        } else if (h.startsWith("가입시간")) {
          newRowData.push(new Date().toISOString());
        } else {
          // Q1~Q24 등 진단/설문 데이터 매핑
          const val = data[h];
          newRowData.push(val !== undefined ? val : "");
        }
      });

      userSheet.appendRow(newRowData);
      return createJsonResponse({ success: true, message: "가입 및 진단평가 제출 완료! 로그인 화면으로 이동합니다 💕" });
    }
    
    // ================= 2. 로그인 검증 (이모지 비밀번호 체크) =================
    else if (action === "login") {
      let userSheet = sheet.getSheetByName("Users");
      if (!userSheet) {
        return createJsonResponse({ success: false, message: "아직 등록된 학생 정보가 없습니다. 회원등록을 먼저 진행해 주세요! 🥺" });
      }

      const studentId = String(data.studentId);
      const studentName = data.studentName;
      const inputPassword = data.password || ""; // 로그인 창에서 다이얼로 고른 이모지 조합

      const rows = userSheet.getDataRange().getValues();
      const headers = rows[0].map(h => String(h).trim());
      
      // 주요 열 인덱스 찾기
      const idIdx = headers.findIndex(h => h.startsWith("학번"));
      const nameIdx = headers.findIndex(h => h.startsWith("이름"));
      const pwIdx = headers.findIndex(h => h.startsWith("비밀번호"));
      const emojiIdx = headers.findIndex(h => h.startsWith("캐릭터"));

      for (let i = 1; i < rows.length; i++) {
        const sheetId = String(rows[i][idIdx]);
        const sheetName = rows[i][nameIdx];
        const sheetPassword = pwIdx !== -1 ? String(rows[i][pwIdx]) : "";
        const sheetEmoji = emojiIdx !== -1 ? rows[i][emojiIdx] : "👧";

        if (sheetId === studentId && sheetName === studentName) {
          // 비밀번호 매칭 검사 (시트에 비밀번호 열이 없거나 비어있는 구버전 가입자는 자동 통과 하위 호환성 유지)
          if (sheetPassword && sheetPassword !== inputPassword) {
            return createJsonResponse({ success: false, message: "비밀번호(이모지 조합)가 일치하지 않습니다. 다이얼을 다시 맞춰주세요! 🥺" });
          }
          
          return createJsonResponse({
            success: true,
            student: {
              gradeClass: studentId.substring(0, 2),
              name: studentName,
              emoji: sheetEmoji
            }
          });
        }
      }
      return createJsonResponse({ success: false, message: "등록되지 않은 학번이거나 이름이 다릅니다. 다시 확인해 주세요. 🥺" });
    }
    
    // ================= 3. 활동 제출 (과제별 맞춤형 동적 컬럼 개설 및 기록) =================
    else if (action === "submit") {
      const rawTitle = data.activityTitle || "일반활동";
      const sheetName = rawTitle.length > 28 ? rawTitle.substring(0, 25) + "..." : rawTitle;

      let actSheet = sheet.getSheetByName(sheetName);
      
      // 학생이 제출한 세부 데이터 객체 파싱
      let parsedResult = {};
      try {
        parsedResult = JSON.parse(data.result);
      } catch (e) {
        parsedResult = { "답변내용": data.result };
      }
      
      const resultKeys = Object.keys(parsedResult);

      if (!actSheet) {
        actSheet = sheet.insertSheet(sheetName);
        const header = ["학번 (StudentID)", "이름 (StudentName)", "평가/수익률 (Score)"];
        resultKeys.forEach(key => {
          header.push(key);
        });
        header.push("제출시간 (Timestamp)");
        
        actSheet.appendRow(header);
        actSheet.getRange(1, 1, 1, header.length).setFontWeight("bold").setBackground("#e8f4fd");
      }

      const studentId = String(data.studentId);
      const studentName = data.studentName;
      const score = data.score || "-";

      const headers = actSheet.getRange(1, 1, 1, actSheet.getLastColumn()).getValues()[0];
      const newRowData = [];

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
          const matchedVal = parsedResult[headerName];
          newRowData.push(matchedVal !== undefined ? matchedVal : "");
        }
      });

      // 동일 학생 중복 제출 오버라이팅
      const rows = actSheet.getDataRange().getValues();
      let rowIdx = -1;
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === studentId) {
          rowIdx = i + 1;
          break;
        }
      }

      if (rowIdx !== -1) {
        const range = actSheet.getRange(rowIdx, 1, 1, newRowData.length);
        range.setValues([newRowData]);
      } else {
        actSheet.appendRow(newRowData);
      }

      return createJsonResponse({ success: true, message: "활동 제출이 동적 탭에 안전하게 기록되었습니다! ⭐" });
    }
    
    // ================= 4. 전체 학습 진행도 조회 =================
    else if (action === "getProgress") {
      const studentId = String(data.studentId);
      const allSheets = sheet.getSheets();
      const userProgress = {};

      allSheets.forEach(s => {
        const sName = s.getName();
        if (sName === "Users") return;

        const rows = s.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (String(rows[i][0]) === studentId) {
            userProgress[sName] = "completed";
            break;
          }
        }
      });

      return createJsonResponse({ success: true, progress: userProgress });
    }
    
    return createJsonResponse({ success: false, message: "정의되지 않은 동작입니다." });
    
  } catch (error) {
    return createJsonResponse({ success: false, message: "오류 발생: " + error.toString() });
  }
}

// JSON 응답 생성 헬퍼
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
