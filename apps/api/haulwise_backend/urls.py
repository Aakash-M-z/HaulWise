from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def root_api_index(request):
    return JsonResponse({
        "name": "HaulWise Commercial Logistics API",
        "status": "online",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/healthz",
            "plan_trip": "POST /api/trip",
            "list_trips": "GET /api/trips",
            "trip_detail": "GET /api/trips/<id>"
        },
        "frontend_url": "http://localhost:5173"
    })

urlpatterns = [
    path('', root_api_index, name='root-index'),
    path('admin/', admin.site.urls),
    path('api/', include('planner.urls')),
]
