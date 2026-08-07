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

  const authSec = document.getElementById("authSection");
  const dashboard = document.getElementById("mainDashboard");

  if (savedProfile && savedStudentId) {
    state.student = JSON.parse(savedProfile);
    state.student.studentId = savedStudentId;
    
    // 화면 전환 (엘리먼트가 존재할 때만 안전하게 실행)
    if (authSec) authSec.style.display = "none";
    if (dashboard) dashboard.classList.add("active");

    updateProfileUI();
    
    // 구글 시트로부터 학습 진척도 불러오기 및 렌더링
    loadProgressFromServer();
  } else {
    // 로그인창 노출
    if (authSec) authSec.style.display = "flex";
    if (dashboard) dashboard.classList.remove("active");
  }
}

// 탭 스위치 (로그인 / 회원등록)
function switchAuthTab(tab) {
  const tabLogin = document.getElementById("tabLogin");
  const tabSignup = document.getElementById("tabSignup");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  if (tab === "login") {
    tabLogin.classList.add("active");
    tabSignup.classList.remove("active");
    loginForm.classList.add("active");
    signupForm.classList.remove("active");
  } else {
    tabLogin.classList.remove("active");
    tabSignup.classList.add("active");
    loginForm.classList.remove("active");
    signupForm.classList.add("active");
    // 회원가입 마법사 상태 1단계로 리셋
    resetWizard();
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
function navigateWizard(direction) {
  const currentStep = state.currentWizardStep;
  const nextStep = currentStep + direction;

  if (direction === 1) {
    // 1단계: 기본 인풋 유효성 검사
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
    
    // 6단계: 1단원 인권 개념 및 토론 진단평가 검증 (Q10 ~ Q17 전원 필수)
    else if (currentStep === 6) {
      for (let qNum = 10; qNum <= 17; qNum++) {
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
    
    // 7단계: 3단원 경제 개념 및 토론 진단평가 검증 (Q18 ~ Q24 전원 필수)
    else if (currentStep === 7) {
      for (let qNum = 18; qNum <= 24; qNum++) {
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

  // 데이터 수집 프로세스
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
    "Q9_AI과제어려움": getCheckboxValues("q9", true),

    // [PART 2] 1단원 인권 진단평가
    "Q10_3세대인권": getRadioValueWithQuiz("q10", "③"),
    "Q11_오늘날인권": getRadioValueWithQuiz("q11", "④"),
    "Q12_기본권설명": getRadioValueWithQuiz("q12", "③"),
    "Q13_시민불복종": getRadioValueWithQuiz("q13", "③"),
    "Q14_사회적소수자": getRadioValueWithQuiz("q14", "④"),
    "Q15_청소년노동법": getRadioValueWithQuiz("q15", "①"),
    "Q16_인권보편논쟁": getRadioValueWithQuiz("q16", null, true),
    "Q17_자유vs안전": getRadioValueWithQuiz("q17", null, true),

    // [PART 3] 3단원 경제 진단평가
    "Q18_가격원리": getRadioValueWithQuiz("q18", "③"),
    "Q19_합리적선택": getRadioValueWithQuiz("q19", "①"),
    "Q20_지속가능책임": getRadioValueWithQuiz("q20", "②"),
    "Q21_예적금vs주식": getRadioValueWithQuiz("q21", "③"),
    "Q22_국제무역원인": getRadioValueWithQuiz("q22", "②"),
    "Q23_시장자율vs개입": getRadioValueWithQuiz("q23", null, true),
    "Q24_자산관리원칙": getRadioValueWithQuiz("q24", null, true)
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
    const gradeClass = state.student.gradeClass || state.student.studentId.substring(0, 2);
    const formattedName = `${gradeClass}반 ${state.student.name}`;
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

  // 로딩 UI 설정
  body.innerHTML = `
    <div class="loading-pulse-container">
      <div class="loading-pulse-dots">
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
      </div>
      <span style="font-weight: 700; color: var(--text-primary); font-size: 0.92rem; text-align:center;">
        AI 학습 코치가 학생의 학업 진단 데이터와 과제 성취도를 토대로 맞춤형 처방을 작성 중입니다... 💡
      </span>
    </div>
  `;
  modal.style.display = "flex";

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

위 정보를 인지 과학 기법에 기반해 분석하여, 이 학생만을 위한 [인지적 강점], [취약할 수 있는 개선점], [맞춤형 메타인지 학습 전략 조언]을 다정한 어조로 작성해 주세요.
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
  if (modal) modal.style.display = "none";
}
