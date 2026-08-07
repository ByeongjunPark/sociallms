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
  selectedEmoji: "👧"
};

// 페이지 로드 시 초기화
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  checkLoginState();
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

  if (savedProfile && savedStudentId) {
    state.student = JSON.parse(savedProfile);
    state.student.studentId = savedStudentId;
    
    // 화면 전환
    document.getElementById("authSection").style.display = "none";
    const dashboard = document.getElementById("mainDashboard");
    dashboard.classList.add("active");

    updateProfileUI();
    
    // 구글 시트로부터 학습 진척도 불러오기 및 렌더링
    loadProgressFromServer();
  } else {
    // 로그인창 노출
    document.getElementById("authSection").style.display = "flex";
    document.getElementById("mainDashboard").classList.remove("active");
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
  }
}

// 에모지 셀렉터
function selectEmoji(emoji, element) {
  state.selectedEmoji = emoji;
  const options = document.querySelectorAll(".emoji-option");
  options.forEach(opt => opt.classList.remove("selected"));
  element.classList.add("selected");
}

// 학번 유효성 검사 헬퍼
function validateStudentId(id) {
  const idRegex = /^\d{4}$/; // 엄격한 숫자 4자리 검사
  return idRegex.test(String(id));
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
    alert("학번은 반드시 숫자 4자리로 입력해 주세요. (예: 1학년 4반 3번 -> 1403) 🥺");
    return;
  }

  showLoading(true);

  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "login",
        studentId,
        studentName
      })
    });

    const data = await response.json();
    showLoading(false);

    if (data.success) {
      localStorage.setItem("sociallms_student_id", studentId);
      localStorage.setItem("sociallms_profile", JSON.stringify(data.student));
      
      alert(`로그인 성공! 반가워요, ${data.student.name} 학생 🌸`);
      checkLoginState();
    } else {
      alert(data.message || "로그인에 실패했습니다.");
    }
  } catch (error) {
    showLoading(false);
    console.error("Login Error:", error);
    alert("서버 연결 실패: 로그인을 진행할 수 없습니다.");
  }
}

// 회원 등록 실행
async function handleSignup() {
  const studentId = document.getElementById("signupStudentId").value.trim();
  const studentName = document.getElementById("signupStudentName").value.trim();

  if (!studentId || !studentName) {
    alert("학번과 이름을 모두 입력해 주세요! 💕");
    return;
  }

  if (!validateStudentId(studentId)) {
    alert("학번은 반드시 숫자 4자리로 입력해 주세요. (예: 1학년 4반 3번 -> 1403) 🥺");
    return;
  }

  showLoading(true);

  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "signup",
        studentId,
        studentName,
        emoji: state.selectedEmoji
      })
    });

    const data = await response.json();
    showLoading(false);

    if (data.success) {
      alert(data.message);
      // 가입 성공 시 자동으로 로그인 폼에 입력 후 로그인 진행
      document.getElementById("loginStudentId").value = studentId;
      document.getElementById("loginStudentName").value = studentName;
      switchAuthTab("login");
      handleLogin();
    } else {
      alert(data.message || "회원 가입에 실패했습니다.");
    }
  } catch (error) {
    showLoading(false);
    console.error("Signup Error:", error);
    alert("서버 연결 실패: 가입을 진행할 수 없습니다.");
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

// 로딩 표시기
function showLoading(isLoading) {
  const btn = document.querySelector(".auth-form.active button");
  if (btn) {
    if (isLoading) {
      btn.disabled = true;
      btn.textContent = "연결 중... ⏳";
    } else {
      btn.disabled = false;
      btn.textContent = btn.id === "signupForm" ? "가입 및 시작하기 🌸" : "로그인하기 💕";
    }
  }
}

// 학생 프로필 UI 업데이트
function updateProfileUI() {
  const nameDisplay = document.getElementById("studentNameDisplay");
  const welcomeName = document.getElementById("welcomeName");
  const studentEmoji = document.getElementById("studentEmoji");
  
  if (state.student.name) {
    const gradeClass = state.student.gradeClass || state.student.studentId.substring(0, 2);
    const formattedName = `${gradeClass}반 ${state.student.name}`;
    nameDisplay.textContent = formattedName;
    welcomeName.textContent = state.student.name;
  } else {
    nameDisplay.textContent = "로그아웃";
    welcomeName.textContent = "친구";
  }
  studentEmoji.textContent = state.student.emoji;
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
      
      // 구글 시트의 탭 이름(활동 제목)을 프론트엔드의 활동 ID로 변환하여 동기화
      CURRICULUM_DATA.forEach(standard => {
        standard.activities.forEach(act => {
          // 탭 이름 자르기 처리를 고려하여, 탭 이름이 활동 제목을 포함하거나 같은지 확인
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
    // 실패 시 로컬 캐시 이용
    const savedProgress = localStorage.getItem("sociallms_progress");
    if (savedProgress) {
      state.progress = JSON.parse(savedProgress);
    }
  }

  // 화면 다시 렌더링 및 통계 업데이트
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
