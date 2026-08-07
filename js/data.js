/**
 * 박병준 선생님의 통합사회 교실 - 성취기준 및 활동 데이터베이스
 * 
 * [가이드]
 * 새로운 활동을 추가하려면 아래 CURRICULUM_DATA 배열에 맞게 객체를 추가하거나 수정하세요.
 * - type 종류: 'worksheet' (활동지), 'chatbot' (챗봇), 'simulation' (시뮬레이션), 'coming_soon' (준비중)
 */

const CURRICULUM_DATA = [
  {
    id: "10통사2-01-01",
    code: "10통사2-01-01",
    title: "인권의 의미와 변화 양상 🌸",
    description: "근대 시민 혁명 등을 통해 확립되어 온 인권의 의미와 변화 양상을 이해하고, 현대 사회에서 주거, 안전, 환경, 문화 등 다양한 영역으로 인권이 확장되고 있는 사례를 조사한다.",
    category: "인권 보장과 헌법",
    color: "var(--color-pink)",
    bgGradient: "linear-gradient(135deg, #fff5f5 0%, #ffe3e3 100%)",
    activities: [
      {
        id: "c10101_worksheet",
        title: "현대 사회의 새로운 인권 조사 활동지 📝",
        type: "worksheet",
        url: "activities/c10101_worksheet.html",
        description: "주거, 안전, 환경, 문화권 등 새롭게 정의되고 있는 인권 영역의 구체적 사례를 조사하고 기록합니다.",
        timeRequired: "15분"
      }
    ]
  },
  {
    id: "10통사2-01-02",
    code: "10통사2-01-02",
    title: "헌법의 역할과 시민 참여 🏛️",
    description: "인간 존엄성 실현과 인권 보장을 위한 헌법의 역할을 파악하고, 시민의 권익을 보호하기 위한 다양한 시민 참여의 방안을 탐구하고 이를 실천한다.",
    category: "인권 보장과 헌법",
    color: "var(--color-purple)",
    bgGradient: "linear-gradient(135deg, #f8f0fc 0%, #ebd4fc 100%)",
    activities: [
      {
        id: "c10102_ready",
        title: "시민 참여와 헌법 탐구 활동 💬",
        type: "coming_soon",
        url: "#",
        description: "추후 시민 참여 탐구용 챗봇 활동이 필요할 때 구현 및 연동될 예정입니다.",
        timeRequired: "대기중"
      }
    ]
  },
  {
    id: "10통사2-01-03",
    code: "10통사2-01-03",
    title: "국내외 인권 문제와 해결 🌍",
    description: "사회적 소수자 차별, 청소년의 노동권 등 국내 인권 문제와 인권지수를 통해 확인할 수 있는 세계 인권 문제의 양상을 조사하고, 이에 대한 해결 방안을 모색한다.",
    category: "인권 보장과 헌법",
    color: "var(--color-blue)",
    bgGradient: "linear-gradient(135deg, #eef7ff 0%, #d0ebff 100%)",
    activities: [
      {
        id: "c10103_ready",
        title: "세계 인권 지수(Human Rights Index) 분석 📊",
        type: "coming_soon",
        url: "#",
        description: "다양한 국가의 인권 지수 데이터 시각화 자료를 보고 분석 활동을 진행할 예정입니다.",
        timeRequired: "대기중"
      }
    ]
  },
  {
    id: "10통사2-03-01",
    code: "10통사2-03-01",
    title: "자본주의 역사와 시장-정부 관계 ⚖️",
    description: "자본주의의 역사적 전개 과정과 그 특징을 조사하고, 시장과 정부의 관계를 중심으로 다양한 삶의 방식을 비교 평가한다.",
    category: "시장 경제와 금융",
    color: "var(--color-peach)",
    bgGradient: "linear-gradient(135deg, #fff9db 0%, #fff3bf 100%)",
    activities: [
      {
        id: "c10301_ready",
        title: "보이지 않는 손 vs 정부의 규제 토론방 💬",
        type: "coming_soon",
        url: "#",
        description: "자본주의 역사 속 대공황, 신자유주의 등 위기 순간에서 시장과 정부의 역할을 토론합니다.",
        timeRequired: "대기중"
      }
    ]
  },
  {
    id: "10통사2-03-02",
    code: "10통사2-03-02",
    title: "합리적 선택과 경제 주체의 역할 💡",
    description: "합리적 선택의 의미와 그 한계를 파악하고, 지속가능발전을 위해 요청되는 정부, 기업가, 노동자, 소비자의 바람직한 역할과 책임에 관해 탐구한다.",
    category: "시장 경제와 금융",
    color: "var(--color-mint)",
    bgGradient: "linear-gradient(135deg, #e6fcf5 0%, #c3fae8 100%)",
    activities: [
      {
        id: "c10302_ready",
        title: "착한 소비 & 지속가능 발전 가상 마켓 🛒",
        type: "coming_soon",
        url: "#",
        description: "기회비용과 외부효과를 고려하여 가상의 마켓에서 합리적이고 지속가능한 소비를 직접 체험합니다.",
        timeRequired: "대기중"
      }
    ]
  },
  {
    id: "10통사2-03-03",
    code: "10통사2-03-03",
    title: "금융 자산 관리와 금융 생활 설계 📈",
    description: "금융 자산의 특징과 자산 관리의 원칙을 토대로 금융 생활을 설계하고, 경제적, 사회적 환경의 변화가 금융과 관련한 의사 결정에 미치는 영향을 탐구한다.",
    category: "시장 경제와 금융",
    color: "var(--color-coral)",
    bgGradient: "linear-gradient(135deg, #fff0f6 0%, #ffdeeb 100%)",
    activities: [
      {
        id: "c10303_simulation",
        title: "1000만원 포트폴리오 자산관리 시뮬레이터 💰",
        type: "simulation",
        url: "activities/c10303_simulation.html",
        description: "예금, 주식, 펀드를 포트폴리오로 구성하고 금리 인상, 경기 불황 등의 가상 이벤트를 겪으며 자산 가치 변화를 체험합니다.",
        timeRequired: "12분"
      }
    ]
  },
  {
    id: "10통사2-03-04",
    code: "10통사2-03-04",
    title: "국제 무역과 지속 가능한 발전 🚢",
    description: "자원, 노동, 자본의 지역 분포에 따른 국제 분업과 무역의 필요성을 이해하고, 지속가능발전에 기여하는 국제무역의 방안을 탐색한다.",
    category: "시장 경제와 금융",
    color: "var(--color-sage)",
    bgGradient: "linear-gradient(135deg, #f4fce8 0%, #e2f9b8 100%)",
    activities: [
      {
        id: "c10304_ready",
        title: "글로벌 무역 및 국제 분업 협상 게임 🤝",
        type: "coming_soon",
        url: "#",
        description: "서로 다른 자원을 가진 국가가 되어 비교 우위를 가진 재화를 교역하는 무역 시뮬레이션입니다.",
        timeRequired: "대기중"
      }
    ]
  }
];
