from django.conf import settings


def deployment_urls(request):
    return {
        'frontend_url': settings.FRONTEND_URL,
    }
