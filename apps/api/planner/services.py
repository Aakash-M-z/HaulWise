import math
import requests
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
    
    # Generate simple line geometry
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
    
    # Commercial driving logic (55 MPH average speed)
    avg_speed = 55.0
    driving_hours_total = total_miles / avg_speed if total_miles > 0 else 0.0
    
    stops = []
    daily_logs = []
    
    # Initial Pickup Stop
    stops.append({
        'name': f"Pickup: {pickup_loc}",
        'type': 'pickup',
        'location': {'lat': p_lat, 'lng': p_lng},
        'mileage': round(haversine_distance(c_lat, c_lng, p_lat, p_lng), 1),
        'duration_minutes': 60,
        'note': 'Load cargo & inspect trailer'
    })

    # HOS Calculation
    accumulated_miles = 0.0
    accumulated_drive_hrs = 0.0
    miles_since_fuel = 0.0
    day_num = 1
    current_time_hr = 8.0 # Start at 08:00 AM

    current_day_segments = []
    current_day_drive_hrs = 0.0

    # Add initial morning inspection / pickup
    current_day_segments.append({
        'status': 'ON_DUTY_NOT_DRIVING',
        'duration_hours': 1.0,
        'start_hour': 8.0,
        'end_hour': 9.0,
        'location': current_loc,
        'remarks': 'Pre-trip inspection & pickup loading'
    })
    current_time_hr = 9.0

    remaining_drive = driving_hours_total
    
    while remaining_drive > 0:
        # Drive chunk up to 8h before mandatory break or remaining
        drive_chunk = min(remaining_drive, 8.0, 11.0 - current_day_drive_hrs)
        if drive_chunk <= 0:
            # Need 10h rest break
            stops.append({
                'name': f"10h Mandatory Rest Stop (Day {day_num})",
                'type': 'rest',
                'location': {'lat': c_lat + (p_lat - c_lat)*0.5, 'lng': c_lng + (p_lng - c_lng)*0.5},
                'mileage': round(accumulated_miles, 1),
                'duration_minutes': 600,
                'note': 'FMCSA 10-hour off-duty rest period'
            })
            
            # Close day log
            current_day_segments.append({
                'status': 'OFF_DUTY',
                'duration_hours': 24.0 - current_time_hr,
                'start_hour': current_time_hr,
                'end_hour': 24.0,
                'location': 'Rest Haven Truck Stop',
                'remarks': '10-hour mandatory off-duty rest'
            })
            daily_logs.append({
                'day_number': day_num,
                'date': f"Day {day_num}",
                'total_miles': round(current_day_drive_hrs * avg_speed, 1),
                'total_drive_hours': round(current_day_drive_hrs, 1),
                'segments': current_day_segments
            })
            
            day_num += 1
            current_time_hr = 6.0 # Start next day at 06:00 AM
            current_day_drive_hrs = 0.0
            current_day_segments = []
            continue

        # Execute drive chunk
        start_t = current_time_hr
        current_time_hr += drive_chunk
        current_day_drive_hrs += drive_chunk
        accumulated_drive_hrs += drive_chunk
        chunk_miles = drive_chunk * avg_speed
        accumulated_miles += chunk_miles
        miles_since_fuel += chunk_miles
        remaining_drive -= drive_chunk

        current_day_segments.append({
            'status': 'DRIVING',
            'duration_hours': round(drive_chunk, 1),
            'start_hour': round(start_t, 1),
            'end_hour': round(current_time_hr, 1),
            'location': 'Interstate Transit',
            'remarks': f"Driving towards {dropoff_loc}"
        })

        # Fuel check every 1000 mi
        if miles_since_fuel >= 900 and remaining_drive > 0:
            miles_since_fuel = 0.0
            stops.append({
                'name': 'Fuel & Inspection Break',
                'type': 'fuel',
                'location': {'lat': p_lat + (d_lat - p_lat)*0.4, 'lng': p_lng + (d_lng - p_lng)*0.4},
                'mileage': round(accumulated_miles, 1),
                'duration_minutes': 45,
                'note': 'Refuel commercial tractor & 30-min break'
            })
            current_day_segments.append({
                'status': 'ON_DUTY_NOT_DRIVING',
                'duration_hours': 0.75,
                'start_hour': round(current_time_hr, 1),
                'end_hour': round(current_time_hr + 0.75, 1),
                'location': 'Loves Travel Stop',
                'remarks': 'Fueling & 30-min rest break'
            })
            current_time_hr += 0.75
        elif drive_chunk >= 7.5 and remaining_drive > 0:
            # 30-minute break
            stops.append({
                'name': '30-Minute Mandatory Rest Break',
                'type': 'rest',
                'location': {'lat': p_lat + (d_lat - p_lat)*0.6, 'lng': p_lng + (d_lng - p_lng)*0.6},
                'mileage': round(accumulated_miles, 1),
                'duration_minutes': 30,
                'note': '30-minute HOS off-duty break'
            })
            current_day_segments.append({
                'status': 'OFF_DUTY',
                'duration_hours': 0.5,
                'start_hour': round(current_time_hr, 1),
                'end_hour': round(current_time_hr + 0.5, 1),
                'location': 'Rest Area',
                'remarks': 'Mandatory 30-minute rest break'
            })
            current_time_hr += 0.5

    # Final Dropoff Stop
    stops.append({
        'name': f"Dropoff: {dropoff_loc}",
        'type': 'dropoff',
        'location': {'lat': d_lat, 'lng': d_lng},
        'mileage': round(total_miles, 1),
        'duration_minutes': 60,
        'note': 'Unload cargo & post-trip inspection'
    })
    
    current_day_segments.append({
        'status': 'ON_DUTY_NOT_DRIVING',
        'duration_hours': 1.0,
        'start_hour': round(current_time_hr, 1),
        'end_hour': round(current_time_hr + 1.0, 1),
        'location': dropoff_loc,
        'remarks': 'Unloading & post-trip inspection'
    })
    current_time_hr += 1.0
    
    # Fill remaining day off duty
    if current_time_hr < 24.0:
        current_day_segments.append({
            'status': 'OFF_DUTY',
            'duration_hours': round(24.0 - current_time_hr, 1),
            'start_hour': round(current_time_hr, 1),
            'end_hour': 24.0,
            'location': dropoff_loc,
            'remarks': 'Post-trip off duty'
        })

    daily_logs.append({
        'day_number': day_num,
        'date': f"Day {day_num}",
        'total_miles': round(current_day_drive_hrs * avg_speed, 1),
        'total_drive_hours': round(current_day_drive_hrs, 1),
        'segments': current_day_segments
    })

    # Summary metrics
    total_duty_hours = driving_hours_total + len(stops) * 0.75
    cycle_remaining = max(0.0, 70.0 - (current_cycle_used + total_duty_hours))

    return {
        'total_distance_miles': round(total_miles, 1),
        'estimated_driving_hours': round(driving_hours_total, 1),
        'total_trip_duration_hours': round(total_duty_hours, 1),
        'cycle_hours_remaining': round(cycle_remaining, 1),
        'current_cycle_used': current_cycle_used,
        'hos_compliant': cycle_remaining > 0,
        'locations': {
            'current': {'name': current_loc, 'lat': c_lat, 'lng': c_lng},
            'pickup': {'name': pickup_loc, 'lat': p_lat, 'lng': p_lng},
            'dropoff': {'name': dropoff_loc, 'lat': d_lat, 'lng': d_lng},
        },
        'route_geometry': route_res['geometry'],
        'stops': stops,
        'daily_logs': daily_logs
    }
