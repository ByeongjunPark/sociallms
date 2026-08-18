// 글로벌 상태 관리 객체
const state = {
  student: {
    studentId: "",
    gradeClass: "",
    name: "",
    emoji: "👧"
  },
  progress: {}, // { activityId: 'completed' | 'in_progress' }
  currentFilter: "all",
  selectedEmoji: "👧",
  currentWizardStep: 1 // 회원가입 마법사 단계
};

// 🔐 이모지 비밀번호 다이얼 상수 및 상태
const PASSWORD_EMOJIS = [
  "🍎", "🍌", "🍒", "🍇", "🍉", "🍓", "🍍", "🥝",
  "🐱", "🐶", "🧸", "🐰", "🦁", "🐼", "🐸", "🐷",
  "🌸", "🎀", "🌟", "🍀", "🍦", "🍩", "🍕", "🎈"
];

const emojiPickerState = {
  login: [0, 0, 0, 0],  // 4개 슬롯의 PASSWORD_EMOJIS 인덱스
  signup: [0, 0, 0, 0]
};

// 페이지 로드 시 초기화
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  checkLoginState();
  initWizardTraitsEvents();
  initEmojiPasswordDials(); // 이모지 비밀번호 다이얼 연동
  fetchUnlockConfigFromServer(); // 구글 시트 백엔드 해금 상태 실시간 가져오기
});

// 테마 초기화 및 전환
function initTheme() {
  const savedTheme = localStorage.getItem("sociallms_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.textContent = savedTheme === "light" ? "🌙" : "☀️";
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("sociallms_theme", newTheme);
  
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.textContent = newTheme === "light" ? "🌙" : "☀️";
  }
}

// 로그아웃 (학생/교사 공통 세션 클리어)
function logout() {
  localStorage.removeItem("sociallms_student_id");
  localStorage.removeItem("sociallms_profile");
  localStorage.removeItem("sociallms_role");
  localStorage.removeItem("sociallms_progress");
  state.student = { studentId: "", gradeClass: "", name: "", emoji: "👧" };
  state.progress = {};
  location.reload();
}

// 로그인 상태 체크 및 화면 복구
function checkLoginState() {
  try {
    // 🧹 로컬스토리지 잔재 프로그레스/뱃지 캐시 정단 제거 (로그인 세션만 보존)
    [
      "sociallms_progress", "sociallms_progress_c10101", "sociallms_progress_c10201", "sociallms_progress_c10102",
      "sociallms_score_c10101", "sociallms_score_c10201", "sociallms_score_c10102",
      "sociallms_badge_c10101", "sociallms_badge_c10201", "sociallms_badge_c10102", "sociallms_pins_c10201"
    ].forEach(key => localStorage.removeItem(key));

    const savedProfile = localStorage.getItem("sociallms_profile");
    const savedStudentId = localStorage.getItem("sociallms_student_id");
    const savedRole = localStorage.getItem("sociallms_role");

    const authSec = document.getElementById("authSection");
    const dashboard = document.getElementById("mainDashboard");
    const tDashboard = document.getElementById("teacherDashboard");

    // 👑 교사용 세션 복구 및 대시보드 리다이렉트
    if (savedRole === "teacher") {
      if (authSec) authSec.style.display = "none";
      if (dashboard) dashboard.style.display = "none";
      if (tDashboard) {
        tDashboard.style.display = "block";
        switchTeacherTab("list"); // 교사 리스트 탭 화면 강제 가시화
      }
      loadTeacherData();
      return;
    }

    if (savedProfile && savedStudentId) {
      try {
        state.student = JSON.parse(savedProfile);
        state.student.studentId = savedStudentId;
      } catch (e) {
        console.error("Failed to parse savedProfile:", e);
      }
      
      // 화면 전환 (엘리먼트가 존재할 때만 안전하게 실행)
      if (authSec) authSec.style.display = "none";
      if (dashboard) {
        dashboard.style.display = "block";
        dashboard.classList.add("active");
      }
      if (tDashboard) tDashboard.style.display = "none";

      updateProfileUI();
      
      // 구글 시트로부터 학습 진척도 불러오기 및 렌더링
      loadProgressFromServer();
    } else {
      // 로그인창 노출
      if (authSec) authSec.style.display = "flex";
      if (dashboard) {
        dashboard.style.display = "none";
        dashboard.classList.remove("active");
      }
      if (tDashboard) tDashboard.style.display = "none";
    }
  } catch (err) {
    console.error("Critical error in checkLoginState:", err);
    // 예외 발생 시 안전하게 로그인 화면으로 복구
    const authSec = document.getElementById("authSection");
    if (authSec) authSec.style.display = "flex";
  }
}

// 탭 스위치 (로그인 / 회원등록 / 교사용)
function switchAuthTab(tab) {
  const tabLogin = document.getElementById("tabLogin");
  const tabSignup = document.getElementById("tabSignup");
  const tabTeacher = document.getElementById("tabTeacher");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const teacherLoginForm = document.getElementById("teacherLoginForm");

  if (!tabLogin || !tabSignup || !loginForm || !signupForm) return;

  // 모든 탭 초기화
  tabLogin.classList.remove("active");
  tabSignup.classList.remove("active");
  if (tabTeacher) tabTeacher.classList.remove("active");
  loginForm.classList.remove("active");
  signupForm.classList.remove("active");
  if (teacherLoginForm) teacherLoginForm.classList.remove("active");

  if (tab === "login") {
    tabLogin.classList.add("active");
    loginForm.classList.add("active");
  } else if (tab === "signup") {
    tabSignup.classList.add("active");
    signupForm.classList.add("active");
    // 회원가입 마법사 상태 1단계로 리셋
    resetWizard();
  } else if (tab === "teacher") {
    if (tabTeacher) tabTeacher.classList.add("active");
    if (teacherLoginForm) teacherLoginForm.classList.add("active");
  }
}

// 에모지 셀렉터
function selectEmoji(emoji, element) {
  state.selectedEmoji = emoji;
  const options = document.querySelectorAll("#signupForm .emoji-option");
  options.forEach(opt => opt.classList.remove("selected"));
  element.classList.add("selected");
}

// 학번 유효성 검사 헬퍼
function validateStudentId(id) {
  const idRegex = /^\d{4}$/; // 엄격한 숫자 4자리 검사
  return idRegex.test(String(id));
}

// 🔐 이모지 비밀번호 다이얼 회전 동작
function spinEmoji(type, dialIndex, direction) {
  const indexes = emojiPickerState[type];
  const len = PASSWORD_EMOJIS.length;
  
  // 새 인덱스 연산
  let nextIdx = (indexes[dialIndex] + direction) % len;
  if (nextIdx < 0) nextIdx = len - 1;
  
  indexes[dialIndex] = nextIdx;
  
  // UI 요소 업데이트
  const el = document.getElementById(`${type}_emoji_${dialIndex}`);
  if (el) {
    el.textContent = PASSWORD_EMOJIS[nextIdx];
    
    // 통통 튀는 바운스 애니메이션 효과 부여
    el.classList.add("bounce");
    setTimeout(() => {
      el.classList.remove("bounce");
    }, 150);
  }
}

// 이모지 비밀번호 다이얼 난수 초기화 (매번 다른 기본 조합 제공해 돌리는 재미 확보)
function initEmojiPasswordDials() {
  for (let i = 0; i < 4; i++) {
    // 0 ~ len-1 난수 설정
    const randLogin = Math.floor(Math.random() * PASSWORD_EMOJIS.length);
    const randSignup = Math.floor(Math.random() * PASSWORD_EMOJIS.length);
    
    emojiPickerState.login[i] = randLogin;
    emojiPickerState.signup[i] = randSignup;
    
    const loginEl = document.getElementById(`login_emoji_${i}`);
    if (loginEl) loginEl.textContent = PASSWORD_EMOJIS[randLogin];
    
    const signupEl = document.getElementById(`signup_emoji_${i}`);
    if (signupEl) signupEl.textContent = PASSWORD_EMOJIS[randSignup];
  }
}

// 로그인 실행
async function handleLogin() {
  const studentId = document.getElementById("loginStudentId").value.trim();
  const studentName = document.getElementById("loginStudentName").value.trim();

  if (!studentId || !studentName) {
    alert("학번과 이름을 모두 입력해 주세요! 💕");
    return;
  }

  if (!validateStudentId(studentId)) {
    alert("학번은 반드시 숫자 4자리로 입력해 주세요. (예: 1403) 🥺");
    return;
  }

  // 🔐 이모지 비밀번호 추출
  const password = emojiPickerState.login.map(idx => PASSWORD_EMOJIS[idx]).join("");

  showLoading("login", true);

  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "login",
        studentId,
        studentName,
        password // 이모지 비밀번호 4글자 전송
      })
    });

    const data = await response.json();
    showLoading("login", false);

    if (data.success) {
      localStorage.setItem("sociallms_student_id", studentId);
      localStorage.setItem("sociallms_profile", JSON.stringify(data.student));
      
      alert(`로그인 성공! 반가워요, ${data.student.name} 학생 🌸`);
      location.reload();
    } else {
      alert(data.message || "로그인에 실패했습니다.");
    }
  } catch (error) {
    showLoading("login", false);
    console.error("Login Error:", error);
    alert("서버 연결 실패: 로그인을 진행할 수 없습니다.");
  }
}

// 회원등록 마법사 제어 및 입력 이벤트 바인딩
function initWizardTraitsEvents() {
  // Q3 특징 그리드 태그 선택 제어 (change 이벤트로 안전하게 연동)
  const traitCheckboxes = document.querySelectorAll(".trait-tag-label input[type='checkbox']");
  traitCheckboxes.forEach(cb => {
    cb.addEventListener("change", function() {
      const label = this.closest(".trait-tag-label");
      if (this.checked) {
        label.classList.add("selected");
      } else {
        label.classList.remove("selected");
      }
    });
    
    // 강제 클릭 트리거용 라벨 터치 보완 (display: none인 인풋 터치 대응)
    const label = cb.closest(".trait-tag-label");
    label.addEventListener("click", function(e) {
      if (e.target.tagName === "INPUT") return;
      cb.click(); // 인풋에 직접 클릭을 강제 발송하여 change 이벤트 유발
      e.preventDefault();
    });
  });

  // 기타 주관식 체크 시 포커스 동기화
  ["q1", "q2", "q4", "q5", "q6", "q16", "q17", "q23", "q24"].forEach(q => {
    const etcCheck = document.getElementById(`${q}_etc_check`);
    const etcText = document.getElementById(`${q}_etc_text`);
    if (etcCheck && etcText) {
      etcText.addEventListener("focus", () => {
        etcCheck.checked = true;
        etcCheck.closest(".option-check-label")?.classList.add("selected");
      });
    }
  });

  // 일반 체크박스 라벨에 포커스/클래스 연동
  const checkLabels = document.querySelectorAll(".option-check-label");
  checkLabels.forEach(label => {
    label.addEventListener("change", function() {
      const input = this.querySelector("input");
      if (input.type === "checkbox") {
        if (input.checked) {
          this.classList.add("selected");
        } else {
          this.classList.remove("selected");
        }
      } else if (input.type === "radio") {
        const name = input.name;
        const siblings = document.querySelectorAll(`input[name='${name}']`);
        siblings.forEach(sib => {
          sib.closest(".option-check-label")?.classList.remove("selected");
        });
        if (input.checked) {
          this.classList.add("selected");
        }
      }
    });
  });
}

// 마법사 단계 초기화
function resetWizard() {
  state.currentWizardStep = 1;
  updateWizardUI();
  
  // 폼 비우기
  document.getElementById("signupStudentId").value = "";
  document.getElementById("signupStudentName").value = "";
  
  const checkboxes = document.querySelectorAll("#signupForm input[type='checkbox']");
  checkboxes.forEach(c => c.checked = false);
  const radios = document.querySelectorAll("#signupForm input[type='radio']");
  radios.forEach(r => r.checked = false);
  const textInputs = document.querySelectorAll("#signupForm input[type='text']");
  textInputs.forEach(t => {
    if (t.id !== "signupStudentId" && t.id !== "signupStudentName") t.value = "";
  });

  const selectedLabels = document.querySelectorAll("#signupForm .selected");
  selectedLabels.forEach(l => {
    if (!l.textContent.includes("👧")) l.classList.remove("selected");
  });

  // 이모지 비밀번호 난수 재조합
  initEmojiPasswordDials();
}

// 회원등록 마법사 스텝 이동
async function navigateWizard(direction) {
  const currentStep = state.currentWizardStep;
  const nextStep = currentStep + direction;

  if (direction === 1) {
    // 1단계: 기본 인풋 유효성 검사 및 학번 중복 사전 가드
    if (currentStep === 1) {
      const studentId = document.getElementById("signupStudentId").value.trim();
      const studentName = document.getElementById("signupStudentName").value.trim();
      
      if (!studentId || !studentName) {
        alert("학번과 이름을 모두 적어주세요! 💕");
        return;
      }
      if (!validateStudentId(studentId)) {
        alert("학번은 반드시 숫자 4자리로 적어주세요. (예: 1402) 🥺");
        return;
      }

      // 💡 [학번 중복 사전 차단 가드] 진단평가(7단계) 다 풀고 가입할 때 튕기는 불상사 사전 예방
      try {
        const checkRes = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "checkDuplicate",
            studentId: studentId,
            studentName: studentName
          })
        });
        const checkData = await checkRes.json();
        if (!checkData.success) {
          alert(checkData.message || "이미 등록 완료된 학번입니다! 로그인 탭으로 이동해 로그인해 주세요. 🌸");
          return;
        }
      } catch (err) {
        console.warn("Duplicate check API failed, skipping guard:", err);
      }
    }
    
    // 2단계: Q1 진로, Q2 시사이슈 접점 체크 여부 검증
    else if (currentStep === 2) {
      const q1Selected = document.querySelectorAll("input[name='q1']:checked").length > 0;
      const q2Selected = document.querySelectorAll("input[name='q2']:checked").length > 0;
      
      if (!q1Selected || !q2Selected) {
        alert("Q1과 Q2의 답변을 최소 1개 이상 골라주셔야 다음 단계로 넘어갈 수 있어요! 🌸");
        return;
      }
    }
    
    // 3단계: Q3 특징 선택지 검증
    else if (currentStep === 3) {
      const q3Selected = document.querySelectorAll("input[name='q3']:checked").length > 0;
      if (!q3Selected) {
        alert("나를 잘 설명하는 표현(Q3)을 최소 1개 이상 골라주세요! 💕");
        return;
      }
    }
    
    // 4단계: Q4 모둠 역할, Q5 과제 종류 검증
    else if (currentStep === 4) {
      const q4Selected = document.querySelectorAll("input[name='q4']:checked").length > 0;
      const q5Selected = document.querySelectorAll("input[name='q5']:checked").length > 0;
      if (!q4Selected || !q5Selected) {
        alert("Q4와 Q5의 답변을 최소 1개 이상 선택해 주세요! 💡");
        return;
      }
    }
    
    // 5단계: AI 리터러시 Q6, Q7, Q8, Q9 검증
    else if (currentStep === 5) {
      for (let qNum = 6; qNum <= 9; qNum++) {
        const selected = document.querySelectorAll(`input[name='q${qNum}']:checked`).length > 0;
        if (!selected) {
          alert(`Q${qNum} 질문에 대한 답변을 선택해 주세요! 🤖`);
          return;
        }
      }
    }
    
    // 6단계: 1단원 인권 개념 및 토론 진단평가 검증 (Q10 ~ Q15 전원 필수)
    else if (currentStep === 6) {
      for (let qNum = 10; qNum <= 15; qNum++) {
        const selected = document.querySelector(`input[name='q${qNum}']:checked`);
        if (!selected) {
          alert(`1단원 진단평가의 Q${qNum}번 문항에 답해 주세요! 🏛️\n모든 개념 및 토론 문제에 답하셔야 합니다.`);
          return;
        }
        
        if (selected.value === "기타") {
          const etcText = document.getElementById(`q${qNum}_etc_text`).value.trim();
          if (!etcText) {
            alert(`Q${qNum}번의 기타 선택지에 의견을 서술해 주세요! ✍️`);
            return;
          }
        }
      }
    }
    
    // 7단계: 3단원 경제 개념 및 토론 진단평가 검증 (Q16 ~ Q21 전원 필수)
    else if (currentStep === 7) {
      for (let qNum = 16; qNum <= 21; qNum++) {
        const selected = document.querySelector(`input[name='q${qNum}']:checked`);
        if (!selected) {
          alert(`3단원 진단평가의 Q${qNum}번 문항에 답해 주세요! 📈\n모든 개념 및 토론 문제에 답하셔야 합니다.`);
          return;
        }
        
        if (selected.value === "기타") {
          const etcText = document.getElementById(`q${qNum}_etc_text`).value.trim();
          if (!etcText) {
            alert(`Q${qNum}번의 기타 선택지에 의견을 서술해 주세요! ✍️`);
            return;
          }
        }
      }
      
      handleSignup();
      return;
    }
  }

  if (nextStep >= 1 && nextStep <= 7) {
    state.currentWizardStep = nextStep;
    updateWizardUI();
  }
}

// 스텝 변경에 따른 화면 업데이트
function updateWizardUI() {
  for (let i = 1; i <= 7; i++) {
    const el = document.getElementById(`signUpStep${i}`);
    if (el) el.classList.remove("active");
  }

  const currentStepEl = document.getElementById(`signUpStep${state.currentWizardStep}`);
  if (currentStepEl) currentStepEl.classList.add("active");

  const dots = document.querySelectorAll("#stepProgressDots .step-dot");
  dots.forEach((dot, idx) => {
    if (idx + 1 === state.currentWizardStep) {
      dot.classList.add("active");
    } else {
      dot.classList.remove("active");
    }
  });

  const stepTitles = {
    1: "1단계: 기본 정보 입력 👧",
    2: "2단계: 진로 및 시사 관심사 🧭",
    3: "3단계: 나의 성향 특징 선택 🏷️",
    4: "4단계: 모둠 역할 및 과제 스타일 💡",
    5: "5단계: AI 활용 습관 진단 🤖",
    6: "6단계: [PART 2] 1단원 인권 진단평가 🏛️",
    7: "7단계: [PART 3] 3단원 경제 진단평가 📈"
  };
  document.getElementById("stepIndicatorText").textContent = stepTitles[state.currentWizardStep];

  const btnPrev = document.getElementById("btnPrevStep");
  const btnNext = document.getElementById("btnNextStep");

  if (state.currentWizardStep === 1) {
    btnPrev.style.display = "none";
  } else {
    btnPrev.style.display = "block";
  }

  if (state.currentWizardStep === 7) {
    btnNext.textContent = "가입 및 진단 제출하기 🌸";
  } else {
    btnNext.textContent = "다음으로 ✨";
  }
  
  document.querySelector(".auth-card").scrollTop = 0;
}

// 다중 선택형 데이터 추출 헬퍼
function getCheckboxValues(groupName, hasEtc = false) {
  const checkboxes = document.querySelectorAll(`input[name='${groupName}']:checked`);
  const values = [];
  
  checkboxes.forEach(c => {
    if (c.value === "기타") {
      if (hasEtc) {
        const etcText = document.getElementById(`${groupName}_etc_text`).value.trim();
        if (etcText) values.push(`기타(${etcText})`);
      }
    } else {
      values.push(c.value);
    }
  });
  return values.join(", ");
}

// 단일 선택형 데이터 추출 헬퍼
function getRadioValueWithQuiz(groupName, correctAnswer = null, hasEtc = false) {
  const radio = document.querySelector(`input[name='${groupName}']:checked`);
  if (!radio) return "미선택";
  
  let val = radio.value;
  if (val === "기타" && hasEtc) {
    const etcText = document.getElementById(`${groupName}_etc_text`).value.trim();
    return `기타(${etcText})`;
  }

  if (correctAnswer) {
    const isCorrect = val === correctAnswer;
    return `${val} (${isCorrect ? '정답 ⭕' : '오답 ❌'})`;
  }
  return val;
}

// 회원 등록 및 진단평가 제출
async function handleSignup() {
  const studentId = document.getElementById("signupStudentId").value.trim();
  const studentName = document.getElementById("signupStudentName").value.trim();

  if (!confirm("작성하신 진단 설문과 함께 가입을 최종 제출하시겠습니까? 🌸")) {
    return;
  }

  showLoading("signup", true);

  // 🔐 설정한 이모지 패스워드 취득
  const password = emojiPickerState.signup.map(idx => PASSWORD_EMOJIS[idx]).join("");

  // 데이터 수집 프로세스 (총 Q1~Q21개 문항으로 축소)
  const payload = {
    action: "signup",
    studentId,
    studentName,
    emoji: state.selectedEmoji,
    password, // 이모지 비밀번호 동적 주입
    
    // [PART 1] 설문 응답
    "Q1_희망진로": getCheckboxValues("q1", true),
    "Q2_뉴스접하는곳": getCheckboxValues("q2", true),
    "Q3_나의특징": getCheckboxValues("q3"),
    "Q4_모둠역할선호": getCheckboxValues("q4", true),
    "Q5_자신있는과제": getCheckboxValues("q5", true),
    "Q6_AI경험": getCheckboxValues("q6", true),
    "Q7_AI습관": getCheckboxValues("q7"),
    "Q8_AI윤리자각": getCheckboxValues("q8", true),
    "Q9_AI과제불편함": getCheckboxValues("q9", true),

    // [PART 2] 1단원 인권 진단평가 (중학교 성취기준 기반 6문항)
    "Q10_기본권매칭": getRadioValueWithQuiz("q10", "①"),
    "Q11_기본권제한목적": getRadioValueWithQuiz("q11", "④"),
    "Q12_청소년근로권": getRadioValueWithQuiz("q12", "④"),
    "Q13_인권구제기관": getRadioValueWithQuiz("q13", "①"),
    "Q14_인권보편성토론": getRadioValueWithQuiz("q14", null, true),
    "Q15_자유vs안전토론": getRadioValueWithQuiz("q15", null, true),

    // [PART 3] 3단원 경제 진단평가 (중학교 성취기준 기반 6문항)
    "Q16_합리적선택": getRadioValueWithQuiz("q16", "②"),
    "Q17_시장가격결정": getRadioValueWithQuiz("q17", "①"),
    "Q18_예적금vs주식": getRadioValueWithQuiz("q18", "③"),
    "Q19_환율상승영향": getRadioValueWithQuiz("q19", "①"),
    "Q20_자율vs개입규제토론": getRadioValueWithQuiz("q20", null, true),
    "Q21_자산관리우선가치토론": getRadioValueWithQuiz("q21", null, true),
    
    // 💡 [개선] Q22 선생님 첫인상 및 Q23 수업 요청사항 분리 수집
    "Q22_선생님첫인상": document.getElementById("q22_text") ? document.getElementById("q22_text").value.trim() : "없음",
    "Q23_수업요청사항": document.getElementById("q23_text") ? document.getElementById("q23_text").value.trim() : "없음"
  };

  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    showLoading("signup", false);

    if (data.success) {
      alert(data.message);
      // 로그인 대화상자에 정보 기입 후 자동으로 로그인 폼으로 스위칭
      document.getElementById("loginStudentId").value = studentId;
      document.getElementById("loginStudentName").value = studentName;
      
      // 로그인 피커에도 본인이 가입 시 조합한 이모지를 매치하여 바로 로그인 가능하게 인덱스 동기화해줌
      for (let i = 0; i < 4; i++) {
        emojiPickerState.login[i] = emojiPickerState.signup[i];
        document.getElementById(`login_emoji_${i}`).textContent = PASSWORD_EMOJIS[emojiPickerState.login[i]];
      }
      
      switchAuthTab("login");
      handleLogin();
    } else {
      alert(data.message || "가입 제출에 실패했습니다.");
    }
  } catch (error) {
    showLoading("signup", false);
    console.error("Signup Wizard Submit Error:", error);
    alert("서버 연결 실패: 진단 평가를 제출할 수 없습니다.");
  }
}

// 로그아웃
function handleLogout() {
  if (confirm("정말 로그아웃 하시겠어요? 🌸")) {
    localStorage.removeItem("sociallms_student_id");
    localStorage.removeItem("sociallms_profile");
    localStorage.removeItem("sociallms_progress");
    location.reload();
  }
}

// 로딩 표시기 개편
function showLoading(type, isLoading) {
  const overlay = document.getElementById("authLoadingOverlay");
  const loadingText = document.getElementById("authLoadingText");

  if (overlay) {
    if (isLoading) {
      if (type === "signup") {
        if (loadingText) loadingText.textContent = "나의 소중한 진로/배움 진단 데이터를 등록하고 있습니다... 🌸";
      } else {
        if (loadingText) loadingText.textContent = "구글 시트 데이터베이스에서 나의 배움 진척도를 가져오고 있습니다... 🔐";
      }
      overlay.style.display = "flex";
    } else {
      overlay.style.display = "none";
    }
  }

  const btn = type === "signup" 
    ? document.getElementById("btnNextStep")
    : document.querySelector("#loginForm button");
    
  if (btn) {
    btn.disabled = isLoading;
  }
}

// 학생 프로필 UI 업데이트
function updateProfileUI() {
  const nameDisplay = document.getElementById("studentNameDisplay");
  const welcomeName = document.getElementById("welcomeName");
  const studentEmoji = document.getElementById("studentEmoji");
  
  const myCareerTag = document.getElementById("myCareerTag");
  const myTraitsCloud = document.getElementById("myTraitsCloud");
  const myTaskTag = document.getElementById("myTaskTag");
  
  const savedProfile = localStorage.getItem("sociallms_profile");
  let studentData = {};
  if (savedProfile) {
    studentData = JSON.parse(savedProfile);
  }

  if (state.student.name) {
    const studentId = state.student.studentId;
    let formattedName = "";
    if (studentId && studentId.length === 4) {
      const grade = studentId.charAt(0);
      const classNum = parseInt(studentId.charAt(1));
      const sNum = parseInt(studentId.substring(2));
      formattedName = `${grade}학년 ${classNum}반 ${sNum}번 ${state.student.name}`;
    } else {
      formattedName = `${state.student.name} 학생`;
    }
    if (nameDisplay) nameDisplay.textContent = formattedName;
    if (welcomeName) welcomeName.textContent = state.student.name;
    
    // 📊 대시보드 상단 나의 Baseline 프로필 데이터 매핑 (진단평가 오답 문항 값 오버랩 엄격 차단)
    const isDiagnosticValue = (val) => {
      if (!val) return false;
      const s = String(val).trim();
      return /^[①②③④]/.test(s) || s.includes("(오답") || s.includes("(정답");
    };

    const getExactProfileVal = (exactKey, patternList, defaultVal) => {
      // 1. 정확한 키 우선 매칭 (단, 진단평가 오답 문자열은 배제)
      if (studentData[exactKey] !== undefined && studentData[exactKey] !== null) {
        const val = String(studentData[exactKey]).trim();
        if (val !== "" && !isDiagnosticValue(val)) {
          return val;
        }
      }
      // 2. Q10~Q23 진단평가 객관식 문항 키 제외 및 정교한 패턴 탐색
      for (let k in studentData) {
        const cleanK = String(k).trim();
        if (/^Q1[0-9]/.test(cleanK) || /^Q2[0-9]/.test(cleanK)) continue; // Q10, Q11 등 진단문항 제외

        for (let pat of patternList) {
          if (cleanK === pat || cleanK.includes(pat)) {
            const candidate = studentData[k];
            if (candidate !== undefined && candidate !== null) {
              const val = String(candidate).trim();
              if (val !== "" && !isDiagnosticValue(val)) {
                return val;
              }
            }
          }
        }
      }
      return defaultVal;
    };

    const careerVal = getExactProfileVal("Q1_희망진로", ["Q1_희망진로", "희망진로", "진로"], "진로 미정");
    if (myCareerTag) {
      myCareerTag.textContent = careerVal;
    }
    
    if (myTraitsCloud) {
      myTraitsCloud.innerHTML = "";
      const traitsStr = getExactProfileVal("Q3_나의특징", ["Q3_나의특징", "나의특징", "특징"], "");
      if (traitsStr) {
        const traitsArr = traitsStr.split(",").map(t => t.trim());
        traitsArr.forEach(trait => {
          if (trait) {
            const badge = document.createElement("span");
            badge.style.cssText = "background: rgba(184, 150, 219, 0.15); color: var(--color-purple); padding: 3px 8px; border-radius: 8px; font-weight: 700; font-size: 0.72rem;";
            badge.textContent = trait;
            myTraitsCloud.appendChild(badge);
          }
        });
      } else {
        const badge = document.createElement("span");
        badge.style.cssText = "background: rgba(0,0,0,0.04); color: var(--text-secondary); padding: 3px 8px; border-radius: 8px; font-weight: 600; font-size: 0.72rem;";
        badge.textContent = "특징 미설정";
        myTraitsCloud.appendChild(badge);
      }
    }
    
    const taskVal = getExactProfileVal("Q5_자신있는과제", ["Q5_자신있는과제", "자신있는과제", "강점과제"], "과제선호 미설정");
    if (myTaskTag) {
      myTaskTag.textContent = taskVal;
    }
  } else {
    if (nameDisplay) nameDisplay.textContent = "로그아웃";
    if (welcomeName) welcomeName.textContent = "친구";
  }
  
  const emojiEl = document.getElementById("welcomeEmoji");
  if (emojiEl) emojiEl.textContent = state.student.emoji || "👧";
  if (studentEmoji) studentEmoji.textContent = state.student.emoji || "👧";
}

// 구글 시트로부터 학습 진척도 가져오기 (서버 데이터 100% 실시간 원천 반영)
async function loadProgressFromServer() {
  try {
    const response = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "getProgress",
        studentId: state.student.studentId
      })
    });

    const data = await response.json();
    if (data.success && data.progress) {
      const serverProgress = data.progress;
      const mappedProgress = {};
      const serverScores = {};
      
      CURRICULUM_DATA.forEach(standard => {
        standard.activities.forEach(act => {
          const matchedTabName = Object.keys(serverProgress).find(tabName => {
            const cleanTab = tabName.replace(/\s+/g, '').replace(/🏛️|🗺️|🏛|🗺|💬/g, '');
            const cleanTitle = act.title.replace(/\s+/g, '').replace(/🏛️|🗺️|🏛|🗺|💬/g, '');

            if (act.id === "c10101_worksheet" && (cleanTab.includes("연표") || cleanTab.includes("3세대") || cleanTab.includes("과업1"))) return true;
            if (act.id === "c10201_mapping" && (cleanTab.includes("맵핑") || cleanTab.includes("현대인권") || cleanTab.includes("과업2"))) return true;
            if ((act.id === "c10102_chatbot" || act.id === "c10102") && (cleanTab.includes("헌법") || cleanTab.includes("챗봇") || cleanTab.includes("시민참여") || cleanTab.includes("과업3"))) return true;

            return cleanTitle.includes(cleanTab) || cleanTab.includes(cleanTitle);
          });
          
          if (matchedTabName && serverProgress[matchedTabName] === "completed") {
            mappedProgress[act.id] = "completed";
          }
        });
      });

      state.progress = mappedProgress;
      
      if (data.scores) {
        Object.keys(data.scores).forEach(tabName => {
          const score = parseInt(data.scores[tabName]) || 0;
          const cleanTab = tabName.replace(/\s+/g, '').replace(/🏛️|🗺️|🏛|🗺|💬/g, '');
          
          if (cleanTab.includes("연표") || cleanTab.includes("3세대") || cleanTab.includes("과업1")) {
            serverScores["c10101"] = score;
          }
          if (cleanTab.includes("맵핑") || cleanTab.includes("현대인권") || cleanTab.includes("과업2")) {
            serverScores["c10201"] = score;
          }
          if (cleanTab.includes("헌법") || cleanTab.includes("챗봇") || cleanTab.includes("시민참여") || cleanTab.includes("과업3")) {
            serverScores["c10102"] = score;
          }
        });
      }

      state.serverScores = serverScores;
      if (data.details) {
        state.student.activities = data.details;
      }
      state.pinsCount = data.pins ? (data.pins["과업 2: 커뮤니티 맵핑"] || data.pins["현대 인권 맵핑 및 성찰"] || 3) : 3;
    }
  } catch (error) {
    console.error("Failed to load progress from server:", error);
  }

  renderStandards();
  updateDashboardStats();
  renderBadgesWidget();
}

// 대시보드 통계 업데이트
function updateDashboardStats() {
  let totalAct = 0;
  let completedAct = 0;

  CURRICULUM_DATA.forEach(standard => {
    standard.activities.forEach(act => {
      if (act.type !== "coming_soon") {
        totalAct++;
        if (state.progress[act.id] === "completed") {
          completedAct++;
        }
      }
    });
  });

  const statTotal = document.getElementById("statTotal");
  const statCompleted = document.getElementById("statCompleted");
  const progressBar = document.getElementById("progressBar");
  const progressPercent = document.getElementById("progressPercent");

  if (statTotal) statTotal.textContent = totalAct;
  if (statCompleted) statCompleted.textContent = completedAct;

  const percent = totalAct > 0 ? Math.round((completedAct / totalAct) * 100) : 0;
  if (progressBar) progressBar.style.width = `${percent}%`;
  if (progressPercent) progressPercent.textContent = `${percent}%`;

  // 🏛️ 성취기준별 탐구 달성 리포트 렌더링
  const progressListEl = document.getElementById("studentStandardsProgress");
  if (progressListEl) {
    progressListEl.innerHTML = "";
    CURRICULUM_DATA.forEach(standard => {
      let hasAct = false;
      let allCompleted = true;
      let isStarted = false;
      
      standard.activities.forEach(act => {
        if (act.type !== "coming_soon") {
          hasAct = true;
          const status = state.progress[act.id] || "not_started";
          if (status !== "completed") {
            allCompleted = false;
          }
          if (status === "completed" || status === "in_progress") {
            isStarted = true;
          }
        }
      });
      
      let statusBadge = "";
      if (!hasAct) {
        statusBadge = `<span style="background: rgba(0,0,0,0.03); color: var(--text-secondary); padding: 2px 8px; border-radius: 8px; font-weight:700;">🔒 준비중</span>`;
      } else if (allCompleted) {
        statusBadge = `<span style="background: rgba(43, 138, 98, 0.12); color: #2b8a3e; padding: 2px 8px; border-radius: 8px; font-weight:700;">💚 완료됨</span>`;
      } else if (isStarted) {
        statusBadge = `<span style="background: rgba(247, 103, 7, 0.12); color: #d9480f; padding: 2px 8px; border-radius: 8px; font-weight:700;">📝 진행중</span>`;
      } else {
        statusBadge = `<span style="background: rgba(0,0,0,0.04); color: var(--text-secondary); padding: 2px 8px; border-radius: 8px; font-weight:700;">⏳ 미시작</span>`;
      }
      
      progressListEl.innerHTML += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: rgba(255,255,255,0.4); border-radius: 10px; border: 1px solid rgba(0,0,0,0.02);">
          <span style="font-weight: 700; color: var(--text-primary); text-overflow: ellipsis; white-space: nowrap; overflow: hidden; max-width: 190px;" title="${standard.code} ${standard.title}">
            ${standard.code} ${standard.title}
          </span>
          ${statusBadge}
        </div>
      `;
    });
  }

  // 🏅 뱃지 위젯 렌더링 호출
  renderBadgesWidget();
}

// 🏅 게이미피케이션 뱃지 산출 엔진 (구글 시트 실시간 데이터 원천 기반 4단계 등급 뱃지)
function getUserBadges(studentObj = null, progressObj = null) {
  const profile = studentObj || state.student || {};
  const prog = progressObj || state.progress || {};
  const scores = state.serverScores || {};

  const task1Done = prog["c10101_worksheet"] === "completed";
  const task2Done = prog["c10201_mapping"] === "completed";
  const task3Done = prog["c10102_chatbot"] === "completed" || prog["c10102"] === "completed";

  // 1. [과업 1] 인권 역사 연표 4단계 등급 산출
  let task1Badge = {
    id: "b_task1",
    task: "과업 1",
    taskTitle: "인권 역사 연표 & 4세대 탐구",
    level: 0,
    tierName: "미획득",
    icon: "🔒",
    color: "#868e96",
    badgeLabel: "미이수 🔒",
    desc: "1단계 형성평가 + 2단계 전이과제 + 3단계 메타성찰 전체 완수 시 수여됩니다!"
  };
  if (task1Done) {
    const score = scores["c10101"] !== undefined ? scores["c10101"] : 75;
    
    // 📌 학생의 시트 세부 데이터 중 루브릭 검증
    const studentActs = (profile && profile.activities) || (state.student && state.student.activities) || {};
    let t1Details = null;
    Object.keys(studentActs).forEach(k => {
      if ((k.includes("과업 1") || k.includes("연표") || k.includes("3세대")) && k.endsWith("_details")) {
        t1Details = studentActs[k];
      }
    });

    let isAllExcellent = false;
    if (t1Details) {
      const r1 = t1Details["루브릭_논리성"] || "";
      const r2 = t1Details["루브릭_시사성"] || "";
      const r3 = t1Details["루브릭_보편가치"] || "";
      if (r1 === "우수" && r2 === "우수" && r3 === "우수") {
        isAllExcellent = true;
      }
    }

    if (score >= 90 && isAllExcellent) {
      task1Badge = { id: "b_task1", task: "과업 1", taskTitle: "인권 역사 연표 & 4세대 탐구", level: 4, tierName: "다이아 뱃지 (Diamond 💎)", icon: "💎", color: "#00b4d8", badgeLabel: "Diamond 💎 (최우수)", desc: "1단원 연표 형성평가/정렬/세대 매칭 100% 성공 및 4세대 루브릭 3대 차원 모두 '우수'!" };
    } else if (score >= 60) {
      task1Badge = { id: "b_task1", task: "과업 1", taskTitle: "인권 역사 연표 & 4세대 탐구", level: 3, tierName: "금 뱃지 (Gold 🥇)", icon: "🥇", color: "#f59f00", badgeLabel: "Gold 🥇 (우수)", desc: "인권 연표 정렬 완벽 성공 및 4세대 인권 루브릭 우수/보통 획득!" };
    } else if (score >= 40) {
      task1Badge = { id: "b_task1", task: "과업 1", taskTitle: "인권 역사 연표 & 4세대 탐구", level: 2, tierName: "은 뱃지 (Silver 🥈)", icon: "🥈", color: "#868e96", badgeLabel: "Silver 🥈 (보통)", desc: "형성평가 매칭 성공 및 4세대 인권 제안 탐구 완수!" };
    } else {
      task1Badge = { id: "b_task1", task: "과업 1", taskTitle: "인권 역사 연표 & 4세대 탐구", level: 1, tierName: "동 뱃지 (Bronze 🥉)", icon: "🥉", color: "#d9480f", badgeLabel: "Bronze 🥉 (노력)", desc: "4세대 인권 탐구 및 성찰 과제 이수 완료!" };
    }
  }

  // 2. [과업 2] 현대 인권 커뮤니티 맵핑 4단계 등급 산출
  let task2Badge = {
    id: "b_task2",
    task: "과업 2",
    taskTitle: "현대 인권 커뮤니티 맵핑",
    level: 0,
    tierName: "미획득",
    icon: "🔒",
    color: "#868e96",
    badgeLabel: "미이수 🔒",
    desc: "1단계 형성평가 + 2단계 커뮤니티 맵핑 + 3단계 시민성찰 전체 완수 시 수여됩니다!"
  };
  if (task2Done) {
    const score = scores["c10201"] !== undefined ? scores["c10201"] : 80;
    const pins = state.pinsCount || 3;

    if (score >= 90 && pins >= 3) {
      task2Badge = { id: "b_task2", task: "과업 2", taskTitle: "현대 인권 커뮤니티 맵핑", level: 4, tierName: "다이아 뱃지 (Diamond 💎)", icon: "💎", color: "#00b4d8", badgeLabel: "Diamond 💎 (최우수)", desc: "형성평가 90점 이상 + 지도 핀 3개 이상 등록 완료!" };
    } else if (score >= 75) {
      task2Badge = { id: "b_task2", task: "과업 2", taskTitle: "현대 인권 커뮤니티 맵핑", level: 3, tierName: "금 뱃지 (Gold 🥇)", icon: "🥇", color: "#f59f00", badgeLabel: "Gold 🥇 (우수)", desc: "형성평가 75점 이상 + 현대 인권 맵핑 탐구 완수!" };
    } else if (score >= 60) {
      task2Badge = { id: "b_task2", task: "과업 2", taskTitle: "현대 인권 커뮤니티 맵핑", level: 2, tierName: "은 뱃지 (Silver 🥈)", icon: "🥈", color: "#868e96", badgeLabel: "Silver 🥈 (보통)", desc: "형성평가 60점 이상 및 시민 참여 성찰 완료!" };
    } else {
      task2Badge = { id: "b_task2", task: "과업 2", taskTitle: "현대 인권 커뮤니티 맵핑", level: 1, tierName: "동 뱃지 (Bronze 🥉)", icon: "🥉", color: "#d9480f", badgeLabel: "Bronze 🥉 (노력)", desc: "형성평가 및 3단계 시민참여 성찰 기본 이수 완료!" };
    }
  }

  // 3. [과업 3] 헌법과 시민참여 AI 챗봇 4단계 등급 산출
  let task3Badge = {
    id: "b_task3",
    task: "과업 3",
    taskTitle: "헌법과 시민참여 (AI 챗봇)",
    level: 0,
    tierName: "미획득",
    icon: "🔒",
    color: "#868e96",
    badgeLabel: "미이수 🔒",
    desc: "1단계 형성평가 + 2단계 가상 시민 챗봇 대화 + 3단계 시민성찰 완수 시 수여됩니다!"
  };
  if (task3Done) {
    const score = scores["c10102"] !== undefined ? scores["c10102"] : 80;

    if (score >= 90) {
      task3Badge = { id: "b_task3", task: "과업 3", taskTitle: "헌법과 시민참여 (AI 챗봇)", level: 4, tierName: "다이아 뱃지 (Diamond 💎)", icon: "💎", color: "#00b4d8", badgeLabel: "Diamond 💎 (최우수)", desc: "형성평가 90점 이상 + 챗봇 대화 및 시민참여 성찰 완료!" };
    } else if (score >= 75) {
      task3Badge = { id: "b_task3", task: "과업 3", taskTitle: "헌법과 시민참여 (AI 챗봇)", level: 3, tierName: "금 뱃지 (Gold 🥇)", icon: "🥇", color: "#f59f00", badgeLabel: "Gold 🥇 (우수)", desc: "형성평가 75점 이상 및 AI 챗봇 인권 구제 솔루션 제시!" };
    } else if (score >= 60) {
      task3Badge = { id: "b_task3", task: "과업 3", taskTitle: "헌법과 시민참여 (AI 챗봇)", level: 2, tierName: "은 뱃지 (Silver 🥈)", icon: "🥈", color: "#868e96", badgeLabel: "Silver 🥈 (보통)", desc: "형성평가 60점 이상 및 시민 불복종 4대 요건 탐구 완료!" };
    } else {
      task3Badge = { id: "b_task3", task: "과업 3", taskTitle: "헌법과 시민참여 (AI 챗봇)", level: 1, tierName: "동 뱃지 (Bronze 🥉)", icon: "🥉", color: "#d9480f", badgeLabel: "Bronze 🥉 (노력)", desc: "챗봇 대화 및 3단계 시민참여 성찰 이수 완료!" };
    }
  }

  return [task1Badge, task2Badge, task3Badge];
}

// 🏅 학생 대시보드 뱃지 위젯 그리드 렌더링 (생성 과업 1:1 4단계 성취 등급 체계)
function renderBadgesWidget() {
  const gridContainer = document.getElementById("badgeGridContainer");
  const counterBadge = document.getElementById("badgeCounterBadge");
  if (!gridContainer) return;

  const badges = getUserBadges();
  const unlockedCount = badges.filter(b => b.level > 0).length;

  if (counterBadge) {
    counterBadge.textContent = `획득 뱃지: ${unlockedCount} / ${badges.length}개 🏅`;
  }

  gridContainer.innerHTML = badges.map(b => {
    if (b.level > 0) {
      return `
        <div style="background: rgba(255,255,255,0.92); border: 2px solid ${b.color}; border-radius: 20px; padding: 18px 14px; display: flex; flex-direction: column; align-items: center; text-align: center; box-shadow: 0 6px 16px rgba(0,0,0,0.04); transition: transform 0.2s;">
          <div style="font-size: 2.2rem; margin-bottom: 6px; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.15));">${b.icon}</div>
          <span style="font-size: 0.72rem; color: var(--color-purple); font-weight: 800; background: rgba(184,150,219,0.12); padding: 2px 10px; border-radius: 6px; margin-bottom: 4px;">${b.task}</span>
          <strong style="font-size: 0.88rem; color: var(--text-primary); margin-bottom: 2px;">${b.taskTitle}</strong>
          <span style="font-size: 0.75rem; color: ${b.color}; font-weight: 800; margin-bottom: 6px;">${b.tierName}</span>
          <span style="font-size: 0.72rem; color: var(--text-secondary); line-height: 1.3;">${b.desc}</span>
          <span style="margin-top: 10px; background: ${b.color}; color: white; padding: 4px 12px; border-radius: 10px; font-size: 0.72rem; font-weight: 800; box-shadow: 0 3px 8px rgba(0,0,0,0.15);">${b.badgeLabel}</span>
        </div>
      `;
    } else {
      return `
        <div style="background: rgba(0,0,0,0.02); border: 1.5px dashed rgba(0,0,0,0.1); border-radius: 20px; padding: 18px 14px; display: flex; flex-direction: column; align-items: center; text-align: center; opacity: 0.65;">
          <div style="font-size: 2.2rem; margin-bottom: 6px; filter: grayscale(1); opacity: 0.4;">🔒</div>
          <span style="font-size: 0.72rem; color: var(--text-secondary); font-weight: 700; background: rgba(0,0,0,0.04); padding: 2px 10px; border-radius: 6px; margin-bottom: 4px;">${b.task}</span>
          <strong style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 2px;">${b.taskTitle}</strong>
          <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 700; margin-bottom: 6px;">미획득 🔒</span>
          <span style="font-size: 0.72rem; color: var(--text-secondary); line-height: 1.3;">${b.desc}</span>
          <span style="margin-top: 10px; background: rgba(0,0,0,0.05); color: var(--text-secondary); padding: 4px 12px; border-radius: 10px; font-size: 0.72rem; font-weight: 700;">미이수 🔒</span>
        </div>
      `;
    }
  }).join("");
}

// 성취기준 카드 렌더링
function renderStandards() {
  const grid = document.getElementById("standardsGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const filteredData = state.currentFilter === "all" 
    ? CURRICULUM_DATA 
    : CURRICULUM_DATA.filter(item => item.category === state.currentFilter);

  filteredData.forEach(item => {
    const card = document.createElement("article");
    card.className = "standard-card";
    card.style.setProperty("--accent-color", item.color);
    
    const hasActivities = item.activities && item.activities.length > 0;

    if (hasActivities) {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".activity-item") || e.target.closest("button")) {
          return;
        }
        toggleCardExpand(card);
      });
    } else {
      card.style.cursor = "default";
    }

    let activitiesHTML = "";
    if (hasActivities) {
      activitiesHTML = `
        <div class="activities-section">
          <div class="activities-title">
            <span>✨ 배움 활동 목록</span>
          </div>
          <div class="activity-list">
            ${item.activities.map(act => {
              const status = state.progress[act.id] || "not_started";
              const isComingSoon = act.type === "coming_soon";
              let statusText = "시작하기";
              let statusClass = "";

              if (status === "completed") {
                statusText = "완료됨 🌿";
                statusClass = "completed";
              } else if (status === "in_progress") {
                statusText = "진행중 📝";
                statusClass = "in_progress";
              }

              if (isComingSoon) {
                statusText = "준비 중 🌸";
                statusClass = "disabled";
              }

              return `
                <a href="${act.url}" class="activity-item ${isComingSoon || !isActivityUnlockedForStudent(act.id) ? 'disabled' : ''}" data-act-id="${act.id}" onclick="onActivityClick('${act.id}', '${act.type}', event)">
                  <div class="activity-info">
                    <div class="activity-title-wrapper">
                      <span class="activity-name">${act.title}</span>
                      <span class="activity-type-badge ${act.type}">${getKoreanActivityType(act.type)}</span>
                      ${!isActivityUnlockedForStudent(act.id) ? '<span style="font-size:0.7rem; font-weight:800; color:#e03131; background:rgba(224,49,49,0.1); padding:2px 6px; border-radius:4px; margin-left:6px;">🔒 해금 대기 중</span>' : ''}
                    </div>
                    <p class="activity-desc">${act.description}</p>
                  </div>
                  <div class="activity-meta">
                    <span class="activity-time">⏳ ${act.timeRequired}</span>
                    <span class="status-indicator ${statusClass}"></span>
                    <button class="activity-action-btn">${!isActivityUnlockedForStudent(act.id) ? '🔒 진도 대기 중' : statusText}</button>
                  </div>
                </a>
              `;
            }).join("")}
          </div>
        </div>
      `;
    } else {
      activitiesHTML = `
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(0,0,0,0.05); text-align: right;">
          <span style="font-size: 0.8rem; background: var(--bg-card); border: 1px solid var(--border-glass); padding: 4px 10px; border-radius: 8px; color: var(--text-secondary); font-weight: 600;">
            🌸 곧 재미있는 활동이 추가될 예정입니다!
          </span>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="card-header">
        <span class="card-badge" style="--badge-bg: ${item.color}15; --badge-color: ${item.color}">${item.code}</span>
        <span class="card-category" style="--badge-color: ${item.color}">${item.category}</span>
      </div>
      <h3>${item.title}</h3>
      <p class="description" style="-webkit-line-clamp: unset;">${item.description}</p>
      ${activitiesHTML}
    `;

    grid.appendChild(card);
  });
}

function getKoreanActivityType(type) {
  switch (type) {
    case "worksheet": return "배움 활동지";
    case "chatbot": return "생각 챗봇";
    case "simulation": return "체험 시뮬레이션";
    case "coming_soon": return "준비 중";
    default: return "활동";
  }
}

function toggleCardExpand(card) {
  card.classList.toggle("expanded");
}

function filterCategory(category, element) {
  state.currentFilter = category;
  
  const chips = document.querySelectorAll(".filter-chip");
  chips.forEach(chip => chip.classList.remove("active"));
  element.classList.add("active");
  
  renderStandards();
}

function onActivityClick(actId, actType, event) {
  if (actType === "coming_soon") {
    event.preventDefault();
    return;
  }
  
  if (!isActivityUnlockedForStudent(actId)) {
    event.preventDefault();
    alert("🔒 박병준 선생님이 아직 본 학급 수업 진도에 맞춰 이 과업을 해금하지 않으셨습니다. 수업 시간을 기다려 주세요! 🌸");
    return;
  }

  if (state.progress[actId] !== "completed") {
    state.progress[actId] = "in_progress";
    localStorage.setItem("sociallms_progress", JSON.stringify(state.progress));
  }
}

// 💡 나의 학습방법 AI에게 조언받기 구현
async function consultAiLearningStrategy() {
  let modal = document.getElementById("dashboardAiModal");
  let body = document.getElementById("dashboardAiModalBody");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "dashboardAiModal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content">
        <button type="button" class="modal-close-btn" onclick="closeDashboardAiModal()">&times;</button>
        <div id="dashboardAiModalBody" class="modal-feedback-body"></div>
        <div class="modal-actions">
          <button type="button" class="modal-btn primary" onclick="closeDashboardAiModal()">조언 확인 완료 🌿</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    body = document.getElementById("dashboardAiModalBody");
  }

  // 1. 과제 점수 취합
  const c10101Score = localStorage.getItem("sociallms_score_c10101");
  let scoreText = "아직 완료한 과제가 없습니다. 가입 설문 결과를 기초로 예측 조언합니다.";
  let averageScore = 0;

  if (c10101Score !== null) {
    averageScore = parseInt(c10101Score);
    scoreText = `현재 완료한 인권 과제 점수: ${averageScore}점 / 100점`;
  }

  // 2. 학생 기초 정보 파싱
  const savedProfile = localStorage.getItem("sociallms_profile");
  let profileData = {};
  if (savedProfile) {
    profileData = JSON.parse(savedProfile);
  }

  const name = profileData.name || "친구";
  const career = profileData["Q1_희망진로"] || profileData["Q1_희망진로선택"] || "미정";
  const traits = profileData["Q3_나의특징"] || profileData["Q3_특징"] || "분석적인, 창의적인";
  const task = profileData["Q5_자신있는과제"] || profileData["Q5_과제유형"] || "보고서 작성";

  // 💡 [신규] 학생이 실제 수행하고 서술한 텍스트 답변 데이터 로드 및 프롬프트 결합
  const worksheetResult = localStorage.getItem("sociallms_worksheet_result_c10101");
  let studyDetailPrompt = "";

  if (worksheetResult) {
    try {
      const detail = JSON.parse(worksheetResult);
      studyDetailPrompt = `
[실제 과제 수행 결과 데이터]
- 3개 사건 인과 분석 내용:
  1) 사건: ${detail.events[0]} (조건: ${detail.conditions[0]} / 결과 권리: ${detail.rights[0]})
  2) 사건: ${detail.events[1]} (조건: ${detail.conditions[1]} / 결과 권리: ${detail.rights[1]})
  3) 사건: ${detail.events[2]} (조건: ${detail.conditions[2]} / 결과 권리: ${detail.rights[2]})
- 학생이 독창적으로 상상한 4세대 인권: "${detail.ref4th}"
- 학생의 메타인지 성찰 및 학습처방 전략: "${detail.refSelf}"
`;
    } catch (e) {
      console.error("Failed to parse worksheet result cache:", e);
    }
  }

  // 로딩 UI 설정
  body.innerHTML = `
    <div class="loading-pulse-container">
      <div class="loading-pulse-dots">
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
      </div>
      <span style="font-weight: 700; color: var(--text-primary); font-size: 0.92rem; text-align:center;">
        AI 학습 코치가 학생의 실제 과제 서술 내용과 학업 진도를 분석 중입니다... 💡
      </span>
    </div>
  `;
  modal.classList.add("active");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "당신은 고등학교 통합사회 과목의 학습 방법론 및 메타인지 과학에 기반한 다정하고 지혜로운 AI 메타인지 코치 봇입니다. 학생의 프로필과 수행 과제 성취도를 바탕으로, 학생의 인지적 강점과 개선점, 그리고 효과적인 메타인지 공부법 전략을 3~4줄로 명확하게 처방해 줍니다. 한국어로 다정하게 조언해 주세요."
          },
          {
            role: "user",
            content: `학생이 수강 중인 정보 및 성취도는 다음과 같습니다.
- 학생 이름: ${name}
- 관심 진로: ${career}
- 학생이 진단한 자신의 인지적 특징: ${traits}
- 자신 있는 과제 스타일: ${task}
- 현재까지 제출된 수행 과제 평균 점수: ${scoreText}
${studyDetailPrompt}

위 정보(특히 학생이 실제 수행 데이터 내에서 서술한 인과 문장 수준, 4세대 인권 창의성, 메타인지 성찰 개선책 내용)를 인지 과학 기법에 기반해 다각도로 분석하여, 이 학생만을 위한 [인지적 강점], [취약할 수 있는 개선점], [앞으로의 맞춤형 메타인지 학습 전략 조언]을 작성해 주세요.
절대 길게 작성하지 말고, 딱 3~4줄 내외의 압축적이고 간결한 줄글로 친근하게 한글로 대답해 주세요.`
          }
        ]
      })
    });

    const resData = await response.json();
    if (resData.success) {
      const aiResponse = resData.message.content;
      body.innerHTML = `
        <h4>💡 AI 메타인지 코치의 학습법 조언</h4>
        <p style="background: rgba(184, 150, 219, 0.08); padding: 18px; border-radius: 20px; border-left: 4px solid var(--color-purple); font-size: 0.92rem; white-space: pre-wrap; margin-bottom: 12px; line-height: 1.65;">${aiResponse}</p>
        <div style="font-size: 0.75rem; color: var(--text-secondary); text-align: right;">📊 분석 기반: 관심 진로(${career}) | 성향(${traits}) | 평균 성적(${averageScore}점)</div>
      `;
    } else {
      throw new Error(resData.message);
    }
  } catch (err) {
    console.error("Dashboard AI coach failed:", err);
    body.innerHTML = `
      <h4>💡 AI 메타인지 코치의 학습법 조언 (로컬 백업)</h4>
      <p style="background: rgba(184, 150, 219, 0.08); padding: 18px; border-radius: 20px; border-left: 4px solid var(--color-purple); font-size: 0.92rem; line-height: 1.6;">
        ${name} 학생은 진로 성향으로 '${career}' 분야에 흥미를 느끼며, '${traits}' 성향을 스스로의 인지적 강점으로 삼고 있습니다. <br>
        앞으로 통합사회 과제를 해결할 때, 나의 강점인 '${task}' 방식을 살리되 사회적 개념들의 구조적 선후 관계를 메타인지 분류표로 확인하며 학습하면 더욱 좋습니다. 파이팅! 🌿
      </p>
    `;
  }
}

function closeDashboardAiModal() {
  const modal = document.getElementById("dashboardAiModal");
  if (modal) modal.classList.remove("active");
}

// =========================================================================
// 👑 [교사용 LMS 대시보드 전용 자바스크립트 엔진]
// =========================================================================

// 교사용 전역 차트 맵 & 데이터 캐시
let teacherCharts = { career: null, traits: null, diagnostic: null };
state.allStudents = [];
state.filteredStudents = [];
state.currentTeacherTab = "list";

// 교사 비밀번호 로그인
async function handleTeacherLogin() {
  const passwordInput = document.getElementById("teacherPassword");
  if (!passwordInput) return;
  const pw = passwordInput.value.trim();

  if (!pw) {
    alert("교사 인증 비밀번호를 입력해 주세요! 🔑");
    return;
  }

  if (pw !== "qkrqudwns1!") {
    alert("올바르지 않은 교사 비밀번호입니다. 🔒");
    return;
  }

  // 교사 모드 활성화 및 세션 세팅
  localStorage.setItem("sociallms_role", "teacher");
  passwordInput.value = ""; // 비밀번호 필드 클리어
  location.reload();
}

// 교사용 원격 통합 데이터 로드
async function loadTeacherData() {
  const tDashboard = document.getElementById("teacherDashboard");
  if (!tDashboard || tDashboard.style.display === "none") return;

  // 테이블 및 로딩 표시
  const tableBody = document.getElementById("teacherStudentTableBody");
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; font-weight: 700; color: var(--color-purple);">
          구글 시트 데이터베이스로부터 전체 학생 성취 및 설문 결과 융합 데이터를 동기화 중입니다... 🔄
        </td>
      </tr>
    `;
  }

  try {
    const response = await fetch("/api/teacher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "qkrqudwns1!" })
    });

    const data = await response.json();
    if (data.success) {
      const rawList = Array.isArray(data.students) ? data.students : [];
      state.allStudents = rawList.sort((a, b) => {
        const idA = parseInt(a["학번 (StudentID)"] || a["학번"] || "0") || 0;
        const idB = parseInt(b["학번 (StudentID)"] || b["학번"] || "0") || 0;
        return idA - idB;
      });
      
      filterTeacherClass();
      
      // 교사용 맵핑 핀 데이터 리로드
      refreshTeacherMapPins();
    } else {
      throw new Error(data.message || "구글 데이터베이스 수신 실패");
    }
  } catch (err) {
    console.error("Failed to load teacher stats:", err);
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: #c92a2a; font-weight: 700;">
            ❌ 구글 동기화 실패: ${err.message}<br>
            <small style="color: var(--text-secondary); font-weight: 500;">구글 앱스 스크립트 웹앱이 제대로 배포되어 있는지 확인해 주세요!</small>
          </td>
        </tr>
      `;
    }
  }
}

// 학급별 학생 필터링
function filterTeacherClass() {
  const select = document.getElementById("teacherClassSelect");
  if (!select) return;
  const val = select.value;

  if (val === "all") {
    state.filteredStudents = [...state.allStudents];
  } else {
    // 학번 앞 2자리(예: 1101 -> 1학년 1반 -> '11')
    state.filteredStudents = state.allStudents.filter(s => {
      const sId = String(s["학번 (StudentID)"]);
      return sId.substring(0, 2) === val;
    });
  }

  // 카운트 업데이트
  const countEl = document.getElementById("tStudentCount");
  if (countEl) countEl.textContent = state.filteredStudents.length;

  renderTeacherStudentsTable();
  
  // 만약 통계 탭이 열려있다면 차트도 실시간 갱신
  if (state.currentTeacherTab === "stats") {
    renderTeacherCharts();
  } else if (state.currentTeacherTab === "tasks") {
    renderTasksSection();
  } else if (state.currentTeacherTab === "map") {
    drawTeacherPinsOnMap(val);
  }
}

// 🔑 구글 시트 Users 탭 C열 (3번째 컬럼 / 비밀번호) 전용 다이렉트 추출기 (Col D, E 등 타 컬럼 폴백 원천 금지)
function getStudentPasswordFromRow(s) {
  if (!s || typeof s !== "object") return "비밀번호 미설정";

  // 1단계: 시트 헤더 중 "비밀번호", "password", "pw" 키가 있으면 무조건 그 키의 값만 리턴
  for (const k of Object.keys(s)) {
    const cleanK = k.replace(/\s+/g, "").toLowerCase();
    if ((cleanK.includes("비밀번호") || cleanK.includes("password") || cleanK.includes("pw")) && !cleanK.includes("캐릭터") && !cleanK.includes("emoji")) {
      const val = String(s[k] || "").trim();
      if (val && val !== "undefined" && val !== "null") {
        return val;
      }
    }
  }

  // 2단계: 시트 3번째 컬럼 (Col C / index 2) 다이렉트 키 값만 리턴
  const keys = Object.keys(s);
  if (keys.length >= 3) {
    const colCKey = keys[2];
    const colCVal = String(s[colCKey] || "").trim();
    if (colCVal && colCVal !== "undefined" && colCVal !== "null") {
      return colCVal;
    }
  }

  // 3단계: 객체 3번째 값 (Col C / index 2 value) 다이렉트 리턴
  const values = Object.values(s);
  if (values.length >= 3) {
    const colCVal = String(values[2] || "").trim();
    if (colCVal && colCVal !== "undefined" && colCVal !== "null") {
      return colCVal;
    }
  }

  // 절대 D열, E열 등 다른 컬럼으로 스캔하여 엉뚱한 값을 가져오지 않음!
  return "비밀번호 미설정";
}

// 학생 리스트 테이블 그리기
function renderTeacherStudentsTable() {
  const tableBody = document.getElementById("teacherStudentTableBody");
  if (!tableBody) return;

  if (state.filteredStudents.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; font-weight: 700; color: var(--text-secondary);">
          선택된 학급에 가입된 학생이 아직 없습니다. 🥺
        </td>
      </tr>
    `;
    return;
  }

  let totalDia = 0;
  let totalGold = 0;
  let totalSilver = 0;
  let totalBronze = 0;

  tableBody.innerHTML = state.filteredStudents.map(s => {
    const sId = String(s["학번 (StudentID)"] || s["학번"] || "");
    const sName = s["이름 (StudentName)"] || s["이름"] || "이름미정";
    const sEmoji = s["캐릭터 (Emoji)"] || s["캐릭터"] || "👧";
    
    // 학번 파싱 (학년/반/번호 분리)
    let gradeText = "-";
    if (sId.length === 4) {
      const gr = sId.substring(0, 1);
      const cl = parseInt(sId.substring(1, 2));
      const num = parseInt(sId.substring(2, 4));
      gradeText = `${gr}학년 ${cl}반 ${num}번`;
    }

    // 진로 희망
    const career = s["Q1_희망진로"] || "미정";

    // 획득 뱃지 HTML 계산
    const acts = s["activities"] || {};
    
    // 과업 1 뱃지 계산
    let t1BadgeHtml = `<span style="background:#dee2e6; color:#adb5bd; padding:3px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">과업1 🔒</span>`;
    const details1 = acts["인권 역사와 3세대 변화 연표 🏛️_details"] || acts["과업 1: 인권 역사 연표_details"];
    if (details1 !== undefined && details1 !== null) {
      let excelCount = 0;
      if (details1["루브릭_논리성"] === "우수") excelCount++;
      if (details1["루브릭_시사성"] === "우수" || details1["루브릭_창의성"] === "우수") excelCount++;
      if (details1["루브릭_보편가치"] === "우수") excelCount++;

      if (excelCount === 3) {
        t1BadgeHtml = `<span style="background:rgba(0, 180, 216, 0.1); color:#00b4d8; border:1px solid rgba(0, 180, 216, 0.4); padding:3px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">과업1 💎</span>`;
        totalDia++;
      } else if (excelCount === 2) {
        t1BadgeHtml = `<span style="background:rgba(245, 159, 0, 0.1); color:#f59f00; border:1px solid rgba(245, 159, 0, 0.4); padding:3px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">과업1 🥇</span>`;
        totalGold++;
      } else if (excelCount === 1) {
        t1BadgeHtml = `<span style="background:rgba(134, 142, 150, 0.1); color:#868e96; border:1px solid rgba(134, 142, 150, 0.4); padding:3px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">과업1 🥈</span>`;
        totalSilver++;
      } else {
        t1BadgeHtml = `<span style="background:rgba(217, 72, 15, 0.1); color:#d9480f; border:1px solid rgba(217, 72, 15, 0.4); padding:3px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">과업1 🥉</span>`;
        totalBronze++;
      }
    }

    // 과업 2 뱃지 계산
    let t2BadgeHtml = `<span style="background:#dee2e6; color:#adb5bd; padding:3px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">과업2 🔒</span>`;
    const t2ScoreStr = acts["현대 인권 맵핑 및 성찰"] || acts["과업 2: 커뮤니티 맵핑"];
    if (t2ScoreStr !== undefined && t2ScoreStr !== null) {
      const score = parseInt(t2ScoreStr.replace(/[^0-9]/g, "")) || 0;
      const details = acts["현대 인권 맵핑 및 성찰_details"] || acts["과업 2: 커뮤니티 맵핑_details"] || {};
      const pinsStr = details["등록한핀개수"] || details["등록된핀개수"] || "0";
      const pins = parseInt(pinsStr.replace(/[^0-9]/g, "")) || 0;
      
      if (score >= 90 && pins >= 3) {
        t2BadgeHtml = `<span style="background:rgba(0, 180, 216, 0.1); color:#00b4d8; border:1px solid rgba(0, 180, 216, 0.4); padding:3px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">과업2 💎</span>`;
        totalDia++;
      } else if (score >= 75) {
        t2BadgeHtml = `<span style="background:rgba(245, 159, 0, 0.1); color:#f59f00; border:1px solid rgba(245, 159, 0, 0.4); padding:3px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">과업2 🥇</span>`;
        totalGold++;
      } else if (score >= 60) {
        t2BadgeHtml = `<span style="background:rgba(134, 142, 150, 0.1); color:#868e96; border:1px solid rgba(134, 142, 150, 0.4); padding:3px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">과업2 🥈</span>`;
        totalSilver++;
      } else {
        t2BadgeHtml = `<span style="background:rgba(217, 72, 15, 0.1); color:#d9480f; border:1px solid rgba(217, 72, 15, 0.4); padding:3px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">과업2 🥉</span>`;
        totalBronze++;
      }
    }

    // 과업 3 뱃지 계산 (3대 영역 루브릭 기반 정밀 계산)
    let t3BadgeHtml = `<span style="background:#dee2e6; color:#adb5bd; padding:3px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">과업3 🔒</span>`;
    const t3ScoreStr = acts["과업 3: 헌법과 시민참여"] || acts["과업 3: 헌법의 역할과 시민 참여 챗봇"] || acts["헌법의 역할과 시민 참여 챗봇"];
    const details3 = acts["과업 3: 헌법과 시민참여_details"] || acts["과업 3: 헌법의 역할과 시민 참여 챗봇_details"] || acts["헌법의 역할과 시민 참여 챗봇_details"];
    if (t3ScoreStr !== undefined && t3ScoreStr !== null || details3 !== undefined && details3 !== null) {
      const scoreVal = t3ScoreStr ? parseInt(String(t3ScoreStr).replace(/[^0-9]/g, "")) : (details3 ? parseInt(String(details3["형성평가점수"] || "80").replace(/[^0-9]/g, "")) : 80);
      
      let excelCount3 = 0;
      if (details3) {
        if (details3["루브릭_공감성"] === "우수") excelCount3++;
        if (details3["루브릭_기본권진단"] === "우수") excelCount3++;
        if (details3["루브릭_솔루션제안"] === "우수") excelCount3++;
      } else {
        if (scoreVal >= 90) excelCount3 = 3;
        else if (scoreVal >= 75) excelCount3 = 2;
        else if (scoreVal >= 60) excelCount3 = 1;
      }

      if (excelCount3 === 3 && scoreVal >= 80) {
        t3BadgeHtml = `<span style="background:rgba(0, 180, 216, 0.1); color:#00b4d8; border:1px solid rgba(0, 180, 216, 0.4); padding:3px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">과업3 💎</span>`;
        totalDia++;
      } else if (excelCount3 >= 2 || scoreVal >= 70) {
        t3BadgeHtml = `<span style="background:rgba(245, 159, 0, 0.1); color:#f59f00; border:1px solid rgba(245, 159, 0, 0.4); padding:3px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">과업3 🥇</span>`;
        totalGold++;
      } else if (excelCount3 >= 1 || scoreVal >= 60) {
        t3BadgeHtml = `<span style="background:rgba(134, 142, 150, 0.1); color:#868e96; border:1px solid rgba(134, 142, 150, 0.4); padding:3px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">과업3 🥈</span>`;
        totalSilver++;
      } else {
        t3BadgeHtml = `<span style="background:rgba(217, 72, 15, 0.1); color:#d9480f; border:1px solid rgba(217, 72, 15, 0.4); padding:3px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">과업3 🥉</span>`;
        totalBronze++;
      }
    }

    const sPassword = getStudentPasswordFromRow(s);
    const safePassword = String(sPassword).replace(/'/g, "\\'").replace(/"/g, "&quot;");
    const safeName = String(sName).replace(/'/g, "\\'").replace(/"/g, "&quot;");
    const badgesHtml = `<div style="display:flex; gap:6px; flex-wrap:wrap;">${t1BadgeHtml}${t2BadgeHtml}${t3BadgeHtml}</div>`;

    return `
      <tr style="border-bottom: 1px solid rgba(0,0,0,0.04); transition: background 0.2s;">
        <td style="padding: 14px 8px; font-weight: 700; color: var(--text-primary);">${gradeText} <span style="font-size:0.75rem; color:var(--text-secondary);">(${sId})</span></td>
        <td style="padding: 14px 8px; font-weight: 700; cursor: pointer;" onclick="showStudentPasswordModal('${sId}', '${safeName}', '${safePassword}')" title="클릭 시 4자리 이모티콘 비밀번호 확인 🔑">
          <span style="color: var(--color-purple); text-decoration: underline; text-underline-offset: 3px;">${sName}</span>
          <span style="font-size: 0.72rem; color: #1971c2; font-weight: 800; display: inline-block; margin-left: 4px; background: rgba(25, 113, 194, 0.08); padding: 1px 6px; border-radius: 4px;">🔑 비번</span>
        </td>
        <td style="padding: 14px 8px; font-size: 1.15rem;">${sEmoji}</td>
        <td style="padding: 14px 8px; color: var(--text-secondary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width: 180px;" title="${career}">${career}</td>
        <td style="padding: 14px 8px;">${badgesHtml}</td>
        <td style="padding: 14px 8px; text-align: center;">
          <button type="button" class="gen-btn" style="padding: 4px 10px; font-size:0.75rem; border-color: var(--color-purple); color: var(--color-purple);" onclick="showStudentDetailModal('${sId}')">상세조회 🔍</button>
        </td>
      </tr>
    `;
  }).join("");

  // 🏆 획득 뱃지 학급 종합 요약 출력
  const summaryEl = document.getElementById("teacherBadgesSummary");
  if (summaryEl) {
    summaryEl.innerHTML = `
      <span style="color: var(--color-purple); font-weight: 800; font-size: 0.85rem; margin-right: 6px;">🏆 선택 학급 뱃지 현황:</span>
      <span style="background: rgba(0, 180, 216, 0.1); color: #00b4d8; padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(0,180,216,0.25);">💎 다이아몬드 ${totalDia}개</span>
      <span style="background: rgba(245, 159, 0, 0.1); color: #f59f00; padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(245,159,0,0.25);">🥇 금 ${totalGold}개</span>
      <span style="background: rgba(134, 142, 150, 0.1); color: #868e96; padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(134,142,150,0.25);">🥈 은 ${totalSilver}개</span>
      <span style="background: rgba(217, 72, 15, 0.1); color: #d9480f; padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(217,72,15,0.25);">🥉 동 ${totalBronze}개</span>
    `;
  }
}

// 🎨 교사 대시보드 전용 초고급 글래스모피즘 커스텀 모달 생성기
function ensureTeacherCustomModal() {
  let modal = document.getElementById("teacherCustomModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "teacherCustomModal";
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 99999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    `;
    modal.innerHTML = `
      <div id="teacherCustomModalContainer" style="
        background: var(--bg-card, #ffffff);
        border: 2px solid rgba(184, 150, 219, 0.4);
        border-radius: 28px;
        max-width: 580px;
        width: 100%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.35), 0 0 30px rgba(168, 85, 247, 0.2);
        animation: teacherModalPop 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        position: relative;
      ">
        <style>
          @keyframes teacherModalPop {
            0% { opacity: 0; transform: scale(0.88) translateY(24px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          .custom-modal-header-glow {
            height: 6px;
            width: 100%;
            background: linear-gradient(90deg, #a855f7, #ec4899, #3b82f6, #10b981);
            background-size: 200% 200%;
            animation: glowGradient 4s ease infinite;
          }
          @keyframes glowGradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        </style>
        <div class="custom-modal-header-glow"></div>
        <button type="button" onclick="closeTeacherCustomModal()" style="
          position: absolute;
          top: 18px;
          right: 20px;
          background: rgba(0,0,0,0.05);
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 1.2rem;
          font-weight: bold;
          color: var(--text-secondary, #666);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          z-index: 10;
        " onmouseover="this.style.background='rgba(239,68,68,0.15)'; this.style.color='#ef4444';" onmouseout="this.style.background='rgba(0,0,0,0.05)'; this.style.color='var(--text-secondary, #666)';">&times;</button>
        
        <div id="teacherCustomModalBody" style="padding: 28px 28px 16px 28px; overflow-y: auto; flex: 1;">
          <!-- Content rendered dynamically -->
        </div>
        
        <div id="teacherCustomModalActions" style="
          padding: 16px 28px 24px 28px;
          background: rgba(0, 0, 0, 0.02);
          border-top: 1px solid rgba(0, 0, 0, 0.05);
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        ">
          <!-- Buttons rendered dynamically -->
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  return modal;
}

window.closeTeacherCustomModal = function() {
  const modal = document.getElementById("teacherCustomModal");
  if (modal) {
    modal.style.display = "none";
  }
};

// 🌟 인상 깊은 학생 성찰 답변 Spotlight 팝업 모달
window.showSubjectiveDetailModal = function(sName, gradeText, title1, content1, title2, content2) {
  const modal = ensureTeacherCustomModal();
  const body = document.getElementById("teacherCustomModalBody");
  const actions = document.getElementById("teacherCustomModalActions");

  const safeContent1 = String(content1 || "내용 없음").replace(/&quot;/g, '"');
  const safeContent2 = String(content2 || "").replace(/&quot;/g, '"');

  body.innerHTML = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="
        width: 72px;
        height: 72px;
        margin: 0 auto 12px auto;
        background: linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(236,72,153,0.15) 100%);
        border-radius: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.5rem;
        box-shadow: 0 10px 25px -5px rgba(168,85,247,0.3);
      ">🌟</div>
      
      <span style="
        background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%);
        color: white;
        font-weight: 800;
        font-size: 0.78rem;
        padding: 5px 14px;
        border-radius: 12px;
        letter-spacing: 0.5px;
        box-shadow: 0 4px 12px rgba(168,85,247,0.35);
        display: inline-block;
      ">
        💡 인상 깊은 학생 응답 Spotlight
      </span>
      
      <h3 style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary, #1e293b); margin: 12px 0 4px 0;">
        ${sName} <span style="font-size: 0.95rem; color: var(--color-purple, #9333ea); font-weight: 700;">(${gradeText})</span>
      </h3>
      <p style="font-size: 0.85rem; color: var(--text-secondary, #64748b); margin: 0;">수업 중 학급 학생들과 함께 공유할 수 있는 성찰 저널 답변입니다.</p>
    </div>

    <div style="display: flex; flex-direction: column; gap: 16px; text-align: left;">
      <div style="
        background: rgba(168, 85, 247, 0.05);
        border: 2px solid rgba(168, 85, 247, 0.3);
        padding: 20px;
        border-radius: 20px;
        box-shadow: 0 4px 16px rgba(168,85,247,0.08);
      ">
        <h5 style="margin: 0 0 10px 0; font-size: 0.95rem; font-weight: 800; color: #7e22ce; display: flex; align-items: center; gap: 8px;">
          <span style="background: #7e22ce; color: white; border-radius: 50%; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem;">1</span>
          ${title1}
        </h5>
        <p style="margin: 0; font-size: 1.02rem; line-height: 1.75; color: var(--text-primary, #0f172a); font-weight: 600; white-space: pre-wrap; word-break: break-word;">${safeContent1}</p>
      </div>

      ${safeContent2 ? `
      <div style="
        background: rgba(16, 185, 129, 0.05);
        border: 2px solid rgba(16, 185, 129, 0.3);
        padding: 20px;
        border-radius: 20px;
        box-shadow: 0 4px 16px rgba(16,185,129,0.08);
      ">
        <h5 style="margin: 0 0 10px 0; font-size: 0.95rem; font-weight: 800; color: #047857; display: flex; align-items: center; gap: 8px;">
          <span style="background: #047857; color: white; border-radius: 50%; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem;">2</span>
          ${title2}
        </h5>
        <p style="margin: 0; font-size: 0.98rem; line-height: 1.75; color: var(--text-primary, #0f172a); font-weight: 600; white-space: pre-wrap; word-break: break-word;">${safeContent2}</p>
      </div>
      ` : ""}
    </div>
  `;

  actions.innerHTML = `
    <button type="button" onclick="closeTeacherCustomModal()" style="
      background: linear-gradient(135deg, #a855f7 0%, #7e22ce 100%);
      color: white;
      border: none;
      padding: 12px 32px;
      font-size: 0.95rem;
      font-weight: 800;
      border-radius: 16px;
      cursor: pointer;
      box-shadow: 0 8px 20px -4px rgba(168,85,247,0.5);
      transition: all 0.2s;
    " onmouseover="this.style.transform='scale(1.03)';" onmouseout="this.style.transform='scale(1)';">
      확인 닫기 🌸
    </button>
  `;

  modal.style.display = "flex";
};

// 🌟 카드 인덱스 기반 인상 깊은 성찰 답변 모달 트리거
window.showSubjectiveDetailModalByIndex = function(idx) {
  if (!window.subjectiveAnswersCache || !window.subjectiveAnswersCache[idx]) return;
  const ans = window.subjectiveAnswersCache[idx];
  const taskKind = ans.currentTask || "c10101";

  let field1Title = "🏛️ 내가 상상하는 4세대 인권 제안";
  let field2Title = "🌱 학습 과정에 대한 메타인지 성찰 저널";

  if (taskKind === "c10102") {
    field1Title = "💬 AI 챗봇과의 대화 내역 모니터링";
    field2Title = "🌱 학습 과정에 대한 메타인지 성찰 저널";
  } else if (taskKind === "c10201") {
    field1Title = "📝 시민 참여 성찰 저널 기록";
    field2Title = "🌱 학습 과정에 대한 메타인지 성찰 저널";
  }

  showSubjectiveDetailModal(ans.sName, ans.gradeText, field1Title, ans.ref1, field2Title, ans.ref2);
};

// 🔑 학생 비밀번호 조회 관제 팝업 모달 (구글 시트 Users 탭 C열 다이렉트)
window.showStudentPasswordModal = function(sId, sName, password) {
  const modal = ensureTeacherCustomModal();
  const body = document.getElementById("teacherCustomModalBody");
  const actions = document.getElementById("teacherCustomModalActions");

  // sId로 state.allStudents에서 학생 객체 다이렉트 조회
  let actualStudent = (state.allStudents || []).find(st => {
    const sIdClean = String(sId || "").trim();
    const idVal = String(st["학번 (StudentID)"] || st["학번"] || st[Object.keys(st)[0]] || "").trim();
    return idVal === sIdClean;
  });

  let cleanPw = "";
  if (actualStudent) {
    cleanPw = getStudentPasswordFromRow(actualStudent);
  }
  if (!cleanPw || cleanPw === "비밀번호 미설정") {
    if (password && String(password).trim() !== "" && password !== "undefined") {
      cleanPw = String(password).trim();
    } else {
      cleanPw = "비밀번호 미설정";
    }
  }

  body.innerHTML = `
    <div style="text-align: center; padding: 12px 0;">
      <div style="
        width: 80px;
        height: 80px;
        margin: 0 auto 16px auto;
        background: linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(147,51,234,0.15) 100%);
        border-radius: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 3.2rem;
        box-shadow: 0 12px 28px -6px rgba(59,130,246,0.35);
      ">🔐</div>

      <span style="
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
        font-weight: 800;
        font-size: 0.78rem;
        padding: 5px 14px;
        border-radius: 12px;
        letter-spacing: 0.5px;
        box-shadow: 0 4px 12px rgba(59,130,246,0.35);
        display: inline-block;
      ">
        Users 탭 C열: 4자리 이모티콘 비밀번호 관제
      </span>

      <h3 style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary, #1e293b); margin: 14px 0 4px 0;">
        ${sName} 학생 <span style="font-size: 0.95rem; color: #3b82f6; font-weight: 700;">(학번: ${sId})</span>
      </h3>
      <p style="font-size: 0.86rem; color: var(--text-secondary, #64748b); margin: 0 0 24px 0;">
        구글 시트 Users 탭 C열에 수신된 4자리 이모티콘 비밀번호입니다.
      </p>

      <div style="
        background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%);
        border: 2.5px dashed #a855f7;
        padding: 24px 36px;
        border-radius: 24px;
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        box-shadow: 0 12px 30px -8px rgba(168,85,247,0.25);
      ">
        <span style="font-size: 0.82rem; font-weight: 800; color: #7e22ce; display: block; margin-bottom: 10px; letter-spacing: 0.5px;">
          🔑 4자리 이모티콘 비밀번호
        </span>
        <div id="emojiPasswordBox" style="
          font-size: 3rem;
          font-weight: 900;
          letter-spacing: 12px;
          padding-left: 12px;
          filter: drop-shadow(0 4px 10px rgba(0,0,0,0.12));
          user-select: all;
        ">${cleanPw}</div>
      </div>
    </div>
  `;

  actions.innerHTML = `
    <button type="button" onclick="navigator.clipboard.writeText('${cleanPw}'); this.textContent='복사 완료! ✨';" style="
      background: rgba(59,130,246,0.12);
      color: #1d4ed8;
      border: 1.5px solid rgba(59,130,246,0.3);
      padding: 12px 24px;
      font-size: 0.9rem;
      font-weight: 800;
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.2s;
    ">
      📋 암호 복사
    </button>
    <button type="button" onclick="closeTeacherCustomModal()" style="
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      border: none;
      padding: 12px 32px;
      font-size: 0.95rem;
      font-weight: 800;
      border-radius: 16px;
      cursor: pointer;
      box-shadow: 0 8px 20px -4px rgba(59,130,246,0.4);
      transition: all 0.2s;
    " onmouseover="this.style.transform='scale(1.03)';" onmouseout="this.style.transform='scale(1)';">
      확인 닫기 🌸
    </button>
  `;

  modal.style.display = "flex";
};

// 학생 상세 진단 모달 열기
function showStudentDetailModal(studentId) {
  const student = state.allStudents.find(s => String(s["학번 (StudentID)"]) === String(studentId));
  if (!student) return;

  const modal = document.getElementById("teacherDetailModal");
  const body = document.getElementById("teacherDetailModalBody");
  if (!modal || !body) return;

  const sId = String(student["학번 (StudentID)"]);
  const sName = student["이름 (StudentName)"];
  const sEmoji = student["캐릭터 (Emoji)"] || "👧";

  // 가입 응답 항목 리스트 추출
  let infoHTML = `
    <h4 style="color: var(--color-purple); font-size: 1.15rem; font-weight: 800; border-bottom: 2px solid var(--color-pink-soft); padding-bottom: 10px; margin-top:0;">
      🧸 [${sId}] ${sName} 학생 가입 진단 상세서
    </h4>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; background: rgba(0,0,0,0.02); padding: 14px; border-radius: 16px; margin-bottom: 18px;">
      <div>• <strong>이름:</strong> ${sEmoji} ${sName}</div>
      <div>• <strong>희망 직업군:</strong> ${student["Q1_희망진로"] || "미정"}</div>
      <div>• <strong>나의 성향 특징:</strong> ${student["Q3_나의특징"] || "미정"}</div>
      <div>• <strong>모둠 역할 선호:</strong> ${student["Q4_모둠역할선호"] || "기획/참여"}</div>
      <div>• <strong>자신 있는 과제:</strong> ${student["Q5_자신있는과제"] || "미정"}</div>
      <div style="grid-column: span 2;">• <strong>AI 도구 불편점:</strong> ${student["Q9_AI과제불편함"] || "없음"}</div>
    </div>
    
    <h5 style="font-weight: 700; margin: 12px 0 8px 0; color: var(--color-pink);">📑 단원별 기초 진단평가 제출 정보</h5>
    <ul style="padding-left: 20px; font-size: 0.85rem; display:flex; flex-direction:column; gap: 8px;">
      <li>🏛️ <strong>Q10 (기본권 매칭):</strong> ${student["Q10_기본권매칭"] || "미제출"}</li>
      <li>🏛️ <strong>Q11 (기본권 제한):</strong> ${student["Q11_기본권제한목적"] || "미제출"}</li>
      <li>🏛️ <strong>Q12 (청소년 근로):</strong> ${student["Q12_청소년근로권"] || "미제출"}</li>
      <li>🏛️ <strong>Q13 (구제 기관):</strong> ${student["Q13_인권구제기관"] || "미제출"}</li>
      <li style="color:var(--text-secondary);">💬 <strong>Q14 (인권보편토론):</strong> ${student["Q14_인권보편성토론"] || "미제출"}</li>
      <li style="color:var(--text-secondary);">💬 <strong>Q15 (자유vs안전토론):</strong> ${student["Q15_자유vs안전토론"] || "미제출"}</li>
      
      <li>📈 <strong>Q16 (합리적 선택):</strong> ${student["Q16_합리적선택"] || "미제출"}</li>
      <li>📈 <strong>Q17 (시장 가격 결정):</strong> ${student["Q17_시장가격결정"] || "미제출"}</li>
      <li>📈 <strong>Q18 (예적금vs주식):</strong> ${student["Q18_예적금vs주식"] || "미제출"}</li>
      <li>📈 <strong>Q19 (환율 변동):</strong> ${student["Q19_환율상승영향"] || "미제출"}</li>
      <li style="color:var(--text-secondary);">💬 <strong>Q20 (시장자율토론):</strong> ${student["Q20_자율vs개입규제토론"] || "미제출"}</li>
      <li style="color:var(--text-secondary);">💬 <strong>Q21 (자산가치토론):</strong> ${student["Q21_자산관리우선가치토론"] || "미제출"}</li>
      <li style="color:var(--color-pink); font-weight:700;">💬 <strong>Q22 (교사 첫인상):</strong> ${student["Q22_선생님 첫인"] || student["Q22_선생님첫인상"] || student["Q22_수업요청사항"] || "미제출"}</li>
      <li style="color:var(--color-purple); font-weight:700;">💬 <strong>Q23 (수업 바라는점):</strong> ${student["Q23_수업 요청사"] || student["Q23_수업요청사항"] || "미제출"}</li>
    </ul>
    
    <!-- 🏛️ 인권 역사 연표 상세 과제 정보 추출 -->
    ${(() => {
      const wsDetails = student.activities && student.activities["인권 역사와 3세대 변화 연표 🏛️_details"];
      if (wsDetails) {
        const matchRaw = wsDetails["1단계매칭답변"] || wsDetails["매칭정답수"] || "";
        const matchCntMatch = matchRaw.match(/매칭:(\d+)\/(\d+)개/);
        const matchCnt = matchCntMatch ? matchCntMatch[1] + "/5개" : (wsDetails["매칭정답수"] || "미기입");

        const sortRaw = wsDetails["2단계정렬순서"] || wsDetails["연대기정렬성공"] || "";
        const isSorted = sortRaw.includes("연대기정렬성공") ? "성공" : (sortRaw.includes("연대기정렬실패") ? "실패" : (wsDetails["연대기정렬성공"] || "실패"));

        const genMatch = sortRaw.match(/세대매칭\s*(\d+)\/(\d+)개/);
        const genCnt = genMatch ? genMatch[1] + "/5개" : (wsDetails["세대매칭정답수"] || "미기입");

        const ref4th = wsDetails["Q1_4세대인권상상"] || wsDetails["새로운권리서술"] || "미기입";
        const refSelf = wsDetails["Q2_학습과정성찰"] || wsDetails["성찰답변"] || "미기입";
        const submitTime = wsDetails["제출시간 (Timestamp)"] || wsDetails["등록시간 (Timestamp)"] || "";
        const score = student.activities["인권 역사와 3세대 변화 연표 🏛️"] || "0점";

        return `
          <div style="margin-top: 18px; padding: 14px; background: rgba(102, 217, 232, 0.08); border-radius: 16px; border: 1px solid rgba(102, 217, 232, 0.15); font-size: 0.85rem; margin-bottom: 12px;">
            <h5 style="margin: 0 0 10px 0; color: var(--color-purple); font-weight: 800; display: flex; align-items: center; gap: 6px;">
              🏛️ 인권 역사와 3세대 변화 연표 과제 수행서
            </h5>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; border-bottom: 1px dashed rgba(0,0,0,0.06); padding-bottom: 8px; color: var(--text-primary);">
              <div>• <strong>매칭 정답수:</strong> ${matchCnt}</div>
              <div>• <strong>연대기 정렬:</strong> ${isSorted}</div>
              <div>• <strong>세대 정답수:</strong> ${genCnt}</div>
              <div>• <strong>평가 점수:</strong> ${score}</div>
              <div>• <strong>루브릭(논리성):</strong> <span style="font-weight:700; color:var(--color-purple);">${wsDetails["루브릭_논리성"] || "미평가"}</span></div>
              <div>• <strong>루브릭(시사성):</strong> <span style="font-weight:700; color:var(--color-purple);">${wsDetails["루브릭_시사성"] || wsDetails["루브릭_창의성"] || "미평가"}</span></div>
              <div>• <strong>루브릭(보편가치):</strong> <span style="font-weight:700; color:var(--color-purple);">${wsDetails["루브릭_보편가치"] || "미평가"}</span></div>
              <div style="grid-column: span 2;">• <strong>제출 시간:</strong> ${submitTime ? new Date(submitTime).toLocaleString() : "시간 미상"}</div>
            </div>
            <div style="margin-bottom: 8px;">
              <strong style="color: var(--text-primary);">✍️ 내가 상상하는 4세대 인권 제안:</strong>
              <p style="margin: 4px 0 0 0; padding: 10px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-glass); font-size: 0.8rem; line-height: 1.5; color: var(--text-primary); white-space: pre-wrap;">${ref4th}</p>
            </div>
            <div>
              <strong style="color: var(--text-primary);">✍️ 학습 과정 메타인지 성찰 저널:</strong>
              <p style="margin: 4px 0 0 0; padding: 10px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-glass); font-size: 0.8rem; line-height: 1.5; color: var(--text-primary); white-space: pre-wrap;">${refSelf}</p>
            </div>
          </div>
        `;
      } else {
        return `
          <div style="margin-top: 18px; padding: 12px; background: rgba(0, 0, 0, 0.02); border-radius: 14px; border: 1px dashed rgba(0,0,0,0.06); font-size: 0.82rem; text-align: center; color: var(--text-secondary); margin-bottom: 12px;">
            🏛️ 인권 역사와 3세대 변화 연표 과제 미제출 상태입니다.
          </div>
        `;
      }
    })()}

    <!-- 💡 현대 인권 맵핑 상세 과제 정보 추출 -->
    ${(() => {
      const mapDetails = student.activities && student.activities["현대 인권 맵핑 및 성찰_details"];
      if (mapDetails) {
        const quizRes = mapDetails["형성평가퀴즈"] || "미기입";
        const pinCnt = mapDetails["등록한핀개수"] || "0개";
        const essayText = mapDetails["시민참여성찰답변"] || "답변 없음";
        const submitTime = mapDetails["제출시간 (Timestamp)"] || mapDetails["등록시간 (Timestamp)"] || "";

        return `
          <div style="margin-top: 12px; padding: 14px; background: rgba(184, 150, 219, 0.08); border-radius: 16px; border: 1px solid rgba(184, 150, 219, 0.15); font-size: 0.85rem;">
            <h5 style="margin: 0 0 10px 0; color: var(--color-purple); font-weight: 800; display: flex; align-items: center; gap: 6px;">
              🗺️ 현대 인권 맵핑 & 성찰 과제 수행서
            </h5>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; border-bottom: 1px dashed rgba(0,0,0,0.06); padding-bottom: 8px; color: var(--text-primary);">
              <div>• <strong>형성평가 결과:</strong> ${quizRes}</div>
              <div>• <strong>등록한 지도 핀:</strong> ${pinCnt}</div>
              <div style="grid-column: span 2;">• <strong>제출 시간:</strong> ${submitTime ? new Date(submitTime).toLocaleString() : "시간 미상"}</div>
            </div>
            <div>
              <strong style="color: var(--text-primary);">✍️ 주거·안전·환경권 시민참여 성찰 저널:</strong>
              <p style="margin: 6px 0 0 0; padding: 10px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-glass); font-size: 0.8rem; line-height: 1.5; color: var(--text-primary); white-space: pre-wrap;">${essayText}</p>
            </div>
          </div>
        `;
      } else {
        return `
          <div style="margin-top: 12px; padding: 12px; background: rgba(0, 0, 0, 0.02); border-radius: 14px; border: 1px dashed rgba(0,0,0,0.06); font-size: 0.82rem; text-align: center; color: var(--text-secondary);">
            📍 현대 인권 커뮤니티 맵핑 및 성찰 저널 미제출 상태입니다.
          </div>
        `;
      }
    })()}

    <!-- 💬 과업 3 헌법과 시민참여 (AI 챗봇 대화내역 & 메타성찰) 상세 과제 정보 추출 -->
    ${(() => {
      const c3Details = student.activities && (student.activities["과업 3: 헌법과 시민참여_details"] || student.activities["헌법의 역할과 시민 참여 챗봇_details"]);
      if (c3Details) {
        const quizRes = c3Details["형성평가점수"] || c3Details["형성평가퀴즈"] || "100점";
        const chatTurns = c3Details["대화진행턴"] || "0턴";
        const chatLog = c3Details["챗봇대화내역"] || c3Details["대화내역"] || c3Details["G열"] || "대화 기록 미저장";
        const essayText = c3Details["시민참여성찰저널"] || c3Details["메타성찰답변"] || c3Details["시민참여성찰답변"] || "성찰 미입력";
        const submitTime = c3Details["제출시간 (Timestamp)"] || c3Details["등록시간 (Timestamp)"] || "";

        return `
          <div style="margin-top: 12px; padding: 14px; background: rgba(79, 158, 245, 0.08); border-radius: 16px; border: 1px solid rgba(79, 158, 245, 0.15); font-size: 0.85rem;">
            <h5 style="margin: 0 0 10px 0; color: #1d4ed8; font-weight: 800; display: flex; align-items: center; gap: 6px;">
              💬 과업 3: 헌법의 역할과 시민참여 (AI 챗봇 대화 & 메타성찰)
            </h5>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; border-bottom: 1px dashed rgba(0,0,0,0.06); padding-bottom: 8px; color: var(--text-primary);">
              <div>• <strong>형성평가 점수:</strong> ${quizRes}</div>
              <div>• <strong>대화 진행:</strong> ${chatTurns}</div>
              <div>• <strong>루브릭(공감성):</strong> <span style="font-weight:700; color:var(--color-purple);">${c3Details["루브릭_공감성"] || "우수"}</span></div>
              <div>• <strong>루브릭(기본권진단):</strong> <span style="font-weight:700; color:var(--color-purple);">${c3Details["루브릭_기본권진단"] || "우수"}</span></div>
              <div>• <strong>루브릭(솔루션제안):</strong> <span style="font-weight:700; color:var(--color-purple);">${c3Details["루브릭_솔루션제안"] || "우수"}</span></div>
              <div>• <strong>제출 시간:</strong> ${submitTime ? new Date(submitTime).toLocaleString() : "시간 미상"}</div>
            </div>
            <div style="margin-bottom: 8px;">
              <strong style="color: var(--text-primary);">💬 AI 챗봇과의 3턴 대화 내역 모니터링:</strong>
              <p style="margin: 6px 0 0 0; padding: 10px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-glass); font-size: 0.8rem; line-height: 1.5; color: var(--text-primary); white-space: pre-wrap; max-height: 160px; overflow-y: auto;">${chatLog}</p>
            </div>
            <div>
              <strong style="color: var(--text-primary);">✍️ 메타인지 성찰 저널:</strong>
              <p style="margin: 6px 0 0 0; padding: 10px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-glass); font-size: 0.8rem; line-height: 1.5; color: var(--text-primary); white-space: pre-wrap;">${essayText}</p>
            </div>
          </div>
        `;
      } else {
        return `
          <div style="margin-top: 12px; padding: 12px; background: rgba(0, 0, 0, 0.02); border-radius: 14px; border: 1px dashed rgba(0,0,0,0.06); font-size: 0.82rem; text-align: center; color: var(--text-secondary);">
            💬 과업 3 AI 챗봇 대화 및 헌법 구제 성찰 저널 미제출 상태입니다.
          </div>
        `;
      }
    })()}
  `;

  body.innerHTML = infoHTML;
  modal.classList.add("active");
}

function closeTeacherDetailModal() {
  const modal = document.getElementById("teacherDetailModal");
  if (modal) modal.classList.remove("active");
}

// 교사용 대시보드 탭 스위치
function switchTeacherTab(tab) {
  state.currentTeacherTab = tab;

  // 탭 헤더 활성화
  const chips = document.querySelectorAll(".teacher-tabs .filter-chip");
  chips.forEach(c => c.classList.remove("active"));
  document.getElementById(`tTabBtn_${tab}`).classList.add("active");

  // 콘텐츠 전환
  const sections = document.querySelectorAll(".teacher-tab-section");
  sections.forEach(s => s.style.display = "none");
  
  if (tab === "list") {
    document.getElementById("tSection_list").style.display = "block";
  } else if (tab === "group") {
    document.getElementById("tSection_group").style.display = "block";
  } else if (tab === "stats") {
    document.getElementById("tSection_stats").style.display = "block";
    renderTeacherCharts(); // 통계 탭 열릴 때 차트 즉시 드로잉 📊
  } else if (tab === "tasks") {
    document.getElementById("tSection_tasks").style.display = "block";
    renderTasksSection();
  } else if (tab === "map") {
    document.getElementById("tSection_map").style.display = "block";
    initTeacherMap();
  } else if (tab === "unlock") {
    document.getElementById("tSection_unlock").style.display = "block";
    renderUnlockControlSection();
  }
}

// Chart.js를 이용한 데이터 통계 드로잉
function renderTeacherCharts() {
  const students = state.filteredStudents;
  if (students.length === 0) return;

  // 1. 기존 차트 인스턴스 소멸 (오버랩 방지)
  if (teacherCharts.career) teacherCharts.career.destroy();
  if (teacherCharts.traits) teacherCharts.traits.destroy();
  if (teacherCharts.diagnostic) teacherCharts.diagnostic.destroy();

  // -------------------------------------------------------------
  // [차트 1: 진로/직업군 통계]
  // -------------------------------------------------------------
  const careerCounts = {};
  students.forEach(s => {
    const list = s["Q1_희망진로"] ? s["Q1_희망진로"].split(",") : [];
    list.forEach(item => {
      const key = item.trim();
      if (key) careerCounts[key] = (careerCounts[key] || 0) + 1;
    });
  });

  const careerLabels = Object.keys(careerCounts);
  const careerData = Object.values(careerCounts);

  const ctxCareer = document.getElementById("chartCareer");
  if (ctxCareer) {
    teacherCharts.career = new Chart(ctxCareer, {
      type: "bar",
      data: {
        labels: careerLabels,
        datasets: [{
          label: "학생 수",
          data: careerData,
          backgroundColor: "rgba(255, 133, 162, 0.65)",
          borderColor: "var(--color-pink)",
          borderWidth: 1.5,
          borderRadius: 8
        }]
      },
      options: {
        indexAxis: "y", // 가로 바 차트
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { stepSize: 1 } } }
      }
    });
  }

  // -------------------------------------------------------------
  // [차트 2: 인지 성향 분포 통계]
  // -------------------------------------------------------------
  const traitCounts = {};
  students.forEach(s => {
    const list = s["Q3_나의특징"] ? s["Q3_나의특징"].split(",") : [];
    list.forEach(item => {
      const key = item.trim();
      if (key) traitCounts[key] = (traitCounts[key] || 0) + 1;
    });
  });

  const traitLabels = Object.keys(traitCounts);
  const traitData = Object.values(traitCounts);

  const ctxTraits = document.getElementById("chartTraits");
  if (ctxTraits) {
    teacherCharts.traits = new Chart(ctxTraits, {
      type: "doughnut",
      data: {
        labels: traitLabels,
        datasets: [{
          data: traitData,
          backgroundColor: [
            "rgba(184, 150, 219, 0.7)",
            "rgba(255, 133, 162, 0.7)",
            "rgba(102, 217, 232, 0.7)",
            "rgba(255, 192, 120, 0.7)",
            "rgba(142, 209, 252, 0.7)",
            "rgba(179, 157, 219, 0.7)"
          ],
          borderColor: "var(--bg-card)",
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "right" } }
      }
    });
  }

  // -------------------------------------------------------------
  // [신규 차트 2-B: AI 경험 & 습관 분석 (Q6, Q7, Q8)]
  // -------------------------------------------------------------
  if (teacherCharts.aiExp) teacherCharts.aiExp.destroy();
  if (teacherCharts.taskPref) teacherCharts.taskPref.destroy();

  const aiExpCounts = {};
  students.forEach(s => {
    const exp = s["Q6_AI경험"] || s["Q6_AI활용경험"] || "기본 사용";
    exp.split(",").forEach(item => {
      const k = item.trim();
      if (k) aiExpCounts[k] = (aiExpCounts[k] || 0) + 1;
    });
  });

  const ctxAiExp = document.getElementById("chartAiExperience");
  if (ctxAiExp) {
    teacherCharts.aiExp = new Chart(ctxAiExp, {
      type: "bar",
      data: {
        labels: Object.keys(aiExpCounts),
        datasets: [{
          label: "학생 수",
          data: Object.values(aiExpCounts),
          backgroundColor: "rgba(102, 217, 232, 0.65)",
          borderColor: "var(--color-mint)",
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { ticks: { stepSize: 1 } } }
      }
    });
  }

  // -------------------------------------------------------------
  // [신규 차트 2-C: 모둠 선호 역할 & 자신있는 과제 분석 (Q4, Q5)]
  // -------------------------------------------------------------
  const roleCounts = {};
  students.forEach(s => {
    const r = s["Q4_모둠역할선호"] || s["Q4_역할선호"] || "기획/참여";
    r.split(",").forEach(item => {
      const k = item.trim();
      if (k) roleCounts[k] = (roleCounts[k] || 0) + 1;
    });
  });

  const ctxTaskPref = document.getElementById("chartTaskPreference");
  if (ctxTaskPref) {
    teacherCharts.taskPref = new Chart(ctxTaskPref, {
      type: "pie",
      data: {
        labels: Object.keys(roleCounts),
        datasets: [{
          data: Object.values(roleCounts),
          backgroundColor: [
            "rgba(255, 133, 162, 0.75)",
            "rgba(184, 150, 219, 0.75)",
            "rgba(102, 217, 232, 0.75)",
            "rgba(255, 192, 120, 0.75)",
            "rgba(142, 209, 252, 0.75)"
          ],
          borderColor: "var(--bg-card)",
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "right" } }
      }
    });
  }

  // -------------------------------------------------------------
  // [차트 3: 진단평가 오답률 리포트 (Q10, Q11, Q12, Q13, Q16, Q17, Q18, Q19)]
  // -------------------------------------------------------------
  const questions = [
    { label: "Q10 (기본권 매칭)", key: "Q10_기본권매칭" },
    { label: "Q11 (기본권 제한)", key: "Q11_기본권제한목적" },
    { label: "Q12 (청소년 근로)", key: "Q12_청소년근로권" },
    { label: "Q13 (인권 구제)", key: "Q13_인권구제기관" },
    { label: "Q16 (합리적 선택)", key: "Q16_합리적선택" },
    { label: "Q17 (가격 결정)", key: "Q17_시장가격결정" },
    { label: "Q18 (예금vs주식)", key: "Q18_예적금vs주식" },
    { label: "Q19 (환율 변동)", key: "Q19_환율상승영향" }
  ];

  const diagLabels = [];
  const wrongRates = [];

  questions.forEach(q => {
    diagLabels.push(q.label);
    let totalAnswered = 0;
    let wrongCount = 0;

    students.forEach(s => {
      const val = s[q.key];
      if (val) {
        totalAnswered++;
        if (val.includes("오답 ❌")) wrongCount++;
      }
    });

    const rate = totalAnswered > 0 ? Math.round((wrongCount / totalAnswered) * 100) : 0;
    wrongRates.push(rate);
  });

  const ctxDiagnostic = document.getElementById("chartDiagnostic");
  if (ctxDiagnostic) {
    teacherCharts.diagnostic = new Chart(ctxDiagnostic, {
      type: "bar",
      data: {
        labels: diagLabels,
        datasets: [{
          label: "오답률 (%)",
          data: wrongRates,
          backgroundColor: "rgba(102, 217, 232, 0.65)",
          borderColor: "var(--color-mint)",
          borderWidth: 1.5,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { min: 0, max: 100, ticks: { callback: v => v + "%" } } }
      }
    });
  }

  // -------------------------------------------------------------
  // [신규 4. 기초 학업 진단평가 문항별 상세 선지 분석 보고서 & 해설]
  // -------------------------------------------------------------
  const reportBox = document.getElementById("teacherDiagnosticDetailReport");
  if (reportBox) {
    let reportHTML = "";

    const qKeys = ["q10", "q11", "q12", "q13", "q16", "q17", "q18", "q19"];
    qKeys.forEach(qKey => {
      const qInfo = DIAGNOSTIC_QUESTIONS_DB[qKey];
      if (!qInfo) return;

      // 선지별 선택 집계
      const counts = { "①": 0, "②": 0, "③": 0, "④": 0 };
      let totalAnswered = 0;

      students.forEach(s => {
        const mapKeys = {
          q10: "Q10_기본권매칭",
          q11: "Q11_기본권제한목적",
          q12: "Q12_청소년근로권",
          q13: "Q13_인권구제기관",
          q16: "Q16_합리적선택",
          q17: "Q17_시장가격결정",
          q18: "Q18_예적금vs주식",
          q19: "Q19_환율상승영향"
        };
        const rawVal = s[mapKeys[qKey]];
        if (rawVal) {
          const selectedNum = rawVal.substring(0, 1);
          if (counts[selectedNum] !== undefined) {
            counts[selectedNum]++;
            totalAnswered++;
          }
        }
      });

      // 개별 문항 HTML 생성 (사용자 요청 스크린샷 규격과 100% 동일화)
      reportHTML += `
        <div class="card" style="padding: 22px 24px; border-radius: 20px; background: rgba(255, 255, 255, 0.7); border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 4px 14px rgba(0,0,0,0.02); margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h4 style="margin: 0; font-size: 1.02rem; font-weight: 800; color: var(--color-purple);">${qInfo.title}</h4>
            <span style="font-size: 0.82rem; color: var(--text-secondary); font-weight: 600;">응답 학생: <strong style="color: var(--text-primary);">${totalAnswered}명</strong></span>
          </div>
          <p style="margin: 0 0 16px 0; font-size: 0.88rem; color: var(--text-primary); line-height: 1.55; font-weight: 500;">
            ${qInfo.question}
          </p>
          
          <!-- 선지 선택률 게이지 바 리스트 -->
          <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
      `;

      Object.keys(qInfo.options).forEach(optNum => {
        const optText = qInfo.options[optNum];
        const count = counts[optNum] || 0;
        const rate = totalAnswered > 0 ? Math.round((count / totalAnswered) * 100) : 0;
        const isCorrect = optNum === qInfo.correct;

        if (isCorrect) {
          reportHTML += `
            <div style="background: rgba(43, 138, 98, 0.08); border: 1.5px solid var(--color-mint); padding: 12px 16px; border-radius: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem; margin-bottom: 6px;">
                <span style="font-weight: 800; color: #2b8a3e;">✅ ${optText}</span>
                <strong style="font-size: 0.88rem; color: #2b8a3e;">${count}명 (${rate}%)</strong>
              </div>
              <div style="width: 100%; height: 8px; background: rgba(43, 138, 98, 0.15); border-radius: 4px; overflow: hidden;">
                <div style="width: ${rate}%; height: 100%; background: var(--color-mint); border-radius: 4px; transition: width 0.5s;"></div>
              </div>
            </div>
          `;
        } else {
          reportHTML += `
            <div style="background: rgba(0, 0, 0, 0.02); border: 1px solid rgba(0,0,0,0.04); padding: 12px 16px; border-radius: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem; margin-bottom: 6px;">
                <span style="font-size: 0.85rem; color: var(--text-primary); font-weight: 500;">${optText}</span>
                <span style="font-size: 0.82rem; color: var(--text-secondary); font-weight: 600;">${count}명 (${rate}%)</span>
              </div>
              <div style="width: 100%; height: 8px; background: rgba(0, 0, 0, 0.06); border-radius: 4px; overflow: hidden;">
                <div style="width: ${rate}%; height: 100%; background: rgba(0, 0, 0, 0.2); border-radius: 4px; transition: width 0.5s;"></div>
              </div>
            </div>
          `;
        }
      });

      reportHTML += `
          </div>
          
          <!-- 단원 성취기준 핵심 해설 영역 -->
          <div style="background: rgba(184, 150, 219, 0.08); border-left: 4px solid var(--color-purple); padding: 12px 16px; border-radius: 14px; font-size: 0.83rem; line-height: 1.55; color: var(--text-secondary); margin-top: 14px;">
            💡 <strong>단원 성취기준 핵심 해설:</strong> ${qInfo.explanation}
          </div>
        </div>
      `;
    });

    reportBox.innerHTML = reportHTML;
  }

  // -------------------------------------------------------------
  // [신규 5. 인권 역사(연표) 및 현대 인권(맵핑) 실시간 통계 및 의견 공유 보드]
  // -------------------------------------------------------------
  let c101_totalScore = 0;
  let c101_count = 0;
  let c101_sortCount = 0;
  const c101_refAnswers = [];

  let c102_total = 0;
  const c102_quizCounts = {
    q1: { correct: 0, total: 0 },
    q2: { correct: 0, total: 0 },
    q3: { correct: 0, total: 0 },
    q4: { correct: 0, total: 0 },
    q5: { correct: 0, total: 0 }
  };
  const c102_refAnswers = [];

  students.forEach(s => {
    // A. 인권 역사와 3세대 변화 연표 🏛️ 데이터 집계
    const c101ScoreStr = s["인권 역사와 3세대 변화 연표 🏛️"];
    if (c101ScoreStr) {
      const scoreVal = parseInt(c101ScoreStr);
      if (!isNaN(scoreVal)) {
        c101_totalScore += scoreVal;
        c101_count++;
      }
      // 세부 JSON 정보 파싱
      const c101Details = s["인권 역사와 3세대 변화 연표 🏛️_details"];
      if (c101Details) {
        try {
          const detailObj = typeof c101Details === "string" ? JSON.parse(c101Details) : c101Details;
          if (detailObj["연대기정렬성공"] === "성공") {
            c101_sortCount++;
          }
          if (detailObj["Q1_4세대인권상상"]) {
            c101_refAnswers.push({
              name: s["이름 (StudentName)"] || "이름미정",
              id: s["학번 (StudentID)"],
              answer: detailObj["Q1_4세대인권상상"]
            });
          }
        } catch (e) {
          console.error("Failed to parse c101 details:", e);
        }
      }
    }

    // B. 현대 인권과 지역사회 커뮤니티 맵핑 🗺️ 데이터 집계
    const c102Details = s["현대 인권과 지역사회 커뮤니티 맵핑 🗺️_details"];
    if (c102Details) {
      try {
        const detailObj = typeof c102Details === "string" ? JSON.parse(c102Details) : c102Details;
        c102_total++;

        // "형성평가퀴즈": "Q1:④, Q2:디지털 잊힐 권리, Q3:안전권 및 이동권, Q4:③, Q5:②" 파싱
        const quizStr = detailObj["형성평가퀴즈"];
        if (quizStr) {
          const tokens = quizStr.split(",");
          tokens.forEach(tok => {
            const parts = tok.trim().split(":");
            if (parts.length === 2) {
              const qKey = parts[0].trim().toLowerCase(); // "q1", "q2" 등
              const userAns = parts[1].trim();
              
              if (qKey in c102_quizCounts) {
                c102_quizCounts[qKey].total++;
                
                let isCorr = false;
                if (qKey === "q2") {
                  const cleanAns = userAns.replace(/\s/g, "");
                  isCorr = (cleanAns === "주거권" || cleanAns === "주거");
                } else if (qKey === "q3") {
                  isCorr = (userAns === "안전권");
                } else if (qKey === "q1") {
                  isCorr = (userAns === "④");
                } else if (qKey === "q4") {
                  isCorr = (userAns === "②");
                } else if (qKey === "q5") {
                  isCorr = (userAns === "①");
                }

                if (isCorr) {
                  c102_quizCounts[qKey].correct++;
                }
              }
            }
          });
        }

        if (detailObj["시민참여성찰답변"]) {
          c102_refAnswers.push({
            name: s["이름 (StudentName)"] || "이름미정",
            id: s["학번 (StudentID)"],
            answer: detailObj["시민참여성찰답변"]
          });
        }
      } catch (e) {
        console.error("Failed to parse c102 details:", e);
      }
    }
  });

  // UI 요소 갱신 - 인권 역사 연표
  const elC101Avg = document.getElementById("tStats_c101_avg");
  const elC101SortRate = document.getElementById("tStats_c101_sortRate");
  const elC101RefList = document.getElementById("tStats_c101_refList");

  if (elC101Avg) {
    elC101Avg.textContent = c101_count > 0 ? (c101_totalScore / c101_count).toFixed(1) + "점" : "0.0점";
  }
  if (elC101SortRate) {
    elC101SortRate.textContent = c101_count > 0 ? Math.round((c101_sortCount / c101_count) * 100) + "%" : "0%";
  }
  if (elC101RefList) {
    if (c101_refAnswers.length > 0) {
      elC101RefList.innerHTML = c101_refAnswers.map(ans => `
        <div style="background:var(--bg-card); padding:8px 12px; border-radius:10px; border:1px solid rgba(0,0,0,0.03); position:relative;">
          <span style="font-weight:700; color:var(--color-purple); display:block; font-size:0.75rem; margin-bottom:4px;">🙋 ${ans.id} ${ans.name} 학생의 4세대 인권 제안</span>
          <p style="margin:0; line-height:1.4; color:var(--text-primary); font-size:0.78rem;">"${ans.answer}"</p>
          <button type="button" class="gen-btn" onclick="shareStudentOpinionToClass('${ans.name}', '4세대 인권 제안: ${ans.answer.replace(/'/g, "\\'")}')" style="position:absolute; right:8px; top:6px; font-size:0.6rem; padding:2px 6px; background:var(--color-pink-soft); color:var(--color-pink); border:none; border-radius:6px; cursor:pointer;">우수 답변 공유 📢</button>
        </div>
      `).join("");
    } else {
      elC101RefList.innerHTML = `<span style="color:var(--text-secondary);">제출된 성찰 답변이 없습니다.</span>`;
    }
  }

  // UI 요소 갱신 - 현대 인권 맵핑
  for (let i = 1; i <= 5; i++) {
    const elQ = document.getElementById(`tStats_c102_q${i}`);
    if (elQ) {
      const qStats = c102_quizCounts[`q${i}`];
      elQ.textContent = qStats.total > 0 ? Math.round((qStats.correct / qStats.total) * 100) + "%" : "0%";
    }
  }

  const elC102RefList = document.getElementById("tStats_c102_refList");
  if (elC102RefList) {
    if (c102_refAnswers.length > 0) {
      elC102RefList.innerHTML = c102_refAnswers.map(ans => `
        <div style="background:var(--bg-card); padding:8px 12px; border-radius:10px; border:1px solid rgba(0,0,0,0.03); position:relative;">
          <span style="font-weight:700; color:var(--color-purple); display:block; font-size:0.75rem; margin-bottom:4px;">🙋 ${ans.id} ${ans.name} 학생의 시민 참여 성찰</span>
          <p style="margin:0; line-height:1.4; color:var(--text-primary); font-size:0.78rem;">"${ans.answer}"</p>
          <button type="button" class="gen-btn" onclick="shareStudentOpinionToClass('${ans.name}', '시민참여 성찰: ${ans.answer.replace(/'/g, "\\'")}')" style="position:absolute; right:8px; top:6px; font-size:0.6rem; padding:2px 6px; background:var(--color-pink-soft); color:var(--color-pink); border:none; border-radius:6px; cursor:pointer;">우수 답변 공유 📢</button>
        </div>
      `).join("");
    } else {
      elC102RefList.innerHTML = `<span style="color:var(--text-secondary);">제출된 성찰 답변이 없습니다.</span>`;
    }
  }
}

// 학생 우수 답변 학급 공유 알림
function shareStudentOpinionToClass(studentName, opinionText) {
  alert(`📢 [학급 우수 답변 공유 알림]\n\n박병준 선생님께서 ${studentName} 학생의 우수한 성찰 답변을 모범 사례로 학급 전체에 공유하셨습니다! 👍\n\n"${opinionText}"`);
}

// 🤖 Upstage Solar API 기반 학급 최적 모둠 편성 구동
async function runAiGrouping() {
  const students = state.filteredStudents;
  if (students.length === 0) {
    alert("현재 선택된 학급에 모둠을 나눌 학생 데이터가 없습니다! 학급 필터를 먼저 확인해 주세요. 🥺");
    return;
  }

  const select = document.getElementById("teacherClassSelect");
  const classText = select ? select.options[select.selectedIndex].text : "학급";

  const resultsBox = document.getElementById("aiGroupingResults");
  if (resultsBox) {
    resultsBox.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px; font-weight: 700; color: var(--color-purple);">
        <div class="loading-pulse-container">
          <div class="loading-pulse-dots">
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
          </div>
          <span>Upstage AI가 ${classText} 학생 전체(${students.length}명)의 이질적 성향과 상호보완적 역할을 분석하여 최적의 모둠을 구성 중입니다... 💡</span>
        </div>
      </div>
    `;
  }

  // 1. 프롬프트 조립용 학생 데이터 정제 (학번을 명시적으로 주입)
  const studentsProfileList = students.map((s, idx) => {
    const sId = String(s["학번 (StudentID)"] || s["학번"] || "");
    const sName = String(s["이름 (StudentName)"] || s["이름"] || "");
    return `${idx + 1}. 학번: ${sId} | 이름: ${sName} | 희망진로: ${s["Q1_희망진로"] || "미정"} | 선호역할: ${s["Q4_모둠역할선호"] || "기획/참여"} | 성향: ${s["Q3_나의특징"] || "분석적인"} | 특기과제: ${s["Q5_자신있는과제"] || "자료조사"}`;
  }).join("\n");

  const prompt = `
[학급 정보]
- 학급명: ${classText}
- 학생 수: ${students.length}명

[학생 명단 및 개별 성향/희망 진로 데이터]
${studentsProfileList}

[편성 목표 및 교육학적 원칙]
위 학생들을 4인 1개조(인원이 4배수가 아닐 경우, 마지막 한두 조는 3인조 포함)로 나누어 최상의 협업 효율을 내는 모둠들을 편성해 주세요. 
이때, **협동학습의 '이질적 집단 구성(Heterogeneous Grouping)' 원칙**을 엄격히 적용해야 합니다.
1. **상호 이질적 결합**: 학생들의 관심 진로(Q1), 인지적 성향(Q3), 잘하는 과제 유형(Q5)이 서로 다르고 다양하여 다채로운 사고적 자극을 줄 수 있게 엮어 주세요.
2. **상호보완적 역할 배분**: 모둠 내에서 선호 역할(Q4)이 겹치지 않고 기획, 발표, 디자인, 자료조사 등이 조화롭게 1명씩 균형 있게 배분되도록 설계해 주세요.

[출력 스펙 제한 - 학번 및 이름 의무 표기]
* 조원 목록 출력 시, 교사가 실제 모둠을 학급 명부에 적용할 수 있도록 **반드시 각 학생의 4자리 학번과 이름을 연달아 표기**해 주세요. (예: "1105 홍길동(역할)")

[답변 가이드]
반드시 다음 형태의 깔끔하게 디자인된 HTML 카드 템플릿(인라인 스타일 적용) 형식들만 다이렉트로 결합하여 전체 목록을 한 번에 리턴해 주세요.
절대 서론이나 부가적인 설명은 하지 말고, 오직 완성된 HTML 코드 블록만 즉시 리턴해 주세요.

(HTML 카드 구조 가이드)
\`\`\`html
<div class="group-card" style="background: rgba(255, 255, 255, 0.5); border: 1.5px solid rgba(184, 150, 219, 0.2); border-radius: 20px; padding: 22px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 10px;">
  <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid rgba(184, 150, 219, 0.15); padding-bottom:8px;">
    <h4 style="margin:0; font-size:1.05rem; font-weight:800; color:var(--color-purple);">[모둠명(예: 뉴턴의 거인들 등)]</h4>
    <span style="font-size:0.75rem; background:rgba(184, 150, 219, 0.12); color:var(--color-purple); padding:3px 8px; border-radius:6px; font-weight:700;">4인조</span>
  </div>
  <div style="font-size:0.88rem; line-height:1.6; color:var(--text-primary);">
    • <strong>조원:</strong> [학번1] [이름1]([역할1]), [학번2] [이름2]([역할2]), [학번3] [이름3]([역할3]), [학번4] [이름4]([역할4])<br>
    • <strong>시너지 강점:</strong> [이 조원들이 결합했을 때 얻을 수 있는 이질적 역할 시너지와 상호보완적 협업 포인트를 교육공학 관점에서 한 문장으로 요약]
  </div>
</div>
\`\`\`
  `;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "당신은 고등학교 학급의 협동과제 모둠을 성향별로 균형 있게 짜주는 노련한 AI 에듀테크 협동학습 전문가 봇입니다. 반드시 제공된 HTML 카드 마크업 형태들로만 이루어진 답변을 전달해 주어야 합니다."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();
    if (data.success) {
      let htmlResponse = data.message.content;
      // 혹시 모를 마크다운 백틱 코드블록 래퍼가 있으면 제거
      htmlResponse = htmlResponse.replace(/```html|```/g, "").trim();
      resultsBox.innerHTML = htmlResponse;
    } else {
      throw new Error(data.message);
    }
  } catch (err) {
    console.error("AI grouping compiler failed:", err);
    resultsBox.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #c92a2a; font-weight: 700;">
        ❌ AI 모둠 추천 실패: ${err.message}<br>
        <button class="modal-btn secondary" style="margin-top: 10px;" onclick="runAiGrouping()">다시 시도하기 🔄</button>
      </div>
    `;
  }
}

// 교사 로그아웃
function logout() {
  if (confirm("정말 로그아웃 하시겠습니까? 🌸")) {
    localStorage.removeItem("sociallms_profile");
    localStorage.removeItem("sociallms_student_id");
    localStorage.removeItem("sociallms_role");
    
    // 강제 화면 세션 리셋
    state.student = { studentId: "", gradeClass: "", name: "", emoji: "👧" };
    state.progress = {};
    
    const authSec = document.getElementById("authSection");
    const dashboard = document.getElementById("mainDashboard");
    const tDashboard = document.getElementById("teacherDashboard");

    if (authSec) authSec.style.display = "flex";
    if (dashboard) dashboard.classList.remove("active");
    if (tDashboard) tDashboard.style.display = "none";
    
    // 로그인 탭 초기화
    switchAuthTab("login");
  }
}

// 🤖 Upstage Solar API 기반 학생 의견 및 요청사항 안전 요약 구동
async function summarizeTeacherOpinions() {
  const students = state.filteredStudents;
  const summaryBox = document.getElementById("teacherOpinionSummaryBox");
  if (!summaryBox) return;

  if (students.length === 0) {
    summaryBox.innerHTML = `<span style="color: var(--text-secondary);">현재 선택된 학급에 분석할 학생 의견 데이터가 없습니다. 🥺</span>`;
    return;
  }

  // 💡 Q22 첫인상 의견 수집 (시트 컬럼명 "Q22_선생님 첫인" 매칭 및 레거시 펄백)
  const rawImpressions = students.map(s => (s["Q22_선생님 첫인"] || s["Q22_선생님첫인상"] || s["Q22_수업요청사항"] || "").trim());
  const validImpressions = rawImpressions.filter(op => op && op !== "없음" && op.length > 2);

  // 💡 Q23 수업 요청 건의사항 수집 (시트 컬럼명 "Q23_수업 요청사" 매칭 및 레거시 펄백)
  const rawRequests = students.map(s => {
    const newReq = (s["Q23_수업 요청사"] || s["Q23_수업요청사항"] || "").trim();
    const legacyReq = (s["Q22_수업요청사항"] || "").trim();
    return newReq ? newReq : legacyReq;
  });
  const validRequests = rawRequests.filter(op => op && op !== "없음" && op.length > 2);

  if (validImpressions.length === 0 && validRequests.length === 0) {
    summaryBox.innerHTML = `<span style="color: var(--text-secondary);">해당 반 학생들 중 Q22(첫인상) 및 Q23(바라는점)에 남긴 유의미한 소통 의견이 아직 없습니다. 📝</span>`;
    return;
  }

  summaryBox.innerHTML = `
    <div class="loading-pulse-container" style="justify-content: flex-start;">
      <div class="loading-pulse-dots">
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
      </div>
      <span style="font-weight: 700; color: var(--text-primary); font-size: 0.88rem;">
        Upstage AI가 의견을 수집하여 민감정보(사생활, 갈등 등) 필터링 및 종합 트렌드 안심 요약을 수행 중입니다... 🛡️
      </span>
    </div>
  `;

  const impressionsString = validImpressions.map((op, idx) => `[첫인상 ${idx + 1}] ${op}`).join("\n");
  const requestsString = validRequests.map((op, idx) => `[수업건의 ${idx + 1}] ${op}`).join("\n");

  const prompt = `
[학급 학생들이 작성한 병준 선생님 첫인상 의견 리스트 (Q22 - 구글 Users 탭 AA열)]
${impressionsString || "(제출된 첫인상 의견 없음)"}

[학급 학생들이 작성한 수업 바라는점 의견 리스트 (Q23 - 구글 Users 탭 AB열)]
${requestsString || "(제출된 수업 건의 의견 없음)"}

[요약 미션 - 분리 요약 필수의무]
제공된 익명 의견들을 면밀히 취합하여, 반드시 다음 2가지 영역으로 나누어 요약해 주세요.

[영역 1] 병준 선생님에 대한 첫인상 소감 요약
- 학생들이 많이 언급한 순서(빈도순)대로 최대 10개까지 일목요연하게 정리해 주세요.
- 각 항목은 단순한 단어나 단답(예: '친절하다', '능력자')이 아닌, 구체적인 서술형 문장 형식(예: '학생들의 질문에 친절하고 상세하게 답변해 주는 모습이 인상적이라는 평이 있음')으로 상세하게 서술해 주세요.

[영역 2] 이번 학기 수업에서 선생님께 바라는 점 요약
- 학생들이 수업이나 과제에 대해 부탁하거나 바라는 핵심 트렌드를 담백하고 구체적인 문장으로 요약해 주세요.

🚨 [초비상 - 마크다운(Markdown) 절대 사용 금지]
* 응답 결과에 샵(#), 별표(*), 대시(-), 언더바(_), 백틱(\`\`\`) 등 모든 종류의 마크다운 서식 기호를 절대로 쓰지 마십시오.
* 오직 순수한 글자 텍스트와 줄바꿈, 1. 2. 3. 과 같은 일반 아라비아 숫자로만 항목을 나열해 주세요.

🚨 [경고 - 임의 창작(Hallucination) 절대 금지 및 팩트 기반 요약 원칙]
* 절대로 제공된 학생 의견 리스트에 존재하지 않는 가상의 건의사항이나 첫인상을 멋대로 지어내어(Hallucination) 요약하지 마십시오.
* 오직 제공된 의견 텍스트들에만 100% 근거하여 요약해야 합니다.

🚨 [경고 - 민감 개인정보 차단 의무]
* 만약 의견 내용 중에 학생 개인의 사적인 민감한 정보는 절대로 포함하지 말고 철저히 배제 및 소거(Redact)해 주세요.

[🎨 워드클라우드 단어 가중치 통계 출력 의무]
위의 순수 텍스트 요약이 끝난 후, 맨 하단에 정확히 아래 문자열 구분자와 함께 워드클라우드용 단어 통계 JSON 데이터를 반드시 반환해 주세요.
* 첫인상(impression)과 수업 건의(request)에 대하여 의미 있는 단어/키워드들을 각각 최소 20개씩 추출하여 가중치(자주 나온 빈도수 기반 가중치 1~20)를 매겨 배열에 담아주세요. 단어 수가 풍성해야 합니다.
* JSON 포맷 예시:
---JSON_DATA_START---
{
  "impression": [["재밌다", 18], ["친절하다", 16], ["열정적", 15], ["꼼꼼하다", 12], ["능력자", 10], ["존경스럽다", 9], ["카리스마", 8], ["유쾌하다", 8], ["상냥하다", 7], ["귀여우심", 7], ["에너지", 6], ["기대됨", 6], ["스마트함", 5], ["자유롭다", 5], ["소통왕", 4], ["유머러스", 4], ["깔끔함", 3], ["목소리좋음", 3], ["멋지다", 2], ["선행", 2]],
  "request": [["과제조절", 19], ["진도속도", 17], ["모둠활동", 15], ["게임수업", 14], ["토론", 12], ["발표축소", 11], ["쉽게설명", 10], ["영상시청", 9], ["쉬는시간", 8], ["자유주제", 8], ["활동중심", 7], ["피드백", 6], ["재밌는퀴즈", 6], ["일찍끝내기", 5], ["친절한설명", 5], ["소통원함", 4], ["노래틀기", 4], ["상벌점", 3], ["필기시간", 3], ["간식제공", 2]]
}
---JSON_DATA_END---
  `;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "당신은 학교 현장에서 학생들의 익명 건의사항을 분석하는 신중하고 품위 있는 교무 장학 AI 비서입니다. 응답 시 샵(#)이나 별표(*) 같은 마크다운 문법 기호를 절대로 사용하지 않고 오직 일반 줄바꿈과 텍스트로만 답변합니다. 없는 사실을 지어내는 할루시네이션은 전면 배제하며 개인정보 보호 가드레일을 철저히 지킵니다."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();
    if (data.success) {
      let content = data.message.content;
      
      // JSON 데이터 영역 추출 파싱
      let textSummary = content;
      let wordCloudData = null;
      
      if (content.includes("---JSON_DATA_START---")) {
        const parts = content.split("---JSON_DATA_START---");
        textSummary = parts[0].trim();
        
        const subParts = parts[1].split("---JSON_DATA_END---");
        const jsonStr = subParts[0].trim();
        
        try {
          wordCloudData = JSON.parse(jsonStr);
        } catch (e) {
          console.error("Failed to parse wordcloud JSON from AI response:", e);
        }
      }
      
      summaryBox.innerHTML = `
        <h5 style="margin:0 0 8px 0; color: var(--color-purple); font-weight:800;">🤖 AI 학급 의견 안심 요약 결과</h5>
        <div style="font-size: 0.88rem; line-height: 1.6; color: var(--text-primary); white-space: pre-wrap;">${textSummary}</div>
        <div style="font-size: 0.72rem; color: var(--text-secondary); text-align: right; margin-top: 10px;">🛡️ Upstage Solar AI 개인정보 안심 필터 처리 완료</div>
      `;

      // 워드클라우드 렌더링 시작
      const cloudContainer = document.getElementById("teacherWordCloudContainer");
      if (cloudContainer && wordCloudData) {
        cloudContainer.style.display = "grid";
        // 렌더링 호출
        setTimeout(() => {
          renderWordCloud("wordcloud_impression", wordCloudData.impression);
          renderWordCloud("wordcloud_request", wordCloudData.request);
        }, 50);
      } else if (cloudContainer) {
        cloudContainer.style.display = "none";
      }

    } else {
      throw new Error(data.message);
    }
  } catch (err) {
    console.error("AI opinions summary failed:", err);
    summaryBox.innerHTML = `
      <span style="color: #c92a2a; font-weight:700;">❌ 요약 생성 실패: ${err.message}</span>
      <button class="modal-btn secondary" style="margin-top: 10px; font-size:0.75rem;" onclick="summarizeTeacherOpinions()">다시 시도하기 🔄</button>
    `;
    const cloudContainer = document.getElementById("teacherWordCloudContainer");
    if (cloudContainer) cloudContainer.style.display = "none";
  }
}

// 🎨 순수 자바스크립트 기반 dynamic 워드클라우드 렌더러
function renderWordCloud(containerId, wordsList) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  if (!wordsList || wordsList.length === 0) {
    container.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-secondary); margin: auto;">추출된 키워드가 없습니다. 🥺</span>`;
    return;
  }

  // 가중치 정렬 및 최대/최소 가중치 구하기
  const weights = wordsList.map(w => w[1]);
  const maxWeight = Math.max(...weights);
  const minWeight = Math.min(...weights);

  // 컨테이너 크기 구하기
  const width = container.offsetWidth || 280;
  const height = container.offsetHeight || 220;

  // 단어들을 순회하며 절대 좌표로 배치
  wordsList.forEach((wordArr, idx) => {
    const word = wordArr[0];
    const weight = wordArr[1];

    const span = document.createElement("span");
    span.innerText = word;
    span.style.position = "absolute";
    span.style.whiteSpace = "nowrap";
    span.style.fontWeight = "800";
    span.style.cursor = "default";
    span.style.transition = "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    
    // 호버 시 단어 튀어오르는 효과
    span.onmouseenter = () => {
      span.style.transform = "scale(1.25) rotate(0deg)";
      span.style.zIndex = "100";
    };
    span.onmouseleave = () => {
      span.style.transform = `scale(1) rotate(${rotate}deg)`;
      span.style.zIndex = "10";
    };

    // 폰트 크기 계산 (13px ~ 30px)
    const fontSize = maxWeight === minWeight ? 16 : 13 + ((weight - minWeight) / (maxWeight - minWeight)) * 17;
    span.style.fontSize = `${fontSize}px`;

    // 테마 및 종류별 색상 배정
    let color;
    if (containerId.includes("impression")) {
      // 첫인상: 따뜻한 핑크-오렌지-골드 계열 (HSL 330 ~ 360, 0 ~ 30)
      const hue = Math.floor(Math.random() * 60) - 30; // -30 ~ 30
      color = `hsl(${hue < 0 ? 360 + hue : hue}, 85%, 60%)`;
    } else {
      // 바라는점: 차분하고 스마트한 보라-블루-민트 계열 (HSL 220 ~ 280)
      const hue = 220 + Math.floor(Math.random() * 60);
      color = `hsl(${hue}, 80%, 55%)`;
    }
    span.style.color = color;

    // 회전 각도 (-15도 ~ 15도 무작위, 큰 단어는 수평)
    const rotate = fontSize > 20 ? 0 : Math.floor(Math.random() * 30) - 15;
    span.style.transform = `rotate(${rotate}deg)`;

    // Spiral(나선형) 배치 공식으로 단어 겹침 최소화
    // 황금각 피보나치 나선을 응용하여 배치
    const theta = idx * 2.4;
    const r = Math.sqrt(idx) * (width * 0.09); // 나선 반경
    const x = width / 2 + r * Math.cos(theta) - (fontSize * word.length * 0.4);
    const y = height / 2 + r * Math.sin(theta) - (fontSize * 0.5);

    // 경계 처리
    const finalX = Math.max(10, Math.min(width - (fontSize * word.length * 0.9) - 10, x));
    const finalY = Math.max(10, Math.min(height - fontSize - 10, y));

    span.style.left = `${finalX}px`;
    span.style.top = `${finalY}px`;
    span.style.animation = "fadeInUp 0.5s ease forwards";

    container.appendChild(span);
  });
}

// 📖 기초 학업 진단평가 문항 데이터 및 해설 DB (객관식 8문항)
const DIAGNOSTIC_QUESTIONS_DB = {
  q10: {
    title: "Q10. 기본권 종류 매칭",
    question: "일상생활 속에서 국가 권력의 간섭을 받지 않고 자유롭게 행동할 수 있는 자유권, 국가에 대해 최소한의 인간다운 생활 보장을 요구할 수 있는 사회권, 정치에 참여할 수 있는 참정권 등 헌법이 보장하는 기본권의 성격이 올바르게 짝지어진 것은?",
    options: {
      "①": "① 선거권 행사 - 참정권 / 행복추구 및 신체의 자유 - 자유권 / 최저임금 보장 요구 - 사회권",
      "②": "② 선거권 행사 - 사회권 / 행복추구 및 신체의 자유 - 자유권 / 최저임금 보장 요구 - 참정권",
      "③": "③ 선거권 행사 - 자유권 / 행복추구 및 신체의 자유 - 참정권 / 최저임금 보장 요구 - 사회권",
      "④": "④ 선거권 행사 - 참정권 / 행복추구 및 신체의 자유 - 사회권 / 최저임금 보장 요구 - 청구권"
    },
    correct: "①",
    explanation: "선거권이나 공무담임권은 정치 과정에 참여하는 '참정권'이며, 신체의 자유와 행복추구은 간섭을 배제하는 '자유권'이고, 국가에 인간다운 생활을 요구하는 최저임금제 등은 복지적 이념의 '사회권'입니다."
  },
  q11: {
    title: "Q11. 기본권 제한 목적",
    question: "우리 헌법 제37조 제2항에 따르면, 국민의 모든 자유와 권리는 국가안전보장, 질서유지 또는 공공복리를 위하여 필요한 경우에 한하여 법률로써 제한할 수 있습니다. 다음 중 기본권을 제한할 수 있는 헌법상 정당한 목적이나 원칙이 아닌 것은?",
    options: {
      "①": "① 국가의 안전을 보장하기 위한 목적",
      "②": "② 사회 공동체의 질서를 유지하기 위한 목적",
      "③": "③ 사회 전체의 이익과 공공의 복리를 증진하기 위한 목적",
      "④": "④ 특정 종교나 사상을 모든 국민에게 강제하여 사상을 통일하기 위한 목적"
    },
    correct: "④",
    explanation: "헌법상 기본권 제한은 오직 '국가안전보장', '질서유지', '공공복리'라는 목적하에서만 법률로써 가능하며, 특정 사상이나 종교의 강제를 목적으로 기본권을 제한하는 것은 위헌입니다."
  },
  q12: {
    title: "Q12. 청소년 근로 권리",
    question: "중학생이나 고등학생 등 청소년이 아르바이트나 근로 활동을 할 때 보호받을 수 있는 근로기준법상 권리로 올바르지 않은 것은?",
    options: {
      "①": "① 근로계약서는 반드시 작성하여 사업주와 근로자가 한 부씩 나누어 가져야 한다.",
      "②": "② 청소년도 성인과 동일한 법정 최저임금을 적용받는다.",
      "③": "③ 하루 1시간 이상 일하면 10분 이상의 휴게시간이 근무시간 중에 주어져야 한다.",
      "④": "④ 청소년은 위험하거나 유해한 업종(예: 유흥주점 등)에서도 부모님의 동의만 있다면 근로가 가능하다."
    },
    correct: "④",
    explanation: "청소년은 도덕상 또는 보건상 유해하거나 위험한 업종(청소년 유해업소 등)에서는 부모의 동의 여부와 무관하게 법적으로 근로가 전면 금지됩니다."
  },
  q13: {
    title: "Q13. 인권 침해 구제 기관",
    question: "학교 내 학교폭력, 직장 내 부당한 차별 대우, 국가 기관에 의한 권리 침해 등 인권을 침해당했을 때 도움을 요청하고 구제받을 수 있는 국가 공공기관과 그 역할이 올바르게 짝지어진 것은?",
    options: {
      "①": "① 국가인권위원회 - 성별, 장애, 종교 등을 이유로 한 차별 행위를 조사하고 시정을 권고한다.",
      "②": "② 법원 - 헌법재판소 법률의 위헌 여부만을 최종 심판한다.",
      "③": "③ 헌법재판소 - 개인 간의 돈 거래 갈등이나 형사 범죄 형량을 판결한다.",
      "④": "④ 경찰서 - 국가 법률이 헌법에 합치하는지 위헌성 심판을 내린다."
    },
    correct: "①",
    explanation: "인권 침해 및 차별 행위를 조사하고 구제를 권고하는 대표 기구는 '국가인권위원회'입니다. 법원은 민사/형사 판결을 내리며, 헌법재판소는 위헌법률심판이나 헌법소원심판을 주관합니다."
  },
  q16: {
    title: "Q16. 합리적 선택 기준",
    question: "경제학에서 말하는 '합리적 선택'에 대한 설명 중 가장 올바른 것은 무엇인가요?",
    options: {
      "①": "① 선택에 따라 지출하는 명목상의 비용만 최소화하면 무조건 합리적이다.",
      "②": "② 선택을 통해 얻는 편익(만족감, 이익)이 그 선택의 기회비용(포기한 대안의 가치 + 실제 지출 비용)보다 커야 한다.",
      "③": "③ 만족감(편익)은 전혀 고려하지 않고, 오직 회계상 비용이 0원에 가까울수록 합리적이다.",
      "④": "④ 기회비용은 개인마다 다를 수 없으며, 언제나 고정된 정답 금액으로 산출된다."
    },
    correct: "②",
    explanation: "합리적 선택은 편익이 기회비용(회계적 비용 + 암묵적 비용)보다 크거나 같을 때 성립합니다. 회계적 비용만 아끼는 것이 아니라 총만족(편익)이 포기한 가치보다 커야 합니다."
  },
  q17: {
    title: "Q17. 시장 가격 결정과 변동",
    question: "완전경쟁시장 안에서 초콜릿의 수요(사는 사람)가 갑자기 증가하여 공급(파는 양)을 훨씬 초과하는 '수요 초과' 상태가 발생했을 때 나타나는 시장 가격의 변동 양상으로 올바른 것은?",
    options: {
      "①": "① 초콜릿 가격이 상승하여 새로운 균형 가격을 찾아간다.",
      "②": "② 초콜릿 가격이 하락하여 사는 사람이 더 많아진다.",
      "③": "③ 가격은 변하지 않고 공급량만 무한대로 늘어난다.",
      "④": "④ 정부가 개입하기 전까지는 가격이 강제로 0원이 된다."
    },
    correct: "①",
    explanation: "수요가 공급보다 많으면(수요 초과) 시장 내에서 초콜릿을 사려는 경쟁이 일어나 가격이 '상승'하게 됩니다."
  },
  q18: {
    title: "Q18. 예적금 vs 주식 자산 관리",
    question: "금융 자산 관리에서 은행의 '예적금'과 기업의 '주식'이 가진 일반적인 특징을 비교한 설명으로 가장 적절한 것은?",
    options: {
      "①": "① 주식은 예적금에 비해 원금 손실 위험이 전혀 없다.",
      "②": "② 예적금은 주식에 비해 단기간에 엄청난 대박 수익률(고수익성)을 보장한다.",
      "③": "③ 예적금은 원금 보장성(안전성)이 높지만 수익성이 낮고, 주식은 고수익을 기대할 수 있으나 원금 손실 위험(위험성)이 크다.",
      "④": "④ 예적금과 주식 모두 예금자보호법에 의해 동일하게 1억 원까지 전액 보호받는다."
    },
    correct: "③",
    explanation: "예적금의 예금자보호 한도는 최근 1억 원으로 법적 상향되었으나, 주식은 예금자보호 대상이 아닙니다. 예적금은 안전성은 높고 수익성은 낮으며, 주식은 고수익을 지향하지만 위험성이 따릅니다."
  },
  q19: {
    title: "Q19. 환율 변동과 실생활 영향",
    question: "최근 원/달러 환율이 1달러당 1,200원에서 1,400원으로 급격하게 '상승'하였습니다. 이러한 환율 상승이 우리나라 경제 생활에 미치는 영향으로 가장 올바른 것은?",
    options: {
      "①": "① 미국 대학에 자녀를 유학 보낸 한국 부모의 해외 송금비 부담이 늘어난다.",
      "②": "② 미국에서 수입해 오는 밀가루와 석유 등 수입품 가격이 국내에서 싸진다.",
      "③": "③ 미국인들이 한국으로 여행 올 때 달러의 구매력이 낮아져 관광을 기피한다.",
      "④": "④ 한국 수출 기업들이 미국에 물건을 팔 때 달러 표시 가격 경쟁력이 극도로 불리해진다."
    },
    correct: "①",
    explanation: "환율이 오르면(원화 가치 하락) 1달러를 송금하기 위해 더 많은 원화(1,200원 ➔ 1,400원)가 필요하므로 유학생 자녀를 둔 한국 부모의 송금 부담이 커집니다."
  }
};

// =========================================================================
// 📝 교사 대시보드 과업별 관제 및 맵핑 시각화 연동 추가
// =========================================================================

state.currentTeacherTask = "c10101";
let teacherMapInstance = null;
let teacherMarkerGroup = null;
let teacherPinsData = [];

function renderTasksSection() {
  const section = document.getElementById("tSection_tasks");
  if (!section) return;
  
  const students = state.filteredStudents || [];
  const currentTask = state.currentTeacherTask || "c10101";
  
  let totalCount = students.length;
  let submitCount = 0;
  let scoresSum = 0;
  
  // 통계용 변수
  let timelineSortSuccess = 0;
  let eventMatchSum = 0;
  let genMatchSum = 0;
  
  let qCorrects = [0, 0, 0, 0, 0];
  let qTotals = [0, 0, 0, 0, 0];
  let qChoiceCounts = [];
  if (currentTask === "c10101") {
    qChoiceCounts = [
      { "①": 0, "②": 0, "③": 0, "④": 0 },
      { "①": 0, "②": 0, "③": 0, "④": 0 },
      { "성공": 0, "부분": 0 },
      { "성공": 0, "실패": 0 },
      { "성공": 0, "부분": 0 }
    ];
  } else if (currentTask === "c10102") {
    qChoiceCounts = [
      { "①": 0, "②": 0, "③": 0, "④": 0 },
      { "과잉금지": 0, "기타": 0 },
      { "①": 0, "②": 0, "③": 0, "④": 0 },
      { "성공": 0, "부분": 0 },
      { "A": 0, "B": 0, "C": 0, "D": 0 }
    ];
  } else {
    qChoiceCounts = [
      { "①": 0, "②": 0, "③": 0, "④": 0 },
      { "주거권": 0, "기타": 0 },
      { "안전권": 0, "기타": 0 },
      { "①": 0, "②": 0, "③": 0, "④": 0 },
      { "①": 0, "②": 0, "③": 0, "④": 0 }
    ];
  }
  
  let subjectiveAnswers = [];
  
  students.forEach(s => {
    let detailsKey = "";
    let activityTitleKey = "";

    if (s.activities) {
      if (currentTask === "c10101") {
        detailsKey = Object.keys(s.activities).find(k => (k.includes("과업 1") || k.includes("과업1") || k.includes("연표") || k.includes("3세대") || k.includes("c10101")) && k.endsWith("_details")) || "";
        activityTitleKey = Object.keys(s.activities).find(k => (k.includes("과업 1") || k.includes("과업1") || k.includes("연표") || k.includes("3세대") || k.includes("c10101")) && !k.endsWith("_details")) || "";
      } else if (currentTask === "c10102") {
        detailsKey = Object.keys(s.activities).find(k => (k.includes("과업 3") || k.includes("과업3") || k.includes("헌법") || k.includes("시민참여") || k.includes("c10102")) && k.endsWith("_details")) || "";
        activityTitleKey = Object.keys(s.activities).find(k => (k.includes("과업 3") || k.includes("과업3") || k.includes("헌법") || k.includes("시민참여") || k.includes("c10102")) && !k.endsWith("_details")) || "";
      } else {
        detailsKey = Object.keys(s.activities).find(k => (k.includes("과업 2") || k.includes("과업2") || k.includes("맵핑") || k.includes("현대인권") || k.includes("c10201")) && k.endsWith("_details")) || "";
        activityTitleKey = Object.keys(s.activities).find(k => (k.includes("과업 2") || k.includes("과업2") || k.includes("맵핑") || k.includes("현대인권") || k.includes("c10201")) && !k.endsWith("_details")) || "";
      }
    }

    let details = null;
    if (s.activities) {
      if (detailsKey && s.activities[detailsKey]) details = s.activities[detailsKey];
      else if (activityTitleKey && s.activities[activityTitleKey]) details = s.activities[activityTitleKey];
    }
    if (!details) {
      if (currentTask === "c10101") {
        const raw1 = s["인권 역사와 3세대 변화 연표 🏛️_details"] || s["과업 1: 인권 역사 연표_details"] || s["c10101_worksheet_details"];
        if (raw1) {
          try { details = typeof raw1 === "string" ? JSON.parse(raw1) : raw1; } catch(e) {}
        }
      } else if (currentTask === "c10102") {
        const raw2 = s["현대 인권과 지역사회 커뮤니티 맵핑 🗺️_details"] || s["과업 3: 커뮤니티 맵핑_details"] || s["c10102_chatbot_details"];
        if (raw2) {
          try { details = typeof raw2 === "string" ? JSON.parse(raw2) : raw2; } catch(e) {}
        }
      } else {
        const raw3 = s["과업 2: AI 대화형 챗봇_details"] || s["c10303_simulation_details"];
        if (raw3) {
          try { details = typeof raw3 === "string" ? JSON.parse(raw3) : raw3; } catch(e) {}
        }
      }
    }

    if (details) {
      submitCount++;
      const scoreStr = (activityTitleKey && s.activities && s.activities[activityTitleKey]) || s["인권 역사와 3세대 변화 연표 🏛️"] || details["평가/수익률 (Score)"] || details["평가/수익률"] || details["형성평가점수"] || details["점수"] || "80점";
      const scoreVal = parseInt(scoreStr) || 80;
      scoresSum += scoreVal;
      
      const sId = String(s["학번 (StudentID)"]);
      const sName = s["이름 (StudentName)"] || "이름미정";
      const gradeText = sId.length === 4 ? `${sId.substring(0, 1)}학년 ${parseInt(sId.substring(1, 2))}반 ${parseInt(sId.substring(2, 4))}번` : sId;
      
      if (currentTask === "c10101") {
        const sortRaw = details["2단계정렬순서"] || details["연대기정렬성공"] || "";
        const isSorted = sortRaw.includes("연대기정렬성공") || details["연대기정렬성공"] === "성공";
        if (isSorted) timelineSortSuccess++;
        
        const matchRaw = details["1단계매칭답변"] || details["매칭정답수"] || "";
        const matchCntMatch = matchRaw.match(/매칭:(\d+)/);
        const matchCnt = matchCntMatch ? parseInt(matchCntMatch[1]) : (parseInt(details["매칭정답수"]) || 0);
        eventMatchSum += matchCnt;
        
        const genMatch = sortRaw.match(/세대매칭\s*(\d+)/);
        const genCnt = genMatch ? parseInt(genMatch[1]) : (parseInt(details["세대매칭정답수"]) || 0);
        genMatchSum += genCnt;
        
        subjectiveAnswers.push({
          gradeText,
          sName,
          currentTask: "c10101",
          ref1: details["Q1_4세대인권상상"] || details["새로운권리서술"] || details["Q1_4세대인권제안"] || "미입력",
          ref2: details["Q2_학습과정성찰"] || details["성찰답변"] || details["메타성찰답변"] || "미입력"
        });

        // 📌 과업 1 (Q1~Q5) 정오답 파싱
        const quizRes = details["형성평가퀴즈"] || "";
        const parts = quizRes.split(",");
        parts.forEach((p, idx) => {
          const trimmed = p.trim();
          if (trimmed.startsWith("Q") && idx < 2) {
            qTotals[idx]++;
            if (trimmed.includes("(O)") || trimmed.endsWith(":O")) {
              qCorrects[idx]++;
            }
            
            // 선택지 파싱 (Q1:③, Q1:①, Q1:1 등 전수 파싱)
            const valMatch = trimmed.match(/Q\d+:([^(\s,]+)/);
            let choice = "";
            if (valMatch && valMatch[1]) {
              choice = valMatch[1].trim();
            }
            if (!choice) {
              if (trimmed.includes("①") || trimmed.includes("1")) choice = "①";
              else if (trimmed.includes("②") || trimmed.includes("2")) choice = "②";
              else if (trimmed.includes("③") || trimmed.includes("3")) choice = "③";
              else if (trimmed.includes("④") || trimmed.includes("4")) choice = "④";
            }
            if (choice === "1") choice = "①";
            if (choice === "2") choice = "②";
            if (choice === "3") choice = "③";
            if (choice === "4") choice = "④";

            if (["①", "②", "③", "④"].includes(choice)) {
              qChoiceCounts[idx][choice] = (qChoiceCounts[idx][choice] || 0) + 1;
            }
          }
        });

        // Q3 상호작용 짝맞추기 통계
        qTotals[2]++;
        if (matchCnt >= 5) {
          qChoiceCounts[2]["성공"] = (qChoiceCounts[2]["성공"] || 0) + 1;
          qCorrects[2]++;
        } else {
          qChoiceCounts[2]["부분"] = (qChoiceCounts[2]["부분"] || 0) + 1;
        }

        // Q4 연대기 정렬 통계
        qTotals[3]++;
        if (isSorted) {
          qChoiceCounts[3]["성공"] = (qChoiceCounts[3]["성공"] || 0) + 1;
          qCorrects[3]++;
        } else {
          qChoiceCounts[3]["실패"] = (qChoiceCounts[3]["실패"] || 0) + 1;
        }

        // Q5 세대 분류 통계
        qTotals[4]++;
        if (genCnt >= 5) {
          qChoiceCounts[4]["성공"] = (qChoiceCounts[4]["성공"] || 0) + 1;
          qCorrects[4]++;
        } else {
          qChoiceCounts[4]["부분"] = (qChoiceCounts[4]["부분"] || 0) + 1;
        }
      } else if (currentTask === "c10102") {
        subjectiveAnswers.push({
          gradeText,
          sName,
          currentTask: "c10102",
          ref1: details["챗봇대화내역"] || details["대화내역"] || details["G열"] || "💬 AI 챗봇 대화 기록 없음",
          ref2: details["시민참여성찰저널"] || details["메타성찰답변"] || details["시민참여성찰답변"] || "성찰 저널 미입력"
        });
      } else {
        const quizRes = details["형성평가퀴즈"] || "";
        const parts = quizRes.split(",");
        parts.forEach((p, idx) => {
          const trimmed = p.trim();
          if (trimmed.startsWith("Q") && idx < 5) {
            qTotals[idx]++;
            if (trimmed.includes("(O)") || trimmed.endsWith(":O")) {
              qCorrects[idx]++;
            }
            
            // 선택지 파싱
            const valMatch = trimmed.match(/Q\d+:([^(\s,]+)/);
            if (valMatch && valMatch[1]) {
              const choice = valMatch[1].trim();
              if (idx === 0 || idx === 3 || idx === 4) {
                if (["①", "②", "③", "④"].includes(choice)) {
                  qChoiceCounts[idx][choice] = (qChoiceCounts[idx][choice] || 0) + 1;
                } else if (choice.includes("①")) qChoiceCounts[idx]["①"]++;
                else if (choice.includes("②")) qChoiceCounts[idx]["②"]++;
                else if (choice.includes("③")) qChoiceCounts[idx]["③"]++;
                else if (choice.includes("④")) qChoiceCounts[idx]["④"]++;
              } else {
                if (choice === "주거권" || choice === "주거" || choice === "안전권") {
                  qChoiceCounts[idx][choice] = (qChoiceCounts[idx][choice] || 0) + 1;
                } else {
                  qChoiceCounts[idx]["기타"] = (qChoiceCounts[idx]["기타"] || 0) + 1;
                }
              }
            }
          }
        });
        
        subjectiveAnswers.push({
          gradeText,
          sName,
          currentTask: "c10201",
          ref1: details["시민참여성찰답변"] || details["시민참여성찰저널"] || "시민참여 저널 미입력",
          ref2: details["메타성찰답변"] || details["학습성찰"] || `📍 등록 핀 수: ${details["등록한핀개수"] || "0개"}`
        });
      }
    }
  });
  
  const submitRate = totalCount > 0 ? ((submitCount / totalCount) * 100).toFixed(1) : 0;
  const avgScore = submitCount > 0 ? (scoresSum / submitCount).toFixed(1) : 0;
  
  // 🗺️ 현대 인권 핀 유형별 분포 통계 (교사 지도 데이터 연동)
  let rightsDistribution = {};
  const select = document.getElementById("teacherClassSelect");
  const classVal = select ? select.value : "all";
  let totalPinsCount = 0;
  
  if (teacherPinsData && teacherPinsData.length > 0) {
    teacherPinsData.forEach(pin => {
      if (classVal !== "all" && String(pin.gradeClass) !== String(classVal)) {
        return;
      }
      totalPinsCount++;
      const rType = pin.rightsType || "기타";
      rightsDistribution[rType] = (rightsDistribution[rType] || 0) + 1;
    });
  }
  
  // 1. [과업 1] 통계 대시보드 마크업
  let statsDashboardHtml = "";
  if (currentTask === "c10101") {
    const sortSuccessRate = submitCount > 0 ? ((timelineSortSuccess / submitCount) * 100).toFixed(1) : 0;
    const avgEventMatch = submitCount > 0 ? (eventMatchSum / submitCount).toFixed(1) : 0;
    
    statsDashboardHtml = `
      <div class="card" style="padding: 24px; border-radius: 24px; background: var(--bg-card); border: 1px solid var(--border-glass);">
        <h4 style="font-size: 1rem; font-weight: 800; color: var(--color-purple); margin: 0 0 16px 0;">📊 🏛️ 과업 1: 인권 역사 연표 학급 정오답 분석 통계</h4>
        
        <!-- 요약 지표 카운트 -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px;">
          <div style="background: rgba(0,0,0,0.02); padding: 16px 20px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.04);">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary);">연대기 최종 정렬 성공률</span>
              <strong style="font-size: 0.9rem; color: var(--color-purple);">${sortSuccessRate}%</strong>
            </div>
            <div style="height: 10px; background: rgba(0,0,0,0.06); border-radius: 5px; overflow: hidden;">
              <div style="height: 100%; width: ${sortSuccessRate}%; background: linear-gradient(90deg, var(--color-purple-soft), var(--color-purple)); border-radius: 5px;"></div>
            </div>
          </div>
          
          <div style="background: rgba(0,0,0,0.02); padding: 16px 20px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.04);">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary);">역사적 사건 카드 매칭 평균</span>
              <strong style="font-size: 0.9rem; color: var(--color-pink);">${avgEventMatch} / 5개 (${(avgEventMatch / 5 * 100).toFixed(1)}%)</strong>
            </div>
            <div style="height: 10px; background: rgba(0,0,0,0.06); border-radius: 5px; overflow: hidden;">
              <div style="height: 100%; width: ${(avgEventMatch / 5 * 100)}%; background: linear-gradient(90deg, var(--color-pink-soft), var(--color-pink)); border-radius: 5px;"></div>
            </div>
          </div>
        </div>

        <!-- 📝 과업 1 객관식 (Q1, Q2) & 상호작용 (Q3~Q5) 문항별 선택지 득표율 & 정오답 분석 -->
        <div style="background: rgba(0,0,0,0.02); padding: 20px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.04);">
          <h5 style="margin: 0 0 14px 0; font-size: 0.92rem; font-weight:800; color: var(--color-purple); border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 6px;">📝 과업 1 형성평가 문항별(Q1~Q5) 지문 & 선택지 득표율 및 정오답 분석</h5>
          
          <div style="display: flex; flex-direction: column; gap: 16px;">
            ${(() => {
              const qQuestionsInfo = [
                { 
                  title: "Q1. [객관식 선다형] 인권의 일반적 특성 (천부성·보편성·항구성·불가침성)", 
                  question: "다음 중 인권의 일반적인 특성에 대한 설명으로 가장 올바르지 않은 항목은?",
                  options: {
                    "①": "① 천부성: 인권은 국가가 법률이나 제도로 승인해주기 이전부터 인간이 태어나면서 자연적으로 갖는 권리이다.",
                    "②": "② 보편성: 성별, 인종, 종교, 신분 등과 무관하게 인류 구성원인 모든 사람에게 예외 없이 동등하게 적용된다.",
                    "③": "③ 항구성: 일정한 보장 연한이 만료되거나 국가적 비상사태 하에서는 임의로 영구 박탈해 처분할 수 있는 시한부 권리이다.",
                    "④": "④ 불가침성: 누구도 다른 사람의 기본적 권리를 함부로 빼앗거나 훼손할 수 없으며 타인에게 임의 양도도 불가능하다."
                  },
                  correct: "③",
                  explanation: "인권은 항구적이며, 국가나 통치자의 편의에 따라 함부로 박탈되거나 제한될 수 없는 불가침의 고유한 권리입니다."
                },
                { 
                  title: "Q2. [객관식 선다형] 2세대 사회권적 기본권의 특징과 사례", 
                  question: "국가의 적극적 개입과 복지 제도를 청구해 최소한의 인간다운 생활과 행복을 누리도록 보장받는 '2세대 사회권적 기본권'에 부합하지 않는 사례는?",
                  options: {
                    "①": "① 근로의 권리를 요구하며 노동조합을 조직해 활동할 수 있는 기본적 권리",
                    "②": "② 어떠한 외부 간섭이나 강제도 거부한 채 개인의 사적인 주거 공간이나 종교적 믿음을 지킬 권리",
                    "③": "③ 건강하고 안전한 거주지에서 최소한의 보건위생 및 영양 지원을 수급해 쾌적하게 생존할 환경권",
                    "④": "④ 집안 형편에 상관없이 국가 공교육 기관에서 균등하게 배움의 지도를 수혜할 수 있는 교육권"
                  },
                  correct: "②",
                  explanation: "외부 간섭과 강제를 거부하고 자유를 지키는 권리는 1세대 '자유권적 기본권'에 해당합니다."
                },
                { 
                  title: "Q3. [상호작용형 짝맞추기] 사회적 조건 ↔ 역사적 사건 5개 1:1 매칭", 
                  question: "1-대헌장/시민혁명(자유권), 2-차티스트운동(참정권), 3-바이마르헌법(사회권), 4-세계인권선언(연대권/보편성), 5-국제인권규약(법적강제성)",
                  options: {
                    "성공": "5/5개 역사적 사건 및 요구 조건 1:1 매칭 성공",
                    "부분": "일부 매칭 성공 (2~4개 정답)"
                  },
                  correct: "성공",
                  explanation: "근대 시민 혁명부터 국제 인권 규약까지 요구 조건과 역사적 사건 매칭을 성찰하였습니다."
                },
                { 
                  title: "Q4. [상호작용형 연대기 정렬] 인권 발달사 시대순 5단계 배열", 
                  question: "대헌장(13세기) ➔ 차티스트(1838) ➔ 바이마르헌법(1919) ➔ 세계인권선언(1948) ➔ 국제인권규약(1966)",
                  options: {
                    "성공": "연대순 5개 역사적 사건 카드 정렬 완벽 성공 (100%)",
                    "실패": "연대순 정렬 재시도 필요"
                  },
                  correct: "성공",
                  explanation: "역사적 인권 발달 과정을 연대순으로 정밀 정렬하였습니다."
                },
                { 
                  title: "Q5. [상호작용형 세대 분류] 1세대·2세대·3세대 인권 세대 분류", 
                  question: "1세대(자유/참정권) ➔ 2세대(사회권) ➔ 3세대(집단권/연대권) 분류 성공률",
                  options: {
                    "성공": "권리 세대(1~3세대) 매칭 분류 완벽 성공",
                    "부분": "일부 세대 분류 성공"
                  },
                  correct: "성공",
                  explanation: "인권의 세대별(1~3세대) 발전 양상과 권리 성격을 성공적으로 분별하였습니다."
                }
              ];

              return qQuestionsInfo.map((q, idx) => {
                const total = qTotals[idx] || submitCount || 0;
                const optCounts = qChoiceCounts[idx] || {};

                const choicesHtml = Object.keys(q.options).map(cKey => {
                  const isAns = cKey === q.correct;
                  let cCnt = optCounts[cKey] || 0;
                  const cPct = total > 0 ? Math.round((cCnt / total) * 100) : 0;

                  if (isAns) {
                    return `
                      <div style="background: rgba(43, 138, 98, 0.08); border: 1.5px solid var(--color-mint); padding: 10px 14px; border-radius: 12px; margin-bottom: 6px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.86rem; margin-bottom: 4px;">
                          <span style="font-weight: 800; color: #2b8a3e;">✅ ${q.options[cKey]}</span>
                          <strong style="font-size: 0.86rem; color: #2b8a3e;">${cCnt}명 (${cPct}%)</strong>
                        </div>
                        <div style="width: 100%; height: 8px; background: rgba(43, 138, 98, 0.15); border-radius: 4px; overflow: hidden;">
                          <div style="width: ${cPct}%; height: 100%; background: var(--color-mint); border-radius: 4px; transition: width 0.5s;"></div>
                        </div>
                      </div>
                    `;
                  } else {
                    return `
                      <div style="background: rgba(0, 0, 0, 0.02); border: 1px solid rgba(0,0,0,0.04); padding: 10px 14px; border-radius: 12px; margin-bottom: 6px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.86rem; margin-bottom: 4px;">
                          <span style="font-size: 0.84rem; color: var(--text-primary); font-weight: 500;">${q.options[cKey]}</span>
                          <span style="font-size: 0.82rem; color: var(--text-secondary); font-weight: 600;">${cCnt}명 (${cPct}%)</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: rgba(0, 0, 0, 0.06); border-radius: 4px; overflow: hidden;">
                          <div style="width: ${cPct}%; height: 100%; background: rgba(0, 0, 0, 0.2); border-radius: 4px; transition: width 0.5s;"></div>
                        </div>
                      </div>
                    `;
                  }
                }).join("");

                return `
                  <div style="background: rgba(255,255,255,0.75); padding: 16px 18px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 4px 12px rgba(0,0,0,0.015);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                      <span style="font-weight:800; font-size:0.95rem; color:var(--color-purple);">${q.title}</span>
                      <span style="font-size:0.8rem; color:var(--text-secondary); font-weight:600;">응답 학생: <strong style="color:var(--text-primary);">${total}명</strong></span>
                    </div>
                    <p style="margin: 0 0 12px 0; font-size:0.86rem; color:var(--text-primary); line-height:1.5; font-weight:500;">${q.question}</p>
                    <div style="margin-bottom:12px;">
                      ${choicesHtml}
                    </div>
                    <div style="background: rgba(184, 150, 219, 0.08); border-left: 4px solid var(--color-purple); padding: 10px 14px; border-radius: 12px; font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary);">
                      💡 <strong>단원 성취기준 핵심 해설:</strong> ${q.explanation}
                    </div>
                  </div>
                `;
              }).join("");
            })()}
          </div>
        </div>
      </div>
    `;
  } else if (currentTask === "c10102") {
    // 2. [과업 3] 통계 대시보드 마크업 (문항별 Q1~Q5 정오답 및 선택지 득표율 상세 포함)
    statsDashboardHtml = `
      <div class="card" style="padding: 24px; border-radius: 24px; background: var(--bg-card); border: 1px solid var(--border-glass);">
        <h4 style="font-size: 1rem; font-weight: 800; color: var(--color-purple); margin: 0 0 16px 0;">📊 💬 과업 3: 헌법의 역할과 시민참여 (AI 챗봇) 학급 정오답 분석</h4>
        
        <!-- 요약 지표 카운트 -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px;">
          <div style="background: rgba(0,0,0,0.02); padding: 16px 20px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.04);">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary);">1단계 헌법/기본권 형성평가 평균</span>
              <strong style="font-size: 0.9rem; color: var(--color-purple);">${avgScore}점</strong>
            </div>
            <div style="height: 10px; background: rgba(0,0,0,0.06); border-radius: 5px; overflow: hidden;">
              <div style="height: 100%; width: ${avgScore}%; background: linear-gradient(90deg, var(--color-purple-soft), var(--color-purple)); border-radius: 5px;"></div>
            </div>
          </div>
          
          <div style="background: rgba(0,0,0,0.02); padding: 16px 20px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.04);">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary);">2단계 1:1 진로 가상시민 AI 대화 완수율</span>
              <strong style="font-size: 0.9rem; color: #2b8a3e;">${submitCount}명 제출완료</strong>
            </div>
            <div style="height: 10px; background: rgba(0,0,0,0.06); border-radius: 5px; overflow: hidden;">
              <div style="height: 100%; width: ${submitRate}%; background: linear-gradient(90deg, #51cf66, #2b8a3e); border-radius: 5px;"></div>
            </div>
          </div>
        </div>

        <!-- 형성평가 문항별 선택지 득표율 & 정오답 분석 -->
        <div style="background: rgba(0,0,0,0.02); padding: 20px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.04);">
          <h5 style="margin: 0 0 14px 0; font-size: 0.92rem; font-weight:800; color: var(--color-purple); border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 6px;">📝 형성평가 (Q1~Q5) 문항별 지문 & 선택지 득표율 및 정오답 분석</h5>
          
          <div style="display: flex; flex-direction: column; gap: 16px;">
            ${(() => {
              const qQuestionsInfo = [
                { 
                  title: "Q1. [선다형] 기본권 개념: 부당한 차별을 받지 않을 권리", 
                  question: "국가나 타인으로부터 성별, 종교, 장애, 신분 등을 이유로 부당한 차별을 받지 않고 법 앞에 동등하게 대우받을 권리는?",
                  options: {
                    "①": "① 평등권 - 법 앞에 차별받지 않고 균등한 대우를 받을 권리",
                    "②": "② 자유권 - 국가 권력의 부당한 간섭이나 침해를 받지 않을 권리",
                    "③": "③ 참정권 - 국가의 정치 과정에 직접 또는 간접적으로 참여할 권리",
                    "④": "④ 청구권 - 기본권이 침해되었을 때 그 구제를 요구할 수 있는 권리"
                  },
                  correct: "①",
                  explanation: "평등권은 모든 국민이 성별, 종교, 사회적 신분 등에 의하여 차별을 받지 아니하는 기본권입니다."
                },
                { 
                  title: "Q2. [단답형] 헌법 제37조 제2항 기본권 제한의 한계 원칙", 
                  question: "헌법 제37조 제2항의 '법률로써 제한할 수 있으며'가 내포하는 의미로서, 기본권 제한 시 목적의 정당성, 수단의 적합성, 피해의 최소성, 법익의 균형성을 지켜야 하는 기본권 제한의 한계 원칙은?",
                  options: {
                    "과잉금지": "과잉금지의 원칙 (정답 - 목적의 정당성·수단의 적합성·피해의 최소성·법익의 균형성)",
                    "기타": "기타 오답 제출"
                  },
                  correct: "과잉금지",
                  explanation: "국민의 기본권 제한 시 과도한 침해를 금지하는 '과잉금지의 원칙'을 의미하며, 정답은 '과잉금지' 또는 '과잉 금지'입니다."
                },
                { 
                  title: "Q3. [선다형] 헌법재판 권리 구제 제도의 유형 구분", 
                  question: "공권력의 행사 또는 불행사로 인하여 헌법상 보장된 기본권을 직접 침해당한 국민이 헌법재판소에 직접 권리 구제를 청구하는 제도는?",
                  options: {
                    "①": "① 권리구제형 헌법소원 (공권력 직접 침해 시 헌재 구제 청구)",
                    "②": "② 위헌심사형 헌법소원 (법원의 위헌제청 신청 기각 시)",
                    "③": "③ 위헌법률심판 (법원이 재판 중 해당 법률의 위헌성 제청)",
                    "④": "④ 행정 강제 집행 (행정 의무 불이행 시 국가 실력 행사)"
                  },
                  correct: "①",
                  explanation: "공권력의 행사/불행사로 기본권을 직접 침해당한 국민이 헌법재판소에 직접 구제를 청구하는 제도는 '권리구제형 헌법소원'입니다."
                },
                { 
                  title: "Q4. [상호작용형 짝맞추기] 실생활 고충 사례 4개 ↔ 4대 기본권 1:1 매칭", 
                  question: "1-헌법소원/재판(청구권), 2-임금차별(평등권), 3-개인정보/집회(자유권), 4-야근/인간다운생활(사회권)",
                  options: {
                    "성공": "4/4개 기본권 1:1 매칭 성공 (청구권·평등권·자유권·사회권)",
                    "부분": "일부 매칭 성공 (2~3개 정답)"
                  },
                  correct: "성공",
                  explanation: "침해된 사례별 헌법상 기본권의 성격을 명확하게 매칭하였습니다."
                },
                { 
                  title: "Q5. [상호작용형 형광펜] 시민 불복종 4대 요건 오개념 하이라이트", 
                  question: "시민 불복종 요건 지문 중 '개인이나 특정 사익 집단의 재산적 이익 증진을 목적으로 삼아야 하며 [A]' 오개념 하이라이트",
                  options: {
                    "A": "[A] 개인이나 특정 사익 집단의 재산적 이익 증진을 목적으로 삼아야 하며 (정답 - 오개념 구역)",
                    "B": "[B] 폭력을 배제하고 주위에 피해를 주지 않는 비폭력이어야 하고",
                    "C": "[C] 모든 합법적 수단을 다 사용한 후 행하는 최후의 수단이어야 하며",
                    "D": "[D] 위법 행위에 따른 법적 처벌과 불이익을 기꺼이 받아들이는 처벌 감수성이 있어야 한다"
                  },
                  correct: "A",
                  explanation: "시민 불복종은 사익 목적이 아닌 사회 전체의 정당성과 공익을 목적으로 해야 하며 비폭력, 최후수단성, 처벌감수성을 갖추어야 합니다."
                }
              ];

              return qQuestionsInfo.map((q, idx) => {
                const total = qTotals[idx] || submitCount || 0;
                const optCounts = qChoiceCounts[idx] || {};

                const choicesHtml = Object.keys(q.options).map(cKey => {
                  const isAns = cKey === q.correct;
                  let cCnt = optCounts[cKey] || 0;
                  if (cKey === "성공" && optCounts["성공"] === undefined) cCnt = qCorrects[idx] || submitCount;
                  const cPct = total > 0 ? Math.round((cCnt / total) * 100) : 0;

                  if (isAns) {
                    return `
                      <div style="background: rgba(43, 138, 98, 0.08); border: 1.5px solid var(--color-mint); padding: 10px 14px; border-radius: 12px; margin-bottom: 6px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.86rem; margin-bottom: 4px;">
                          <span style="font-weight: 800; color: #2b8a3e;">✅ ${q.options[cKey]}</span>
                          <strong style="font-size: 0.86rem; color: #2b8a3e;">${cCnt}명 (${cPct}%)</strong>
                        </div>
                        <div style="width: 100%; height: 8px; background: rgba(43, 138, 98, 0.15); border-radius: 4px; overflow: hidden;">
                          <div style="width: ${cPct}%; height: 100%; background: var(--color-mint); border-radius: 4px; transition: width 0.5s;"></div>
                        </div>
                      </div>
                    `;
                  } else {
                    return `
                      <div style="background: rgba(0, 0, 0, 0.02); border: 1px solid rgba(0,0,0,0.04); padding: 10px 14px; border-radius: 12px; margin-bottom: 6px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.86rem; margin-bottom: 4px;">
                          <span style="font-size: 0.84rem; color: var(--text-primary); font-weight: 500;">${q.options[cKey]}</span>
                          <span style="font-size: 0.82rem; color: var(--text-secondary); font-weight: 600;">${cCnt}명 (${cPct}%)</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: rgba(0, 0, 0, 0.06); border-radius: 4px; overflow: hidden;">
                          <div style="width: ${cPct}%; height: 100%; background: rgba(0, 0, 0, 0.2); border-radius: 4px; transition: width 0.5s;"></div>
                        </div>
                      </div>
                    `;
                  }
                }).join("");

                return `
                  <div style="background: rgba(255,255,255,0.75); padding: 16px 18px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 4px 12px rgba(0,0,0,0.015);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                      <span style="font-weight:800; font-size:0.95rem; color:var(--color-purple);">${q.title}</span>
                      <span style="font-size:0.8rem; color:var(--text-secondary); font-weight:600;">응답 학생: <strong style="color:var(--text-primary);">${total}명</strong></span>
                    </div>
                    <p style="margin: 0 0 12px 0; font-size:0.86rem; color:var(--text-primary); line-height:1.5; font-weight:500;">${q.question}</p>
                    <div style="margin-bottom:12px;">
                      ${choicesHtml}
                    </div>
                    <div style="background: rgba(184, 150, 219, 0.08); border-left: 4px solid var(--color-purple); padding: 10px 14px; border-radius: 12px; font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary);">
                      💡 <strong>단원 성취기준 핵심 해설:</strong> ${q.explanation}
                    </div>
                  </div>
                `;
              }).join("");
            })()}
          </div>
        </div>
      </div>
    `;
  } else {
    // 2. [과업 2] 통계 대시보드 마크업 (과업 2 문항 유형 Q1~Q5 정밀 매칭)
    const qRates = qCorrects.map((correct, idx) => {
      const total = qTotals[idx] || 1;
      return ((correct / total) * 100).toFixed(1);
    });
    
    // 인권 유형 분포 차트용 HTML 구성
    let distRowsHtml = "";
    const distKeys = Object.keys(rightsDistribution);
    if (distKeys.length === 0) {
      distRowsHtml = `<div style="font-size: 0.8rem; color: var(--text-secondary); text-align: center; padding: 20px;">등록된 핀 정보가 없습니다.</div>`;
    } else {
      distRowsHtml = distKeys.map(key => {
        const count = rightsDistribution[key];
        const pct = totalPinsCount > 0 ? ((count / totalPinsCount) * 100).toFixed(1) : 0;
        
        let badgeColor = "var(--color-purple)";
        if (key === "환경권") badgeColor = "#2b8a3e";
        else if (key === "안전권") badgeColor = "#e03131";
        else if (key === "주거권") badgeColor = "#f08c00";
        else if (key === "디지털") badgeColor = "#1971c2";
        
        return `
          <div style="margin-bottom: 12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px; font-size: 0.8rem;">
              <span class="rights-badge" style="background: ${badgeColor}; padding: 2px 6px; border-radius: 4px; color: white; font-weight:700;">${key}</span>
              <strong style="color: var(--text-primary); font-size: 0.82rem;">${count}개 (${pct}%)</strong>
            </div>
            <div style="height: 8px; background: rgba(0,0,0,0.05); border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: ${pct}%; background: ${badgeColor}; border-radius: 4px;"></div>
            </div>
          </div>
        `;
      }).join("");
    }
    
    statsDashboardHtml = `
      <div class="card" style="padding: 24px; border-radius: 24px; background: var(--bg-card); border: 1px solid var(--border-glass);">
        <h4 style="font-size: 1rem; font-weight: 800; color: var(--color-purple); margin: 0 0 16px 0;">📊 🗺️ 과업 2 학급 형성평가 & 맵핑 침해유형 분석</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
          <!-- 형성평가 문항별 선택지 득표율 & 정오답 분석 -->
          <div style="background: rgba(0,0,0,0.02); padding: 20px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.04); grid-column: span 2;">
            <h5 style="margin: 0 0 14px 0; font-size: 0.92rem; font-weight:800; color: var(--color-purple); border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 6px;">📝 형성평가 (Q1~Q5) 문항별 전체 지문 & 선택지(①~④) 득표율 상세 분석</h5>
            
            <div style="display: flex; flex-direction: column; gap: 16px;">
              ${(() => {
                const qQuestionsInfo = [
                  { 
                    title: "Q1. [환경권] 현대 신흥 인권의 기본 개념", 
                    question: "현대 사회의 핵심 신흥 인권 중 하나인 '환경권'에 관한 설명으로 가장 올바르지 않은 것은?",
                    options: {
                      "①": "① 모든 인간은 건강하고 쾌적한 환경에서 환경 오염으로부터 해를 입지 않고 살 권리가 있다.",
                      "②": "② 헌법 제35조에서 보장하며, 환경을 보전하기 위해 국가와 모든 국민은 공동 의무를 진다.",
                      "③": "③ 미래 세대에게 물려줄 환경 자원 확보와 지속 가능한 환경 보전 의무를 명시한다.",
                      "④": "④ 개인이나 기업의 자유로운 토지 개발과 영리 추구를 위해서라면 공공 환경의 훼손은 제한 없이 허용된다."
                    },
                    correct: "④",
                    explanation: "개인이나 기업의 자유나 영리 개발을 위해서라도 환경권은 헌법 제37조 2항의 공공복리와 질서유지 기준에 의해 엄격히 제한되며, 무제한 오염 및 훼손은 절대 허용되지 않습니다."
                  },
                  { 
                    title: "Q2. [주거권] 쾌적하고 안정적인 삶의 터전 보장", 
                    question: "쾌적하고 안정적인 주거 환경에서 인간다운 주거 생활을 영위할 권리를 뜻하며, 헌법 제35조 3항에서 국가는 주택 개발 정책 등을 통해 모든 국민의 이 권리를 위해 노력해야 한다고 규정한 인권은?",
                    options: {
                      "①": "① 주거권 (주거의 권리)",
                      "②": "② 소극적 신체 자유권",
                      "③": "③ 참정권적 선거 운동권",
                      "④": "④ 재산권 전면 청구권"
                    },
                    correct: "①",
                    explanation: "쾌적하고 안정적인 주거 환경에서 살 권리는 헌법 제35조 3항에 규정된 현대 사회의 대표적 신흥 인권인 '주거권'입니다."
                  },
                  { 
                    title: "Q3. [안전권 & 디지털 잊힐 권리] 현대 위험 사회의 헌법적 보호", 
                    question: "생명과 안녕을 위협하는 각종 재해 및 전염병으로부터 국가의 보복 및 안전 대책 보호를 받을 '안전권'과, 인터넷상 원치 않는 정보 삭제를 요구하는 '디지털 잊힐 권리'의 공통적 성격은?",
                    options: {
                      "①": "① 기술 발전과 현대 사회의 복잡화에 따라 인권의 영역이 지속적으로 확장·창설된 사례이다.",
                      "②": "② 근대 18세기 프랑스 인권 선언 당시에 명시된 역사적 기본권이다.",
                      "③": "③ 오직 정당 및 정치인들에게만 부여되는 정치적 참정권이다.",
                      "④": "④ 국가의 법적 의무가 전혀 수반되지 않는 순수한 개인의 사적 소망이다."
                    },
                    correct: "①",
                    explanation: "안전권과 디지털 잊힐 권리는 현대 사회의 복잡화 및 과학 기술 발전에 따라 지속적으로 확장·창설된 신흥 인권입니다."
                  },
                  { 
                    title: "Q4. [지리/공간 핫스팟] 보행 장애 구역 지도 식별 (핫스팟 클릭)", 
                    question: "지역사회 보행 환경 지도에서 휠체어·유모차 통행이 단절된 보도블록 턱 20cm 단차 구역(핫스팟 B) 식별",
                    options: {
                      "B": "🚨 [B 구역] 20cm 높은 보도블록 턱으로 휠체어 단절된 횡단보도 (정답 구역)",
                      "A": "🏢 [A 구역] 완만한 경사로가 설치된 공공 도서관 정문",
                      "C": "🌳 [C 구역] 평지 휴식용 벤치가 놓인 중앙 근린 공원",
                      "D": "🚏 [D 구역] 음성 안내 장치가 작동하는 버스 정류장"
                    },
                    correct: "B",
                    explanation: "20cm 높은 보도블록 턱이 위치한 횡단보도 [B 구역]은 휠체어·유모차 이용자의 이동권과 안전권을 심각하게 위협하는 핵심 개선 핫스팟입니다."
                  },
                  { 
                    title: "Q5. [범주 분류] 현대 신흥 인권 3대 영역별 분류", 
                    question: "1-공장매연(환경권), 2-공공임대주택(주거권), 3-가로등/CCTV(안전권), 4-도심생태공원(환경권)",
                    options: {
                      "성공": "4/4개 실생활 이슈 3대 신흥 인권 영역 매칭 분류 완벽 성공 (100%)",
                      "부분": "일부 영역 분류 성공 (2~3개 정답)"
                    },
                    correct: "성공",
                    explanation: "1번(매연)과 4번(녹지)은 🌿 환경권, 2번(임대주택)은 🏠 주거권, 3번(가로등/CCTV)은 🚨 안전권 영역에 정확하게 분류되었습니다."
                  }
                ];

                return qQuestionsInfo.map((q, idx) => {
                  const total = qTotals[idx] || submitCount || 0;
                  const optCounts = qChoiceCounts[idx] || {};

                  const choicesHtml = Object.keys(q.options).map(cKey => {
                    const isAns = cKey === q.correct;
                    let cCnt = optCounts[cKey] || 0;
                    if (cKey === "B" && optCounts["B"] === undefined) cCnt = qCorrects[idx] || submitCount;
                    if (cKey === "성공" && optCounts["성공"] === undefined) cCnt = qCorrects[idx] || submitCount;
                    const cPct = total > 0 ? Math.round((cCnt / total) * 100) : 0;

                    if (isAns) {
                      return `
                        <div style="background: rgba(43, 138, 98, 0.08); border: 1.5px solid var(--color-mint); padding: 10px 14px; border-radius: 12px; margin-bottom: 6px;">
                          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.86rem; margin-bottom: 4px;">
                            <span style="font-weight: 800; color: #2b8a3e;">✅ ${q.options[cKey]}</span>
                            <strong style="font-size: 0.86rem; color: #2b8a3e;">${cCnt}명 (${cPct}%)</strong>
                          </div>
                          <div style="width: 100%; height: 8px; background: rgba(43, 138, 98, 0.15); border-radius: 4px; overflow: hidden;">
                            <div style="width: ${cPct}%; height: 100%; background: var(--color-mint); border-radius: 4px; transition: width 0.5s;"></div>
                          </div>
                        </div>
                      `;
                    } else {
                      return `
                        <div style="background: rgba(0, 0, 0, 0.02); border: 1px solid rgba(0,0,0,0.04); padding: 10px 14px; border-radius: 12px; margin-bottom: 6px;">
                          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.86rem; margin-bottom: 4px;">
                            <span style="font-size: 0.84rem; color: var(--text-primary); font-weight: 500;">${q.options[cKey]}</span>
                            <span style="font-size: 0.82rem; color: var(--text-secondary); font-weight: 600;">${cCnt}명 (${cPct}%)</span>
                          </div>
                          <div style="width: 100%; height: 8px; background: rgba(0, 0, 0, 0.06); border-radius: 4px; overflow: hidden;">
                            <div style="width: ${cPct}%; height: 100%; background: rgba(0, 0, 0, 0.2); border-radius: 4px; transition: width 0.5s;"></div>
                          </div>
                        </div>
                      `;
                    }
                  }).join("");

                  return `
                    <div style="background: rgba(255,255,255,0.75); padding: 16px 18px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 4px 12px rgba(0,0,0,0.015);">
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <span style="font-weight:800; font-size:0.95rem; color:var(--color-purple);">${q.title}</span>
                        <span style="font-size:0.8rem; color:var(--text-secondary); font-weight:600;">응답 학생: <strong style="color:var(--text-primary);">${total}명</strong></span>
                      </div>
                      <p style="margin: 0 0 12px 0; font-size:0.86rem; color:var(--text-primary); line-height:1.5; font-weight:500;">${q.question}</p>
                      <div style="margin-bottom:12px;">
                        ${choicesHtml}
                      </div>
                      <div style="background: rgba(184, 150, 219, 0.08); border-left: 4px solid var(--color-purple); padding: 10px 14px; border-radius: 12px; font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary);">
                        💡 <strong>단원 성취기준 핵심 해설:</strong> ${q.explanation}
                      </div>
                    </div>
                  `;
                }).join("");
              })()}
            </div>
          </div>
          
          <!-- 침해 현황 인권 유형별 분포 -->
          <div style="background: rgba(0,0,0,0.02); padding: 20px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.04);">
            <h5 style="margin: 0 0 14px 0; font-size: 0.88rem; font-weight:800; color: var(--text-primary); border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 6px;">🗺️ 등록된 지역 침해 핀 인권 유형 분포</h5>
            <div style="max-height: 160px; overflow-y:auto; padding-right: 4px;">
              ${distRowsHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // 3. 주관식 답변 성과물 공유 보드 마크업
  let subjectiveBoardHtml = "";
  if (subjectiveAnswers.length === 0) {
    subjectiveBoardHtml = `
      <div class="card" style="padding: 24px; border-radius: 24px; background: var(--bg-card); border: 1px solid var(--border-glass); text-align: center; color: var(--text-secondary);">
        💡 제출된 주관식 성찰 답변이 없습니다.
      </div>
    `;
  } else {
    let cardTitle = "💡 학급 4세대 신규 인권 상상 제안 및 학습 과정 성찰 저널";
    if (currentTask === "c10102") cardTitle = "💬 학급 AI 챗봇 대화 내역 모니터링 & 메타인지 성찰 저널 모음";
    else if (currentTask === "c10201") cardTitle = "💡 학급 주거·안전·환경/소외 구역 시민 참여 성찰 저널 모음";
      
    window.subjectiveAnswersCache = subjectiveAnswers;

    const answerCards = subjectiveAnswers.map((ans, idx) => {
      const taskKind = ans.currentTask || currentTask;
      let field1Title = "🏛️ 내가 상상하는 4세대 인권 제안";
      let field2Title = "🌱 학습 과정에 대한 메타인지 성찰 저널";

      if (taskKind === "c10102") {
        field1Title = "💬 AI 챗봇과의 대화 내역 모니터링";
        field2Title = "🌱 학습 과정에 대한 메타인지 성찰 저널";
      } else if (taskKind === "c10201") {
        field1Title = "📝 시민 참여 성찰 저널 기록";
        field2Title = "🌱 학습 과정에 대한 메타인지 성찰 저널";
      }
      
      const displayRef1 = taskKind === "c10102"
        ? (ans.ref1.length > 110 ? ans.ref1.substring(0, 110) + "..." : ans.ref1)
        : ans.ref1;

      return `
        <div onclick="showSubjectiveDetailModalByIndex(${idx})" style="background: rgba(255, 255, 255, 0.7); border: 1.5px solid rgba(184,150,219,0.3); padding: 16px; border-radius: 18px; display: flex; flex-direction: column; gap: 8px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.02);" onmouseover="this.style.transform='translateY(-2px)'; this.style.borderColor='var(--color-purple)';" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='rgba(184,150,219,0.3)';">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(0,0,0,0.04); padding-bottom: 6px;">
            <strong style="font-size:0.85rem; color: var(--color-purple);">${ans.sName} <span style="font-size:0.72rem; color:var(--text-secondary); font-weight: normal;">(${ans.gradeText})</span></strong>
            <span style="font-size: 0.72rem; font-weight: 800; color: var(--color-purple); background: rgba(184,150,219,0.15); padding: 3px 8px; border-radius: 6px;">🔍 ${taskKind === "c10102" ? "챗봇 대화/성찰 크게보기" : "상세 성찰 크게보기"}</span>
          </div>
          <div>
            <span style="font-size: 0.72rem; font-weight:700; color: var(--text-secondary); display:block; margin-bottom: 2px;">${field1Title}:</span>
            <p style="margin: 0; font-size: 0.8rem; color: var(--text-primary); line-height: 1.45; word-break: break-all; white-space: pre-wrap;">${displayRef1}</p>
          </div>
          <div>
            <span style="font-size: 0.72rem; font-weight:700; color: var(--text-secondary); display:block; margin-bottom: 2px;">${field2Title}:</span>
            <p style="margin: 0; font-size: 0.8rem; color: var(--color-purple); line-height: 1.45; word-break: break-all;">${ans.ref2}</p>
          </div>
        </div>
      `;
    }).join("");
    
    subjectiveBoardHtml = `
      <div class="card" style="padding: 24px; border-radius: 24px; background: var(--bg-card); border: 1px solid var(--border-glass);">
        <h4 style="font-size: 1rem; font-weight: 800; color: var(--text-primary); margin: 0 0 16px 0;">${cardTitle}</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; max-height: 380px; overflow-y: auto; padding-right: 6px;">
          ${answerCards}
        </div>
      </div>
    `;
  }
  
  let tableRows = "";
  if (students.length === 0) {
    tableRows = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 30px; font-weight: 700; color: var(--text-secondary);">
          선택된 학급의 학생 정보가 없습니다. 🥺
        </td>
      </tr>
    `;
  } else {
    tableRows = students.map(s => {
      const sId = String(s["학번 (StudentID)"]);
      const sName = s["이름 (StudentName)"] || "이름미정";
      const gradeText = sId.length === 4 ? `${sId.substring(0, 1)}학년 ${parseInt(sId.substring(1, 2))}반 ${parseInt(sId.substring(2, 4))}번` : sId;
      
      let detailsKey = "";
      if (s.activities) {
        if (currentTask === "c10101") {
          detailsKey = Object.keys(s.activities).find(k => (k.includes("과업 1") || k.includes("연표") || k.includes("3세대")) && k.endsWith("_details")) || "";
        } else if (currentTask === "c10102") {
          detailsKey = Object.keys(s.activities).find(k => (k.includes("과업 3") || k.includes("헌법") || k.includes("시민참여")) && k.endsWith("_details")) || "";
        } else {
          detailsKey = Object.keys(s.activities).find(k => (k.includes("과업 2") || k.includes("맵핑") || k.includes("현대인권")) && k.endsWith("_details")) || "";
        }
      }
      const details = detailsKey ? s.activities[detailsKey] : null;
      
      const sPassword = getStudentPasswordFromRow(s);
      const safePassword = String(sPassword).replace(/'/g, "\\'").replace(/"/g, "&quot;");
      const safeName = String(sName).replace(/'/g, "\\'").replace(/"/g, "&quot;");

      if (!details) {
        return `
          <tr style="border-bottom: 1px solid rgba(0,0,0,0.04);">
            <td style="padding: 14px 8px; font-weight: 700; color: var(--text-primary);">${gradeText}</td>
            <td style="padding: 14px 8px; font-weight: 700; cursor: pointer;" onclick="showStudentPasswordModal('${sId}', '${safeName}', '${safePassword}')" title="클릭 시 4자리 이모티콘 비밀번호 확인 🔑">
              <span style="color: var(--color-purple); text-decoration: underline; text-underline-offset: 3px;">${sName}</span>
              <span style="font-size: 0.72rem; color: #1971c2; font-weight: 800; display: inline-block; margin-left: 4px; background: rgba(25, 113, 194, 0.08); padding: 1px 6px; border-radius: 4px;">🔑 비번</span>
            </td>
            <td style="padding: 14px 8px;"><span style="background: rgba(201, 42, 42, 0.08); color: #c92a2a; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 0.75rem;">미제출 ❌</span></td>
            <td colspan="${currentTask === 'c10101' ? 7 : 5}" style="padding: 14px 8px; text-align: center; color: var(--text-secondary); font-style: italic;">과제를 아직 제출하지 않았습니다.</td>
          </tr>
        `;
      }
      
      const submitTimeRaw = details["등록시간 (Timestamp)"] || details["제출시간 (Timestamp)"] || "";
      const submitTime = submitTimeRaw ? new Date(submitTimeRaw).toLocaleString() : "시간 미상";
      
      if (currentTask === "c10101") {
        const matchRaw = details["1단계매칭답변"] || details["매칭정답수"] || "";
        const matchCntMatch = matchRaw.match(/매칭:(\d+)\/(\d+)개/);
        const matchCnt = matchCntMatch ? matchCntMatch[1] + "/5개" : (details["매칭정답수"] || "미기입");

        const sortRaw = details["2단계정렬순서"] || details["연대기정렬성공"] || "";
        const isSorted = sortRaw.includes("연대기정렬성공") ? "성공" : (sortRaw.includes("연대기정렬실패") ? "실패" : (details["연대기정렬성공"] || "실패"));

        const quizRes = details["형성평가퀴즈"] || "";
        let quizCorrectCount = 0;
        if (quizRes) {
          const parts = quizRes.split(",");
          parts.forEach(p => {
            if (p.includes("(O)") || p.endsWith(":O")) {
              quizCorrectCount++;
            }
          });
        }
        const quizText = quizRes ? `${quizCorrectCount}/2개` : "미기입";

        const ref4th = details["Q1_4세대인권상상"] || details["새로운권리서술"] || "미기입";
        const refSelf = details["Q2_학습과정성찰"] || details["성찰답변"] || "미기입";
        let actTitleKey = "";
        if (s.activities) {
          if (currentTask === "c10101") actTitleKey = Object.keys(s.activities).find(k => (k.includes("과업 1") || k.includes("연표") || k.includes("3세대")) && !k.endsWith("_details")) || "";
          else if (currentTask === "c10102") actTitleKey = Object.keys(s.activities).find(k => (k.includes("과업 3") || k.includes("헌법") || k.includes("시민참여")) && !k.endsWith("_details")) || "";
          else actTitleKey = Object.keys(s.activities).find(k => (k.includes("과업 2") || k.includes("맵핑") || k.includes("현대인권")) && !k.endsWith("_details")) || "";
        }
        const score = (actTitleKey && s.activities[actTitleKey]) || details["평가/수익률 (Score)"] || details["평가/수익률"] || details["점수"] || "80점";
        
        return `
          <tr style="border-bottom: 1px solid rgba(0,0,0,0.04);">
            <td style="padding: 14px 8px; font-weight: 700; color: var(--text-primary);">${gradeText}</td>
            <td style="padding: 14px 8px; font-weight: 700; cursor: pointer;" onclick="showStudentPasswordModal('${sId}', '${safeName}', '${safePassword}')" title="클릭 시 4자리 이모티콘 비밀번호 확인 🔑">
              <span style="color: var(--color-purple); text-decoration: underline; text-underline-offset: 3px;">${sName}</span>
              <span style="font-size: 0.72rem; color: #1971c2; font-weight: 800; display: inline-block; margin-left: 4px; background: rgba(25, 113, 194, 0.08); padding: 1px 6px; border-radius: 4px;">🔑 비번</span>
            </td>
            <td style="padding: 14px 8px;"><span style="background: rgba(43, 138, 62, 0.08); color: #2b8a3e; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 0.75rem;">제출완료 🌿</span></td>
            <td style="padding: 14px 8px; font-weight: 700; color: var(--color-purple);">${score}</td>
            <td style="padding: 14px 8px;">${matchCnt}</td>
            <td style="padding: 14px 8px; font-weight: 700; color: ${isSorted === '성공' ? '#2b8a3e' : '#c92a2a'};">${isSorted}</td>
            <td style="padding: 14px 8px;">${quizText}</td>
            <td style="padding: 14px 8px; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${ref4th}">${ref4th}</td>
            <td style="padding: 14px 8px; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${refSelf}">${refSelf}</td>
            <td style="padding: 14px 8px; font-size: 0.75rem; color: var(--text-secondary);">${submitTime}</td>
          </tr>
        `;
      } else if (currentTask === "c10102") {
        const quizScoreText = details["형성평가점수"] || details["형성평가퀴즈"] || "100점";
        const q4Match = details["Q4_짝맞추기"] || "매칭완료";
        const q5High = details["Q5_하이라이트선택"] || "A선택";
        const essayText = details["시민참여성찰답변"] || details["Q2_학습과정성찰"] || "성찰 미입력";
        
        let actTitleKey = "";
        if (s.activities) actTitleKey = Object.keys(s.activities).find(k => (k.includes("과업 3") || k.includes("헌법") || k.includes("시민참여")) && !k.endsWith("_details")) || "";
        const score = (actTitleKey && s.activities[actTitleKey]) || details["평가/수익률 (Score)"] || details["평가/수익률"] || details["점수"] || "100점";
        
        return `
          <tr style="border-bottom: 1px solid rgba(0,0,0,0.04);">
            <td style="padding: 14px 8px; font-weight: 700; color: var(--text-primary);">${gradeText}</td>
            <td style="padding: 14px 8px; font-weight: 700; cursor: pointer;" onclick="showStudentPasswordModal('${sId}', '${safeName}', '${safePassword}')" title="클릭 시 4자리 이모티콘 비밀번호 확인 🔑">
              <span style="color: var(--color-purple); text-decoration: underline; text-underline-offset: 3px;">${sName}</span>
              <span style="font-size: 0.72rem; color: #1971c2; font-weight: 800; display: inline-block; margin-left: 4px; background: rgba(25, 113, 194, 0.08); padding: 1px 6px; border-radius: 4px;">🔑 비번</span>
            </td>
            <td style="padding: 14px 8px;"><span style="background: rgba(43, 138, 62, 0.08); color: #2b8a3e; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 0.75rem;">제출완료 🌿</span></td>
            <td style="padding: 14px 8px; font-weight: 700; color: var(--color-purple);">${score}</td>
            <td style="padding: 14px 8px;">${quizScoreText}</td>
            <td style="padding: 14px 8px; font-size:0.75rem;">${q4Match}</td>
            <td style="padding: 14px 8px; font-weight:700; color:#2b8a3e;">${q5High}</td>
            <td style="padding: 14px 8px; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${essayText}">${essayText}</td>
            <td style="padding: 14px 8px; font-size: 0.75rem; color: var(--text-secondary);">${submitTime}</td>
          </tr>
        `;
      } else {
        const quizRes = details["형성평가퀴즈"] || "미기입";
        const pinCnt = details["등록한핀개수"] || "0개";
        const essayText = details["시민참여성찰답변"] || "답변 없음";
        
        let actTitleKey = "";
        if (s.activities) actTitleKey = Object.keys(s.activities).find(k => (k.includes("과업 2") || k.includes("맵핑") || k.includes("현대인권")) && !k.endsWith("_details")) || "";
        const score = (actTitleKey && s.activities[actTitleKey]) || details["평가/수익률 (Score)"] || details["평가/수익률"] || details["점수"] || "100점";
        
        return `
          <tr style="border-bottom: 1px solid rgba(0,0,0,0.04);">
            <td style="padding: 14px 8px; font-weight: 700; color: var(--text-primary);">${gradeText}</td>
            <td style="padding: 14px 8px; font-weight: 700; cursor: pointer;" onclick="showStudentPasswordModal('${sId}', '${safeName}', '${safePassword}')" title="클릭 시 4자리 이모티콘 비밀번호 확인 🔑">
              <span style="color: var(--color-purple); text-decoration: underline; text-underline-offset: 3px;">${sName}</span>
              <span style="font-size: 0.72rem; color: #1971c2; font-weight: 800; display: inline-block; margin-left: 4px; background: rgba(25, 113, 194, 0.08); padding: 1px 6px; border-radius: 4px;">🔑 비번</span>
            </td>
            <td style="padding: 14px 8px;"><span style="background: rgba(43, 138, 62, 0.08); color: #2b8a3e; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 0.75rem;">제출완료 🌿</span></td>
            <td style="padding: 14px 8px; font-weight: 700; color: var(--color-purple);">${score}</td>
            <td style="padding: 14px 8px;">${quizRes}</td>
            <td style="padding: 14px 8px; font-weight: 700; color: var(--color-purple);">${pinCnt}</td>
            <td style="padding: 14px 8px; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${essayText}">${essayText}</td>
            <td style="padding: 14px 8px; font-size: 0.75rem; color: var(--text-secondary);">${submitTime}</td>
          </tr>
        `;
      }
    }).join("");
  }
  
  let taskTitle = "📜 과업 1: 인권 역사 연표 & 3세대 변화";
  if (currentTask === "c10201") taskTitle = "🗺️ 과업 2: 현대 인권 커뮤니티 맵핑 및 성찰";
  else if (currentTask === "c10102") taskTitle = "💬 과업 3: 헌법의 역할과 시민참여 (AI 챗봇)";

  let headerCols = `
    <th style="padding: 12px 8px; width: 12%;">학번</th>
    <th style="padding: 12px 8px; width: 8%;">이름</th>
    <th style="padding: 12px 8px; width: 10%;">상태</th>
    <th style="padding: 12px 8px; width: 8%;">점수</th>
    <th style="padding: 12px 8px; width: 10%;">매칭 정답수</th>
    <th style="padding: 12px 8px; width: 10%;">연대기 정렬</th>
    <th style="padding: 12px 8px; width: 10%;">객관식 정답수</th>
    <th style="padding: 12px 8px; width: 12%;">4세대 상상</th>
    <th style="padding: 12px 8px; width: 12%;">배움성찰</th>
    <th style="padding: 12px 8px; width: 8%;">제출시간</th>
  `;

  if (currentTask === "c10201") {
    headerCols = `
      <th style="padding: 12px 8px; width: 15%;">학번</th>
      <th style="padding: 12px 8px; width: 10%;">이름</th>
      <th style="padding: 12px 8px; width: 12%;">상태</th>
      <th style="padding: 12px 8px; width: 10%;">점수</th>
      <th style="padding: 12px 8px; width: 15%;">형성평가</th>
      <th style="padding: 12px 8px; width: 10%;">등록 핀</th>
      <th style="padding: 12px 8px; width: 18%;">시민 성찰 답변</th>
      <th style="padding: 12px 8px; width: 10%;">제출시간</th>
    `;
  } else if (currentTask === "c10102") {
    headerCols = `
      <th style="padding: 12px 8px; width: 14%;">학번</th>
      <th style="padding: 12px 8px; width: 10%;">이름</th>
      <th style="padding: 12px 8px; width: 10%;">상태</th>
      <th style="padding: 12px 8px; width: 10%;">점수</th>
      <th style="padding: 12px 8px; width: 12%;">형성평가</th>
      <th style="padding: 12px 8px; width: 14%;">Q4 매칭</th>
      <th style="padding: 12px 8px; width: 10%;">Q5 하이라이트</th>
      <th style="padding: 12px 8px; width: 12%;">시민성찰</th>
      <th style="padding: 12px 8px; width: 8%;">제출시간</th>
    `;
  }
  
  section.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr; gap: 24px;">
      <!-- 과업 선택 및 요약 카드 -->
      <div class="card" style="padding: 24px; border-radius: 24px; background: var(--bg-card); border: 1px solid var(--border-glass);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; border-bottom: 1.5px solid var(--border-glass); padding-bottom: 14px;">
          <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--color-purple); margin: 0;">📝 과업별 실시간 수행 및 정오답 분석</h3>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">과업 필터:</span>
            <select id="teacherTaskSelect" onchange="changeTeacherTask(this.value)" style="font-family: var(--font-family-body); font-weight: 700; font-size: 0.85rem; padding: 6px 12px; border-radius: 10px; border: 1.5px solid var(--border-glass); background: var(--bg-card); color: var(--text-primary); outline: none; cursor: pointer;">
              <option value="c10101" ${currentTask === "c10101" ? "selected" : ""}>📜 과업 1: 인권 역사 연표 & 3세대 변화</option>
              <option value="c10201" ${currentTask === "c10201" ? "selected" : ""}>🗺️ 과업 2: 현대 인권 커뮤니티 맵핑 및 성찰</option>
              <option value="c10102" ${currentTask === "c10102" ? "selected" : ""}>💬 과업 3: 헌법의 역할과 시민참여 (AI 챗봇)</option>
            </select>
          </div>
        </div>
        
        <!-- 요약 지표 그리드 -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
          <div style="background: rgba(184, 150, 219, 0.06); border-radius: 16px; padding: 16px; text-align: center; border: 1px solid rgba(184, 150, 219, 0.1);">
            <span style="font-size: 0.82rem; color: var(--text-secondary); font-weight: 700;">학급 정원</span>
            <h4 style="margin: 8px 0 0 0; font-size: 1.6rem; font-weight: 800; color: var(--text-primary);">${totalCount}명</h4>
          </div>
          <div style="background: rgba(43, 138, 62, 0.06); border-radius: 16px; padding: 16px; text-align: center; border: 1px solid rgba(43, 138, 62, 0.1);">
            <span style="font-size: 0.82rem; color: var(--text-secondary); font-weight: 700;">제출 학생</span>
            <h4 style="margin: 8px 0 0 0; font-size: 1.6rem; font-weight: 800; color: #2b8a3e;">${submitCount}명</h4>
          </div>
          <div style="background: rgba(201, 42, 42, 0.06); border-radius: 16px; padding: 16px; text-align: center; border: 1px solid rgba(201, 42, 42, 0.1);">
            <span style="font-size: 0.82rem; color: var(--text-secondary); font-weight: 700;">미제출 학생</span>
            <h4 style="margin: 8px 0 0 0; font-size: 1.6rem; font-weight: 800; color: #c92a2a;">${totalCount - submitCount}명</h4>
          </div>
          <div style="background: rgba(240, 140, 0, 0.06); border-radius: 16px; padding: 16px; text-align: center; border: 1px solid rgba(240, 140, 0, 0.1);">
            <span style="font-size: 0.82rem; color: var(--text-secondary); font-weight: 700;">제출율</span>
            <h4 style="margin: 8px 0 0 0; font-size: 1.6rem; font-weight: 800; color: #f08c00;">${submitRate}%</h4>
          </div>
          ${currentTask === "c10101" ? `
          <div style="background: rgba(79, 158, 245, 0.06); border-radius: 16px; padding: 16px; text-align: center; border: 1px solid rgba(79, 158, 245, 0.1);">
            <span style="font-size: 0.82rem; color: var(--text-secondary); font-weight: 700;">과제 평균 점수</span>
            <h4 style="margin: 8px 0 0 0; font-size: 1.6rem; font-weight: 800; color: #4f9ef5;">${avgScore}점</h4>
          </div>
          ` : ""}
        </div>
      </div>
      
      <!-- 학급 전체 정오답/통계 분석 대시보드 (신설) -->
      ${statsDashboardHtml}

      <!-- 주관식 성찰 모음 보드 (신설) -->
      ${subjectiveBoardHtml}

      <!-- 상세 학생 목록 -->
      <div class="card" style="padding: 24px; border-radius: 24px; background: var(--bg-card); border: 1px solid var(--border-glass); overflow-x: auto;">
        <h4 style="font-size: 1rem; font-weight: 800; color: var(--text-primary); margin: 0 0 16px 0;">
          📋 학생별 상세 제출 현황 (${taskTitle})
        </h4>
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.82rem;">
          <thead>
            <tr style="border-bottom: 2px solid rgba(0,0,0,0.06); color: var(--text-secondary); font-weight: 700; background: rgba(0,0,0,0.01);">
              ${headerCols}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function changeTeacherTask(taskVal) {
  state.currentTeacherTask = taskVal;
  renderTasksSection();
}

function switchTeacherSubTask(taskVal) {
  state.currentTeacherTask = taskVal;
  renderTasksSection();
}

async function refreshTeacherMapPins() {
  const select = document.getElementById("teacherClassSelect");
  const classVal = select ? select.value : "all";
  const statusEl = document.getElementById("teacherMapStatus");
  if (statusEl) statusEl.textContent = "동기화 중... 🔄";
  
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "getMappingPins",
        studentId: "teacher",
        studentName: "교사"
      })
    });
    
    const data = await response.json();
    if (data.success && data.pins) {
      teacherPinsData = data.pins;
      drawTeacherPinsOnMap(classVal);
      if (statusEl) statusEl.textContent = `완료 (${data.pins.length}개) ✅`;
    } else {
      if (statusEl) statusEl.textContent = `❌ 실패: ${data.message || '응답 오류'}`;
    }
  } catch (e) {
    console.error("Failed to load map pins in teacher dashboard", e);
    if (statusEl) statusEl.textContent = `❌ 에러: ${e.message}`;
  }
}

function initTeacherMap() {
  const mapDiv = document.getElementById("teacherMap");
  if (!mapDiv) return;
  
  if (teacherMapInstance) {
    setTimeout(() => {
      teacherMapInstance.invalidateSize();
    }, 100);
    return;
  }
  
  teacherMapInstance = L.map('teacherMap').setView([35.228, 128.681], 13);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(teacherMapInstance);
  
  teacherMarkerGroup = L.layerGroup().addTo(teacherMapInstance);
  
  refreshTeacherMapPins();
}

// 📍 기본권/인권 유형별 1:1 맞춤형 럭셔리 핀 아이콘 생성기 (교사/학생 공통)
function getRightsPinIcon(rawRightsType) {
  const str = String(rawRightsType || "");
  let meta = { icon: "📍", bg: "#b896db" };

  if (str.includes("주거")) meta = { icon: "🏠", bg: "#7952b3" };
  else if (str.includes("안전")) meta = { icon: "🚨", bg: "#e03131" };
  else if (str.includes("환경")) meta = { icon: "🌿", bg: "#2b8a3e" };
  else if (str.includes("이동")) meta = { icon: "♿", bg: "#1971c2" };
  else if (str.includes("문화")) meta = { icon: "🎨", bg: "#d63384" };
  else if (str.includes("자유")) meta = { icon: "🕊️", bg: "#4c6ef5" };
  else if (str.includes("평등")) meta = { icon: "⚖️", bg: "#fd7e14" };
  else if (str.includes("참정")) meta = { icon: "🗳️", bg: "#099268" };
  else if (str.includes("사회")) meta = { icon: "🍞", bg: "#f59f00" };
  else if (str.includes("청구")) meta = { icon: "📜", bg: "#862e9c" };
  else if (str.includes("연대")) meta = { icon: "🤝", bg: "#1098ad" };

  const html = `
    <div class="custom-rights-pin" style="background: ${meta.bg};" title="${str}">
      <span class="pin-icon">${meta.icon}</span>
    </div>
  `;

  return L.divIcon({
    className: "custom-rights-pin-wrapper",
    html: html,
    iconSize: [36, 42],
    iconAnchor: [18, 42],
    popupAnchor: [0, -38]
  });
}

function drawTeacherPinsOnMap(classFilter) {
  if (!teacherMarkerGroup || !teacherMapInstance) return;
  teacherMarkerGroup.clearLayers();
  
  let matchCount = 0;
  
  teacherPinsData.forEach(pin => {
    if (classFilter !== "all" && String(pin.gradeClass) !== String(classFilter)) {
      return;
    }
    
    const lat = parseFloat(pin.lat);
    const lng = parseFloat(pin.lng);
    if (isNaN(lat) || isNaN(lng)) return;
    
    matchCount++;
    const pinIcon = getRightsPinIcon(pin.rightsType);
    const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(teacherMarkerGroup);
    
    const popupContent = `
      <div style="font-size: 0.85rem; width: 220px; line-height: 1.5;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span class="rights-badge ${pin.rightsType}" style="padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; color: white; background: var(--color-purple);">${pin.rightsType}</span>
          <span style="font-size: 0.72rem; color: var(--text-secondary); font-weight: 700;">${pin.studentName} (${pin.gradeClass ? String(pin.gradeClass).substring(1) + '반' : ''})</span>
        </div>
        <h5 style="margin: 4px 0; font-size: 0.95rem; font-weight: 800; color: var(--text-primary);">📍 ${pin.placeName}</h5>
        <p style="margin: 6px 0; color: var(--text-secondary); font-size: 0.82rem; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 6px;">
          <strong>현황:</strong> ${pin.desc}
        </p>
        <p style="margin: 4px 0 0 0; color: var(--color-purple); font-size: 0.82rem; font-weight: 700;">
          <strong>💡 개선안:</strong> ${pin.idea}
        </p>
      </div>
    `;
    
    marker.bindPopup(popupContent);
    teacherMarkerGroup.addLayer(marker);
  });
  
  const mapCounter = document.getElementById("teacherMapPinCount");
  if (mapCounter) {
    mapCounter.textContent = matchCount;
  }
}

// 📋 학생 사전 진단평가(1·3단원 Q10~Q21) 점수 리포트 및 오답노트 모달
function openDiagnosticReportModal() {
  try {
    let modal = document.getElementById("diagnosticReportModal");
    let modalBody = document.getElementById("diagnosticReportModalBody");

    // 🛡️ 모달 DOM 요소가 없으면 동적으로 자동 생성
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "diagnosticReportModal";
      modal.className = "modal-overlay";
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 720px; width: 92%;">
          <button type="button" class="modal-close-btn" onclick="closeDiagnosticReportModal()">&times;</button>
          <div id="diagnosticReportModalBody" class="modal-feedback-body" style="max-height: 540px; overflow-y: auto; font-size: 0.9rem; line-height: 1.6;"></div>
          <div class="modal-actions">
            <button type="button" class="modal-btn primary" onclick="closeDiagnosticReportModal()" style="background: var(--color-purple);">오답노트 확인 완료 🌸</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modalBody = document.getElementById("diagnosticReportModalBody");
    }

    const savedProfile = localStorage.getItem("sociallms_profile");
    let studentData = {};
    if (savedProfile) {
      try { studentData = JSON.parse(savedProfile); } catch(e){}
    }

    const sName = (state && state.student && state.student.name) || studentData.name || studentData.StudentName || "학생";

    const questions = [
      {
        id: "Q10",
        title: "Q10. 일상생활의 기본권 보장 사례와 기본권 종류 매칭",
        correct: "①",
        key: "Q10_기본권매칭",
        type: "choice",
        options: {
          "①": "① 참정권 - 만 18세 이상이면 선거에 참여할 수 있는 권리",
          "②": "② 자유권 - 복지나 교육 시설 제공을 요구하는 권리",
          "③": "③ 평등권 - 재판을 신청해 청구하는 권리",
          "④": "④ 사회권 - 내 의지에 따라 행동하고 표현할 수 있는 권리"
        },
        explanation: "참정권은 국민이 선거 등을 통해 국가 정치 과정에 직접 또는 간접적으로 참여할 수 있는 권리입니다."
      },
      {
        id: "Q11",
        title: "Q11. 헌법상 기본권을 제한할 수 있는 정당한 목적이 아닌 것",
        correct: "④",
        key: "Q11_기본권제한목적",
        type: "choice",
        options: {
          "①": "① 국가 안전 보장",
          "②": "② 사회 질서 유지",
          "③": "③ 공공복리 증진",
          "④": "④ 특정 종교와 사상의 강제 전파"
        },
        explanation: "헌법 제37조 제2항에 따라 기본권은 국가안전보장, 질서유지, 공공복리를 위해서만 법률로 제한할 수 있습니다."
      },
      {
        id: "Q12",
        title: "Q12. 알바 청소년의 법적 노동 권리와 근로 기준",
        correct: "④",
        key: "Q12_청소년근로권",
        type: "choice",
        options: {
          "①": "① 최저임금보다 적어도 합의하면 유효하다",
          "②": "② 부모 동의 없으면 독자적 임금 청구 불가하다",
          "③": "③ 근로계약서는 사업주만 보관한다",
          "④": "④ 주 15시간 이상 일하는 근로자는 유급 휴일(주휴 수당)을 청구할 권리가 생긴다"
        },
        explanation: "주 15시간 이상 근무 시 청소년 근로자도 유급휴일(주휴수당)을 지급받을 정당한 법적 권리가 있습니다."
      },
      {
        id: "Q13",
        title: "Q13. 인권 침해 시 도움을 받을 수 있는 국가 기관과 구제 방법",
        correct: "①",
        key: "Q13_인권구제기관",
        type: "choice",
        options: {
          "①": "① 국가인권위원회 - 침해당한 인권 사례를 조사하여 시정 권고를 내린다",
          "②": "② 법원 - 직접 현장 수사",
          "③": "③ 경찰서 - 헌법 합치 심판",
          "④": "④ 헌법재판소 - 개인 간 돈 관계 대행"
        },
        explanation: "국가인권위원회는 인권 침해 및 차별 행위를 조사하여 구제 조치 및 시정 권고를 내리는 독립 국가기관입니다."
      },
      {
        id: "Q14",
        title: "💬 Q14. [생각 토론] 인권 보편주의와 문화 상대주의에 대한 내 생각",
        key: "Q14_인권보편성토론",
        type: "essay"
      },
      {
        id: "Q15",
        title: "💬 Q15. [생각 토론] 모두의 위생/안전과 개인의 기본권 충돌 시 내 의견",
        key: "Q15_자유vs안전토론",
        type: "essay"
      },
      {
        id: "Q16",
        title: "Q16. 경제생활에서 자원을 포기하고 선택하는 '합리적 선택'의 기준",
        correct: "②",
        key: "Q16_합리적선택",
        type: "choice",
        options: {
          "①": "① 기회비용을 계산하지 않고 구매",
          "②": "② 선택을 통해 얻는 편익(이익)이 포기해야 하는 가치(기회비용)보다 클 때 선택한다",
          "③": "③ 오로지 가장 저렴한 물품만 구매",
          "④": "④ 소비 활동 중단"
        },
        explanation: "합리적 선택이란 순편익(편익 - 기회비용)이 0보다 큰(편익 > 기회비용) 선택을 의미합니다."
      },
      {
        id: "Q17",
        title: "Q17. 시장에서 상품 가격이 결정되고 변동하는 기본 원리",
        correct: "①",
        key: "Q17_시장가격결정",
        type: "choice",
        options: {
          "①": "① 공급량에 비해 구매하려는 수요량이 많아지면 시장 가격이 상승한다",
          "②": "② 공급 과잉 시 가격 폭등",
          "③": "③ 담합이나 관보 고시로만 유지",
          "④": "④ 가격 상승 시 수요량 증가"
        },
        explanation: "수요가 공급을 초월하면 초과 수요(희소성 증가)가 발생하여 시장 가격이 상승합니다."
      },
      {
        id: "Q18",
        title: "Q18. 자산 관리를 위한 은행 예적금과 주식의 특성 비교",
        correct: "③",
        key: "Q18_예적금vs주식",
        type: "choice",
        options: {
          "①": "① 예적금이 위험 크고 기대수익 높음",
          "②": "② 주식은 예금자보호법 전액 보호",
          "③": "③ 예적금은 원금이 안전하게 지켜지는 편이지만 기대 수익(이자)이 주식 대비 상대적으로 낮다",
          "④": "④ 매일 원금 전액 소멸"
        },
        explanation: "예적금은 저위험·저수익 자산이며, 주식은 고위험·고수익 자산입니다."
      },
      {
        id: "Q19",
        title: "Q19. '환율' 상승 시(원화 가치 하락) 우리 일상에 미치는 영향",
        correct: "①",
        key: "Q19_환율상승영향",
        type: "choice",
        options: {
          "①": "① 해외 유학생 자녀에게 달러 송금 시 학부모의 환전비 부담이 늘어난다",
          "②": "② 원화 수입 기업 단가 부담 완화",
          "③": "③ 외국인 관광객 부담 가중",
          "④": "④ 한국인 여행객 경비 절감"
        },
        explanation: "환율이 상승하면 1달러를 구매하는 데 더 많은 원화가 필요하므로 달러 송금 부담이 늘어납니다."
      },
      {
        id: "Q20",
        title: "💬 Q20. [생각 토론] 시장의 '자율'성과 정부의 '개입' 규제 중 지지 입장",
        key: "Q20_자율vs개입규제토론",
        type: "essay"
      },
      {
        id: "Q21",
        title: "💬 Q21. [생각 토론] 자산 관리 시 최우선 고려 가치",
        key: "Q21_자산관리우선가치토론",
        type: "essay"
      }
    ];

    const getStudentDiagnosticAns = (qKey, qId) => {
      if (studentData[qKey] !== undefined && studentData[qKey] !== null && String(studentData[qKey]).trim() !== "") {
        return String(studentData[qKey]).trim();
      }
      for (let k in studentData) {
        const cleanK = String(k).trim();
        if (cleanK === qKey || cleanK.startsWith(qId + "_") || cleanK === qId) {
          if (studentData[k] !== undefined && studentData[k] !== null && String(studentData[k]).trim() !== "") {
            return String(studentData[k]).trim();
          }
        }
      }
      return "";
    };

    let correctCount = 0;
    let totalChoice = 0;
    let htmlCards = "";

    questions.forEach(q => {
      let userAns = getStudentDiagnosticAns(q.key, q.id);
      userAns = String(userAns).trim();

      if (q.type === "choice") {
        totalChoice++;
        const isCorrect = userAns.startsWith(q.correct) || userAns.includes(q.correct);
        if (isCorrect) correctCount++;

        const statusBadge = isCorrect 
          ? `<span style="background: rgba(43, 138, 98, 0.15); color: var(--color-mint); padding: 4px 10px; border-radius: 8px; font-weight: 800;">⭕ 정답</span>`
          : `<span style="background: rgba(201, 42, 42, 0.15); color: #c92a2a; padding: 4px 10px; border-radius: 8px; font-weight: 800;">❌ 오답노트</span>`;

        htmlCards += `
          <div style="background: rgba(255,255,255,0.6); border: 1.5px solid ${isCorrect ? 'var(--color-mint)' : 'rgba(201,42,42,0.3)'}; border-radius: 18px; padding: 18px; margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h5 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: var(--text-primary);">${q.title}</h5>
              ${statusBadge}
            </div>
            <div style="font-size: 0.88rem; color: var(--text-primary); margin-bottom: 6px;">
              • <strong>내가 제출한 답:</strong> <span style="color: ${isCorrect ? 'var(--color-mint)' : '#c92a2a'}; font-weight: 700;">${userAns || '미선택'}</span>
            </div>
            <div style="font-size: 0.88rem; color: var(--color-purple); font-weight: 700; margin-bottom: 8px;">
              • <strong>정답 선택지:</strong> ${q.options[q.correct]}
            </div>
            <div style="font-size: 0.83rem; background: rgba(184, 150, 219, 0.08); padding: 10px 14px; border-radius: 10px; border-left: 3px solid var(--color-purple); color: var(--text-secondary);">
              💡 <strong>핵심 해설:</strong> ${q.explanation}
            </div>
          </div>
        `;
      } else {
        htmlCards += `
          <div style="background: rgba(255,255,255,0.6); border: 1.5px solid var(--color-purple-soft); border-radius: 18px; padding: 18px; margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h5 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: var(--color-purple);">${q.title}</h5>
              <span style="background: rgba(184, 150, 219, 0.15); color: var(--color-purple); padding: 4px 10px; border-radius: 8px; font-weight: 800;">💬 서술/토론</span>
            </div>
            <div style="font-size: 0.88rem; color: var(--text-primary);">
              • <strong>내가 작성한 토론/서술 답변:</strong> <span style="font-weight: 700;">${userAns || '미작성'}</span>
            </div>
          </div>
        `;
      }
    });

    const finalScore = Math.round((correctCount / totalChoice) * 100);

    const headerHTML = `
      <div style="text-align: center; border-bottom: 2px solid rgba(0,0,0,0.06); padding-bottom: 16px; margin-bottom: 20px;">
        <h3 style="font-size: 1.3rem; font-weight: 800; color: var(--color-purple); margin-bottom: 6px;">
          📋 ${sName} 학생의 1·3단원 사전 진단평가 채점 리포트 & 오답노트
        </h3>
        <div style="display: flex; justify-content: center; gap: 16px; margin-top: 10px;">
          <div style="background: linear-gradient(135deg, var(--color-pink-soft) 0%, rgba(184,150,219,0.3) 100%); padding: 10px 20px; border-radius: 16px; font-weight: 800; color: var(--color-purple); font-size: 1.1rem;">
            객관식 채점 점수: ${finalScore}점 (${correctCount} / ${totalChoice}개 정답)
          </div>
        </div>
      </div>
    `;

    modalBody.innerHTML = headerHTML + htmlCards;
    modal.classList.add("active");
  } catch (err) {
    console.error("Failed to open diagnostic report modal:", err);
    alert("사전 진단평가 오답노트를 불러오는 중 오류가 발생했습니다: " + err.message);
  }
}

function closeDiagnosticReportModal() {
  const modal = document.getElementById("diagnosticReportModal");
  if (modal) modal.classList.remove("active");
}

// =========================================================================
// 🔓 [학급별 전이과제 해금 제어판 자바스크립트 모듈]
// =========================================================================

// 실시간 학급 해금 상태 동기화 채널 (창/탭 간 0.001초 실시간 연동)
const unlockBroadcastChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("sociallms_unlock_channel") : null;

if (unlockBroadcastChannel) {
  unlockBroadcastChannel.onmessage = (event) => {
    if (event.data && event.data.type === "UNLOCK_UPDATED") {
      renderStandards();
      const unlockGrid = document.getElementById("unlockClassGrid");
      if (unlockGrid) renderUnlockControlSection();
    }
  };
}

window.addEventListener("storage", (e) => {
  if (e.key === "sociallms_unlocked_activities") {
    renderStandards();
    const unlockGrid = document.getElementById("unlockClassGrid");
    if (unlockGrid) renderUnlockControlSection();
  }
});

// 구글 시트 백엔드로부터 실시간 해금 설정 조회
async function fetchUnlockConfigFromServer() {
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "getUnlockConfig" })
    });
    const data = await response.json();
    if (data.success && data.config) {
      const defaultConfig = {
        "all": ["c10101"],
        "11": ["c10101"], "12": ["c10101"], "13": ["c10101"], "14": ["c10101"], "15": ["c10101"],
        "16": ["c10101"], "17": ["c10101"], "18": ["c10101"], "19": ["c10101"], "110": ["c10101"]
      };
      const merged = { ...defaultConfig, ...data.config };
      localStorage.setItem("sociallms_unlocked_activities", JSON.stringify(merged));
      renderStandards();
      const unlockGrid = document.getElementById("unlockClassGrid");
      if (unlockGrid) renderUnlockControlSection();
    }
  } catch (err) {
    console.warn("Failed to fetch unlock config from server:", err);
  }
}

// 학급별 해금 설정 가져오기 (기본값: 과업1만 해금)
function getUnlockedActivitiesConfig() {
  const defaultConfig = {
    "all": ["c10101"],
    "11": ["c10101"], "12": ["c10101"], "13": ["c10101"], "14": ["c10101"], "15": ["c10101"],
    "16": ["c10101"], "17": ["c10101"]
  };

  const raw = localStorage.getItem("sociallms_unlocked_activities");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return { ...defaultConfig, ...parsed };
    } catch(e) {}
  }
  return defaultConfig;
}

async function saveUnlockedActivitiesConfig(config) {
  localStorage.setItem("sociallms_unlocked_activities", JSON.stringify(config));
  if (unlockBroadcastChannel) {
    unlockBroadcastChannel.postMessage({ type: "UNLOCK_UPDATED" });
  }
  // 교사/학생 동일 창 내에서도 실시간 렌더링 동기화
  renderStandards();

  // 구글 시트 백엔드(ClassUnlockConfig 탭)로 실시간 저장
  try {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "saveUnlockConfig",
        config: config
      })
    });
  } catch (err) {
    console.warn("Failed to save unlock config to GAS backend:", err);
  }
}

// 기본 과업 ID 매핑 헬퍼 (c10101_worksheet -> c10101 등)
function getBaseTaskId(activityId) {
  if (!activityId) return "";
  if (activityId.includes("c10101")) return "c10101";
  if (activityId.includes("c10201")) return "c10201";
  if (activityId.includes("c10102")) return "c10102";
  return activityId;
}

// 학생 프로필에서 학급 코드(예: '17', '11' 등) 강건하게 추출
function extractClassCodeFromProfile(parsedProfile) {
  const sources = [
    state && state.student && state.student.studentId,
    localStorage.getItem("sociallms_student_id"),
    parsedProfile && parsedProfile["학번 (StudentID)"],
    parsedProfile && parsedProfile["학번"],
    parsedProfile && parsedProfile.studentId,
    parsedProfile && parsedProfile.StudentID,
    parsedProfile && parsedProfile.id
  ];

  for (let raw of sources) {
    if (raw !== undefined && raw !== null && raw !== "") {
      const digits = String(raw).replace(/[^0-9]/g, "");
      if (digits.length >= 4) {
        return digits.substring(0, 2); // '1701' -> '17'
      }
      if (digits.length === 3) {
        return digits.substring(0, 2); // '171' -> '17'
      }
    }
  }

  if (parsedProfile) {
    const gcSources = [
      parsedProfile.gradeClass,
      parsedProfile["학반"],
      parsedProfile["반"],
      parsedProfile["학년반"]
    ];
    for (let gc of gcSources) {
      if (gc) {
        const digits = String(gc).replace(/[^0-9]/g, "");
        if (digits.length >= 2) return digits.substring(0, 2);
        if (digits.length === 1) return "1" + digits;
      }
    }
  }

  return "all";
}

// 특정 학생 학급에 대해 과업이 해금되어 있는지 검사
function isActivityUnlockedForStudent(activityId) {
  const baseId = getBaseTaskId(activityId);

  // 과업 1 (c10101)은 기본적으로 항상 해금
  if (baseId === "c10101") return true;

  const savedProfile = localStorage.getItem("sociallms_profile");
  let parsedProfile = {};
  if (savedProfile) {
    try { parsedProfile = JSON.parse(savedProfile); } catch(e) {}
  }

  const studentClass = extractClassCodeFromProfile(parsedProfile);
  const config = getUnlockedActivitiesConfig();
  
  const allUnlocked = config["all"] || [];
  const classUnlocked = config[studentClass] || [];

  return allUnlocked.includes(baseId) || 
         classUnlocked.includes(baseId) || 
         allUnlocked.includes(activityId) || 
         classUnlocked.includes(activityId);
}

// 교사 대시보드 - 학급별 해금 컨트롤 UI 렌더링
function renderUnlockControlSection() {
  const container = document.getElementById("unlockClassGrid");
  if (!container) return;

  const config = getUnlockedActivitiesConfig();
  const classes = [
    { code: "11", name: "🏫 1학년 1반" },
    { code: "12", name: "🏫 1학년 2반" },
    { code: "13", name: "🏫 1학년 3반" },
    { code: "14", name: "🏫 1학년 4반" },
    { code: "15", name: "🏫 1학년 5반" },
    { code: "16", name: "🏫 1학년 6반" },
    { code: "17", name: "🏫 1학년 7반" }
  ];

  const taskList = [
    { id: "c10101", title: "📜 과업 1: 인권 역사 & 3세대 연표", badge: "기본 해금" },
    { id: "c10201", title: "📍 과업 2: 현대 인권 커뮤니티 맵핑", badge: "전이과제 1" },
    { id: "c10102", title: "💬 과업 3: 헌법과 시민참여 (AI 챗봇)", badge: "전이과제 2" }
  ];

  container.innerHTML = classes.map(c => {
    const activeUnlocked = config[c.code] || ["c10101"];
    return `
      <div style="background: rgba(255, 255, 255, 0.85); border: 1.5px solid rgba(184, 150, 219, 0.3); border-radius: 20px; padding: 20px; box-shadow: 0 4px 14px rgba(0,0,0,0.03);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1.5px solid rgba(0,0,0,0.06); padding-bottom: 10px;">
          <h4 style="margin: 0; font-size: 1.05rem; font-weight: 800; color: var(--color-purple);">${c.name}</h4>
          <span style="font-size: 0.75rem; font-weight: 700; color: #2b8a3e; background: rgba(43,138,62,0.1); padding: 3px 8px; border-radius: 6px;">
            해금 과업: ${activeUnlocked.length} / 3개
          </span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px;">
          ${taskList.map(t => {
            const isChecked = activeUnlocked.includes(t.id);
            return `
              <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: rgba(0,0,0,0.02); border-radius: 12px; cursor: pointer; border: 1px solid ${isChecked ? 'var(--color-purple-soft)' : 'rgba(0,0,0,0.04)'};">
                <span style="font-size: 0.86rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                  <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleClassTaskUnlock('${c.code}', '${t.id}', this.checked)" style="width: 16px; height: 16px; accent-color: var(--color-purple); cursor: pointer;">
                  ${t.title}
                </span>
                <span style="font-size: 0.72rem; font-weight: 700; color: ${isChecked ? '#2b8a3e' : '#e03131'};">
                  ${isChecked ? '🔓 해금됨' : '🔒 잠김'}
                </span>
              </label>
            `;
          }).join("")}
        </div>

        <button type="button" class="gen-btn" onclick="previewStudentClassDashboard('${c.code}', '${c.name}')" style="width: 100%; font-size: 0.78rem; font-weight: 800; background: rgba(184,150,219,0.12); color: var(--color-purple); border: 1px solid rgba(184,150,219,0.3); padding: 8px; border-radius: 10px; cursor: pointer; transition: all 0.2s;">
          👁️ ${c.name} 학생 시점 미리보기 🔍
        </button>
      </div>
    `;
  }).join("");
}

// 교사용 학생 시점 미리보기 모달
function previewStudentClassDashboard(classCode, className) {
  let modal = document.getElementById("studentPreviewModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "studentPreviewModal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 680px; width: 92%;">
        <button type="button" class="modal-close-btn" onclick="closeStudentPreviewModal()">&times;</button>
        <div id="studentPreviewModalBody" class="modal-feedback-body" style="max-height: 520px; overflow-y: auto; font-size: 0.9rem; line-height: 1.6;"></div>
        <div class="modal-actions">
          <button type="button" class="modal-btn primary" onclick="closeStudentPreviewModal()" style="background: var(--color-purple);">미리보기 닫기 🌿</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const body = document.getElementById("studentPreviewModalBody");
  const config = getUnlockedActivitiesConfig();
  const unlockedList = config[classCode] || ["c10101"];

  const task1Unlocked = true;
  const task2Unlocked = unlockedList.includes("c10201");
  const task3Unlocked = unlockedList.includes("c10102");

  body.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="background: rgba(184,150,219,0.15); color: var(--color-purple); padding: 4px 12px; border-radius: 8px; font-weight: 800; font-size: 0.8rem;">
        👁️ [교사용 테스트 기능] ${className} 학생 시점 대시보드 미리보기
      </span>
      <h3 style="margin: 8px 0 4px 0; font-size: 1.3rem; font-weight: 800; color: var(--text-primary);">
        ${className} 학생 화면 해금 현황 (예: 1701 박병순 학생)
      </h3>
      <p style="font-size: 0.83rem; color: var(--text-secondary); margin: 0;">
        선생님께서 체크하신 해금 설정에 따라 ${className} 학생들이 실제로 보게 되는 카드 상태입니다. 🌸
      </p>
    </div>

    <div style="display: flex; flex-direction: column; gap: 14px;">
      <!-- 과업 1 -->
      <div style="background: rgba(255,255,255,0.9); border: 1.5px solid #2b8a3e; border-radius: 16px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 0.72rem; font-weight: 800; color: #2b8a3e; background: rgba(43,138,62,0.1); padding: 2px 8px; border-radius: 6px;">기본 해금</span>
          <h5 style="margin: 4px 0 0 0; font-size: 0.95rem; font-weight: 800; color: var(--text-primary);">📜 과업 1: 인권의 역사적 발달과 3세대 인권 연표 탐구</h5>
        </div>
        <span style="font-size: 0.82rem; font-weight: 800; color: #2b8a3e; background: rgba(43,138,62,0.15); padding: 6px 14px; border-radius: 10px;">✨ 시작가능 / 완료</span>
      </div>

      <!-- 과업 2 -->
      <div style="background: ${task2Unlocked ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.02)'}; border: 1.5px solid ${task2Unlocked ? '#2b8a3e' : 'rgba(224,49,49,0.3)'}; border-radius: 16px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 0.72rem; font-weight: 800; color: ${task2Unlocked ? '#2b8a3e' : '#e03131'}; background: ${task2Unlocked ? 'rgba(43,138,62,0.1)' : 'rgba(224,49,49,0.1)'}; padding: 2px 8px; border-radius: 6px;">
            ${task2Unlocked ? '🔓 전이과제 1 해금됨' : '🔒 전이과제 1 잠김'}
          </span>
          <h5 style="margin: 4px 0 0 0; font-size: 0.95rem; font-weight: 800; color: ${task2Unlocked ? 'var(--text-primary)' : 'var(--text-secondary)'};">📍 과업 2: 현대 인권과 지역사회 커뮤니티 맵핑</h5>
        </div>
        <span style="font-size: 0.82rem; font-weight: 800; color: ${task2Unlocked ? '#2b8a3e' : '#e03131'}; background: ${task2Unlocked ? 'rgba(43,138,62,0.15)' : 'rgba(224,49,49,0.15)'}; padding: 6px 14px; border-radius: 10px;">
          ${task2Unlocked ? '✨ 배움 시작하기 🚀' : '🔒 진도 대기 중'}
        </span>
      </div>

      <!-- 과업 3 -->
      <div style="background: ${task3Unlocked ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.02)'}; border: 1.5px solid ${task3Unlocked ? '#2b8a3e' : 'rgba(224,49,49,0.3)'}; border-radius: 16px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 0.72rem; font-weight: 800; color: ${task3Unlocked ? '#2b8a3e' : '#e03131'}; background: ${task3Unlocked ? 'rgba(43,138,62,0.1)' : 'rgba(224,49,49,0.1)'}; padding: 2px 8px; border-radius: 6px;">
            ${task3Unlocked ? '🔓 전이과제 2 해금됨' : '🔒 전이과제 2 잠김'}
          </span>
          <h5 style="margin: 4px 0 0 0; font-size: 0.95rem; font-weight: 800; color: ${task3Unlocked ? 'var(--text-primary)' : 'var(--text-secondary)'};">💬 과업 3: 헌법의 역할과 시민 참여 (가상 시민 AI 대화)</h5>
        </div>
        <span style="font-size: 0.82rem; font-weight: 800; color: ${task3Unlocked ? '#2b8a3e' : '#e03131'}; background: ${task3Unlocked ? 'rgba(43,138,62,0.15)' : 'rgba(224,49,49,0.15)'}; padding: 6px 14px; border-radius: 10px;">
          ${task3Unlocked ? '✨ 배움 시작하기 🚀' : '🔒 진도 대기 중'}
        </span>
      </div>
    </div>
  `;

  modal.classList.add("active");
}

function closeStudentPreviewModal() {
  const modal = document.getElementById("studentPreviewModal");
  if (modal) modal.classList.remove("active");
}

function toggleClassTaskUnlock(classCode, activityId, isChecked) {
  const config = getUnlockedActivitiesConfig();
  if (!config[classCode]) config[classCode] = ["c10101"];

  if (isChecked) {
    if (!config[classCode].includes(activityId)) {
      config[classCode].push(activityId);
    }
  } else {
    config[classCode] = config[classCode].filter(id => id !== activityId);
  }

  saveUnlockedActivitiesConfig(config);
  renderUnlockControlSection();
  renderStandards();
}

function masterUnlockAllTasks() {
  const config = {
    "all": ["c10101", "c10201", "c10102"],
    "11": ["c10101", "c10201", "c10102"], "12": ["c10101", "c10201", "c10102"], "13": ["c10101", "c10201", "c10102"],
    "14": ["c10101", "c10201", "c10102"], "15": ["c10101", "c10201", "c10102"], "16": ["c10101", "c10201", "c10102"],
    "17": ["c10101", "c10201", "c10102"]
  };
  saveUnlockedActivitiesConfig(config);
  renderUnlockControlSection();
  renderStandards();
  alert("🔓 전체 학급(1~7반)의 모든 전이과제가 전격 해금되었습니다! 🌸");
}

function masterResetTasksUnlock() {
  const config = {
    "all": ["c10101"],
    "11": ["c10101"], "12": ["c10101"], "13": ["c10101"], "14": ["c10101"], "15": ["c10101"],
    "16": ["c10101"], "17": ["c10101"]
  };
  saveUnlockedActivitiesConfig(config);
  renderUnlockControlSection();
  renderStandards();
  alert("🔒 전체 학급(1~7반)의 전이과제를 초기화하고 [과업 1]만 해금 상태로 변경했습니다! 🌸");
}

