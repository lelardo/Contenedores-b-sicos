from django.urls import path
from django.contrib.auth import views as auth_views
from .views import (
    api_publicaciones, api_registro, api_login, api_perfil, api_logout,
    profile_picture, publicacion_imagen, inicio, registrar_usuario,
    custom_logout, perfil
)

urlpatterns = [
    # API endpoints
    path('api/publicaciones/', api_publicaciones, name='api_publicaciones'),
    path('api/registro/', api_registro, name='api_registro'),
    path('api/login/', api_login, name='api_login'),
    path('api/perfil/', api_perfil, name='api_perfil'),
    path('api/logout/', api_logout, name='api_logout'),
    
    # Image serving endpoints
    path('profile-picture/<int:user_id>/', profile_picture, name='profile_picture'),
    path('publicacion-imagen/<int:publicacion_id>/', publicacion_imagen, name='publicacion_imagen'),

    # Web app views
    path('', inicio, name='inicio'),
    path('registro/', registrar_usuario, name='registro'),
    path('login/', auth_views.LoginView.as_view(template_name='login.html', success_url='/perfil/'), name='login'),
    path('logout/', custom_logout, name='logout'),
    path('perfil/', perfil, name='perfil'),
]
