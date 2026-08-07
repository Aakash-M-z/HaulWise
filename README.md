# 🚚 HaulWise — Commercial Logistics Engine & Multi-Day ELD Route Planner

> **FMCSA-Compliant Commercial Route Optimization, Dynamic 70-Hour Cycle Engine, Polyline-Accurate Fuel Stops & Multi-Day ELD Daily Log Sheets**

---

## 🌟 Executive Overview

**HaulWise** is a full-stack commercial freight routing and Electronic Logging Device (ELD) log management platform built to meet the rigorous demands of property-carrying commercial drivers and fleet dispatchers. 

By integrating real-time Open Source Routing Machine (OSRM) road geometry with Federal Motor Carrier Safety Administration (FMCSA) Hours of Service (HOS) regulations, HaulWise transforms raw origin-to-destination inputs into actionable, compliant, multi-day execution plans complete with interactive route maps, polyline-accurate fuel stops, mandatory rest breaks, and contiguous 24-hour daily ELD log sheets.

---

## ✨ Key Features & Technical Capabilities

### 1. Required Inputs & Interactive Parameter Sidebar
- **Current Location**: Driver origin or starting freight depot.
- **Pickup Location**: Shipper facility (1-hour service duration included).
- **Dropoff Location**: Consignee destination (1-hour service duration included).
- **Current Cycle Used (Hours)**: Input between `0` and `70` hours; dynamically calculates available cycle hours before departure and updates status in real time.
- **Quick Preset Corridors**: One-click pre-filling for high-density freight corridors (Chicago $\rightarrow$ Dallas, LA $\rightarrow$ Denver, Atlanta $\rightarrow$ Miami, etc.).

### 2. FMCSA Hours of Service (HOS) Engine
- **Property-Carrying Driver Rules**: Strictly enforces the **70-Hour / 8-Day Cycle**.
- **11-Hour Driving Limit**: Limits continuous driving to 11 hours following 10 consecutive hours off-duty.
- **14-Hour Duty Window**: Constrains work activity within a 14-hour window once duty begins.
- **30-Minute Mandatory Break**: Automatically schedules a 30-minute off-duty break after 8 hours of continuous driving.
- **10-Hour Mandatory Rest Stops**: Inserts sleeper berth / off-duty rest stops whenever the 11-hour driving cap or 14-hour duty window is reached.

### 3. Dynamic Polyline-Accurate Fuel Stop Placement
- **1,000-Mile Interval Rule**: Inserts fuel stops approximately every 1,000 miles traveled.
- **Polyline Segment Interpolation**: Rather than using arbitrary straight-line geometric math, HaulWise walks the actual OSRM polyline segment-by-segment to place fuel markers at exact geographic coordinates (`lat, lng`) along the real highway path.
- **Short Trip Intelligence**: If a trip is shorter than 1,000 miles, fuel stops are omitted automatically.

### 4. Contiguous 24-Hour Multi-Day ELD Daily Log Sheets
- **Multi-Day Generation**: Automatically splits multi-day journeys into individual daily log sheets (`Day 1`, `Day 2`, `Day 3`, ...).
- **Mathematical 24-Hour Continuity**: Every daily log sheet is contiguous from `00:00` to `24:00` with zero missing or overlapping hours ($\text{Off Duty} + \text{Sleeper} + \text{Driving} + \text{On Duty} = 24.0\text{h}$).
- **FMCSA Visual Grid**: Displays a color-coded duty status grid alongside hour breakdown totals, HOS compliance remarks, and a list of stops occurring on that calendar day.
- **Dual Display Modes**: Toggle between **All Sheets Stacked** (continuous multi-day view) and **Day Tabs** for focused inspection.

### 5. Dynamic 70-Hour / 8-Day Cycle Status & Shortfall Warning
- **Remaining Cycle Calculation**: 
  $$\text{Initial Remaining Cycle} = \max(0.0, 70.0 - \text{Current Cycle Used})$$
  $$\text{Post-Trip Remaining Cycle} = \max(0.0, 70.0 - (\text{Current Cycle Used} + \text{Total On-Duty Hours}))$$
- **Insufficient Cycle Alert**: If required trip duty hours exceed available cycle hours, HaulWise displays a prominent HOS alert banner detailing the exact hour shortfall and advising a mandatory **34-hour HOS cycle restart**.

### 6. Trip Archive & One-Click Re-Planning
- **Trip History Archive**: View all previously generated route plans with key summary metrics (distance, duration, stops, cycle status).
- **Update & Re-Plan Action**: Clicking **Update Trip** on any history item loads its parameters back into the planner for instant editing and re-calculation.

---

## 🏗️ Architecture & Workspace Tech Stack

HaulWise is structured as a modern TypeScript + Python monorepo using `pnpm` workspaces.

```
HaulWise/
├── apps/
│   ├── api/                # Django 5.2 REST Framework backend engine
│   │   ├── haulwise_backend/  # Project settings, CORS & URL routing
│   │   ├── planner/           # HOS simulation, geocoding & polyline engine
│   │   └── requirements.txt   # Python package manifest
│   └── web/                # React 19 + Vite frontend web app
│       ├── src/
│       │   ├── components/    # PlannerForm, TripMap, SummaryCards, DailyLogViewer
│       │   └── pages/         # PlannerPage, TripsPage, TripDetailPage
│       └── package.json
├── packages/
│   └── api-client-react/   # Generated API client and TypeScript schemas
├── pnpm-workspace.yaml
└── README.md
```

### Technology Stack
- **Frontend**: React 19, Vite, TypeScript, TailwindCSS v4, Framer Motion, Leaflet / React-Leaflet, Wouter, Lucide Icons, TanStack React Query.
- **Backend**: Python 3.13, Django 5.2, Django REST Framework, `django-cors-headers`, Gunicorn.
- **Geospatial & Routing APIs**: OpenRouteService / OSRM Demo API, OpenStreetMap Nominatim Geocoder.
- **Deployment & Hosting**: Vercel (Frontend), Render (Django REST API).

---

## 🚀 Getting Started & Local Development

### Prerequisites
- **Node.js**: `v20.0.0` or higher
- **pnpm**: `v9.0.0` or higher
- **Python**: `v3.10` or higher

### Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Aakash-M-z/HaulWise.git
   cd HaulWise
   ```

2. **Install Node.js Dependencies**:
   ```bash
   pnpm install
   ```

3. **Set Up Python Virtual Environment (API Backend)**:
   ```bash
   cd apps/api
   python -m venv venv
   
   # Windows PowerShell:
   .\venv\Scripts\Activate.ps1
   
   # macOS / Linux:
   source venv/bin/activate

   pip install -r requirements.txt
   python manage.py migrate
   cd ../..
   ```

4. **Launch Local Development Servers**:
   Run both frontend and backend concurrently from the root directory:
   ```bash
   pnpm dev
   ```
   - **Web App**: `http://localhost:5173`
   - **Django API Backend**: `http://localhost:5000`

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/healthz` | System status check. |
| `POST` | `/api/trip` | Accepts trip parameters and returns full HOS plan, fuel stops, and ELD logs. |
| `GET` | `/api/trips` | Fetches trip history archive. |
| `GET` | `/api/trips/<id>` | Fetches detailed execution plan for a specific trip by ID. |

### Example Request (`POST /api/trip`)
```json
{
  "current_location": "Seattle, WA",
  "pickup_location": "Portland, OR",
  "dropoff_location": "Denver, CO",
  "current_cycle_used": 15.0
}
```

---

## 🧪 Testing & Verification

Run verification checks across the codebase:

```bash
# Run TypeScript type check across all packages
pnpm run typecheck

# Run frontend build verification
pnpm run build

# Run Django system checks
cd apps/api
venv\Scripts\python.exe manage.py check
```

---

## 🔮 Future Roadmap & Enhancements

Looking ahead, HaulWise is designed to expand into a complete fleet-grade telematics ecosystem. Key planned enhancements include:

### 1. 📡 Live Telematics & OBD-II GPS Dongle Sync
- **Real-Time Duty Status Transitions**: Connect with vehicle CAN bus / OBD-II dongles via Bluetooth/Cellular to automatically transition driver status between `DRIVING` and `ON_DUTY` based on real-time vehicle movement.
- **Geofenced Cargo Tracking**: Automated trigger of pickup/dropoff service timers upon crossing warehouse geofences.

### 2. ⛈️ Real-Time Weather & Live Severe Weather Routing
- **NOAA Weather Overlays**: Layer live radar, snowstorm alerts, high-wind warnings, and road closure alerts directly on the interactive Leaflet route map.
- **Dynamic Speed Adaptation**: Adjust average commercial travel speeds automatically when adverse weather conditions are detected along the highway corridor.

### 3. 🚛 Fleet Vehicle Profiles & Hazmat Routing
- **Multi-Trailer Configurations**: Support for Double, Triple, Oversized, and Low-Boy trailer configurations.
- **Bridge Clearance & Weight Restriction Avoidance**: Filter highway segments based on gross vehicle weight rating (GVWR), axle weight limits, and vertical bridge clearances.
- **Hazardous Materials (HAZMAT) Class Routing**: Specialized routing rules avoiding tunnels and restricted urban bypasses for dangerous goods transport.

### 4. 👥 Co-Driver Team Driving Mode
- **Alternating Sleeper Berth Shifts**: Support 2-driver team configurations under FMCSA §395.1(g) rules, allowing non-stop long-haul transit while one driver rests in the sleeper berth while the other drives.

### 5. ⛽ Fuel Price Optimization Engine
- **Live Diesel Price Integration**: Integrate real-time truck stop diesel fuel pricing APIs (e.g. Pilot Flying J, Love's, TA Petro) to recommend specific fuel stops that minimize total trip fuel expense.

### 6. 📄 Official PDF Export & FMCSA Form 395.8 Printing
- **Paper-Equivalent Log Generation**: One-click export of high-resolution PDF daily log sheets matching the official FMCSA Form 395.8 layout for DOT roadside inspections.

---

## 📄 License

This project is submitted for commercial logistics assessment and hiring review. All rights reserved.
