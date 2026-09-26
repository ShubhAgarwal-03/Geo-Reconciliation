import { BuildingEntity, ReconciliationStats, UploadedFile } from '../types';

// Anchor point: Indiranagar / Halasuru zone, Bengaluru (NAKSHA Urban Pilot Sector 4)
const CENTER_LAT = 12.9784;
const CENTER_LNG = 77.6408;

// Helper to create polygon coordinates with jitter/variation
function generateFootprint(
  baseLat: number,
  baseLng: number,
  widthMeters: number,
  heightMeters: number,
  offsetLatMeters: number = 0,
  offsetLngMeters: number = 0,
  scale: number = 1.0,
  rotationDeg: number = 0
): [number, number][] {
  // Conversion factors (approximate for 13° N latitude)
  const degPerMeterLat = 1 / 110574;
  const degPerMeterLng = 1 / (111320 * Math.cos((baseLat * Math.PI) / 180));

  const centerLat = baseLat + offsetLatMeters * degPerMeterLat;
  const centerLng = baseLng + offsetLngMeters * degPerMeterLng;

  const w = (widthMeters * scale * degPerMeterLng) / 2;
  const h = (heightMeters * scale * degPerMeterLat) / 2;

  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const localCorners = [
    [-w, -h],
    [w, -h],
    [w, h],
    [-w, h],
  ];

  return localCorners.map(([dx, dy]) => {
    const rotX = dx * cos - dy * sin;
    const rotY = dx * sin + dy * cos;
    return [centerLat + rotY, centerLng + rotX] as [number, number];
  });
}

// Curated Showcase Building #BLD-1028 (Explicitly required by user prompt)
export const showcaseBuilding1028: BuildingEntity = {
  id: "BLD-1028",
  surveyNumber: "123/4A",
  wardNo: "Ward 112 - Domlur",
  zone: "East Zone, Bengaluru Urban",
  status: "reconciled",
  confidence: 94,
  area: 505,
  landUse: "Residential",
  height: 8.4,
  floors: 3,
  sourcesCount: 4,
  agreementScore: 96,
  lastUpdated: "03 Sep 2026",
  centroid: [CENTER_LAT + 0.0004, CENTER_LNG + 0.0003],
  coordinates: generateFootprint(CENTER_LAT + 0.0004, CENTER_LNG + 0.0003, 22.4, 22.5),
  beforeCoordinates: generateFootprint(CENTER_LAT + 0.0004, CENTER_LNG + 0.0003, 22.1, 23.2, 1.2, -0.8, 1.05, 3),
  sources: {
    ori: {
      sourceName: "Drone Orthorectified Imagery (ORI)",
      sourceType: "ori",
      area: 498,
      coordinates: generateFootprint(CENTER_LAT + 0.0004, CENTER_LNG + 0.0003, 22.2, 22.4, -0.4, 0.3, 0.98, 0.5),
      confidence: 96,
      captureDate: "12 Aug 2026",
      resolutionOrScale: "5 cm GSD",
      color: "#f59e0b", // Amber
    },
    municipal: {
      sourceName: "Municipal GIS Tax Cadastre",
      sourceType: "municipal",
      area: 512,
      coordinates: generateFootprint(CENTER_LAT + 0.0004, CENTER_LNG + 0.0003, 22.8, 22.5, 0.6, -0.5, 1.02, -1.0),
      confidence: 91,
      captureDate: "15 Jan 2025",
      resolutionOrScale: "1:1000",
      color: "#3b82f6", // Blue
    },
    cadastral: {
      sourceName: "Revenue Cadastral Map (Khasra)",
      sourceType: "cadastral",
      area: 505,
      coordinates: generateFootprint(CENTER_LAT + 0.0004, CENTER_LNG + 0.0003, 22.4, 22.5, 0.0, 0.0, 1.0, 0),
      confidence: 95,
      captureDate: "Rev. 2024",
      resolutionOrScale: "1:500 (ETS)",
      color: "#8b5cf6", // Purple
    },
    ai: {
      sourceName: "AI Feature Extraction (SAM-2 + DTM)",
      sourceType: "ai",
      area: 501,
      coordinates: generateFootprint(CENTER_LAT + 0.0004, CENTER_LNG + 0.0003, 22.3, 22.5, 0.2, 0.1, 0.99, 0.2),
      confidence: 93,
      captureDate: "02 Sep 2026",
      resolutionOrScale: "Sub-pixel",
      color: "#14b8a6", // Teal
    },
  },
  verificationChecks: {
    geometryAgreement: true,
    sourceAgreement: true,
    attributeAgreement: true,
    spatialProximity: true,
  },
  history: [
    { date: "03 Sep 2026 09:30", action: "Reconciled unified parcel generated", actor: "NAKSHA AI Engine v3.4", note: "Confidence 94% accepted auto-threshold" },
    { date: "02 Sep 2026 14:15", action: "SAM-2 Drone feature extracted", actor: "System Pipeline", note: "Area 501 m² extracted from 5cm GSD" },
    { date: "15 Aug 2026 11:00", action: "Municipal GIS layer synchronized", actor: "BBMP Ward 112 Portal", note: "PID: 112-W0045-88" },
  ],
};

// Showcase Building #BLD-1044 (Medium Conflict from user prompt)
export const showcaseBuilding1044: BuildingEntity = {
  id: "BLD-1044",
  surveyNumber: "148/2B",
  wardNo: "Ward 112 - Domlur",
  zone: "East Zone, Bengaluru Urban",
  status: "review",
  confidence: 78,
  area: 523,
  landUse: "Commercial",
  height: 14.2,
  floors: 4,
  sourcesCount: 3,
  agreementScore: 78,
  lastUpdated: "03 Sep 2026",
  centroid: [CENTER_LAT + 0.0012, CENTER_LNG - 0.0015],
  coordinates: generateFootprint(CENTER_LAT + 0.0012, CENTER_LNG - 0.0015, 23.2, 22.6),
  beforeCoordinates: generateFootprint(CENTER_LAT + 0.0012, CENTER_LNG - 0.0015, 25.0, 21.9, 2.5, -1.8, 1.08, 4.5),
  sources: {
    ori: {
      sourceName: "Drone Orthorectified Imagery (ORI)",
      sourceType: "ori",
      area: 520,
      coordinates: generateFootprint(CENTER_LAT + 0.0012, CENTER_LNG - 0.0015, 23.1, 22.5, 0.4, 0.2, 0.99, 1),
      confidence: 86,
      captureDate: "12 Aug 2026",
      resolutionOrScale: "5 cm GSD",
      color: "#f59e0b",
    },
    municipal: {
      sourceName: "Municipal GIS Tax Cadastre",
      sourceType: "municipal",
      area: 548,
      coordinates: generateFootprint(CENTER_LAT + 0.0012, CENTER_LNG - 0.0015, 24.5, 22.4, 2.1, -1.4, 1.05, 3),
      confidence: 74,
      captureDate: "15 Jan 2025",
      resolutionOrScale: "1:1000",
      color: "#3b82f6",
    },
    cadastral: {
      sourceName: "Revenue Cadastral Map (Khasra)",
      sourceType: "cadastral",
      area: 510,
      coordinates: generateFootprint(CENTER_LAT + 0.0012, CENTER_LNG - 0.0015, 22.8, 22.4, -1.5, 0.8, 0.97, -2),
      confidence: 79,
      captureDate: "Rev. 2024",
      resolutionOrScale: "1:500",
      color: "#8b5cf6",
    },
    ai: {
      sourceName: "AI Feature Extraction",
      sourceType: "ai",
      area: 523,
      coordinates: generateFootprint(CENTER_LAT + 0.0012, CENTER_LNG - 0.0015, 23.2, 22.6, 0.0, 0.0, 1.0, 0),
      confidence: 82,
      captureDate: "02 Sep 2026",
      resolutionOrScale: "Sub-pixel",
      color: "#14b8a6",
    },
  },
  verificationChecks: {
    geometryAgreement: false,
    sourceAgreement: true,
    attributeAgreement: true,
    spatialProximity: true,
  },
  conflictDetails: {
    severity: "medium",
    title: "Geometry mismatch detected",
    simplifiedReason: "Building boundaries differ between cadastral and municipal sources.",
    technicalReason: "IoU between Municipal GIS (548 m²) and Revenue Cadastral (510 m²) is 0.74 (< 0.85 threshold). South-west corner eave overhang suspected in municipal digitization.",
    iouScore: 0.74,
    centroidOffsetMeters: 2.3,
    recommendedArea: 523,
    recommendedSource: "AI Extraction harmonized with ORI Drone GSD",
    sourcesDiff: [
      { source: "Revenue Cadastral", area: 510, difference: -13, note: "Excludes ground floor overhang" },
      { source: "Municipal GIS", area: 548, difference: +25, note: "Includes cantilever balcony" },
      { source: "AI Harmonized", area: 523, difference: 0, note: "Filtered roof-eave edge using DTM" },
    ],
  },
  history: [
    { date: "03 Sep 2026 08:15", action: "Flagged for operator review", actor: "NAKSHA Rule Engine", note: "38 m² variance detected between municipal and revenue records" },
    { date: "15 Jan 2025", action: "Commercial permit boundary submitted", actor: "Zonal Engineer", note: "G+3 commercial complex" },
  ],
};

// Showcase Building #BLD-1015 (High Conflict from user prompt)
export const showcaseBuilding1015: BuildingEntity = {
  id: "BLD-1015",
  surveyNumber: "119/1A",
  wardNo: "Ward 112 - Domlur",
  zone: "East Zone, Bengaluru Urban",
  status: "conflict",
  confidence: 61,
  area: 630,
  landUse: "Commercial",
  height: 11.5,
  floors: 3,
  sourcesCount: 4,
  agreementScore: 58,
  lastUpdated: "03 Sep 2026",
  centroid: [CENTER_LAT - 0.0014, CENTER_LNG + 0.0018],
  coordinates: generateFootprint(CENTER_LAT - 0.0014, CENTER_LNG + 0.0018, 28.0, 22.5),
  beforeCoordinates: generateFootprint(CENTER_LAT - 0.0014, CENTER_LNG + 0.0018, 32.0, 24.5, 4.2, -3.1, 1.18, 8.5),
  sources: {
    ori: {
      sourceName: "Drone Orthorectified Imagery (ORI)",
      sourceType: "ori",
      area: 638,
      coordinates: generateFootprint(CENTER_LAT - 0.0014, CENTER_LNG + 0.0018, 28.2, 22.6, 0.4, 0.3, 1.01, 1),
      confidence: 68,
      captureDate: "12 Aug 2026",
      resolutionOrScale: "5 cm GSD",
      color: "#f59e0b",
    },
    municipal: {
      sourceName: "Municipal GIS Tax Cadastre",
      sourceType: "municipal",
      area: 685,
      coordinates: generateFootprint(CENTER_LAT - 0.0014, CENTER_LNG + 0.0018, 30.5, 22.5, 3.8, -2.5, 1.12, 5),
      confidence: 54,
      captureDate: "15 Jan 2025",
      resolutionOrScale: "1:1000",
      color: "#3b82f6",
    },
    cadastral: {
      sourceName: "Revenue Cadastral Map (Khasra)",
      sourceType: "cadastral",
      area: 560,
      coordinates: generateFootprint(CENTER_LAT - 0.0014, CENTER_LNG + 0.0018, 25.0, 22.4, -2.2, 1.8, 0.90, -4),
      confidence: 62,
      captureDate: "Rev. 2024",
      resolutionOrScale: "1:500",
      color: "#8b5cf6",
    },
    ai: {
      sourceName: "AI Feature Extraction",
      sourceType: "ai",
      area: 630,
      coordinates: generateFootprint(CENTER_LAT - 0.0014, CENTER_LNG + 0.0018, 28.0, 22.5, 0.0, 0.0, 1.0, 0),
      confidence: 64,
      captureDate: "02 Sep 2026",
      resolutionOrScale: "Sub-pixel",
      color: "#14b8a6",
    },
  },
  verificationChecks: {
    geometryAgreement: false,
    sourceAgreement: false,
    attributeAgreement: true,
    spatialProximity: true,
  },
  conflictDetails: {
    severity: "high",
    title: "Significant source discrepancy & boundary overhang",
    simplifiedReason: "Sources differ significantly. Drone boundary extends 3.8m into Municipal road setback buffer.",
    technicalReason: "Hausdorff distance is 4.6m between Cadastral Parcel 119/1A and Municipal GIS 685m² footprint. Potential ROW (Right of Way) road widening buffer encroachment.",
    iouScore: 0.58,
    centroidOffsetMeters: 4.1,
    recommendedArea: 630,
    recommendedSource: "AI Segmentation with Cadastral Alignment Constraint",
    sourcesDiff: [
      { source: "Revenue Cadastral", area: 560, difference: -70, note: "Historical title record" },
      { source: "Municipal GIS", area: 685, difference: +55, note: "Includes unregularized road front shed" },
      { source: "Drone ORI (Actual)", area: 638, difference: +8, note: "Physical boundary on ground" },
    ],
  },
  history: [
    { date: "03 Sep 2026 07:45", action: "High conflict escalation", actor: "NAKSHA Spatial Analyzer", note: "Road margin encroachment flagged" },
    { date: "20 May 2026", action: "Surveyor notice issued", actor: "Town Planning Cell", note: "Frontage inspection pending" },
  ],
};

// Generate realistic dataset of 75 buildings around Indiranagar grid
export function generateGridBuildings(): BuildingEntity[] {
  const buildings: BuildingEntity[] = [showcaseBuilding1028, showcaseBuilding1044, showcaseBuilding1015];
  
  const landUses: ('Residential' | 'Commercial' | 'Institutional' | 'Mixed Use')[] = [
    'Residential', 'Residential', 'Residential', 'Commercial', 'Mixed Use', 'Institutional'
  ];

  let idCounter = 1001;
  const rows = 9;
  const cols = 9;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (idCounter === 1028 || idCounter === 1044 || idCounter === 1015) {
        idCounter++;
        continue;
      }

      // Generate staggered street layout
      const latOffset = (r - 4) * 0.00062 + (c % 2 === 0 ? 0.00008 : -0.00006);
      const lngOffset = (c - 4) * 0.00078 + (r % 2 === 0 ? 0.00005 : -0.00008);

      const lat = CENTER_LAT + latOffset;
      const lng = CENTER_LNG + lngOffset;

      const buildingId = `BLD-${idCounter}`;
      const surveyNo = `${100 + r}/${c + 1}${['A', 'B', 'C'][c % 3]}`;
      const landUse = landUses[(r * 3 + c) % landUses.length];
      
      const width = 16 + ((r * 7 + c * 11) % 14);
      const length = 18 + ((r * 13 + c * 5) % 16);
      const baseArea = Math.round(width * length);
      const height = Math.round((6 + ((r + c) % 5) * 3.2) * 10) / 10;
      const floors = Math.max(1, Math.round(height / 3));

      // Decide status: 80% reconciled, 12% review, 8% conflict
      const hash = (r * 17 + c * 31) % 100;
      let status: 'reconciled' | 'review' | 'conflict' = 'reconciled';
      let confidence = 90 + (hash % 9);
      let agreement = 92 + (hash % 7);

      if (hash < 12) {
        status = 'conflict';
        confidence = 58 + (hash % 11);
        agreement = 55 + (hash % 12);
      } else if (hash < 24) {
        status = 'review';
        confidence = 74 + (hash % 15);
        agreement = 76 + (hash % 12);
      }

      const diffMultiplier = status === 'conflict' ? 0.14 : (status === 'review' ? 0.06 : 0.02);
      const oriArea = Math.round(baseArea * (1 + (Math.sin(r) * diffMultiplier)));
      const municipalArea = Math.round(baseArea * (1 - (Math.cos(c) * diffMultiplier * 1.1)));
      const cadastralArea = Math.round(baseArea * (1 + (Math.sin(r + c) * diffMultiplier * 0.9)));
      const aiArea = Math.round(baseArea * (1 + (Math.cos(r * c) * diffMultiplier * 0.5)));

      const coords = generateFootprint(lat, lng, width, length);
      const beforeCoords = generateFootprint(
        lat, lng, width * (1 + diffMultiplier), length * (1 - diffMultiplier),
        diffMultiplier * 8, -diffMultiplier * 6, 1.0 + diffMultiplier, diffMultiplier * 20
      );

      const building: BuildingEntity = {
        id: buildingId,
        surveyNumber: surveyNo,
        wardNo: `Ward ${110 + (r % 4)}`,
        zone: "East Zone, Bengaluru Urban",
        status,
        confidence,
        area: baseArea,
        landUse,
        height,
        floors,
        sourcesCount: 4,
        agreementScore: agreement,
        lastUpdated: "03 Sep 2026",
        centroid: [lat, lng],
        coordinates: coords,
        beforeCoordinates: beforeCoords,
        sources: {
          ori: {
            sourceName: "Drone Orthorectified Imagery",
            sourceType: "ori",
            area: oriArea,
            coordinates: generateFootprint(lat, lng, width * 0.99, length * 1.01, 0.2, -0.2),
            confidence: Math.min(98, confidence + 2),
            captureDate: "12 Aug 2026",
            resolutionOrScale: "5 cm GSD",
            color: "#f59e0b",
          },
          municipal: {
            sourceName: "Municipal GIS Cadastre",
            sourceType: "municipal",
            area: municipalArea,
            coordinates: generateFootprint(lat, lng, width * 1.02, length * 0.98, -0.3, 0.3),
            confidence: Math.max(60, confidence - 4),
            captureDate: "15 Jan 2025",
            resolutionOrScale: "1:1000",
            color: "#3b82f6",
          },
          cadastral: {
            sourceName: "Revenue Cadastral Map",
            sourceType: "cadastral",
            area: cadastralArea,
            coordinates: generateFootprint(lat, lng, width, length, 0, 0),
            confidence: Math.max(65, confidence - 2),
            captureDate: "Rev. 2024",
            resolutionOrScale: "1:500",
            color: "#8b5cf6",
          },
          ai: {
            sourceName: "AI Feature Extraction",
            sourceType: "ai",
            area: aiArea,
            coordinates: generateFootprint(lat, lng, width * 1.0, length * 1.0, 0.1, 0.1),
            confidence: Math.min(96, confidence + 1),
            captureDate: "02 Sep 2026",
            resolutionOrScale: "Sub-pixel",
            color: "#14b8a6",
          },
        },
        verificationChecks: {
          geometryAgreement: status === 'reconciled',
          sourceAgreement: status !== 'conflict',
          attributeAgreement: true,
          spatialProximity: true,
        },
        conflictDetails: status !== 'reconciled' ? {
          severity: status === 'conflict' ? 'high' : 'medium',
          title: status === 'conflict' ? 'Significant source boundary variance' : 'Minor boundary difference',
          simplifiedReason: status === 'conflict'
            ? 'Sources differ significantly between Cadastral map and Drone imagery.'
            : 'Boundary difference between municipal assessment and drone rooftop footprint.',
          technicalReason: `Centroid displacement ${(diffMultiplier * 18).toFixed(1)}m. IoU between municipal and drone footprint is ${(agreement / 100).toFixed(2)}.`,
          iouScore: agreement / 100,
          centroidOffsetMeters: parseFloat((diffMultiplier * 18).toFixed(1)),
          recommendedArea: baseArea,
          recommendedSource: "AI Extraction harmonized with ORI",
          sourcesDiff: [
            { source: "Cadastral", area: cadastralArea, difference: cadastralArea - baseArea, note: "Survey ETS" },
            { source: "Municipal", area: municipalArea, difference: municipalArea - baseArea, note: "Tax assessment" },
            { source: "Drone ORI", area: oriArea, difference: oriArea - baseArea, note: "Physical 5cm GSD" },
          ],
        } : undefined,
        history: [
          { date: "03 Sep 2026 09:12", action: status === 'reconciled' ? "Reconciled unified parcel created" : "Requires surveyor review", actor: "NAKSHA Engine", note: `Confidence ${confidence}%` },
          { date: "12 Aug 2026 14:00", action: "Drone imagery integrated", actor: "Survey of India Team", note: "Flight Block IND-04" },
        ],
      };

      buildings.push(building);
      idCounter++;
    }
  }

  return buildings;
}

export const mockBuildings: BuildingEntity[] = generateGridBuildings();

export const defaultStats: ReconciliationStats = {
  totalBuildings: 1248,
  matched: 1103,
  averageConfidence: 94,
  requiresReview: 37,
  conflictsDetected: 42,
  autoResolved: 31,
  beforeConflicts: 42,
  afterConflicts: 11,
  beforeAvgConfidence: 82,
  afterAvgConfidence: 94,
};
export const initialStats = defaultStats;

export const mockUploadedFiles: UploadedFile[] = [
  {
    id: "UPL-001",
    name: "ORI_Indiranagar_Zone4_5cm.tif",
    dataType: "Drone / ORI",
    size: "482.6 MB",
    uploadDate: "03 Sep 2026, 08:30 AM",
    status: "processed",
    crsDetected: "EPSG:32643 (UTM 43N) → Harmonized to EPSG:4326",
    featuresCount: 1248,
    errorCount: 0,
  },
  {
    id: "UPL-002",
    name: "BBMP_Ward112_Cadastral_Revenue.shp",
    dataType: "Cadastral",
    size: "28.4 MB",
    uploadDate: "03 Sep 2026, 08:45 AM",
    status: "processed",
    crsDetected: "EPSG:7760 (KSRSAC Grid) → Aligned",
    featuresCount: 1205,
    errorCount: 4,
  },
  {
    id: "UPL-003",
    name: "Municipal_PropertyTax_GIS_Layers.geojson",
    dataType: "Municipal GIS",
    size: "14.2 MB",
    uploadDate: "02 Sep 2026, 04:10 PM",
    status: "processed",
    crsDetected: "EPSG:4326 (WGS84)",
    featuresCount: 1180,
    errorCount: 2,
  },
  {
    id: "UPL-004",
    name: "CORS_RTK_GNSS_GroundTruthing.csv",
    dataType: "GNSS / Survey",
    size: "4.8 MB",
    uploadDate: "02 Sep 2026, 02:20 PM",
    status: "processed",
    crsDetected: "ITRF2014 / EPSG:4326",
    featuresCount: 340,
    errorCount: 0,
  },
];
export const initialUploadedFiles = mockUploadedFiles;

export const recentActivities = [
  { id: 1, title: "Spatial reconciliation completed for Ward 112 Block 4", time: "12 mins ago", type: "success" },
  { id: 2, title: "Building #BLD-1028 unified from 4 multi-source geometries (94% confidence)", time: "24 mins ago", type: "verified" },
  { id: 3, title: "High conflict flagged on Building #BLD-1015 (Road boundary encroachment)", time: "45 mins ago", type: "warning" },
  { id: 4, title: "Drone ORI 5cm GeoTIFF tile aligned automatically to EPSG:4326", time: "1 hour ago", type: "info" },
  { id: 5, title: "Auto-resolved 31 minor eave offsets using DTM elevation filter", time: "2 hours ago", type: "success" },
];
