from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    UserRegistrationViewSet, UserProfileViewSet,
    TankViewSet, InspectionViewSet,
    SealViewSet, IsolationViewSet,
    InspectionCalculationViewSet, InspectionReportViewSet,
    ProductReceiptCertificateViewSet,
    SealIsolationReportViewSet,
    ShoreTankCalculationViewSet,
    ASTMLookupView,
    SubmissionViewSet, VesselReportViewSet,
    ProvisionalOuturnReportViewSet,
    StockReportViewSet,
)

router = DefaultRouter()
router.register(r'auth/register', UserRegistrationViewSet, basename='register')
router.register(r'users/profile', UserProfileViewSet, basename='user-profile')
router.register(r'tanks', TankViewSet, basename='tank')
router.register(r'inspections', InspectionViewSet, basename='inspection')
router.register(r'seals', SealViewSet, basename='seal')
router.register(r'isolations', IsolationViewSet, basename='isolation')
router.register(r'calculations', InspectionCalculationViewSet, basename='calculation')
router.register(r'reports', InspectionReportViewSet, basename='report')
router.register(r'product-receipt-certificates', ProductReceiptCertificateViewSet, basename='product-receipt-certificate')
router.register(r'seal-isolation-reports', SealIsolationReportViewSet, basename='seal-isolation-report')
router.register(r'shore-tank-calculations', ShoreTankCalculationViewSet, basename='shore-tank-calculation')
router.register(r'astm', ASTMLookupView, basename='astm')
router.register(r'submissions', SubmissionViewSet, basename='submission')
router.register(r'vessel-reports', VesselReportViewSet, basename='vessel-report')
router.register(r'provisional-outturn-reports', ProvisionalOuturnReportViewSet, basename='provisional-outturn-report')
router.register(r'stock-reports', StockReportViewSet, basename='stock-report')

urlpatterns = [
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', include(router.urls)),
]
