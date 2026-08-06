from rest_framework import serializers
from .models import Trip

class TripInputSerializer(serializers.Serializer):
    current_location = serializers.CharField(max_length=255, required=True, error_messages={'required': 'current_location is required'})
    pickup_location = serializers.CharField(max_length=255, required=True, error_messages={'required': 'pickup_location is required'})
    dropoff_location = serializers.CharField(max_length=255, required=True, error_messages={'required': 'dropoff_location is required'})
    current_cycle_used = serializers.FloatField(default=0.0, min_value=0.0, max_value=70.0)

    def to_internal_value(self, data):
        # Normalize camelCase inputs to snake_case if sent by frontend
        if isinstance(data, dict):
            normalized = data.copy()
            if 'currentLocation' in normalized and 'current_location' not in normalized:
                normalized['current_location'] = normalized.pop('currentLocation')
            if 'pickupLocation' in normalized and 'pickup_location' not in normalized:
                normalized['pickup_location'] = normalized.pop('pickupLocation')
            if 'dropoffLocation' in normalized and 'dropoff_location' not in normalized:
                normalized['dropoff_location'] = normalized.pop('dropoffLocation')
            if 'currentCycleUsed' in normalized and 'current_cycle_used' not in normalized:
                normalized['current_cycle_used'] = normalized.pop('currentCycleUsed')
            elif 'cycleHours' in normalized and 'current_cycle_used' not in normalized:
                normalized['current_cycle_used'] = normalized.pop('cycleHours')
            data = normalized
        return super().to_internal_value(data)

class TripSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = ['id', 'current_location', 'pickup_location', 'dropoff_location', 'current_cycle_used', 'trip_plan', 'created_at']
