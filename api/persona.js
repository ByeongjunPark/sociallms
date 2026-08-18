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
      const occ = row.occupation || "자영업";
      if (occ.includes("하역") || occ.includes("단순") || occ.includes("노동")) {
        return `고강도 과중 노동과 위험한 작업 환경으로 인해 헌법상 인간의 존엄성과 안전권, 인간다운 생활을 누릴 권리가 위협받고 있습니다.`;
      }
      if (occ.includes("회계") || occ.includes("사무") || occ.includes("개발")) {
        return `주 60시간 이상의 과도한 연장 근무와 불투명한 임금 체계로 인해 헌법상 건강권과 정당한 노동의 대가를 받을 권리를 침해당하고 있습니다.`;
      }
      if (occ.includes("교사") || occ.includes("강사") || occ.includes("교육")) {
        return `악성 민원과 부당한 간섭으로 인해 교권 및 헌법상 안전하게 일할 권리가 심각하게 침해받고 있습니다.`;
      }
      return `현대 사회의 급격한 환경 변화와 제도적 미비로 인해 헌법상 행복추구권과 평등한 삶의 기회를 침해당하고 있습니다.`;
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
