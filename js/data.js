/**
 * 박병준 선생님의 통합사회 교실 - 성취기준 및 활동 데이터베이스 (초기 뼈대 버전)
 * 
 * [가이드]
 * 사용자가 명령하여 하나씩 하위 활동을 생성할 예정입니다.
 * 활동은 각 성취기준 객체의 `activities` 배열 내에 추가됩니다.
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
    activities: []
  },
  {
    id: "10통사2-01-02",
    code: "10통사2-01-02",
    title: "헌법의 역할과 시민 참여 🏛️",
    description: "인간 존엄성 실현과 인권 보장을 위한 헌법의 역할을 파악하고, 시민의 권익을 보호하기 위한 다양한 시민 참여의 방안을 탐구하고 이를 실천한다.",
    category: "인권 보장과 헌법",
    color: "var(--color-purple)",
    bgGradient: "linear-gradient(135deg, #f8f0fc 0%, #ebd4fc 100%)",
    activities: []
  },
  {
    id: "10통사2-01-03",
    code: "10통사2-01-03",
    title: "국내외 인권 문제와 해결 🌍",
    description: "사회적 소수자 차별, 청소년의 노동권 등 국내 인권 문제와 인권지수를 통해 확인할 수 있는 세계 인권 문제의 양상을 조사하고, 이에 대한 해결 방안을 모색한다.",
    category: "인권 보장과 헌법",
    color: "var(--color-blue)",
    bgGradient: "linear-gradient(135deg, #eef7ff 0%, #d0ebff 100%)",
    activities: []
  },
  {
    id: "10통사2-03-01",
    code: "10통사2-03-01",
    title: "자본주의 역사와 시장-정부 관계 ⚖️",
    description: "자본주의의 역사적 전개 과정과 그 특징을 조사하고, 시장과 정부의 관계를 중심으로 다양한 삶의 방식을 비교 평가한다.",
    category: "시장 경제와 금융",
    color: "var(--color-peach)",
    bgGradient: "linear-gradient(135deg, #fff9db 0%, #fff3bf 100%)",
    activities: []
  },
  {
    id: "10통사2-03-02",
    code: "10통사2-03-02",
    title: "합리적 선택과 경제 주체의 역할 💡",
    description: "합리적 선택의 의미와 그 한계를 파악하고, 지속가능발전을 위해 요청되는 정부, 기업가, 노동자, 소비자의 바람직한 역할과 책임에 관해 탐구한다.",
    category: "시장 경제와 금융",
    color: "var(--color-mint)",
    bgGradient: "linear-gradient(135deg, #e6fcf5 0%, #c3fae8 100%)",
    activities: []
  },
  {
    id: "10통사2-03-03",
    code: "10통사2-03-03",
    title: "금융 자산 관리와 금융 생활 설계 📈",
    description: "금융 자산의 특징과 자산 관리의 원칙을 토대로 금융 생활을 설계하고, 경제적, 사회적 환경의 변화가 금융과 관련한 의사 결정에 미치는 영향을 탐구한다.",
    category: "시장 경제와 금융",
    color: "var(--color-coral)",
    bgGradient: "linear-gradient(135deg, #fff0f6 0%, #ffdeeb 100%)",
    activities: []
  },
  {
    id: "10통사2-03-04",
    code: "10통사2-03-04",
    title: "국제 무역과 지속 가능한 발전 🚢",
    description: "자원, 노동, 자본의 지역 분포에 따른 국제 분업과 무역의 필요성을 이해하고, 지속가능발전에 기여하는 국제무역의 방안을 탐색한다.",
    category: "시장 경제와 금융",
    color: "var(--color-sage)",
    bgGradient: "linear-gradient(135deg, #f4fce8 0%, #e2f9b8 100%)",
    activities: []
  }
];
