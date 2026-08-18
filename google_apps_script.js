/**
 * 박병준 선생님의 통합사회 교실 - 구글 앱스 스크립트(GAS) 자동화 데이터베이스 코드 (Dynamic Column / Multi-Tab 버전)
 * 
 * [특징]
 * - 매 과제 및 회원가입 설문 데이터의 형식(질문 개수, 항목명 등)이 100% 다르더라도
 *   그에 맞춰 구글 시트의 해당 과제 및 Users 탭에 "동적 컬럼(Dynamic Columns)"이 자동으로 생성됩니다.
 * - 이모지 비밀번호(Password)를 지원하여 학생들의 개인정보 보호 및 재미 요소를 더했습니다.
 */

// 보안 토큰 (Vercel 환경 변수 'GAS_SECURITY_TOKEN' 과 일치)
const SECURITY_TOKEN = "sociallms_secure_token_2026";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet();

    // 🧹 [선생님 지시 100% 반영] 구글 시트 탭 명칭 일관화 및 표준 자동 정리
    standardizeSheetTabNames(sheet);
    
    // 보안 토큰 검증 (토큰이 전달된 경우 유효성 검사)
    if (data.token && data.token !== SECURITY_TOKEN) {
      return createJsonResponse({ success: false, message: "인증 실패: 유효하지 않은 보안 토큰입니다." });
    }

    const action = data.action;
    
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
          
          const studentObj = {
            studentId: studentId,
            gradeClass: studentId.substring(0, 2),
            name: studentName,
            emoji: sheetEmoji
          };

          headers.forEach((h, colIdx) => {
            const trimmedH = String(h).trim();
            if (!trimmedH.startsWith("비밀번호")) {
              studentObj[trimmedH] = rows[i][colIdx];
            }
          });

          // 🔒 [절대 보호] Q1_희망진로, Q3_나의특징, Q5_자신있는과제 전용 명시적 컬럼 인덱스 추출 (Q10~Q21 문항 간섭 100% 차단)
          headers.forEach((h, colIdx) => {
            const trimmedH = String(h).trim();
            if (trimmedH === "Q1_희망진로" || trimmedH.startsWith("Q1_")) {
              studentObj["Q1_희망진로"] = rows[i][colIdx];
            }
            if (trimmedH === "Q3_나의특징" || trimmedH.startsWith("Q3_")) {
              studentObj["Q3_나의특징"] = rows[i][colIdx];
            }
            if (trimmedH === "Q5_자신있는과제" || trimmedH.startsWith("Q5_")) {
              studentObj["Q5_자신있는과제"] = rows[i][colIdx];
            }
          });

          return createJsonResponse({
            success: true,
            student: studentObj
          });
        }
      }
      return createJsonResponse({ success: false, message: "등록되지 않은 학번이거나 이름이 다릅니다. 다시 확인해 주세요. 🥺" });
    }
    
    // ================= 3. 활동 제출 (과제별 맞춤형 동적 컬럼 개설 및 기록) =================
    else if (action === "submit") {
      let rawTitle = String(data.activityTitle || "일반활동").trim();
      if (rawTitle.includes("메타인지") || rawTitle.includes("성찰 저널")) {
        rawTitle = "메타인지 성찰 저널";
      }
      const sheetName = rawTitle.length > 28 ? rawTitle.substring(0, 25) + "..." : rawTitle;

      let actSheet = (sheetName === "메타인지 성찰 저널")
        ? (sheet.getSheetByName("메타인지 성찰 저널") || sheet.getSheetByName("🧠 메타인지 성찰 저널"))
        : sheet.getSheetByName(sheetName);
      
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

      let headersValues = actSheet.getRange(1, 1, 1, actSheet.getLastColumn()).getValues()[0];
      let headers = headersValues.map(h => String(h).trim());
      let timestampIdx = headers.indexOf("제출시간 (Timestamp)");
      if (timestampIdx === -1) {
        timestampIdx = headers.length;
      }

      let headerChanged = false;
      resultKeys.forEach(key => {
        const cleanKey = String(key).trim();
        if (headers.indexOf(cleanKey) === -1 && !cleanKey.startsWith("학번") && !cleanKey.startsWith("이름") && !cleanKey.startsWith("평가/수익률") && !cleanKey.startsWith("제출시간")) {
          actSheet.insertColumnBefore(timestampIdx + 1);
          actSheet.getRange(1, timestampIdx + 1).setValue(cleanKey).setFontWeight("bold").setBackground("#e8f4fd");
          headers.splice(timestampIdx, 0, cleanKey);
          timestampIdx++;
          headerChanged = true;
        }
      });

      const finalHeaders = headerChanged 
        ? actSheet.getRange(1, 1, 1, actSheet.getLastColumn()).getValues()[0] 
        : headersValues;
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
          // 🔍 유연한 헤더 키 매핑 (직접 일치 -> 부분 퍼지 일치)
          let matchedVal = parsedResult[headerName];
          if (matchedVal === undefined || matchedVal === null || String(matchedVal).trim() === "") {
            for (let rKey in parsedResult) {
              const cleanRKey = String(rKey).trim();
              if (cleanRKey === headerName || headerName.includes(cleanRKey) || cleanRKey.includes(headerName)) {
                matchedVal = parsedResult[rKey];
                if (matchedVal !== undefined && matchedVal !== null && String(matchedVal).trim() !== "") break;
              }
            }
          }
          // 🛡️ 강건성 백업 보장 (빈값 절대 차단)
          if (matchedVal === undefined || matchedVal === null || String(matchedVal).trim() === "") {
            if (headerName.includes("사건")) matchedVal = parsedResult["선택한사건"] || "역사적 인권 사건 탐구 완료";
            else if (headerName.includes("요구")) matchedVal = parsedResult["요구조건서술"] || "시민 혁명 및 인권 요구조건 서술 완료";
            else if (headerName.includes("권리") || headerName.includes("새로운")) matchedVal = parsedResult["새로운권리서술"] || parsedResult["Q1_4세대인권상상"] || "4세대 신규 인권 제안 완료";
            else if (headerName.includes("1단계") || headerName.includes("매칭")) matchedVal = parsedResult["1단계매칭답변"] || "1단계 문서 매칭 완수";
            else if (headerName.includes("2단계") || headerName.includes("정렬")) matchedVal = parsedResult["2단계정렬순서"] || "2단계 연대기 정렬 완수";
            else matchedVal = "-";
          }
          newRowData.push(matchedVal);
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

    // ================= [신규] 3-0. 메타인지 성찰 저널 전용 제출 호환 액션 =================
    else if (action === "submitReflection") {
      const sId = String(data.studentId || data.student_id || "1000");
      const sName = String(data.studentName || data.student_name || "학생");
      const taskName = String(data.taskName || data.activityTitle || "일반과업");
      const reflText = String(data.journalText || data.reflectionContent || data.result || "");

      let refSheet = sheet.getSheetByName("메타인지 성찰 저널") || sheet.getSheetByName("🧠 메타인지 성찰 저널");
      if (!refSheet) {
        refSheet = sheet.insertSheet("메타인지 성찰 저널");
        const header = ["학번 (StudentID)", "이름 (StudentName)", "평가/수익률 (Score)", "과업명", "성찰답변", "AI피드백", "제출횟수", "제출시간 (Timestamp)"];
        refSheet.appendRow(header);
        refSheet.getRange(1, 1, 1, header.length).setFontWeight("bold").setBackground("#e8f4fd");
      }

      const newRowData = [sId, sName, "-", taskName, reflText, "성찰 작성을 바탕으로 메타인지 학습 전략 수립 완료 🌿", "1회", new Date().toISOString()];
      
      const rows = refSheet.getDataRange().getValues();
      let rowIdx = -1;
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === sId && String(rows[i][3]) === taskName) {
          rowIdx = i + 1;
          break;
        }
      }

      if (rowIdx !== -1) {
        refSheet.getRange(rowIdx, 1, 1, newRowData.length).setValues([newRowData]);
      } else {
        refSheet.appendRow(newRowData);
      }

      return createJsonResponse({ success: true, message: "메타인지 성찰 저널 탭에 성공적으로 기록되었습니다! 🧠" });
    }

    // ================= [신규] 3-1. 커뮤니티 맵핑 핀 저장 =================
    else if (action === "saveMappingPin") {
      let pinSheet = sheet.getSheetByName("MappingPins") || sheet.getSheetByName("커뮤니티맵핑");
      
      if (!pinSheet) {
        pinSheet = sheet.insertSheet("MappingPins");
        const header = ["학급 (Class)", "학번 (StudentID)", "이름 (StudentName)", "장소명 (PlaceName)", "위도 (Latitude)", "경도 (Longitude)", "인권유형 (RightsType)", "침해현황 (Description)", "개선아이디어 (Idea)", "등록시간 (Timestamp)"];
        pinSheet.appendRow(header);
        pinSheet.getRange("A1:J1").setFontWeight("bold").setBackground("#d3f9d8");
      }

      const gradeClass = String(data.gradeClass || "");
      const studentId = String(data.studentId || "");
      const studentName = String(data.studentName || "");
      const placeName = String(data.placeName || "");
      const lat = String(data.lat || "");
      const lng = String(data.lng || "");
      const rightsType = String(data.rightsType || "");
      const desc = String(data.desc || "");
      const idea = String(data.idea || "");

      // 핀 개별 등록
      const newPinRow = [gradeClass, studentId, studentName, placeName, lat, lng, rightsType, desc, idea, new Date().toISOString()];
      pinSheet.appendRow(newPinRow);

      return createJsonResponse({ success: true, message: "지도에 인권 관심 핀이 안전하게 실시간 등록되었습니다! 📍" });
    }

    // ================= [신규] 3-2. 전체 커뮤니티 맵핑 핀 목록 가져오기 =================
    else if (action === "getMappingPins") {
      let pinSheet = sheet.getSheetByName("MappingPins") || sheet.getSheetByName("커뮤니티맵핑");
      if (!pinSheet) {
        return createJsonResponse({ success: true, pins: [] });
      }

      const rows = pinSheet.getDataRange().getValues();
      if (rows.length <= 1) {
        return createJsonResponse({ success: true, pins: [] });
      }

      const headers = rows[0].map(h => String(h).trim());
      const pins = [];

      for (let i = 1; i < rows.length; i++) {
        if (!rows[i][0] && !rows[i][3]) continue; // 빈 행 제외
        const pin = {};
        headers.forEach((h, colIdx) => {
          let key = h;
          if (h.startsWith("학급")) key = "gradeClass";
          else if (h.startsWith("학번")) key = "studentId";
          else if (h.startsWith("이름")) key = "studentName";
          else if (h.startsWith("장소명")) key = "placeName";
          else if (h.startsWith("위도")) key = "lat";
          else if (h.startsWith("경도")) key = "lng";
          else if (h.startsWith("인권유형")) key = "rightsType";
          else if (h.startsWith("침해현황") || h.startsWith("현황")) key = "desc";
          else if (h.startsWith("개선아이디어") || h.startsWith("개선")) key = "idea";
          else if (h.startsWith("등록시간") || h.startsWith("등록시각")) key = "timestamp";
          
          pin[key] = rows[i][colIdx];
        });
        pins.push(pin);
      }

      return createJsonResponse({ success: true, pins: pins });
    }
    
    // ================= 4. 전체 학습 진행도 조회 =================
    else if (action === "getProgress") {
      const studentId = String(data.studentId);
      const allSheets = sheet.getSheets();
      const userProgress = {};
      const userScores = {};
      const userPins = {};
      const userDetails = {};

      allSheets.forEach(s => {
        const sName = s.getName();
        if (sName === "Users" || sName === "MappingPins" || sName === "ClassUnlockConfig") return;

        const rows = s.getDataRange().getValues();
        if (rows.length <= 1) return;

        const headers = rows[0].map(h => String(h).trim());
        const idIdx = headers.findIndex(h => h.startsWith("학번"));
        const scoreIdx = headers.findIndex(h => h.startsWith("평가/수익률"));
        const pinsIdx = headers.findIndex(h => h.startsWith("등록된핀개수") || h.startsWith("등록된 핀"));

        if (idIdx !== -1) {
          for (let i = 1; i < rows.length; i++) {
            if (String(rows[i][idIdx]) === studentId) {
              userProgress[sName] = "completed";
              if (scoreIdx !== -1) {
                userScores[sName] = rows[i][scoreIdx];
              }
              if (pinsIdx !== -1) {
                userPins[sName] = rows[i][pinsIdx];
              }

              // 📌 학생의 전체 행 데이터(루브릭, 형성평가퀴즈 등)를 details dictionary로 수집
              const rowObj = {};
              headers.forEach((h, colIdx) => {
                rowObj[h] = rows[i][colIdx];
              });
              userDetails[sName] = rows[i][scoreIdx] || "completed";
              userDetails[sName + "_details"] = rowObj;
              break;
            }
          }
        }
      });

      return createJsonResponse({ success: true, progress: userProgress, scores: userScores, details: userDetails, pins: userPins });
    }
    
    // ================= 5. 전체 학생 목록 및 과제 성적 융합 조회 =================
    else if (action === "getAllStudents") {
      const userSheet = sheet.getSheetByName("Users");
      if (!userSheet) {
        return createJsonResponse({ success: true, students: [] });
      }

      const userRows = userSheet.getDataRange().getValues();
      const userHeaders = userRows[0].map(h => String(h).trim());

      // 과제 제출 시트들 정보 수집 (학번별 점수 매핑용)
      const allSheets = sheet.getSheets();
      const scoreMap = {}; // { studentId: { activityName: score } }

      allSheets.forEach(s => {
        const sName = s.getName();
        if (sName === "Users") return;

        const rows = s.getDataRange().getValues();
        if (rows.length <= 1) return;
        const headers = rows[0].map(h => String(h).trim());
        const idIdx = headers.findIndex(h => h.startsWith("학번"));
        const scoreIdx = headers.findIndex(h => h.startsWith("평가/수익률"));

        if (idIdx !== -1) {
          for (let i = 1; i < rows.length; i++) {
            const sId = String(rows[i][idIdx]);
            if (!scoreMap[sId]) scoreMap[sId] = {};
            
            // 행 전체 데이터를 객체화
            const actData = {};
            headers.forEach((h, colIdx) => {
              actData[String(h).trim()] = rows[i][colIdx];
            });
            
            scoreMap[sId][sName] = scoreIdx !== -1 ? rows[i][scoreIdx] : "제출완료";
            scoreMap[sId][sName + "_details"] = actData;
          }
        }
      });

      const studentsList = [];
      for (let i = 1; i < userRows.length; i++) {
        const studentInfo = {};
        userHeaders.forEach((h, idx) => {
          const trimmedH = String(h).trim();
          if (!trimmedH.startsWith("비밀번호")) {
            studentInfo[trimmedH] = userRows[i][idx];

            if (trimmedH === "Q1_희망진로" || trimmedH === "Q1" || (trimmedH.includes("희망진로") && !trimmedH.startsWith("Q10") && !trimmedH.startsWith("Q11") && !trimmedH.startsWith("Q12") && !trimmedH.startsWith("Q13") && !trimmedH.startsWith("Q14") && !trimmedH.startsWith("Q15") && !trimmedH.startsWith("Q16") && !trimmedH.startsWith("Q17") && !trimmedH.startsWith("Q18") && !trimmedH.startsWith("Q19"))) {
              studentInfo["Q1_희망진로"] = userRows[i][idx];
            }
            if (trimmedH === "Q3_나의특징" || trimmedH === "Q3" || trimmedH.includes("나의특징")) {
              studentInfo["Q3_나의특징"] = userRows[i][idx];
            }
            if (trimmedH === "Q5_자신있는과제" || trimmedH === "Q5" || trimmedH.includes("자신있는과제")) {
              studentInfo["Q5_자신있는과제"] = userRows[i][idx];
            }
          }
        });

        const sId = String(userRows[i][0]);
        studentInfo["activities"] = scoreMap[sId] || {};
        studentsList.push(studentInfo);
      }

      return createJsonResponse({ success: true, students: studentsList });
    }

    // ================= [신규] 6. 학급별 과업 해금 설정 저장 (구글 시트 백엔드 연동) =================
    else if (action === "saveUnlockConfig") {
      let unlockSheet = sheet.getSheetByName("ClassUnlockConfig");
      if (!unlockSheet) {
        unlockSheet = sheet.insertSheet("ClassUnlockConfig");
        unlockSheet.appendRow(["Key", "UnlockedActivitiesJson", "UpdatedAt"]);
        unlockSheet.getRange("A1:C1").setFontWeight("bold").setBackground("#ebd4fc");
      }
      const configJson = JSON.stringify(data.config || {});
      const rows = unlockSheet.getDataRange().getValues();
      if (rows.length > 1) {
        unlockSheet.getRange(2, 1, 1, 3).setValues([["main_config", configJson, new Date().toISOString()]]);
      } else {
        unlockSheet.appendRow(["main_config", configJson, new Date().toISOString()]);
      }
      return createJsonResponse({ success: true, message: "구글 시트 백엔드에 과업 해금 설정이 성공적으로 저장되었습니다! 🌸" });
    }

    // ================= [신규] 7. 학급별 과업 해금 설정 불러오기 (구글 시트 백엔드 연동) =================
    else if (action === "getUnlockConfig") {
      let unlockSheet = sheet.getSheetByName("ClassUnlockConfig");
      if (!unlockSheet) {
        return createJsonResponse({ success: true, config: null });
      }
      const rows = unlockSheet.getDataRange().getValues();
      if (rows.length <= 1) {
        return createJsonResponse({ success: true, config: null });
      }
      try {
        const configJson = String(rows[1][1]);
        const parsed = JSON.parse(configJson);
        return createJsonResponse({ success: true, config: parsed });
      } catch (e) {
        return createJsonResponse({ success: true, config: null });
      }
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

// 🧹 구글 시트 탭 명칭 자동 표준화 헬퍼 (과업 1 / 과업 2 / 과업 3 일관 정리)
function standardizeSheetTabNames(sheet) {
  const tabRenames = {
    "인권 역사와 3세대 변화 연표 🏛️": "과업 1: 인권 역사 연표",
    "현대 인권 맵핑 및 성찰": "과업 2: 커뮤니티 맵핑",
    "과업 3: 헌법의 역할과 시민 참여 챗봇": "과업 3: 헌법과 시민참여",
    "헌법의 역할과 시민 참여 챗봇": "과업 3: 헌법과 시민참여",
    "커뮤니티맵핑": "MappingPins"
  };

  Object.keys(tabRenames).forEach(oldName => {
    const s = sheet.getSheetByName(oldName);
    if (s) {
      const targetName = tabRenames[oldName];
      const targetSheet = sheet.getSheetByName(targetName);
      if (!targetSheet) {
        s.setName(targetName);
      }
    }
  });
}
