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
            const cleanTab = tabName.replace(/\s+/g, '').replace(/🏛️|🗺️|🏛|🗺/g, '');
            const cleanTitle = act.title.replace(/\s+/g, '').replace(/🏛️|🗺️|🏛|🗺/g, '');

            if (act.id === "c10101_worksheet" && (cleanTab.includes("연표") || cleanTab.includes("3세대"))) return true;
            if (act.id === "c10201_mapping" && (cleanTab.includes("맵핑") || cleanTab.includes("현대인권"))) return true;

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
      // 학번 숫자 기준 순차 정렬
      state.allStudents = data.students.sort((a, b) => parseInt(a["학번 (StudentID)"]) - parseInt(b["학번 (StudentID)"]));
      
      filterTeacherClass();
      
      // 교사용 맵핑 핀 데이터 리로드
      refreshTeacherMapPins();
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
  } else if (state.currentTeacherTab === "tasks") {
    renderTasksSection();
  } else if (state.currentTeacherTab === "map") {
    drawTeacherPinsOnMap(val);
  }
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

    return `
      <tr style="border-bottom: 1px solid rgba(0,0,0,0.04); transition: background 0.2s;">
        <td style="padding: 14px 8px; font-weight: 700; color: var(--text-primary);">${gradeText} <span style="font-size:0.75rem; color:var(--text-secondary);">(${sId})</span></td>
        <td style="padding: 14px 8px; font-weight: 600;">${sName}</td>
        <td style="padding: 14px 8px; font-size: 1.15rem;">${sEmoji}</td>
        <td style="padding: 14px 8px; color: var(--text-secondary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width: 180px;" title="${career}">${career}</td>
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
      <li style="color:var(--color-pink); font-weight:700;">💬 <strong>Q22 (교사 첫인상):</strong> ${student["Q22_선생님 첫인"] || student["Q22_선생님첫인상"] || student["Q22_수업요청사항"] || "미제출"}</li>
      <li style="color:var(--color-purple); font-weight:700;">💬 <strong>Q23 (수업 바라는점):</strong> ${student["Q23_수업 요청사"] || student["Q23_수업요청사항"] || "미제출"}</li>
    </ul>
    
    <!-- 💡 현대 인권 맵핑 상세 과제 정보 추출 -->
    ${(() => {
      const mapDetails = student.activities && student.activities["현대 인권 맵핑 및 성찰_details"];
      if (mapDetails) {
        const quizRes = mapDetails["형성평가퀴즈"] || "미기입";
        const pinCnt = mapDetails["등록한핀개수"] || "0개";
        const essayText = mapDetails["시민참여성찰답변"] || "답변 없음";
        const submitTime = mapDetails["제출시간 (Timestamp)"] || "시간 미상";

        return `
          <div style="margin-top: 18px; padding: 14px; background: rgba(184, 150, 219, 0.08); border-radius: 16px; border: 1px solid rgba(184, 150, 219, 0.15); font-size: 0.85rem;">
            <h5 style="margin: 0 0 10px 0; color: var(--color-purple); font-weight: 800; display: flex; align-items: center; gap: 6px;">
              🗺️ 현대 인권 맵핑 & 성찰 과제 수행서
            </h5>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; border-bottom: 1px dashed rgba(0,0,0,0.06); padding-bottom: 8px; color: var(--text-primary);">
              <div>• <strong>형성평가 결과:</strong> ${quizRes}</div>
              <div>• <strong>등록한 지도 핀:</strong> ${pinCnt}</div>
              <div style="grid-column: span 2;">• <strong>제출 시간:</strong> ${new Date(submitTime).toLocaleString()}</div>
            </div>
            <div>
              <strong style="color: var(--text-primary);">✍️ 주거·안전·환경권 시민참여 성찰 저널:</strong>
              <p style="margin: 6px 0 0 0; padding: 10px; background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-glass); font-size: 0.8rem; line-height: 1.5; color: var(--text-primary); white-space: pre-wrap;">${essayText}</p>
            </div>
          </div>
        `;
      } else {
        return `
          <div style="margin-top: 18px; padding: 12px; background: rgba(0, 0, 0, 0.02); border-radius: 14px; border: 1px dashed rgba(0,0,0,0.06); font-size: 0.82rem; text-align: center; color: var(--text-secondary);">
            📍 현대 인권 커뮤니티 맵핑 및 성찰 저널 미제출 상태입니다.
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

      // 개별 문항 HTML 생성
      reportHTML += `
        <div style="background: rgba(0,0,0,0.015); border: 1px solid rgba(0,0,0,0.05); border-radius: 18px; padding: 20px; margin-bottom: 8px;">
          <h5 style="margin: 0 0 8px 0; font-size: 0.92rem; font-weight: 800; color: var(--color-purple); display:flex; justify-content:space-between;">
            <span>${qInfo.title}</span>
            <span style="font-size: 0.78rem; color: var(--text-secondary); font-weight: 500;">응답 학생: ${totalAnswered}명</span>
          </h5>
          <p style="margin: 0 0 16px 0; font-size: 0.85rem; color: var(--text-primary); line-height: 1.5; font-weight: 500;">${qInfo.question}</p>
          
          <!-- 선지 선택률 게이지 바 리스트 -->
          <div style="display:flex; flex-direction:column; gap: 8px; margin-bottom: 16px;">
      `;

      Object.keys(qInfo.options).forEach(optNum => {
        const optText = qInfo.options[optNum];
        const count = counts[optNum] || 0;
        const rate = totalAnswered > 0 ? Math.round((count / totalAnswered) * 100) : 0;
        const isCorrect = optNum === qInfo.correct;

        // 정답 선지는 하이라이트 디자인 적용
        const bgBarColor = isCorrect ? "rgba(43, 138, 62, 0.15)" : "rgba(0,0,0,0.03)";
        const barColor = isCorrect ? "var(--color-mint)" : "rgba(0,0,0,0.12)";
        const textWeight = isCorrect ? "700" : "500";
        const textColor = isCorrect ? "#2b8a3e" : "var(--text-primary)";

        reportHTML += `
          <div style="font-size: 0.82rem; color: ${textColor}; font-weight: ${textWeight}; display:flex; flex-direction:column; gap: 4px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span>${isCorrect ? '✅ ' : ''}${optText}</span>
              <span>${count}명 (${rate}%)</span>
            </div>
            <div style="width: 100%; height: 8px; background: ${bgBarColor}; border-radius: 6px; overflow: hidden; position:relative;">
              <div style="width: ${rate}%; height: 100%; background: ${barColor}; border-radius: 6px; transition: width 0.6s ease;"></div>
            </div>
          </div>
        `;
      });

      reportHTML += `
          </div>
          
          <!-- 해설 팁 영역 -->
          <div style="background: rgba(184, 150, 219, 0.06); border-left: 4px solid var(--color-purple); padding: 12px 16px; border-radius: 12px; font-size: 0.8rem; line-height: 1.55; color: var(--text-secondary);">
            <strong>💡 단원 성취기준 핵심 해설:</strong> ${qInfo.explanation}
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
    explanation: "선거권이나 공무담임권은 정치 과정에 참여하는 '참정권'이며, 신체의 자유와 행복추구는 간섭을 배제하는 '자유권'이고, 국가에 인간다운 생활을 요구하는 최저임금제 등은 복지적 이념의 '사회권'입니다."
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
  let qChoiceCounts = [
    { "①": 0, "②": 0, "③": 0, "④": 0 },
    { "주거권": 0, "기타": 0 },
    { "안전권": 0, "기타": 0 },
    { "①": 0, "②": 0, "③": 0, "④": 0 },
    { "①": 0, "②": 0, "③": 0, "④": 0 }
  ];
  
  let subjectiveAnswers = [];
  
  students.forEach(s => {
    const detailsKey = currentTask === "c10101" 
      ? "인권 역사와 3세대 변화 연표 🏛️_details" 
      : "현대 인권 맵핑 및 성찰_details";
    const isSubmitted = s.activities && s.activities[detailsKey];
    if (isSubmitted) {
      submitCount++;
      const scoreStr = s.activities[currentTask === "c10101" ? "인권 역사와 3세대 변화 연표 🏛️" : "현대 인권 맵핑 및 성찰"];
      const scoreVal = parseInt(scoreStr) || 100;
      scoresSum += scoreVal;
      
      const sId = String(s["학번 (StudentID)"]);
      const sName = s["이름 (StudentName)"] || "이름미정";
      const gradeText = sId.length === 4 ? `${sId.substring(0, 1)}학년 ${parseInt(sId.substring(1, 2))}반 ${parseInt(sId.substring(2, 4))}번` : sId;
      const details = s.activities[detailsKey];
      
      if (currentTask === "c10101") {
        const isSorted = details["연대기정렬성공"] === "성공";
        if (isSorted) timelineSortSuccess++;
        
        const matchCnt = parseInt(details["매칭정답수"]) || 0;
        eventMatchSum += matchCnt;
        
        const genCnt = parseInt(details["세대매칭정답수"]) || 0;
        genMatchSum += genCnt;
        
        subjectiveAnswers.push({
          gradeText,
          sName,
          ref1: details["Q1_4세대인권상상"] || "미입력",
          ref2: details["Q2_학습과정성찰"] || "미입력"
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
          ref1: details["시민참여성찰답변"] || "답변 없음",
          ref2: `📍 등록 핀 수: ${details["등록한핀개수"] || "0개"}`
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
    const avgGenMatch = submitCount > 0 ? (genMatchSum / submitCount).toFixed(1) : 0;
    
    statsDashboardHtml = `
      <div class="card" style="padding: 24px; border-radius: 24px; background: var(--bg-card); border: 1px solid var(--border-glass);">
        <h4 style="font-size: 1rem; font-weight: 800; color: var(--color-purple); margin: 0 0 16px 0;">📊 🏛️ 과업 1 학급 정오답 분석 통계</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
          <!-- 연대기 최종 정렬 성공률 -->
          <div style="background: rgba(0,0,0,0.02); padding: 20px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.04);">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">연대기 최종 정렬 성공률</span>
              <strong style="font-size: 0.9rem; color: var(--color-purple);">${sortSuccessRate}%</strong>
            </div>
            <div style="height: 12px; background: rgba(0,0,0,0.06); border-radius: 6px; overflow: hidden;">
              <div style="height: 100%; width: ${sortSuccessRate}%; background: linear-gradient(90deg, var(--color-purple-soft), var(--color-purple)); border-radius: 6px; transition: width 0.5s;"></div>
            </div>
            <span style="font-size: 0.72rem; color: var(--text-secondary); display:block; margin-top:6px;">제출 학생 ${submitCount}명 중 ${timelineSortSuccess}명 성공</span>
          </div>
          
          <!-- 역사적 사건 매칭 평균 -->
          <div style="background: rgba(0,0,0,0.02); padding: 20px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.04);">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">역사적 사건 카드 매칭 평균</span>
              <strong style="font-size: 0.9rem; color: var(--color-pink);">${avgEventMatch} / 5개 (${(avgEventMatch / 5 * 100).toFixed(1)}%)</strong>
            </div>
            <div style="height: 12px; background: rgba(0,0,0,0.06); border-radius: 6px; overflow: hidden;">
              <div style="height: 100%; width: ${(avgEventMatch / 5 * 100)}%; background: linear-gradient(90deg, var(--color-pink-soft), var(--color-pink)); border-radius: 6px; transition: width 0.5s;"></div>
            </div>
            <span style="font-size: 0.72rem; color: var(--text-secondary); display:block; margin-top:6px;">1단계: 서구 근대 시민 혁명 시기별 주요 인권 선언 매칭</span>
          </div>

          <!-- 1~3세대 인권 특징 매칭 평균 -->
          <div style="background: rgba(0,0,0,0.02); padding: 20px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.04);">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">1~3세대 인권 특징 매칭 평균</span>
              <strong style="font-size: 0.9rem; color: #4f9ef5;">${avgGenMatch} / 5개 (${(avgGenMatch / 5 * 100).toFixed(1)}%)</strong>
            </div>
            <div style="height: 12px; background: rgba(0,0,0,0.06); border-radius: 6px; overflow: hidden;">
              <div style="height: 100%; width: ${(avgGenMatch / 5 * 100)}%; background: linear-gradient(90deg, #a5d8ff, #4f9ef5); border-radius: 6px; transition: width 0.5s;"></div>
            </div>
            <span style="font-size: 0.72rem; color: var(--text-secondary); display:block; margin-top:6px;">3단계: 자유권·참정권·사회권·연대권 매칭</span>
          </div>
        </div>
      </div>
    `;
  } else {
    // 2. [과업 2] 통계 대시보드 마크업
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
            <h5 style="margin: 0 0 14px 0; font-size: 0.88rem; font-weight:800; color: var(--text-primary); border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 6px;">📝 형성평가 (Q1~Q5) 문항별 선택지(①~④) 득표율 & 정오답 상세 분석</h5>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
              ${(() => {
                const qQuestionsInfo = [
                  { title: "Q1. 인권의 정의와 천부인권성", correct: "③" },
                  { title: "Q2. 쾌적한 주거권과 주거의 안정", correct: "주거권" },
                  { title: "Q3. 안전하게 살 권리(안전권)", correct: "안전권" },
                  { title: "Q4. 노동3권과 근로 기준 보장", correct: "④" },
                  { title: "Q5. 디지털 잊힐 권리(정보인권)", correct: "①" }
                ];

                return qQuestionsInfo.map((q, idx) => {
                  const total = qTotals[idx] || 0;
                  const correct = qCorrects[idx] || 0;
                  const rate = total > 0 ? ((correct / total) * 100).toFixed(1) : 0;
                  const optCounts = qChoiceCounts[idx] || {};

                  let optGrid = "";
                  if (idx === 0 || idx === 3 || idx === 4) {
                    const choices = ["①", "②", "③", "④"];
                    optGrid = choices.map(c => {
                      const cCnt = optCounts[c] || 0;
                      const cPct = total > 0 ? ((cCnt / total) * 100).toFixed(0) : 0;
                      const isAns = c === q.correct;
                      return `
                        <div style="background: ${isAns ? 'rgba(43, 138, 98, 0.12)' : 'rgba(0,0,0,0.03)'}; padding: 6px 8px; border-radius: 8px; text-align: center; border: ${isAns ? '1.5px solid var(--color-mint)' : '1px solid transparent'};">
                          <div style="font-weight: 700; font-size:0.78rem; color: ${isAns ? 'var(--color-mint)' : 'var(--text-primary)'};">${c} ${isAns ? '⭕' : ''}</div>
                          <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top:2px;">${cCnt}명 (${cPct}%)</div>
                        </div>
                      `;
                    }).join("");
                  } else {
                    const correctCnt = optCounts[q.correct] || 0;
                    const otherCnt = total > correctCnt ? total - correctCnt : 0;
                    optGrid = `
                      <div style="background: rgba(43, 138, 98, 0.12); padding: 6px 8px; border-radius: 8px; text-align: center; border: 1.5px solid var(--color-mint); grid-column: span 2;">
                        <div style="font-weight: 700; font-size:0.78rem; color: var(--color-mint);">정답("${q.correct}") ⭕</div>
                        <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top:2px;">${correctCnt}명 (${total > 0 ? (correctCnt/total*100).toFixed(0) : 0}%)</div>
                      </div>
                      <div style="background: rgba(201,42,42,0.08); padding: 6px 8px; border-radius: 8px; text-align: center; border: 1px solid rgba(201,42,42,0.2); grid-column: span 2;">
                        <div style="font-weight: 700; font-size:0.78rem; color: #c92a2a;">오답(기타) ❌</div>
                        <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top:2px;">${otherCnt}명 (${total > 0 ? (otherCnt/total*100).toFixed(0) : 0}%)</div>
                      </div>
                    `;
                  }

                  return `
                    <div style="background: rgba(255,255,255,0.7); padding: 12px 14px; border-radius: 14px; border: 1px solid rgba(0,0,0,0.05);">
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; font-size:0.8rem;">
                        <span style="font-weight:700; color:var(--text-primary);">${q.title}</span>
                        <span style="font-weight:800; color:${rate >= 80 ? 'var(--color-mint)' : rate >= 50 ? 'var(--color-purple)' : '#c92a2a'};">${rate}% (${correct}/${total}명)</span>
                      </div>
                      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
                        ${optGrid}
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
    const cardTitle = currentTask === "c10101" 
      ? "💡 학급 4세대 신규 인권 상상 제안 및 학습 과정 성찰 저널" 
      : "💡 학급 주거·안전·환경/소외 구역 시민 참여 성찰 저널 모음";
      
    const answerCards = subjectiveAnswers.map(ans => {
      const field1Title = currentTask === "c10101" ? "🏛️ 내가 상상하는 4세대 인권 제안" : "📝 시민 참여 성찰 저널 기록";
      const field2Title = currentTask === "c10101" ? "🌱 학습 과정에 대한 메타인지 성찰" : "📍 활동 요약";
      
      return `
        <div style="background: rgba(255, 255, 255, 0.4); border: 1px solid rgba(0, 0, 0, 0.05); padding: 16px; border-radius: 16px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(0,0,0,0.04); padding-bottom: 6px;">
            <strong style="font-size:0.85rem; color: var(--color-purple);">${ans.sName} <span style="font-size:0.72rem; color:var(--text-secondary); font-weight: normal;">(${ans.gradeText})</span></strong>
          </div>
          <div>
            <span style="font-size: 0.72rem; font-weight:700; color: var(--text-secondary); display:block; margin-bottom: 2px;">${field1Title}:</span>
            <p style="margin: 0; font-size: 0.8rem; color: var(--text-primary); line-height: 1.45; word-break: break-all;">${ans.ref1}</p>
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
      
      const detailsKey = currentTask === "c10101" 
        ? "인권 역사와 3세대 변화 연표 🏛️_details" 
        : "현대 인권 맵핑 및 성찰_details";
      const details = s.activities && s.activities[detailsKey];
      
      if (!details) {
        return `
          <tr style="border-bottom: 1px solid rgba(0,0,0,0.04);">
            <td style="padding: 14px 8px; font-weight: 700; color: var(--text-primary);">${gradeText}</td>
            <td style="padding: 14px 8px; font-weight: 600;">${sName}</td>
            <td style="padding: 14px 8px;"><span style="background: rgba(201, 42, 42, 0.08); color: #c92a2a; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 0.75rem;">미제출 ❌</span></td>
            <td colspan="${currentTask === 'c10101' ? 7 : 5}" style="padding: 14px 8px; text-align: center; color: var(--text-secondary); font-style: italic;">과제를 아직 제출하지 않았습니다.</td>
          </tr>
        `;
      }
      
      const submitTimeRaw = details["등록시간 (Timestamp)"] || details["제출시간 (Timestamp)"] || "";
      const submitTime = submitTimeRaw ? new Date(submitTimeRaw).toLocaleString() : "시간 미상";
      
      if (currentTask === "c10101") {
        const matchCnt = details["매칭정답수"] || "미기입";
        const isSorted = details["연대기정렬성공"] || "실패";
        const genCnt = details["세대매칭정답수"] || "미기입";
        const ref4th = details["Q1_4세대인권상상"] || "미기입";
        const refSelf = details["Q2_학습과정성찰"] || "미기입";
        const score = s.activities["인권 역사와 3세대 변화 연표 🏛️"] || "0점";
        
        return `
          <tr style="border-bottom: 1px solid rgba(0,0,0,0.04);">
            <td style="padding: 14px 8px; font-weight: 700; color: var(--text-primary);">${gradeText}</td>
            <td style="padding: 14px 8px; font-weight: 600;">${sName}</td>
            <td style="padding: 14px 8px;"><span style="background: rgba(43, 138, 62, 0.08); color: #2b8a3e; padding: 4px 10px; border-radius: 8px; font-weight: 700; font-size: 0.75rem;">제출완료 🌿</span></td>
            <td style="padding: 14px 8px; font-weight: 700; color: var(--color-purple);">${score}</td>
            <td style="padding: 14px 8px;">${matchCnt}</td>
            <td style="padding: 14px 8px; font-weight: 700; color: ${isSorted === '성공' ? '#2b8a3e' : '#c92a2a'};">${isSorted}</td>
            <td style="padding: 14px 8px;">${genCnt}</td>
            <td style="padding: 14px 8px; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${ref4th}">${ref4th}</td>
            <td style="padding: 14px 8px; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${refSelf}">${refSelf}</td>
            <td style="padding: 14px 8px; font-size: 0.75rem; color: var(--text-secondary);">${submitTime}</td>
          </tr>
        `;
      } else {
        const quizRes = details["형성평가퀴즈"] || "미기입";
        const pinCnt = details["등록한핀개수"] || "0개";
        const essayText = details["시민참여성찰답변"] || "답변 없음";
        const score = s.activities["현대 인권 맵핑 및 성찰"] || "100점";
        
        return `
          <tr style="border-bottom: 1px solid rgba(0,0,0,0.04);">
            <td style="padding: 14px 8px; font-weight: 700; color: var(--text-primary);">${gradeText}</td>
            <td style="padding: 14px 8px; font-weight: 600;">${sName}</td>
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
  
  const taskTitle = currentTask === "c10101" ? "🏛️ 과업 1: 인권 역사 연표 & 3세대 변화" : "🗺️ 과업 2: 현대 인권 커뮤니티 맵핑 및 성찰";
  const headerCols = currentTask === "c10101" 
    ? `
      <th style="padding: 12px 8px; width: 12%;">학번</th>
      <th style="padding: 12px 8px; width: 8%;">이름</th>
      <th style="padding: 12px 8px; width: 10%;">상태</th>
      <th style="padding: 12px 8px; width: 8%;">점수</th>
      <th style="padding: 12px 8px; width: 10%;">매칭 정답수</th>
      <th style="padding: 12px 8px; width: 10%;">연대기 정렬</th>
      <th style="padding: 12px 8px; width: 10%;">세대 정답수</th>
      <th style="padding: 12px 8px; width: 12%;">4세대 상상</th>
      <th style="padding: 12px 8px; width: 12%;">배움성찰</th>
      <th style="padding: 12px 8px; width: 8%;">제출시간</th>
    `
    : `
      <th style="padding: 12px 8px; width: 15%;">학번</th>
      <th style="padding: 12px 8px; width: 10%;">이름</th>
      <th style="padding: 12px 8px; width: 12%;">상태</th>
      <th style="padding: 12px 8px; width: 10%;">점수</th>
      <th style="padding: 12px 8px; width: 15%;">형성평가</th>
      <th style="padding: 12px 8px; width: 10%;">등록 핀</th>
      <th style="padding: 12px 8px; width: 18%;">시민 성찰 답변</th>
      <th style="padding: 12px 8px; width: 10%;">제출시간</th>
    `;
  
  section.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr; gap: 24px;">
      <!-- 과업 선택 및 요약 카드 -->
      <div class="card" style="padding: 24px; border-radius: 24px; background: var(--bg-card); border: 1px solid var(--border-glass);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; border-bottom: 1.5px solid var(--border-glass); padding-bottom: 14px;">
          <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--color-purple); margin: 0;">📝 과업별 실시간 수행 및 정오답 분석</h3>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">과업 필터:</span>
            <select id="teacherTaskSelect" onchange="changeTeacherTask(this.value)" style="font-family: var(--font-family-body); font-weight: 700; font-size: 0.85rem; padding: 6px 12px; border-radius: 10px; border: 1.5px solid var(--border-glass); background: var(--bg-card); color: var(--text-primary); outline: none; cursor: pointer;">
              <option value="c10101" ${currentTask === "c10101" ? "selected" : ""}>🏛️ 과업 1: 인권 역사 연표 & 3세대 변화</option>
              <option value="c10201" ${currentTask === "c10201" ? "selected" : ""}>🗺️ 과업 2: 현대 인권 커뮤니티 맵핑 및 성찰</option>
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
    const marker = L.marker([lat, lng]);
    
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

