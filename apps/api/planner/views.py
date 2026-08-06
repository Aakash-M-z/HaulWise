import uuid
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Trip
from .serializers import TripInputSerializer, TripSerializer
from .services import calculate_trip_plan

# In-memory trip store fallback
MEMORY_TRIPS = []

@api_view(['GET', 'POST'])
def trip_list_create(request):
    if request.method == 'POST':
        serializer = TripInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
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
        except Exception:
            MEMORY_TRIPS.insert(0, response_data)

        return Response(response_data, status=status.HTTP_201_CREATED)

    elif request.method == 'GET':
        try:
            trips = Trip.objects.all()
            serializer = TripSerializer(trips, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception:
            return Response(MEMORY_TRIPS, status=status.HTTP_200_OK)

@api_view(['GET'])
def trip_detail(request, pk):
    try:
        trip = Trip.objects.get(pk=pk)
        serializer = TripSerializer(trip)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception:
        # Check memory store fallback
        for t in MEMORY_TRIPS:
            if t.get('id') == pk:
                return Response(t, status=status.HTTP_200_OK)
        return Response({'error': 'Trip not found'}, status=status.HTTP_404_NOT_FOUND)
