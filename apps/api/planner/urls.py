from django.urls import path
from . import views

urlpatterns = [
    path('trip', views.trip_list_create, name='trip-create'),
    path('trip/', views.trip_list_create, name='trip-create-slash'),
    path('trips', views.trip_list_create, name='trip-list'),
    path('trips/', views.trip_list_create, name='trip-list-slash'),
    path('trips/<str:pk>', views.trip_detail, name='trip-detail'),
    path('trips/<str:pk>/', views.trip_detail, name='trip-detail-slash'),
]
