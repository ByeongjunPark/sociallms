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

    // 🤖 Upstage Solar Pro AI 기반 개별 맞춤형 일상 고충 동적 생성 엔진
    async function generateDynamicGrievanceWithSolar(row, name) {
      const apiKey = process.env.UPSTAGE_API_KEY || "up_UIiScmFaZD3CfDoVFtJiTIjP9ATXp";
      const occ = row.occupation || "자영업";
      const age = row.age || 35;
      const sex = row.sex || "시민";
      const loc = `${row.province || ''} ${row.district || ''}`.trim() || "대한민국";
      const bg = row.bachelors_field !== "해당없음" ? row.bachelors_field : "";
      const goals = row.career_goals_and_ambitions || row.cultural_background || "";
      const personaDesc = row.persona || "";

      const prompt = `[대한민국 실제 시민 페르소나 프로필 데이터]
- 이름: ${name}
- 나이/성별: ${age}세 ${sex}
- 직업: ${occ}
- 거주지: ${loc}
- 전공/배경: ${bg}
- 성향 및 가치관: ${goals}
- 상세 신상 특징: ${personaDesc.substring(0, 250)}

[요청 사항 - 개별 시민 맞춤형 일상 고충 사건 생성]
위 시민의 나이, 직업, 거주지, 가치관, 생활 배경을 종합적으로 깊이 분석하여, 이 사람만이 일상에서 겪을 법한 구체적인 억울함과 고민 사건 1개를 1~2문장(최대 110자 이내)으로 생성하세요.

[엄격한 3대 조건]:
1. [스포일러 금지]: 절대로 '헌법상 기본권 침해', '자유권', '사회권', '헌법 제몇조'와 같은 교과서적/학술적 개념어를 먼저 포함하지 마세요!
2. 마구 획일화된 템플릿 문장을 절대 쓰지 말고, 이 직업과 나이대의 실제 삶에서 발생하는 개별적이고 현실적인 사건(임금, 소음, 계약, 안전, 악성민원, 개인정보, 환경, 차별 등)을 다채롭게 생생한 구어체로 만드세요.
3. 오직 생성된 1~2문장의 고충 텍스트만 다이렉트로 출력하세요. (서론, 부연설명, 따옴표 없이 오직 텍스트만 리턴)`;

      try {
        const response = await fetch("https://api.upstage.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey.trim()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "solar-pro",
            messages: [
              { role: "system", content: "당신은 고등학교 사회 탐구 수업용 생생한 시민 고충 시나리오를 1:1 개별 맞춤 생성하는 노련한 에듀테크 AI 시나리오 작가입니다." },
              { role: "user", content: prompt }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content.trim() : "";
          if (content && content.length >= 10) {
            return content.replace(/^["']|["']$/g, "").trim();
          }
        }
      } catch (err) {
        console.warn("Solar API dynamic grievance generation error:", err);
      }

      // Fallback if AI call fails
      return `${occ} 일을 하며 일상생활 중 예기치 못한 불공정한 일 처리와 사각지대로 인해 밤마다 잠을 이루지 못하고 큰 어려움을 겪고 있습니다.`;
    }

    const dynamicGrievance = await generateDynamicGrievanceWithSolar(matchedRow, parsedName);

    const formattedPersona = {
      id: matchedRow.uuid || `nemotron_${randomOffset}`,
      name: parsedName,
      age: matchedRow.age || 35,
      job: matchedRow.occupation || "일반 시민",
      location: `${matchedRow.province || '대한민국'} ${matchedRow.district || ''}`.trim(),
      careerCategory: matchedRow.bachelors_field !== "해당없음" ? matchedRow.bachelors_field : (matchedRow.occupation || "일반"),
      emoji: getEmoji(matchedRow.occupation, matchedRow.sex),
      values: matchedRow.career_goals_and_ambitions || matchedRow.cultural_background || "존엄한 삶과 정의로운 사회 지향",
      grievance: dynamicGrievance,
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
