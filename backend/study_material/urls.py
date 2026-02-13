from django.urls import path
from . import views

urlpatterns = [
    path('', views.StudyMaterialListView.as_view(), name='study-material-list'),
]
