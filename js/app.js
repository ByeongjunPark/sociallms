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

// 로그인 상태 체크
function checkLoginState() {
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
    if (tDashboard) tDashboard.style.display = "block";
    loadTeacherData();
    return;
  }

  if (savedProfile && savedStudentId) {
    state.student = JSON.parse(savedProfile);
    state.student.studentId = savedStudentId;
    
    // 화면 전환 (엘리먼트가 존재할 때만 안전하게 실행)
    if (authSec) authSec.style.display = "none";
    if (dashboard) dashboard.classList.add("active");
    if (tDashboard) tDashboard.style.display = "none";

    updateProfileUI();
    
    // 구글 시트로부터 학습 진척도 불러오기 및 렌더링
    loadProgressFromServer();
  } else {
    // 로그인창 노출
    if (authSec) authSec.style.display = "flex";
    if (dashboard) dashboard.classList.remove("active");
    if (tDashboard) tDashboard.style.display = "none";
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
      checkLoginState();
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
    "Q21_자산관리우선가치토론": getRadioValueWithQuiz("q21", null, true)
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
    
    // 📊 대시보드 상단 나의 Baseline 프로필 데이터 매핑
    if (myCareerTag) {
      myCareerTag.textContent = studentData["Q1_희망진로"] || studentData["Q1_희망진로선택"] || "경영/경제 (미정)";
    }
    
    if (myTraitsCloud) {
      myTraitsCloud.innerHTML = "";
      const traitsStr = studentData["Q3_나의특징"] || studentData["Q3_특징"] || "분석적인, 창의적인";
      const traitsArr = traitsStr.split(",").map(t => t.trim());
      traitsArr.forEach(trait => {
        if (trait) {
          const badge = document.createElement("span");
          badge.style.cssText = "background: rgba(184, 150, 219, 0.15); color: var(--color-purple); padding: 3px 8px; border-radius: 8px; font-weight: 700; font-size: 0.72rem;";
          badge.textContent = trait;
          myTraitsCloud.appendChild(badge);
        }
      });
    }
    
    if (myTaskTag) {
      myTaskTag.textContent = studentData["Q5_자신있는과제"] || studentData["Q5_과제유형"] || "보고서 작성";
    }
  } else {
    if (nameDisplay) nameDisplay.textContent = "로그아웃";
    if (welcomeName) welcomeName.textContent = "친구";
  }
  
  const emojiEl = document.getElementById("welcomeEmoji");
  if (emojiEl) emojiEl.textContent = state.student.emoji || "👧";
  if (studentEmoji) studentEmoji.textContent = state.student.emoji || "👧";
}

// 구글 시트로부터 학습 진척도 가져오기
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
      
      CURRICULUM_DATA.forEach(standard => {
        standard.activities.forEach(act => {
          const matchedTabName = Object.keys(serverProgress).find(tabName => {
            const cleanTab = tabName.replace(/\s+/g, '');
            const cleanTitle = act.title.replace(/\s+/g, '');
            return cleanTitle.includes(cleanTab) || cleanTab.includes(cleanTitle);
          });
          
          if (matchedTabName && serverProgress[matchedTabName] === "completed") {
            mappedProgress[act.id] = "completed";
          }
        });
      });

      state.progress = mappedProgress;
      localStorage.setItem("sociallms_progress", JSON.stringify(state.progress));
    }
  } catch (error) {
    console.error("Failed to load progress from server, using local cache:", error);
    const savedProgress = localStorage.getItem("sociallms_progress");
    if (savedProgress) {
      state.progress = JSON.parse(savedProgress);
    }
  }

  renderStandards();
  updateDashboardStats();
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
                <a href="${act.url}" class="activity-item ${isComingSoon ? 'disabled' : ''}" data-act-id="${act.id}" onclick="onActivityClick('${act.id}', '${act.type}', event)">
                  <div class="activity-info">
                    <div class="activity-title-wrapper">
                      <span class="activity-name">${act.title}</span>
                      <span class="activity-type-badge ${act.type}">${getKoreanActivityType(act.type)}</span>
                    </div>
                    <p class="activity-desc">${act.description}</p>
                  </div>
                  <div class="activity-meta">
                    <span class="activity-time">⏳ ${act.timeRequired}</span>
                    <span class="status-indicator ${statusClass}"></span>
                    <button class="activity-action-btn">${statusText}</button>
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
  
  if (state.progress[actId] !== "completed") {
    state.progress[actId] = "in_progress";
    localStorage.setItem("sociallms_progress", JSON.stringify(state.progress));
  }
}

// 💡 나의 학습방법 AI에게 조언받기 구현
async function consultAiLearningStrategy() {
  const modal = document.getElementById("dashboardAiModal");
  const body = document.getElementById("dashboardAiModalBody");

  if (!modal || !body) return;

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
  
  const authSec = document.getElementById("authSection");
  const dashboard = document.getElementById("mainDashboard");
  const tDashboard = document.getElementById("teacherDashboard");

  if (authSec) authSec.style.display = "none";
  if (dashboard) dashboard.style.display = "none";
  if (tDashboard) tDashboard.style.display = "block";

  passwordInput.value = ""; // 비밀번호 필드 클리어
  await loadTeacherData();
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
      // 학번 숫자 기준 순차 정렬
      state.allStudents = data.students.sort((a, b) => parseInt(a["학번 (StudentID)"]) - parseInt(b["학번 (StudentID)"]));
      
      // 초기에는 학년 전체 필터 적용
      filterTeacherClass();
    } else {
      throw new Error(data.message);
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
  }
}

// 학생 리스트 테이블 그리기
function renderTeacherStudentsTable() {
  const tableBody = document.getElementById("teacherStudentTableBody");
  if (!tableBody) return;

  if (state.filteredStudents.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; font-weight: 700; color: var(--text-secondary);">
          선택된 학급에 가입된 학생이 아직 없습니다. 🥺
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = state.filteredStudents.map(s => {
    const sId = String(s["학번 (StudentID)"]);
    const sName = s["이름 (StudentName)"] || "이름미정";
    const sEmoji = s["캐릭터 (Emoji)"] || "👧";
    
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

    // 1단원 성취도 점수 매칭
    const actScore = s.activities && s.activities["인권 역사와 3세대 변화 연표 🏛️"];
    let scoreBadge = `<span style="background: rgba(201, 42, 42, 0.08); color: #c92a2a; padding: 4px 10px; border-radius: 8px; font-weight: 700;">미제출 ❌</span>`;
    
    if (actScore !== undefined) {
      scoreBadge = `<span style="background: rgba(43, 138, 62, 0.08); color: #2b8a3e; padding: 4px 10px; border-radius: 8px; font-weight: 700;">제출 (${actScore})</span>`;
    }

    return `
      <tr style="border-bottom: 1px solid rgba(0,0,0,0.04); transition: background 0.2s;">
        <td style="padding: 14px 8px; font-weight: 700; color: var(--text-primary);">${gradeText} <span style="font-size:0.75rem; color:var(--text-secondary);">(${sId})</span></td>
        <td style="padding: 14px 8px; font-weight: 600;">${sName}</td>
        <td style="padding: 14px 8px; font-size: 1.15rem;">${sEmoji}</td>
        <td style="padding: 14px 8px; color: var(--text-secondary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width: 180px;" title="${career}">${career}</td>
        <td style="padding: 14px 8px;">${scoreBadge}</td>
        <td style="padding: 14px 8px; text-align: center;">
          <button type="button" class="gen-btn" style="padding: 4px 10px; font-size:0.75rem; border-color: var(--color-purple); color: var(--color-purple);" onclick="showStudentDetailModal('${sId}')">상세조회 🔍</button>
        </td>
      </tr>
    `;
  }).join("");
}

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
    </ul>
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
          <span>Upstage AI가 ${classText} 학생들의 이질적 성향과 상호보완적 역할을 분석하여 최적의 모둠(학번+이름 포함)을 구성 중입니다... 💡</span>
        </div>
      </div>
    `;
  }

  // 1. 프롬프트 조립용 학생 데이터 정제 (학번을 명시적으로 주입)
  const studentsProfileList = students.map((s, idx) => {
    const sId = String(s["학번 (StudentID)"]);
    return `${idx + 1}. 학번: ${sId} | 이름: ${s["이름 (StudentName)"]} | 진로: ${s["Q1_희망진로"] || "미정"} | 선호역할: ${s["Q4_모둠역할선호"] || "기획/참여"} | 성향: ${s["Q3_나의특징"] || "분석적인"} | 특기과제: ${s["Q5_자신있는과제"] || "자료조사"}`;
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
