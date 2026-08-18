export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const studentCareer = req.query.career || (req.body && req.body.career) || "";
    const excludeId = req.query.excludeId || (req.body && req.body.excludeId) || "";

    // HuggingFace nvidia/Nemotron-Personas-Korea (100만 개 표본 중 무작위 오프셋 추출)
    const randomOffset = Math.floor(Math.random() * 950000);
    const hfUrl = `https://datasets-server.huggingface.co/rows?dataset=nvidia/Nemotron-Personas-Korea&config=default&split=train&offset=${randomOffset}&length=12`;

    const hfRes = await fetch(hfUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });

    if (!hfRes.ok) {
      throw new Error(`HuggingFace API Status: ${hfRes.status}`);
    }

    const hfData = await hfRes.json();
    const rows = (hfData.rows || []).map(r => r.row);

    if (!rows || rows.length === 0) {
      throw new Error("No rows returned from HuggingFace dataset server");
    }

    // 학생 희망 진로 매칭 또는 무작위 선정
    let matchedRow = null;
    if (studentCareer) {
      const cleanCareer = String(studentCareer).toLowerCase().trim();
      const scored = rows.map(r => {
        let score = 0;
        const text = `${r.occupation || ''} ${r.bachelors_field || ''} ${r.persona || ''} ${r.cultural_background || ''}`.toLowerCase();
        
        const keywords = ["교육", "사범", "교사", "선생님", "IT", "개발", "소프트웨어", "의료", "간호", "의사", "건축", "환경", "경영", "자영업", "예술", "미디어", "노동", "청년", "행정", "물류", "자연", "과학"];
        keywords.forEach(kw => {
          if (cleanCareer.includes(kw) && text.includes(kw)) {
            score += 10;
          }
        });

        if (cleanCareer.length >= 2 && text.includes(cleanCareer)) {
          score += 20;
        }

        return { row: r, score };
      });

      scored.sort((a, b) => b.score - a.score);
      matchedRow = scored[0].row;
    } else {
      const randIdx = Math.floor(Math.random() * rows.length);
      matchedRow = rows[randIdx];
    }

    // 이름 추출 파서 (예: "전기태 씨는..." -> "전기태")
    let parsedName = "가상 시민";
    if (matchedRow.persona) {
      const nameMatch = matchedRow.persona.match(/([가-힣]{2,4})\s*씨는/);
      if (nameMatch && nameMatch[1]) {
        parsedName = nameMatch[1];
      }
    }

    const getEmoji = (occ, sex) => {
      const o = String(occ || "");
      if (o.includes("교사") || o.includes("교수") || o.includes("학") || o.includes("연구")) return sex === "여자" ? "👩‍🏫" : "🧑‍🏫";
      if (o.includes("개발") || o.includes("회계") || o.includes("사무") || o.includes("수학")) return sex === "여자" ? "👩‍💻" : "👨‍💻";
      if (o.includes("의사") || o.includes("간호") || o.includes("약사") || o.includes("보건")) return sex === "여자" ? "👩‍⚕️" : "👨‍⚕️";
      if (o.includes("하역") || o.includes("농") || o.includes("건설") || o.includes("종사원")) return sex === "여자" ? "👩‍🌾" : "👷";
      if (o.includes("예술") || o.includes("작가") || o.includes("디자인") || o.includes("문화")) return sex === "여자" ? "👩‍🎨" : "🎨";
      return sex === "여자" ? "👩" : "👨";
    };

    const getGrievance = (row) => {
      const occ = String(row.occupation || "자영업");
      const age = row.age || 35;

      if (occ.includes("하역") || occ.includes("단순") || occ.includes("노동") || occ.includes("건설")) {
        return `매일 밤샘 물류 작업을 하느라 휴식 시간도 부족하고, 낡은 안전 장비 때문에 다칠까 봐 늘 두려워요. 제대로 쉬지도 못하고 일만 하다 건강을 망칠까 봐 걱정입니다.`;
      }
      if (occ.includes("회계") || occ.includes("사무") || occ.includes("개발") || occ.includes("IT")) {
        return `매주 60시간 넘게 야근을 강요당하고 포괄임금제라는 이유로 야간 수당도 제대로 받지 못하고 있어요. 이러다 정말 몸도 마음도 무너질 것 같은데 막막하네요.`;
      }
      if (occ.includes("교사") || occ.includes("강사") || occ.includes("교육")) {
        return `수업 중 일어난 일에 대해 밤낮없는 학부모의 폭언과 무분별한 악성 민원에 시달려 정상적인 수업 진행이 너무 힘듭니다. 안전하고 정당하게 일할 환경이 간절합니다.`;
      }
      if (occ.includes("의사") || occ.includes("간호") || occ.includes("약사") || occ.includes("보건")) {
        return `3교대 연속 근무로 밥 먹을 시간조차 없이 일하는데, 인력이 늘 부족해 환자 안전까지 우려돼요. 정당한 휴식과 안전한 근무 환경이 보장되면 좋겠습니다.`;
      }
      if (occ.includes("자영업") || occ.includes("상인") || occ.includes("매장")) {
        return `인근 대형 상업 시설과 공사 현장의 극심한 소음과 미세먼지 피해로 손님이 끊겼는데, 사전 설명이나 보상 대책조차 없이 방치되어 너무 억울합니다.`;
      }
      if (occ.includes("작가") || occ.includes("디자인") || occ.includes("예술") || occ.includes("크리에이터")) {
        return `제작사의 불공정 계약 요구로 제 작품 저작권을 뺏길 위기에 처했고, 불법 공유 사이트 무단 도용으로 정당한 수입을 받지 못해 생활고를 겪고 있어요.`;
      }
      if (age <= 26 || occ.includes("학생") || occ.includes("알바")) {
        return `주 20시간 넘게 일했는데 아르바이트생이라는 이유로 주휴수당도 안 주고, 항의하자 사장님이 당장 나가라며 전화 한 통으로 부당하게 해고하셨어요.`;
      }
      return `주민들의 의견 수렴이나 사전 고지 없이 지역의 공공 버스 노선과 편의 시설이 전면 폐지되어 매일 출퇴근길에 큰 불편과 막막함을 겪고 있습니다.`;
    };

    const formattedPersona = {
      id: matchedRow.uuid || `nemotron_${randomOffset}`,
      name: parsedName,
      age: matchedRow.age || 35,
      job: matchedRow.occupation || "일반 시민",
      location: `${matchedRow.province || '대한민국'} ${matchedRow.district || ''}`.trim(),
      careerCategory: matchedRow.bachelors_field !== "해당없음" ? matchedRow.bachelors_field : (matchedRow.occupation || "일반"),
      emoji: getEmoji(matchedRow.occupation, matchedRow.sex),
      values: matchedRow.career_goals_and_ambitions || matchedRow.cultural_background || "존엄한 삶과 정의로운 사회 지향",
      grievance: getGrievance(matchedRow),
      datasetSource: `HuggingFace nvidia/Nemotron-Personas-Korea (Row #${randomOffset})`,
      hfUuid: matchedRow.uuid
    };

    return res.status(200).json({
      success: true,
      persona: formattedPersona,
      datasetInfo: {
        repo: "nvidia/Nemotron-Personas-Korea",
        license: "CC-BY-4.0 / NVIDIA",
        totalRows: 1000000,
        sampledOffset: randomOffset
      }
    });

  } catch (error) {
    console.error("HF Persona Fetch Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
