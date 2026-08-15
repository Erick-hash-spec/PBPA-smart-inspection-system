"""
URL configuration for petroleum inspection system
"""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static


def root_status(request):
    return JsonResponse({
        'name': 'Smart Reporting System API',
        'status': 'running',
        'admin': '/admin/',
        'api': '/api/',
        'frontend': settings.FRONTEND_URL or None,
    })

urlpatterns = [
    path('', root_status, name='root-status'),
    path('admin/', admin.site.urls),
    path('api/', include('inspections.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
