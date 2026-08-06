import uuid
from django.db import models

class Trip(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=uuid.uuid4)
    current_location = models.CharField(max_length=255)
    pickup_location = models.CharField(max_length=255)
    dropoff_location = models.CharField(max_length=255)
    current_cycle_used = models.FloatField(default=0.0)
    trip_plan = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Trip {self.id}: {self.pickup_location} -> {self.dropoff_location}"
