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
    'orlando, fl': (28.5383, -81.3792),
    'orlando': (28.5383, -81.3792),
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
    lat = 32.0 + (hash_val % 1200) / 100.0
    lng = -120.0 + (hash_val % 2000) / 50.0
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
                    'geometry': route['geometry']['coordinates'],
                }
    except Exception:
        pass

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


def _polyline_segment_distances(geometry: List[List[float]]) -> List[float]:
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
    total_length = cum_dists[-1] if cum_dists else 0.0
    if target_miles >= total_length:
        return None

    prev_dist = 0.0
    for i, dist in enumerate(cum_dists):
        if dist >= target_miles:
            seg_len = dist - prev_dist
            frac = 0.0 if seg_len == 0 else (target_miles - prev_dist) / seg_len
            lng1, lat1 = geometry[i]
            lng2, lat2 = geometry[i + 1]
            lat = lat1 + frac * (lat2 - lat1)
            lng = lng1 + frac * (lng2 - lng1)
            return (lat, lng)
        prev_dist = dist
    return None


# ---------------------------------------------------------------------------
# Constants according to FMCSA HOS regulations (Property Carrying Drivers)
# ---------------------------------------------------------------------------
FUEL_INTERVAL_MILES = 1000.0  # fuel stop every 1000 miles
AVG_SPEED_MPH = 55.0          # commercial truck average speed
MAX_DRIVING_PER_DAY = 11.0    # FMCSA 11-hour driving limit
MAX_DUTY_HOURS = 14.0         # 14-hour on-duty window
BREAK_AFTER_HOURS = 8.0       # mandatory 30-min break after 8 h continuous driving
REST_DURATION = 10.0          # mandatory 10-hour sleeper/off-duty rest
BREAK_DURATION = 0.5          # 30-minute HOS break
FUEL_DURATION = 0.75          # 45-minute fuel stop
PICKUP_DURATION = 1.0         # 1-hour pickup service
DROPOFF_DURATION = 1.0        # 1-hour dropoff service
TOTAL_CYCLE_HOURS = 70.0      # FMCSA 70-hour / 8-day cycle limit


def calculate_trip_plan(
    current_loc: str,
    pickup_loc: str,
    dropoff_loc: str,
    current_cycle_used: float = 0.0,
) -> Dict[str, Any]:

    # Validate current_cycle_used bounds
    current_cycle_used = max(0.0, min(TOTAL_CYCLE_HOURS, float(current_cycle_used)))

    # 1. Geocode locations
    c_lat, c_lng = geocode_location(current_loc)
    p_lat, p_lng = geocode_location(pickup_loc)
    d_lat, d_lng = geocode_location(dropoff_loc)

    # 2. Get route geometry & distance
    route_res = get_osrm_route([(c_lat, c_lng), (p_lat, p_lng), (d_lat, d_lng)])
    total_miles: float = route_res['distance_miles']
    geometry: List[List[float]] = route_res['geometry']

    cum_dists = _polyline_segment_distances(geometry)
    polyline_total = cum_dists[-1] if cum_dists else total_miles
    driving_hours_total = total_miles / AVG_SPEED_MPH if total_miles > 0 else 0.0

    now = datetime.now(timezone.utc)
    start_iso = now.isoformat()

    pickup_dist_road = haversine_distance(c_lat, c_lng, p_lat, p_lng)
    haversine_total = haversine_distance(c_lat, c_lng, d_lat, d_lng) + pickup_dist_road
    pickup_road_dist = (pickup_dist_road / haversine_total * total_miles) if haversine_total > 0 else 0.0
    pickup_road_dist = min(pickup_road_dist, total_miles * 0.6)

    fuel_mile_marks: List[float] = []
    mark = FUEL_INTERVAL_MILES
    while mark < polyline_total - 10:
        fuel_mile_marks.append(mark)
        mark += FUEL_INTERVAL_MILES

    fuel_stop_coords: List[Tuple[float, float, float]] = []
    for mile_mark in fuel_mile_marks:
        pt = interpolate_point_on_polyline(geometry, cum_dists, mile_mark)
        if pt:
            fuel_stop_coords.append((pt[0], pt[1], mile_mark))

    stops: List[Dict[str, Any]] = []
    daily_logs: List[Dict[str, Any]] = []

    # 1. Current Location Stop
    stops.append({
        'type': 'current',
        'location': current_loc,
        'coordinates': {'lat': round(c_lat, 5), 'lng': round(c_lng, 5)},
        'arrivalTime': start_iso,
        'duration': 0.0,
        'distanceFromStart': 0.0,
    })

    # 2. Pickup Stop
    pickup_drive_hrs = pickup_road_dist / AVG_SPEED_MPH
    pickup_arr_dt = now + timedelta(hours=pickup_drive_hrs)
    stops.append({
        'type': 'pickup',
        'location': pickup_loc,
        'coordinates': {'lat': round(p_lat, 5), 'lng': round(p_lng, 5)},
        'arrivalTime': pickup_arr_dt.isoformat(),
        'duration': PICKUP_DURATION,
        'distanceFromStart': round(pickup_road_dist, 1),
    })

    accumulated_drive_hrs = pickup_drive_hrs + PICKUP_DURATION
    accumulated_miles = pickup_road_dist
    day_num = 1

    current_day_segments: List[Dict[str, Any]] = [
        {'startHour': 0.0, 'endHour': 8.0, 'status': 'off_duty'},
        {'startHour': 8.0, 'endHour': 9.0, 'status': 'on_duty'}
    ]
    current_time_hr = 9.0
    current_day_drive_hrs = 0.0
    continuous_drive_hrs = 0.0

    remaining_drive = driving_hours_total - pickup_drive_hrs
    if remaining_drive < 0:
        remaining_drive = driving_hours_total

    fuel_idx = 0
    fuel_count = 0
    rest_count = 0
    break_count = 0

    while fuel_idx < len(fuel_stop_coords) and fuel_stop_coords[fuel_idx][2] <= pickup_road_dist:
        fuel_idx += 1

    def finalize_day_log(day_number: int, segments_list: List[Dict[str, Any]], remarks_list: List[str]):
        off_duty = sum(s['endHour'] - s['startHour'] for s in segments_list if s['status'] == 'off_duty')
        sleeper = sum(s['endHour'] - s['startHour'] for s in segments_list if s['status'] == 'sleeper_berth')
        driving = sum(s['endHour'] - s['startHour'] for s in segments_list if s['status'] == 'driving')
        on_duty = sum(s['endHour'] - s['startHour'] for s in segments_list if s['status'] == 'on_duty')

        day_date = (now + timedelta(days=day_number - 1)).strftime('%Y-%m-%d')
        daily_logs.append({
            'date': day_date,
            'dayNumber': day_number,
            'segments': segments_list,
            'totalOffDuty': round(off_duty, 2),
            'totalSleeperBerth': round(sleeper, 2),
            'totalDriving': round(driving, 2),
            'totalOnDuty': round(on_duty, 2),
            'remarks': remarks_list
        })

    while remaining_drive > 0.001:
        if fuel_idx < len(fuel_stop_coords):
            next_fuel_mile = fuel_stop_coords[fuel_idx][2]
            miles_to_fuel = max(0.0, next_fuel_mile - accumulated_miles)
            hrs_to_fuel = miles_to_fuel / AVG_SPEED_MPH
        else:
            hrs_to_fuel = float('inf')

        hrs_until_break = max(0.0, BREAK_AFTER_HOURS - continuous_drive_hrs)
        hrs_left_today = max(0.0, MAX_DRIVING_PER_DAY - current_day_drive_hrs)

        drive_chunk = min(remaining_drive, hrs_left_today, hrs_to_fuel, hrs_until_break)

        EPS = 1e-6
        hit_fuel = (fuel_idx < len(fuel_stop_coords) and abs(drive_chunk - hrs_to_fuel) < EPS and remaining_drive - drive_chunk > EPS)
        hit_break = (not hit_fuel and abs(drive_chunk - hrs_until_break) < EPS and continuous_drive_hrs + drive_chunk >= BREAK_AFTER_HOURS - EPS and remaining_drive - drive_chunk > EPS)
        hit_rest = (not hit_fuel and not hit_break and hrs_left_today <= EPS)

        if hit_rest or (drive_chunk <= EPS and hrs_left_today <= EPS):
            rest_count += 1
            rest_pt = interpolate_point_on_polyline(geometry, cum_dists, accumulated_miles)
            rest_lat, rest_lng = rest_pt if rest_pt else (p_lat, p_lng)

            arr_dt = now + timedelta(hours=accumulated_drive_hrs)
            stops.append({
                'type': 'rest',
                'location': f"Mandatory Rest Stop #{rest_count}",
                'coordinates': {'lat': round(rest_lat, 5), 'lng': round(rest_lng, 5)},
                'arrivalTime': arr_dt.isoformat(),
                'duration': REST_DURATION,
                'distanceFromStart': round(accumulated_miles, 1),
            })

            rest_today_hrs = min(REST_DURATION, 24.0 - current_time_hr)
            rest_next_day_hrs = REST_DURATION - rest_today_hrs

            if rest_today_hrs > 0:
                current_day_segments.append({
                    'startHour': round(current_time_hr, 2),
                    'endHour': 24.0,
                    'status': 'off_duty'
                })

            day_remarks = [
                f"Day {day_num}: Drove {round(current_day_drive_hrs * AVG_SPEED_MPH, 0):.0f} miles",
                f"Completed 11-hr driving limit at mile {round(accumulated_miles, 0):.0f}",
                f"Mandatory 10-hr rest break initiated ({rest_today_hrs:.1f}h today, {rest_next_day_hrs:.1f}h tomorrow)"
            ]
            finalize_day_log(day_num, current_day_segments, day_remarks)

            day_num += 1
            accumulated_drive_hrs += REST_DURATION
            current_day_drive_hrs = 0.0
            continuous_drive_hrs = 0.0

            current_day_segments = []
            if rest_next_day_hrs > 0:
                current_day_segments.append({
                    'startHour': 0.0,
                    'endHour': round(rest_next_day_hrs, 2),
                    'status': 'off_duty'
                })
                current_time_hr = rest_next_day_hrs
            else:
                current_time_hr = 0.0

            continue

        if drive_chunk <= EPS:
            break

        seg_start = current_time_hr
        current_time_hr += drive_chunk
        current_day_drive_hrs += drive_chunk
        continuous_drive_hrs += drive_chunk
        accumulated_drive_hrs += drive_chunk
        chunk_miles = drive_chunk * AVG_SPEED_MPH
        accumulated_miles += chunk_miles
        remaining_drive -= drive_chunk

        current_day_segments.append({
            'startHour': round(seg_start, 2),
            'endHour': round(current_time_hr, 2),
            'status': 'driving',
        })

        if hit_fuel:
            f_lat, f_lng, f_mile = fuel_stop_coords[fuel_idx]
            fuel_idx += 1
            fuel_count += 1
            arr_dt = now + timedelta(hours=accumulated_drive_hrs)

            stops.append({
                'type': 'fuel',
                'location': f"Fuel Stop #{fuel_count} — Mile {round(f_mile, 0):.0f}",
                'coordinates': {'lat': round(f_lat, 5), 'lng': round(f_lng, 5)},
                'arrivalTime': arr_dt.isoformat(),
                'duration': FUEL_DURATION,
                'distanceFromStart': round(f_mile, 1),
            })
            current_day_segments.append({
                'startHour': round(current_time_hr, 2),
                'endHour': round(current_time_hr + FUEL_DURATION, 2),
                'status': 'on_duty',
            })
            current_time_hr += FUEL_DURATION
            accumulated_drive_hrs += FUEL_DURATION
            continuous_drive_hrs = 0.0

        elif hit_break:
            break_count += 1
            continuous_drive_hrs = 0.0
            arr_dt = now + timedelta(hours=accumulated_drive_hrs)

            brk_pt = interpolate_point_on_polyline(geometry, cum_dists, accumulated_miles)
            brk_lat, brk_lng = brk_pt if brk_pt else (p_lat + (d_lat - p_lat) * 0.5, p_lng + (d_lng - p_lng) * 0.5)

            stops.append({
                'type': 'break',
                'location': f"30-Min HOS Break #{break_count}",
                'coordinates': {'lat': round(brk_lat, 5), 'lng': round(brk_lng, 5)},
                'arrivalTime': arr_dt.isoformat(),
                'duration': BREAK_DURATION,
                'distanceFromStart': round(accumulated_miles, 1),
            })
            current_day_segments.append({
                'startHour': round(current_time_hr, 2),
                'endHour': round(current_time_hr + BREAK_DURATION, 2),
                'status': 'off_duty',
            })
            current_time_hr += BREAK_DURATION
            accumulated_drive_hrs += BREAK_DURATION

    # 3. Dropoff Stop
    dropoff_arr_dt = now + timedelta(hours=accumulated_drive_hrs)
    stops.append({
        'type': 'dropoff',
        'location': dropoff_loc,
        'coordinates': {'lat': round(d_lat, 5), 'lng': round(d_lng, 5)},
        'arrivalTime': dropoff_arr_dt.isoformat(),
        'duration': DROPOFF_DURATION,
        'distanceFromStart': round(total_miles, 1),
    })

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

    final_remarks = [
        f"Trip completed at {dropoff_loc}",
        f"Final delivery completed. Total trip distance: {round(total_miles, 1)} miles"
    ]
    finalize_day_log(day_num, current_day_segments, final_remarks)

    # ---------------------------------------------------------------------------
    # Dynamic 70-Hour / 8-Day Cycle Hours Calculations
    # ---------------------------------------------------------------------------
    total_stop_hours = (
        fuel_count * FUEL_DURATION
        + rest_count * REST_DURATION
        + break_count * BREAK_DURATION
        + PICKUP_DURATION
        + DROPOFF_DURATION
    )
    total_trip_hours = driving_hours_total + total_stop_hours

    # On-duty hours that consume the 70-hour cycle (Driving + On-Duty stops)
    total_duty_hours = driving_hours_total + PICKUP_DURATION + DROPOFF_DURATION + (fuel_count * FUEL_DURATION)

    # Initial remaining cycle hours before departure
    initial_remaining_cycle = max(0.0, TOTAL_CYCLE_HOURS - current_cycle_used)

    # Remaining cycle hours after completing the trip
    cycle_remaining = max(0.0, TOTAL_CYCLE_HOURS - (current_cycle_used + total_duty_hours))

    # Insufficient cycle detection
    is_insufficient = (current_cycle_used + total_duty_hours) > TOTAL_CYCLE_HOURS

    warning_msg = ""
    if is_insufficient:
        exceeded_by = round((current_cycle_used + total_duty_hours) - TOTAL_CYCLE_HOURS, 1)
        warning_msg = (
            f"FMCSA HOS Warning: Driver has {round(initial_remaining_cycle, 1)}h remaining in 70-hr cycle, "
            f"but trip requires {round(total_duty_hours, 1)}h of on-duty time. Insufficient by {exceeded_by}h. "
            f"Mandatory 34-hour HOS cycle restart required before departure."
        )
        if daily_logs:
            daily_logs[0]['remarks'].insert(0, f"⚠️ FMCSA HOS ALERT: Initial remaining cycle ({round(initial_remaining_cycle, 1)}h) is insufficient for {round(total_duty_hours, 1)}h duty trip. 34-hr restart required.")

    return {
        'totalDistanceMiles': round(total_miles, 1),
        'totalDrivingHours': round(driving_hours_total, 1),
        'totalTripHours': round(total_trip_hours, 1),
        'totalDutyHours': round(total_duty_hours, 1),
        'currentCycleUsed': round(current_cycle_used, 1),
        'initialRemainingCycleHours': round(initial_remaining_cycle, 1),
        'remainingCycleHours': round(cycle_remaining, 1),
        'isCycleInsufficient': is_insufficient,
        'cycleWarningMessage': warning_msg,
        'estimatedArrival': dropoff_arr_dt.isoformat(),
        'startTime': start_iso,
        'fuelStopCount': fuel_count,
        'restStopCount': rest_count,
        'stops': stops,
        'dailyLogs': daily_logs,
        'routeGeometry': {
            'coordinates': geometry,
        },
    }
