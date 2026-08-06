import math
import requests
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple, Any, Optional

# ---------------------------------------------------------------------------
# Static geocoding dictionary for key US freight hubs (fast path)
# ---------------------------------------------------------------------------
CITY_COORDINATES: Dict[str, Tuple[float, float]] = {
    'chicago, il': (41.8781, -87.6298),
    'chicago': (41.8781, -87.6298),
    'indianapolis, in': (39.7684, -86.1581),
    'indianapolis': (39.7684, -86.1581),
    'dallas, tx': (32.7767, -96.7970),
    'dallas': (32.7767, -96.7970),
    'atlanta, ga': (33.7490, -84.3880),
    'atlanta': (33.7490, -84.3880),
    'miami, fl': (25.7617, -80.1918),
    'miami': (25.7617, -80.1918),
    'los angeles, ca': (34.0522, -118.2437),
    'los angeles': (34.0522, -118.2437),
    'denver, co': (39.7392, -104.9903),
    'denver': (39.7392, -104.9903),
    'st. louis, mo': (38.6270, -90.1994),
    'st louis, mo': (38.6270, -90.1994),
    'memphis, tn': (35.1495, -90.0490),
    'nashville, tn': (36.1627, -86.7816),
    'nashville': (36.1627, -86.7816),
    'phoenix, az': (33.4484, -112.0740),
    'phoenix': (33.4484, -112.0740),
    'seattle, wa': (47.6062, -122.3321),
    'seattle': (47.6062, -122.3321),
    'portland, or': (45.5051, -122.6750),
    'portland': (45.5051, -122.6750),
    'new york, ny': (40.7128, -74.0060),
    'new york': (40.7128, -74.0060),
    'philadelphia, pa': (39.9526, -75.1652),
    'philadelphia': (39.9526, -75.1652),
    'jacksonville, fl': (30.3322, -81.6557),
    'jacksonville': (30.3322, -81.6557),
    'houston, tx': (29.7604, -95.3698),
    'houston': (29.7604, -95.3698),
    'kansas city, mo': (39.0997, -94.5786),
    'kansas city': (39.0997, -94.5786),
    'oklahoma city, ok': (35.4676, -97.5164),
    'oklahoma city': (35.4676, -97.5164),
    'minneapolis, mn': (44.9778, -93.2650),
    'minneapolis': (44.9778, -93.2650),
    'detroit, mi': (42.3314, -83.0458),
    'detroit': (42.3314, -83.0458),
    'columbus, oh': (39.9612, -82.9988),
    'columbus': (39.9612, -82.9988),
    'charlotte, nc': (35.2271, -80.8431),
    'charlotte': (35.2271, -80.8431),
    'san antonio, tx': (29.4241, -98.4936),
    'san antonio': (29.4241, -98.4936),
    'el paso, tx': (31.7619, -106.4850),
    'el paso': (31.7619, -106.4850),
    'albuquerque, nm': (35.0844, -106.6504),
    'albuquerque': (35.0844, -106.6504),
    'salt lake city, ut': (40.7608, -111.8910),
    'salt lake city': (40.7608, -111.8910),
    'las vegas, nv': (36.1699, -115.1398),
    'las vegas': (36.1699, -115.1398),
}


def geocode_location(query: str) -> Tuple[float, float]:
    clean_query = query.strip().lower()
    if clean_query in CITY_COORDINATES:
        return CITY_COORDINATES[clean_query]

    try:
        url = (
            f"https://nominatim.openstreetmap.org/search"
            f"?q={requests.utils.quote(query)}&format=json&limit=1&countrycodes=us"
        )
        headers = {'User-Agent': 'HaulWise-Commercial-Logistics-Platform/1.0'}
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code == 200:
            data = res.json()
            if data:
                return (float(data[0]['lat']), float(data[0]['lon']))
    except Exception:
        pass

    # Deterministic hash fallback inside continental US bounds
    hash_val = sum(ord(c) for c in clean_query)
    lat = 32.0 + (hash_val % 1200) / 100.0  # 32 – 44 N
    lng = -120.0 + (hash_val % 2000) / 50.0  # -120 – -80 W
    return (lat, lng)


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance between two WGS-84 points in miles."""
    R = 3958.8
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def get_osrm_route(coords: List[Tuple[float, float]]) -> Dict[str, Any]:
    """
    Call the public OSRM demo server.
    Returns distance_miles, duration_hours, and the full GeoJSON polyline
    as a list of [lng, lat] pairs.
    Falls back to straight-line haversine when OSRM is unreachable.
    """
    try:
        coord_str = ";".join([f"{lon:.5f},{lat:.5f}" for lat, lon in coords])
        url = (
            f"http://router.project-osrm.org/route/v1/driving/{coord_str}"
            f"?overview=full&geometries=geojson"
        )
        res = requests.get(url, timeout=6)
        if res.status_code == 200:
            data = res.json()
            if data.get('routes'):
                route = data['routes'][0]
                return {
                    'distance_miles': route['distance'] / 1609.344,
                    'duration_hours': route['duration'] / 3600.0,
                    'geometry': route['geometry']['coordinates'],  # [[lng, lat], ...]
                }
    except Exception:
        pass

    # Haversine fallback – build a simple polyline between waypoints
    total_dist = sum(
        haversine_distance(coords[i][0], coords[i][1], coords[i+1][0], coords[i+1][1])
        for i in range(len(coords) - 1)
    )
    geometry = [[lon, lat] for lat, lon in coords]
    return {
        'distance_miles': total_dist,
        'duration_hours': total_dist / 55.0,
        'geometry': geometry,
    }


# ---------------------------------------------------------------------------
# Polyline interpolation helpers
# ---------------------------------------------------------------------------

def _polyline_segment_distances(geometry: List[List[float]]) -> List[float]:
    """
    Return the cumulative distance (miles) from the polyline start to the
    *end* of each segment.  geometry is a list of [lng, lat] pairs.
    """
    cumulative = []
    running = 0.0
    for i in range(len(geometry) - 1):
        lng1, lat1 = geometry[i]
        lng2, lat2 = geometry[i + 1]
        running += haversine_distance(lat1, lng1, lat2, lng2)
        cumulative.append(running)
    return cumulative


def interpolate_point_on_polyline(
    geometry: List[List[float]],
    cum_dists: List[float],
    target_miles: float,
) -> Optional[Tuple[float, float]]:
    """
    Walk the OSRM polyline until cumulative distance reaches *target_miles*.
    Returns (lat, lng) at exactly that point by linear interpolation between
    the two enclosing vertices.
    Returns None if target_miles is beyond the polyline length.
    """
    total_length = cum_dists[-1] if cum_dists else 0.0
    if target_miles >= total_length:
        return None

    prev_dist = 0.0
    for i, dist in enumerate(cum_dists):
        if dist >= target_miles:
            seg_len = dist - prev_dist
            if seg_len == 0:
                frac = 0.0
            else:
                frac = (target_miles - prev_dist) / seg_len
            lng1, lat1 = geometry[i]
            lng2, lat2 = geometry[i + 1]
            lat = lat1 + frac * (lat2 - lat1)
            lng = lng1 + frac * (lng2 - lng1)
            return (lat, lng)
        prev_dist = dist
    return None


# ---------------------------------------------------------------------------
# Main trip-planning function
# ---------------------------------------------------------------------------

FUEL_INTERVAL_MILES = 1000.0  # one fuel stop every 1 000 miles
AVG_SPEED_MPH = 55.0          # commercial truck average
MAX_DRIVING_PER_DAY = 11.0    # FMCSA 11-hour driving limit
MAX_DUTY_HOURS = 14.0         # 14-hour on-duty window
BREAK_AFTER_HOURS = 8.0       # mandatory 30-min break after 8 h continuous
REST_DURATION = 10.0          # mandatory 10-hour sleeper/off-duty rest
BREAK_DURATION = 0.5          # 30-minute HOS break
FUEL_DURATION = 0.75          # 45-minute fuel stop
PICKUP_DURATION = 1.0         # 1-hour pickup service
DROPOFF_DURATION = 1.0        # 1-hour dropoff service


def calculate_trip_plan(
    current_loc: str,
    pickup_loc: str,
    dropoff_loc: str,
    current_cycle_used: float = 0.0,
) -> Dict[str, Any]:

    # ── 1. Geocode all three waypoints ──────────────────────────────────────
    c_lat, c_lng = geocode_location(current_loc)
    p_lat, p_lng = geocode_location(pickup_loc)
    d_lat, d_lng = geocode_location(dropoff_loc)

    # ── 2. Get road route from OSRM ─────────────────────────────────────────
    route_res = get_osrm_route([(c_lat, c_lng), (p_lat, p_lng), (d_lat, d_lng)])
    total_miles: float = route_res['distance_miles']
    geometry: List[List[float]] = route_res['geometry']  # [[lng, lat], ...]

    # Pre-compute cumulative distances along the full polyline once
    cum_dists = _polyline_segment_distances(geometry)
    polyline_total = cum_dists[-1] if cum_dists else total_miles

    driving_hours_total = total_miles / AVG_SPEED_MPH if total_miles > 0 else 0.0

    now = datetime.now(timezone.utc)
    start_iso = now.isoformat()

    # ── 3. Determine real distance from start to pickup via the polyline ─────
    # We use haversine from start→pickup as the "distance along route to pickup"
    # (accurate enough; OSRM gives us the total distance, not per-leg breakdown)
    pickup_dist_road = haversine_distance(c_lat, c_lng, p_lat, p_lng)
    # Scale to road distance: ratio of haversine vs haversine total
    haversine_total = haversine_distance(c_lat, c_lng, d_lat, d_lng) + haversine_distance(c_lat, c_lng, p_lat, p_lng)
    # Approximate pickup road distance proportionally to total road distance
    if haversine_total > 0:
        pickup_road_dist = (pickup_dist_road / haversine_total) * total_miles
    else:
        pickup_road_dist = 0.0
    pickup_road_dist = min(pickup_road_dist, total_miles * 0.6)  # sanity cap

    # ── 4. Pre-compute fuel stop positions from polyline ────────────────────
    #
    # Rule: insert one fuel stop at every 1 000-mile mark along the polyline.
    # Skip any mark that falls before the pickup or at/beyond the dropoff.
    #
    fuel_mile_marks: List[float] = []
    mark = FUEL_INTERVAL_MILES
    while mark < polyline_total - 10:   # -10 mi buffer before dropoff
        fuel_mile_marks.append(mark)
        mark += FUEL_INTERVAL_MILES

    fuel_stop_coords: List[Tuple[float, float, float]] = []  # (lat, lng, mile_mark)
    for mile_mark in fuel_mile_marks:
        pt = interpolate_point_on_polyline(geometry, cum_dists, mile_mark)
        if pt:
            fuel_stop_coords.append((pt[0], pt[1], mile_mark))

    # ── 5. Build stops list ──────────────────────────────────────────────────
    stops: List[Dict[str, Any]] = []
    daily_logs: List[Dict[str, Any]] = []

    # ── 5a. Current location ─────────────────────────────────────────────────
    stops.append({
        'type': 'current',
        'location': current_loc,
        'coordinates': {'lat': round(c_lat, 5), 'lng': round(c_lng, 5)},
        'arrivalTime': start_iso,
        'duration': 0.0,
        'distanceFromStart': 0.0,
    })

    # ── 5b. Pickup ───────────────────────────────────────────────────────────
    pickup_drive_hrs = pickup_road_dist / AVG_SPEED_MPH
    pickup_arr = (now + timedelta(hours=pickup_drive_hrs)).isoformat()
    stops.append({
        'type': 'pickup',
        'location': pickup_loc,
        'coordinates': {'lat': round(p_lat, 5), 'lng': round(p_lng, 5)},
        'arrivalTime': pickup_arr,
        'duration': PICKUP_DURATION,
        'distanceFromStart': round(pickup_road_dist, 1),
    })

    # ── 6. HOS driving loop ──────────────────────────────────────────────────
    # State machine tracking cumulative driving hours and distance
    accumulated_drive_hrs = pickup_drive_hrs + PICKUP_DURATION
    accumulated_miles = pickup_road_dist
    current_time_hr = 8.0         # driver starts at 08:00 on day 1
    current_day_drive_hrs = 0.0
    continuous_drive_hrs = 0.0    # for mandatory 30-min break tracking
    day_num = 1

    current_day_segments: List[Dict[str, Any]] = [{
        'startHour': 8.0,
        'endHour': 9.0,
        'status': 'on_duty'       # pre-trip inspection at pickup
    }]
    current_time_hr = 9.0

    remaining_drive = driving_hours_total - pickup_drive_hrs
    if remaining_drive < 0:
        remaining_drive = driving_hours_total

    fuel_idx = 0          # pointer into fuel_stop_coords
    fuel_count = 0
    rest_count = 0
    break_count = 0

    # Advance past any fuel stops already behind the pickup
    while fuel_idx < len(fuel_stop_coords) and fuel_stop_coords[fuel_idx][2] <= pickup_road_dist:
        fuel_idx += 1

    while remaining_drive > 0.001:
        # ── Determine what limits this drive chunk ───────────────────────────
        if fuel_idx < len(fuel_stop_coords):
            next_fuel_mile = fuel_stop_coords[fuel_idx][2]
            miles_to_fuel = max(0.0, next_fuel_mile - accumulated_miles)
            hrs_to_fuel = miles_to_fuel / AVG_SPEED_MPH
        else:
            hrs_to_fuel = float('inf')

        hrs_until_break = max(0.0, BREAK_AFTER_HOURS - continuous_drive_hrs)
        hrs_left_today = max(0.0, MAX_DRIVING_PER_DAY - current_day_drive_hrs)

        # What stops this chunk?
        drive_chunk = min(remaining_drive, hrs_left_today, hrs_to_fuel, hrs_until_break)

        # Identify the stopping reason using a small epsilon tolerance
        EPS = 1e-6
        hit_fuel  = (fuel_idx < len(fuel_stop_coords) and abs(drive_chunk - hrs_to_fuel)  < EPS and remaining_drive - drive_chunk > EPS)
        hit_break = (not hit_fuel and abs(drive_chunk - hrs_until_break) < EPS and continuous_drive_hrs + drive_chunk >= BREAK_AFTER_HOURS - EPS and remaining_drive - drive_chunk > EPS)
        hit_rest  = (not hit_fuel and not hit_break and hrs_left_today <= EPS)

        # ── 10-h rest: today's 11-h driving cap is exhausted ────────────────
        if hit_rest or (drive_chunk <= EPS and hrs_left_today <= EPS):
            rest_count += 1
            rest_pt = interpolate_point_on_polyline(geometry, cum_dists, accumulated_miles)
            rest_lat, rest_lng = rest_pt if rest_pt else (p_lat, p_lng)

            stops.append({
                'type': 'rest',
                'location': f"Mandatory Rest Stop #{rest_count}",
                'coordinates': {'lat': round(rest_lat, 5), 'lng': round(rest_lng, 5)},
                'arrivalTime': (now + timedelta(hours=accumulated_drive_hrs)).isoformat(),
                'duration': REST_DURATION,
                'distanceFromStart': round(accumulated_miles, 1),
            })
            current_day_segments.append({'startHour': round(current_time_hr, 2), 'endHour': 24.0, 'status': 'off_duty'})
            day_date = (now + timedelta(days=day_num - 1)).strftime('%Y-%m-%d')
            daily_logs.append({
                'date': day_date,
                'dayNumber': day_num,
                'segments': current_day_segments,
                'totalOffDuty': round(max(0.0, 24.0 - current_day_drive_hrs - 1.0), 1),
                'totalSleeperBerth': 0.0,
                'totalDriving': round(current_day_drive_hrs, 1),
                'totalOnDuty': 1.0,
                'remarks': [f"Day {day_num}: drove {round(current_day_drive_hrs * AVG_SPEED_MPH, 0):.0f} mi — 10-hr rest"],
            })
            day_num += 1
            accumulated_drive_hrs += REST_DURATION
            current_time_hr = 6.0
            current_day_drive_hrs = 0.0
            continuous_drive_hrs = 0.0
            current_day_segments = []
            continue

        # Safety guard against zero-chunk infinite loops
        if drive_chunk <= EPS:
            break

        # ── Drive the chunk ──────────────────────────────────────────────────
        seg_start = current_time_hr
        current_time_hr        += drive_chunk
        current_day_drive_hrs  += drive_chunk
        continuous_drive_hrs   += drive_chunk
        accumulated_drive_hrs  += drive_chunk
        chunk_miles             = drive_chunk * AVG_SPEED_MPH
        accumulated_miles      += chunk_miles
        remaining_drive        -= drive_chunk

        current_day_segments.append({
            'startHour': round(seg_start, 2),
            'endHour':   round(current_time_hr, 2),
            'status':    'driving',
        })

        # ── Fuel stop at the exact polyline coordinate ───────────────────────
        if hit_fuel:
            f_lat, f_lng, f_mile = fuel_stop_coords[fuel_idx]
            fuel_idx  += 1
            fuel_count += 1
            stops.append({
                'type': 'fuel',
                'location': f"Fuel Stop #{fuel_count} — Mile {round(f_mile, 0):.0f}",
                'coordinates': {'lat': round(f_lat, 5), 'lng': round(f_lng, 5)},
                'arrivalTime': (now + timedelta(hours=accumulated_drive_hrs)).isoformat(),
                'duration': FUEL_DURATION,
                'distanceFromStart': round(f_mile, 1),
            })
            current_day_segments.append({
                'startHour': round(current_time_hr, 2),
                'endHour':   round(current_time_hr + FUEL_DURATION, 2),
                'status':    'on_duty',
            })
            current_time_hr       += FUEL_DURATION
            accumulated_drive_hrs += FUEL_DURATION
            continuous_drive_hrs   = 0.0   # fuelling resets continuous-drive clock

        # ── 30-min HOS break after 8 h continuous driving ───────────────────
        elif hit_break:
            break_count      += 1
            continuous_drive_hrs = 0.0

            brk_pt = interpolate_point_on_polyline(geometry, cum_dists, accumulated_miles)
            brk_lat, brk_lng = brk_pt if brk_pt else (p_lat + (d_lat - p_lat) * 0.5, p_lng + (d_lng - p_lng) * 0.5)

            stops.append({
                'type': 'break',
                'location': f"30-Min HOS Break #{break_count}",
                'coordinates': {'lat': round(brk_lat, 5), 'lng': round(brk_lng, 5)},
                'arrivalTime': (now + timedelta(hours=accumulated_drive_hrs)).isoformat(),
                'duration': BREAK_DURATION,
                'distanceFromStart': round(accumulated_miles, 1),
            })
            current_day_segments.append({
                'startHour': round(current_time_hr, 2),
                'endHour':   round(current_time_hr + BREAK_DURATION, 2),
                'status':    'off_duty',
            })
            current_time_hr       += BREAK_DURATION
            accumulated_drive_hrs += BREAK_DURATION

    # ── 5c. Dropoff ──────────────────────────────────────────────────────────
    dropoff_arr = (now + timedelta(hours=accumulated_drive_hrs)).isoformat()
    stops.append({
        'type': 'dropoff',
        'location': dropoff_loc,
        'coordinates': {'lat': round(d_lat, 5), 'lng': round(d_lng, 5)},
        'arrivalTime': dropoff_arr,
        'duration': DROPOFF_DURATION,
        'distanceFromStart': round(total_miles, 1),
    })

    # Close out the final day's log ──────────────────────────────────────────
    current_day_segments.append({
        'startHour': round(current_time_hr, 2),
        'endHour': round(current_time_hr + DROPOFF_DURATION, 2),
        'status': 'on_duty'
    })
    current_time_hr += DROPOFF_DURATION
    if current_time_hr < 24.0:
        current_day_segments.append({
            'startHour': round(current_time_hr, 2),
            'endHour': 24.0,
            'status': 'off_duty'
        })

    day_date = (now + timedelta(days=day_num - 1)).strftime('%Y-%m-%d')
    daily_logs.append({
        'date': day_date,
        'dayNumber': day_num,
        'segments': current_day_segments,
        'totalOffDuty': round(max(0.0, 24.0 - current_day_drive_hrs - DROPOFF_DURATION), 1),
        'totalSleeperBerth': 0.0,
        'totalDriving': round(current_day_drive_hrs, 1),
        'totalOnDuty': round(DROPOFF_DURATION, 1),
        'remarks': [f"Trip completed at {dropoff_loc}"],
    })

    # ── 7. Final totals ──────────────────────────────────────────────────────
    total_stop_hours = (
        fuel_count * FUEL_DURATION
        + rest_count * REST_DURATION
        + break_count * BREAK_DURATION
        + PICKUP_DURATION
        + DROPOFF_DURATION
    )
    total_trip_hours = driving_hours_total + total_stop_hours
    cycle_remaining = max(0.0, 70.0 - (current_cycle_used + total_trip_hours))

    return {
        'totalDistanceMiles': round(total_miles, 1),
        'totalDrivingHours': round(driving_hours_total, 1),
        'totalTripHours': round(total_trip_hours, 1),
        'estimatedArrival': dropoff_arr,
        'startTime': start_iso,
        'remainingCycleHours': round(cycle_remaining, 1),
        'fuelStopCount': fuel_count,
        'restStopCount': rest_count,
        'stops': stops,
        'dailyLogs': daily_logs,
        'routeGeometry': {
            'coordinates': geometry,
        },
    }
