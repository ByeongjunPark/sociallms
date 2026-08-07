// 글로벌 상태 관리 객체
const state = {
  student: {
    gradeClass: "",
    name: "",
    emoji: "👧"
  },
  progress: {}, // { activityId: 'completed' | 'in_progress' | 'not_started' }
  currentFilter: "all",
  selectedEmoji: "👧"
};

// 페이지 로드 시 초기화
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  loadStudentProfile();
  loadProgress();
  renderStandards();
  updateDashboardStats();
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

// 학생 프로필 관리
function loadStudentProfile() {
  const savedProfile = localStorage.getItem("sociallms_profile");
  if (savedProfile) {
    state.student = JSON.parse(savedProfile);
    updateProfileUI();
  } else {
    // 처음 접속한 경우 학생 등록 모달 자동 열기
    setTimeout(() => {
      openProfileModal();
    }, 800);
  }
}

function updateProfileUI() {
  const nameDisplay = document.getElementById("studentNameDisplay");
  const welcomeName = document.getElementById("welcomeName");
  const studentEmoji = document.getElementById("studentEmoji");
  
  if (state.student.name) {
    const formattedName = `${state.student.gradeClass ? state.student.gradeClass + ' ' : ''}${state.student.name}`;
    nameDisplay.textContent = formattedName;
    welcomeName.textContent = state.student.name;
  } else {
    nameDisplay.textContent = "학생 설정";
    welcomeName.textContent = "친구";
  }
  studentEmoji.textContent = state.student.emoji;
}

function openProfileModal() {
  const modal = document.getElementById("profileModal");
  modal.classList.add("active");
  
  // 모달 열 때 현재 저장된 값들 넣어주기
  document.getElementById("studentGradeClass").value = state.student.gradeClass || "";
  document.getElementById("studentName").value = state.student.name || "";
  
  // 에모지 선택자 동기화
  const options = document.querySelectorAll(".emoji-option");
  options.forEach(opt => {
    if (opt.textContent === state.student.emoji) {
      opt.classList.add("selected");
      state.selectedEmoji = state.student.emoji;
    } else {
      opt.classList.remove("selected");
    }
  });
}

function closeProfileModal() {
  const modal = document.getElementById("profileModal");
  modal.classList.remove("active");
}

function selectEmoji(emoji, element) {
  state.selectedEmoji = emoji;
  const options = document.querySelectorAll(".emoji-option");
  options.forEach(opt => opt.classList.remove("selected"));
  element.classList.add("selected");
}

function saveProfile() {
  const gradeClassInput = document.getElementById("studentGradeClass").value.trim();
  const nameInput = document.getElementById("studentName").value.trim();
  
  if (!nameInput) {
    alert("이름을 입력해 주세요! 💕");
    return;
  }
  
  state.student.gradeClass = gradeClassInput;
  state.student.name = nameInput;
  state.student.emoji = state.selectedEmoji;
  
  localStorage.setItem("sociallms_profile", JSON.stringify(state.student));
  updateProfileUI();
  closeProfileModal();
}

// 학습 진행도 관리
function loadProgress() {
  const savedProgress = localStorage.getItem("sociallms_progress");
  if (savedProgress) {
    state.progress = JSON.parse(savedProgress);
  } else {
    state.progress = {};
  }
}

// 대시보드 상태 및 통계 업데이트
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
    
    // 카드를 클릭했을 때 아코디언처럼 아래로 열리는 기능
    card.addEventListener("click", (e) => {
      // 활동 아이템 자체의 클릭은 무시
      if (e.target.closest(".activity-item") || e.target.closest("button")) {
        return;
      }
      toggleCardExpand(card);
    });

    // 활동 목록 마크업 생성
    let activitiesHTML = "";
    if (item.activities && item.activities.length > 0) {
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
    }

    card.innerHTML = `
      <div class="card-header">
        <span class="card-badge" style="--badge-bg: ${item.color}15; --badge-color: ${item.color}">${item.code}</span>
        <span class="card-category" style="--badge-color: ${item.color}">${item.category}</span>
      </div>
      <h3>${item.title}</h3>
      <p class="description">${item.description}</p>
      ${activitiesHTML}
    `;

    grid.appendChild(card);
  });
}

// 활동 유형 한글 변환
function getKoreanActivityType(type) {
  switch (type) {
    case "worksheet": return "배움 활동지";
    case "chatbot": return "생각 챗봇";
    case "simulation": return "체험 시뮬레이션";
    case "coming_soon": return "준비 중";
    default: return "활동";
  }
}

// 아코디언 확장 및 축소
function toggleCardExpand(card) {
  // 이미 열려있는 카드가 있다면 닫아주기 (옵션 - 원하면 닫고 원치 않으면 주석)
  /*
  const expandedCard = document.querySelector('.standard-card.expanded');
  if (expandedCard && expandedCard !== card) {
    expandedCard.classList.remove('expanded');
  }
  */
  card.classList.toggle("expanded");
}

// 카테고리 필터링
function filterCategory(category, element) {
  state.currentFilter = category;
  
  // 활성 칩 변경
  const chips = document.querySelectorAll(".filter-chip");
  chips.forEach(chip => chip.classList.remove("active"));
  element.classList.add("active");
  
  // 카드 리스트 다시 그리기
  renderStandards();
}

// 활동 진입 시 진행 중으로 설정
function onActivityClick(actId, actType, event) {
  if (actType === "coming_soon") {
    event.preventDefault();
    return;
  }
  
  // 아직 완료되지 않은 상태라면 진행중으로 업데이트
  if (state.progress[actId] !== "completed") {
    state.progress[actId] = "in_progress";
    localStorage.setItem("sociallms_progress", JSON.stringify(state.progress));
  }
}
