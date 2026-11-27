# 산불 후 파종 길잡이 · Post-Fire Planting Guide

2026 한양대학교 YK인터칼리지 USS 캡스톤 27조의 프로토타입입니다.
산불이 난 땅에서 재가 흙의 염도(EC)와 pH를 얼마나 바꾸는지 계산하고, 보리 실험 결과를 옮겨 쓰기 쉬운 보리족 작물 7종이 얼마나 자랄지 예측합니다. 흙을 어떻게 바꾸면(석회 또는 황) 얼마나 더 자랄지를 식물이 자라는 애니메이션으로 보여 줍니다.
휴대폰과 PC에 설치할 수 있고, 한 번 열면 인터넷 없이도 작동합니다(PWA).

**앱 주소:** https://acdtgroup23.github.io/wildfire-growth-rate-app/

팀: 안상현, 오정효, 이준우, 윤상철, 이현진, 박지훈, 서한슬

## 앱이 하는 일

1. **땅 상태**
   - 산불 강도 체크: 나무 유무, 나무 위쪽 잎, 탄 높이, 재 색깔을 물어 저강도·중간강도·고강도를 추정합니다.
   - 강도별 재 부하량은 6.0 / 15.9 / 34.2 Mg/ha입니다(Santín et al., 2015).
   - 직접 잰 값을 넣을 수도 있습니다. 20 × 20 cm 틀 안의 재 무게(g) ÷ 4 = 재 부하량(Mg/ha)입니다.
2. **흙 pH (선택)**
   - 불난 뒤 pH, 타지 않은 근처 흙 pH, 모름(국내 산림 흙 기본값 4.6; Lee & Koo, 2020) 가운데 하나를 고릅니다.
   - 흙 느낌(모래·양토·점토)은 석회와 황 양 계산에 씁니다.
3. **결과**
   - 염도: 보통 산불 재(기본), 염이 많은 산불 재, 최악(땔감 재) 세 경우의 흙물 EC를 계산합니다. 염에 따른 생장은 Maas & Hoffman(1977) 식입니다.
   - pH: 우리 모종판 실측 기울기(재 1 Mg/ha당 +0.24)로 pH 범위를 예측합니다. pH에 따른 생장은 Ecocrop 방식(알맞은 범위 100%, 자랄 수 있는 한계 0%, 사이는 직선; Hijmans, 2021)입니다.
   - 예상 생장 = 염과 pH 가운데 더 나쁜 쪽(최소율의 법칙).
   - **흙을 바꾸면 이렇게 자랍니다:** "그대로 두면" 화분과 "석회/황을 넣으면" 화분이 나란히 자라는 애니메이션으로 예상 생장률과 차이(+%p)를 보여 주고, 할 일(1 m²당 석회 또는 황 g)을 알려 줍니다. 작물과 재 종류를 눌러 바꿀 수 있습니다.
   - 석회 양: Ippolito & Bauder(2021) 표(흙 종류·색깔별, pH 6.5까지). 황 양: Oklahoma State University Extension 표.
   - 작물 카드: 추천 / 조절하면 추천 / 조건부 / 비추천과 지금·pH 맞춘 뒤의 생장률, 할 일과 근거.

작물 7종은 보리, 밀, 듀럼밀, 호밀, 키 큰 위트그라스, 페어웨이 크레스티드 위트그라스, 스탠더드 크레스티드 위트그라스입니다.

## 쓰는 방법

- **휴대폰:** 주소를 열고 Android Chrome은 "앱 설치" 버튼을, iPhone Safari는 공유 → "홈 화면에 추가"를 누릅니다.
- **PC:** Chrome이나 Edge 주소창 오른쪽의 설치 아이콘이나 "앱 설치" 버튼을 누릅니다.
- 오른쪽 위 버튼으로 한국어와 영어를 바꿉니다.

## GitHub Pages 공개 설정 (한 번만)

1. 저장소의 **Settings → Pages**로 갑니다.
2. Source를 **Deploy from a branch**로 두고 Branch를 **main**, 폴더를 **/(root)** 로 고른 뒤 Save를 누릅니다.
3. 1~2분 뒤 위 앱 주소가 열립니다.

## 파일 구성

| 파일 | 내용 |
|---|---|
| `index.html` | 화면 구조 |
| `assets/data.js` | **모든 입력 숫자와 출처** (강도별 재 부하량, 재 EC, 작물 염 내성과 pH 범위, 석회·황 양 표, 참고문헌) |
| `assets/model.js` | 계산식 (강도 추정, EC, 염·pH에 따른 생장, pH 예측, 석회·황 양, 바꾼 뒤 생장, 작물 순위) |
| `assets/i18n.js` | 한국어·영어 문구 |
| `assets/app.js` | 화면 동작, 전후 비교 애니메이션, 설치 버튼, 오프라인 등록 |
| `assets/style.css` | 디자인 |
| `manifest.webmanifest`, `sw.js`, `icons/` | 설치형 앱 설정, 오프라인 캐시, 아이콘 |
| `tests/model.test.js` | 계산식 검사 (`node tests/model.test.js`) |

## 숫자를 고치는 방법

1. `assets/data.js`에서 값을 바꾸고, 같은 줄 주석과 `SOURCES` 표의 출처도 함께 고칩니다.
2. `node tests/model.test.js`로 검사합니다. 바꾼 값 때문에 기대값이 달라졌다면 테스트도 고칩니다.
3. `sw.js` 맨 위의 `VERSION`을 올립니다(예: `'pfg-v3'` → `'pfg-v4'`). 올리지 않으면 이미 설치한 사람에게 옛 화면이 계속 보입니다.

## 한계

- 염도(EC)는 측정하지 않고 문헌값으로 계산한 값입니다.
- pH 기울기는 재 0–8.5 Mg/ha 범위의 모종판 흙에서 잰 값입니다. 그보다 많은 재에서는 실제 pH가 더 오를 수 있습니다.
- 보리 외 작물은 우리 보리 결과를 문헌 내성값에 옮겨 쓴 것으로, 직접 키워 보지 않았습니다.
- pH에 따른 생장은 Ecocrop 적합도이고 실제로 잰 수확량이 아닙니다. 염과 pH가 서로 주는 영향은 넣지 않았습니다.
- 석회 양 표는 미국 흙에서 만든 대략값입니다. 넣기 전에 토양검정으로 정확한 양을 정하세요.
- 바꾼 뒤의 생장은 pH가 알맞은 범위로 맞춰졌다고 가정한 값입니다. 석회와 황이 효과를 내는 데는 시간이 걸립니다.
- 씨앗 깊이는 다루지 않습니다.
- 실제 농사 결정 전에는 토양검정과 전문가 상담을 함께 하세요.

앱 안의 "한계"와 "출처" 항목에 전체 목록과 APA 7판 참고문헌이 있습니다.

---

**English summary.** A prototype from USS Capstone Group 27 (Hanyang University YK Intercollege, 2026). It estimates wildfire severity from four questions or a measured ash weight, then predicts soil salinity (EC) and pH, ranks seven barley-tribe crops, and animates how much better each would grow after liming or adding sulfur, with the amount per m². It installs on phones and PCs and works offline. All inputs and their sources are in `assets/data.js`. To publish, enable Settings → Pages → main / (root).
