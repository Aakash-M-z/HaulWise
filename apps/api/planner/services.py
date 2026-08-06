import math
import requests
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple, Any

# Fallback geocoding dictionary for key US freight hubs
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
}

def geocode_location(query: str) -> Tuple[float, float]:
    clean_query = query.strip().lower()
    if clean_query in CITY_COORDINATES:
        return CITY_COORDINATES[clean_query]
    
    try:
        url = f"https://nominatim.openstreetmap.org/search?q={requests.utils.quote(query)}&format=json&limit=1"
        headers = {'User-Agent': 'HaulWise-Commercial-Logistics-Platform/1.0'}
        res = requests.get(url, headers=headers, timeout=3)
        if res.status_code == 200:
            data = res.json()
            if data and len(data) > 0:
                return (float(data[0]['lat']), float(data[0]['lon']))
    except Exception:
        pass
    
    # Hash query to deterministic fallback inside US bounds
    hash_val = sum(ord(c) for c in clean_query)
    lat = 32.0 + (hash_val % 1000) / 100.0
    lng = -100.0 + (hash_val % 1500) / 100.0
    return (lat, lng)

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3958.8  # Earth radius in miles
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_osrm_route(coords: List[Tuple[float, float]]) -> Dict[str, Any]:
    try:
        coord_str = ";".join([f"{lon:.5f},{lat:.5f}" for lat, lon in coords])
        url = f"http://router.project-osrm.org/route/v1/driving/{coord_str}?overview=full&geometries=geojson"
        res = requests.get(url, timeout=4)
        if res.status_code == 200:
            data = res.json()
            if data.get('routes') and len(data['routes']) > 0:
                route = data['routes'][0]
                distance_miles = route['distance'] / 1609.34
                duration_hours = route['duration'] / 3600.0
                geometry = route['geometry']['coordinates']
                return {
                    'distance_miles': distance_miles,
                    'duration_hours': duration_hours,
                    'geometry': geometry
                }
    except Exception:
        pass

    # Haversine fallback calculation
    total_dist = 0.0
    for i in range(len(coords) - 1):
        total_dist += haversine_distance(coords[i][0], coords[i][1], coords[i+1][0], coords[i+1][1])
    
    # 55 MPH average commercial speed
    duration_hours = total_dist / 55.0
    geometry = [[lon, lat] for lat, lon in coords]
    return {
        'distance_miles': total_dist,
        'duration_hours': duration_hours,
        'geometry': geometry
    }

def calculate_trip_plan(
    current_loc: str,
    pickup_loc: str,
    dropoff_loc: str,
    current_cycle_used: float = 0.0
) -> Dict[str, Any]:
    c_lat, c_lng = geocode_location(current_loc)
    p_lat, p_lng = geocode_location(pickup_loc)
    d_lat, d_lng = geocode_location(dropoff_loc)

    route_res = get_osrm_route([(c_lat, c_lng), (p_lat, p_lng), (d_lat, d_lng)])
    total_miles = route_res['distance_miles']
    
    avg_speed = 55.0
    driving_hours_total = total_miles / avg_speed if total_miles > 0 else 0.0
    
    now = datetime.now(timezone.utc)
    start_iso = now.isoformat()
    
    stops = []
    daily_logs = []
    
    # 1. Current Location Stop
    stops.append({
        'type': 'current',
        'location': current_loc,
        'coordinates': {'lat': c_lat, 'lng': c_lng},
        'arrivalTime': start_iso,
        'duration': 0.0,
        'distanceFromStart': 0.0,
    })

    # 2. Pickup Stop
    pickup_dist = haversine_distance(c_lat, c_lng, p_lat, p_lng)
    pickup_arr = (now + timedelta(hours=pickup_dist / avg_speed)).isoformat()
    stops.append({
        'type': 'pickup',
        'location': pickup_loc,
        'coordinates': {'lat': p_lat, 'lng': p_lng},
        'arrivalTime': pickup_arr,
        'duration': 1.0,
        'distanceFromStart': round(pickup_dist, 1),
    })

    accumulated_miles = pickup_dist
    accumulated_drive_hrs = pickup_dist / avg_speed
    miles_since_fuel = pickup_dist
    day_num = 1
    current_time_hr = 8.0 # 08:00 AM

    current_day_segments = [
        {
            'startHour': 8.0,
            'endHour': 9.0,
            'status': 'on_duty'
        }
    ]
    current_day_drive_hrs = 0.0
    current_time_hr = 9.0

    remaining_drive = driving_hours_total - (pickup_dist / avg_speed if pickup_dist / avg_speed < driving_hours_total else 0)
    if remaining_drive < 0:
        remaining_drive = driving_hours_total

    fuel_count = 0
    rest_count = 0

    while remaining_drive > 0:
        drive_chunk = min(remaining_drive, 8.0, 11.0 - current_day_drive_hrs)
        if drive_chunk <= 0:
            rest_count += 1
            rest_mileage = round(accumulated_miles, 1)
            stops.append({
                'type': 'rest',
                'location': f"Mandatory Rest Stop #{rest_count}",
                'coordinates': {'lat': c_lat + (p_lat - c_lat)*0.5, 'lng': c_lng + (p_lng - c_lng)*0.5},
                'arrivalTime': (now + timedelta(hours=accumulated_drive_hrs)).isoformat(),
                'duration': 10.0,
                'distanceFromStart': rest_mileage,
            })
            
            current_day_segments.append({
                'startHour': current_time_hr,
                'endHour': 24.0,
                'status': 'off_duty'
            })
            
            day_date = (now + timedelta(days=day_num - 1)).strftime('%Y-%m-%d')
            daily_logs.append({
                'date': day_date,
                'dayNumber': day_num,
                'segments': current_day_segments,
                'totalOffDuty': round(24.0 - current_day_drive_hrs - 1.0, 1),
                'totalSleeperBerth': 0.0,
                'totalDriving': round(current_day_drive_hrs, 1),
                'totalOnDuty': 1.0,
                'remarks': [f"Day {day_num} driving completed ({round(current_day_drive_hrs * avg_speed, 1)} miles)"]
            })
            
            day_num += 1
            current_time_hr = 6.0
            current_day_drive_hrs = 0.0
            current_day_segments = []
            continue

        start_t = current_time_hr
        current_time_hr += drive_chunk
        current_day_drive_hrs += drive_chunk
        accumulated_drive_hrs += drive_chunk
        chunk_miles = drive_chunk * avg_speed
        accumulated_miles += chunk_miles
        miles_since_fuel += chunk_miles
        remaining_drive -= drive_chunk

        current_day_segments.append({
            'startHour': round(start_t, 1),
            'endHour': round(current_time_hr, 1),
            'status': 'driving'
        })

        if miles_since_fuel >= 900 and remaining_drive > 0:
            miles_since_fuel = 0.0
            fuel_count += 1
            stops.append({
                'type': 'fuel',
                'location': f"Fuel & Inspection #{fuel_count}",
                'coordinates': {'lat': p_lat + (d_lat - p_lat)*0.4, 'lng': p_lng + (d_lng - p_lng)*0.4},
                'arrivalTime': (now + timedelta(hours=accumulated_drive_hrs)).isoformat(),
                'duration': 0.75,
                'distanceFromStart': round(accumulated_miles, 1),
            })
            current_day_segments.append({
                'startHour': round(current_time_hr, 1),
                'endHour': round(current_time_hr + 0.75, 1),
                'status': 'on_duty'
            })
            current_time_hr += 0.75
        elif drive_chunk >= 7.5 and remaining_drive > 0:
            rest_count += 1
            stops.append({
                'type': 'break',
                'location': '30-Min Mandatory Break',
                'coordinates': {'lat': p_lat + (d_lat - p_lat)*0.6, 'lng': p_lng + (d_lng - p_lng)*0.6},
                'arrivalTime': (now + timedelta(hours=accumulated_drive_hrs)).isoformat(),
                'duration': 0.5,
                'distanceFromStart': round(accumulated_miles, 1),
            })
            current_day_segments.append({
                'startHour': round(current_time_hr, 1),
                'endHour': round(current_time_hr + 0.5, 1),
                'status': 'off_duty'
            })
            current_time_hr += 0.5

    # 3. Dropoff Stop
    dropoff_arr = (now + timedelta(hours=accumulated_drive_hrs + 1.0)).isoformat()
    stops.append({
        'type': 'dropoff',
        'location': dropoff_loc,
        'coordinates': {'lat': d_lat, 'lng': d_lng},
        'arrivalTime': dropoff_arr,
        'duration': 1.0,
        'distanceFromStart': round(total_miles, 1),
    })
    
    current_day_segments.append({
        'startHour': round(current_time_hr, 1),
        'endHour': round(current_time_hr + 1.0, 1),
        'status': 'on_duty'
    })
    current_time_hr += 1.0
    
    if current_time_hr < 24.0:
        current_day_segments.append({
            'startHour': round(current_time_hr, 1),
            'endHour': 24.0,
            'status': 'off_duty'
        })

    day_date = (now + timedelta(days=day_num - 1)).strftime('%Y-%m-%d')
    daily_logs.append({
        'date': day_date,
        'dayNumber': day_num,
        'segments': current_day_segments,
        'totalOffDuty': round(24.0 - current_day_drive_hrs - 1.0, 1),
        'totalSleeperBerth': 0.0,
        'totalDriving': round(current_day_drive_hrs, 1),
        'totalOnDuty': 1.0,
        'remarks': [f"Trip completed at {dropoff_loc}"]
    })

    total_duty_hours = driving_hours_total + len(stops) * 0.5
    cycle_remaining = max(0.0, 70.0 - (current_cycle_used + total_duty_hours))
    est_arrival = dropoff_arr

    return {
        'totalDistanceMiles': round(total_miles, 1),
        'totalDrivingHours': round(driving_hours_total, 1),
        'totalTripHours': round(total_duty_hours, 1),
        'estimatedArrival': est_arrival,
        'startTime': start_iso,
        'remainingCycleHours': round(cycle_remaining, 1),
        'fuelStopCount': fuel_count,
        'restStopCount': rest_count,
        'stops': stops,
        'dailyLogs': daily_logs,
        'routeGeometry': {
            'coordinates': route_res['geometry']
        }
    }
