import uuid
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Trip
from .serializers import TripInputSerializer, TripSerializer
from .services import calculate_trip_plan

MEMORY_TRIPS = []

@api_view(['GET'])
def health_check(request):
    return Response({"status": "ok", "service": "HaulWise Commercial Logistics API"}, status=status.HTTP_200_OK)

@api_view(['GET', 'POST'])
def trip_list_create(request):
    if request.method == 'POST':
        print("[API] Incoming request.data:", request.data)
        
        serializer = TripInputSerializer(data=request.data)
        if not serializer.is_valid():
            print("[API] Serializer validation errors:", serializer.errors)
            
            first_field = next(iter(serializer.errors))
            first_msg = serializer.errors[first_field][0]
            
            return Response({
                "success": False,
                "message": f"Validation error on field '{first_field}': {first_msg}",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        current_loc = data['current_location']
        pickup_loc = data['pickup_location']
        dropoff_loc = data['dropoff_location']
        cycle_used = data.get('current_cycle_used', 0.0)

        plan = calculate_trip_plan(current_loc, pickup_loc, dropoff_loc, cycle_used)
        trip_id = str(uuid.uuid4())

        response_data = {
            'id': trip_id,
            'current_location': current_loc,
            'pickup_location': pickup_loc,
            'dropoff_location': dropoff_loc,
            'current_cycle_used': cycle_used,
            'trip_plan': plan,
            'totalDistanceMiles': plan['totalDistanceMiles'],
            'totalDrivingHours': plan['totalDrivingHours'],
            'totalTripHours': plan['totalTripHours'],
            'estimatedArrival': plan['estimatedArrival'],
            'startTime': plan['startTime'],
            'remainingCycleHours': plan['remainingCycleHours'],
            'fuelStopCount': plan['fuelStopCount'],
            'restStopCount': plan['restStopCount'],
            'stops': plan['stops'],
            'dailyLogs': plan['dailyLogs'],
            'routeGeometry': plan['routeGeometry'],
            'distance': plan['totalDistanceMiles'],
            'duration': plan['totalTripHours'],
            'fuelStops': plan['fuelStopCount'],
            'restStops': plan['restStopCount'],
            'remainingCycle': plan['remainingCycleHours'],
            'eldLogs': plan['dailyLogs'],
        }

        try:
            trip_obj = Trip.objects.create(
                id=trip_id,
                current_location=current_loc,
                pickup_location=pickup_loc,
                dropoff_location=dropoff_loc,
                current_cycle_used=cycle_used,
                trip_plan=plan
            )
            response_data['created_at'] = trip_obj.created_at.isoformat()
        except Exception as e:
            print("[API] DB save warning (using memory fallback):", e)
            MEMORY_TRIPS.insert(0, response_data)

        return Response(response_data, status=status.HTTP_201_CREATED)

    elif request.method == 'GET':
        try:
            trips = list(Trip.objects.all())
            serializer = TripSerializer(trips, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            print("[API] DB fetch error (falling back to memory):", e)
            return Response(MEMORY_TRIPS, status=status.HTTP_200_OK)

@api_view(['GET'])
def trip_detail(request, pk):
    try:
        trip = Trip.objects.get(pk=pk)
        serializer = TripSerializer(trip)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        print("[API] DB detail error (checking memory):", e)
        for t in MEMORY_TRIPS:
            if t.get('id') == str(pk):
                return Response(t, status=status.HTTP_200_OK)
        return Response({
            "success": False,
            "message": f"Trip with ID {pk} not found",
            "errors": {"id": ["Trip not found"]}
        }, status=status.HTTP_404_NOT_FOUND)
