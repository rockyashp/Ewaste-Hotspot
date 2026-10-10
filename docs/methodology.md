# Methodology & Scientific Formulation: E-Waste Hotspot & Collection Planner

## 1. Research Problem & Motivation
Urban e-waste is the fastest-growing municipal waste stream globally. In Indian metropolitan cities like Mumbai, e-waste management faces three fundamental structural challenges:
1. **Lack of Direct Ward-Level Empirical Measurements:** Municipal corporations (BMC) and state pollution control boards (MPCB) do not maintain weighbridge logs specifically for e-waste because it rarely enters formal solid waste dumping grounds directly; it is dispersed among informal scrap dealers (*kabadiwalas*) or retained in households.
2. **Spatial Misalignment between Generation and Processing:** Authorized formal recyclers are heavily concentrated in designated heavy industrial zones (e.g., Thane, Navi Mumbai, Vasai, Wada, Taloja), leaving dense urban cores with high consumption rates without convenient drop-off options.
3. **Absence of Data-Driven Collection Logistics:** Municipal interventions often rely on ad-hoc awareness drives rather than quantitative, spatially prioritized logistics routing.

This system addresses these challenges through a unified data science, GIS, and decision-support pipeline.

---

## 2. Mathematical Modeling of Ward E-Waste Generation

### Step 1: Population Projection (2011 to 2024)
Census 2011 figures are projected 13 years forward using localized compound annual growth rates ($r$) derived from the BMC Development Plan 2034 and MMRDA regional mobility reports:
$$\text{Pop}_{w, 2024} = \text{Pop}_{w, 2011} \times (1 + r_w)^{13}$$
- **Island City Wards (A to G):** $r = 0.25\%$ (residential consolidation, commercial shift).
- **Western Suburbs Wards (H to R):** $r = 0.95\%$ (high-density residential expansion).
- **Eastern Suburbs Wards (L to T):** $r = 0.85\%$ (redevelopment and industrial transition).

### Step 2: Household Electronic Affluence Factor ($EAF_w$)
Using Census 2011 Table HH-14 (Assets and Amenities), we compute an empirical device ownership intensity factor. Weights reflect typical unit mass and obsolescence velocity:
$$EAF_w = w_1 \left(\frac{\text{PC}_w}{\overline{\text{PC}}}\right) + w_2 \left(\frac{\text{Phone}_w}{\overline{\text{Phone}}}\right) + w_3 \left(\frac{\text{TV}_w}{\overline{\text{TV}}}\right) + w_4 \left(\frac{\text{Affluence}_w}{\overline{\text{Affluence}}}\right)$$
- $w_1 = 0.40$ (Computers/Laptops: high unit mass ~3–10 kg, replacement cycle 3–5 years).
- $w_2 = 0.25$ (Mobile phones: high velocity replacement 1.5–3 years).
- $w_3 = 0.20$ (Televisions/Displays: heavy unit mass ~5–15 kg, replacement cycle 5–8 years).
- $w_4 = 0.15$ (High-asset households owning PC + TV + Phone + Vehicle: multi-device affluence multiplier).

### Step 3: Commercial & Institutional Activity Multiplier ($CAF_w$)
According to Central Pollution Control Board (CPCB) national inventory studies, commercial, corporate IT, and institutional sectors contribute 45% to 55% of total metropolitan e-waste. Using 414 verified electronics retail and repair POIs extracted from OpenStreetMap:
$$CAF_w = 1.0 + 0.30 \times \left(\frac{\text{Commercial POI Density}_w}{\max(\text{Commercial POI Density})}\right)$$

### Step 4: Multi-Scenario Benchmark Calibration
The unnormalized composite generation weight is:
$$W_w = \text{Pop}_{w, 2024} \times EAF_w \times CAF_w$$
The final annual generation ($\text{MT/year}$) is calibrated to target city benchmarks based on parliamentary records (`RS_Session_265_AU_1177_A_to_C.csv`) and CPCB Tier-1 metro generation benchmarks:
$$\text{Generation}_w = \frac{W_w}{\sum_{i=1}^{24} W_i} \times \text{Target City Total}$$
- **Baseline Scenario:** $107,500\text{ MT/year}$ (~$7.84\text{ kg/capita/year}$).
- **Conservative Lower Bound:** $89,500\text{ MT/year}$ (~$6.53\text{ kg/capita/year}$).
- **Accelerated Upper Bound:** $125,500\text{ MT/year}$ (~$9.15\text{ kg/capita/year}$).

---

## 3. Explainable Hotspot Detection & Unsupervised Clustering

### Composite E-Waste Hotspot Index (CEHI)
To ensure transparency and avoid opaque predictions, $CEHI$ combines 4 normalized dimensions (0 to 100):
$$CEHI_w = \text{MinMax}\Big(0.35 \cdot \text{Volume}_w + 0.25 \cdot \text{Density}_w + 0.20 \cdot \text{Affluence}_w + 0.20 \cdot \text{Commercial}_w\Big)$$
- **HIGH Hotspot:** $CEHI \ge 60.0$
- **MEDIUM Hotspot:** $35.0 \le CEHI < 60.0$
- **LOW Hotspot:** $CEHI < 35.0$

### Unsupervised Machine Learning Clustering
To validate natural spatial groupings without forcing arbitrary labels, we applied **K-Means Clustering** across the 5-dimensional standardized space ($\mu=0, \sigma=1$):
- $\ln(\text{Generation Volume})$
- Generation Density ($\text{MT/km}^2$)
- Population Density ($\text{pop/km}^2$)
- Asset Factor ($EAF$)
- Commercial Electronics POI Count

Evaluating Silhouette Scores across $k \in [2, 5]$ revealed an optimal score at **$k = 4$ ($s = 0.253$)**, confirmed via Agglomerative Hierarchical Clustering:
1. **Tier-1 Commercial IT & Mega Generation Hub (Ward S):** Massive commercial tech concentration (Powai corridor).
2. **Affluent Urban Core / High Per-Capita Generators (K/W, H/W, K/E, D, R/S):** High digital device density.
3. **Hyper-Dense Residential Corridors (L, G/N, C, B, E, etc.):** Extreme spatial concentration.
4. **Moderate Residential & Peripheral Growth Zones (P/N, R/C, T, etc.):** Expansive suburban areas.

---

## 4. GIS Spatial Infrastructure & Gap Analysis

### Geodesic Proximity & Buffer Analysis
Using Haversine great-circle calculation:
$$d = 2R \arcsin \left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1\cos\phi_2\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
For each ward, we compute:
- Nearest facility distance $d_{\min}$ (km).
- Accessible facilities within 5 km, 10 km, 20 km.
- Aggregate processing capacity within 15 km ($C_{15\text{km}}$).

### Infrastructure Gap Index ($IGI$)
A high hotspot is not vulnerable if facilities are close; vulnerability occurs when high generation collides with spatial isolation:
$$IAS_w = 0.50 \cdot (1 - \text{Norm}(d_{\min})) + 0.30 \cdot \text{Norm}(N_{10\text{km}}) + 0.20 \cdot \text{Norm}(C_{15\text{km}})$$
$$IGI_w = \text{Norm}(CEHI_w) \times (1.0 - \text{Norm}(IAS_w))$$
- **CRITICAL GAP:** $IGI \ge 50.0$ or ($CEHI = \text{HIGH}$ and $d_{\min} > 8\text{ km}$).
- **MODERATE GAP:** $25.0 \le IGI < 50.0$.
- **WELL SERVED:** $IGI < 25.0$.

---

## 5. Municipal Recommendation Engine & Logistics Sizing

The system applies Multi-Criteria Decision Analysis (MCDA) to assign specific collection strategies and logistics capacity:
- **Permanent Authorized Drop-off Depot:** Triggered by High Hotspot + Critical Gap ($d > 8\text{ km}$).
- **EPR Retailer Take-back Partnerships:** Triggered by High Hotspot + High Commercial POIs ($\ge 40$).
- **Scheduled Mobile Collection Vans:** Triggered by Hyper-dense residential corridors ($>35,000\text{ pop/km}^2$).
- **Monthly Community Drives & Civic Bins:** Triggered by Moderate Suburban Gap.
- **Direct Recycler Channeling:** Triggered by Well-served industrial corridors.

### Fleet Sizing Formulation:
Assuming standard municipal light commercial vehicles (2.5 MT load capacity):
$$\text{Weekly Van Trips Required} = \left\lceil \frac{\text{Weekly Generation (MT)}}{2.5} \right\rceil$$
Citywide logistics requirement: **837 vehicle trips/week** (~2,092.5 MT capacity).
