from django.shortcuts import render, redirect, get_object_or_404
from .forms import RegistroUsuarioForm, PublicacionForm
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout, authenticate, login
from django.http import HttpResponse, Http404, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from .models import UsuarioPersonalizado, Publicacion

# API Views
@csrf_exempt
@require_http_methods(["GET"])
def api_publicaciones(request):
    """API endpoint to get all publications"""
    publicaciones = Publicacion.objects.all().select_related('usuario')
    data = []
    for pub in publicaciones:
        data.append({
            'id': pub.id,
            'titulo': pub.titulo,
            'contenido': pub.contenido,
            'fecha_creacion': pub.fecha_creacion.isoformat(),
            'usuario': {
                'id': pub.usuario.id,
                'username': pub.usuario.username,
                'first_name': pub.usuario.first_name,
                'last_name': pub.usuario.last_name,
                'has_profile_picture': bool(pub.usuario.profile_picture)
            },
            'has_imagen': bool(pub.imagen)
        })
    return JsonResponse({'publicaciones': data})

@csrf_exempt
@require_http_methods(["POST"])
def api_registro(request):
    """API endpoint for user registration"""
    try:
        # Handle multipart form data instead of JSON
        form = RegistroUsuarioForm(request.POST, request.FILES)
        
        if form.is_valid():
            user = form.save()
            return JsonResponse({
                'success': True,
                'message': f'Cuenta creada para {user.username}!',
                'user_id': user.id
            })
        else:
            return JsonResponse({
                'success': False,
                'errors': form.errors
            }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def api_login(request):
    """API endpoint for user login"""
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return JsonResponse({
                'success': True,
                'message': 'Login exitoso',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': user.email,
                    'fecha_nacimiento': user.fecha_nacimiento.isoformat() if user.fecha_nacimiento else None,
                    'has_profile_picture': bool(user.profile_picture)
                }
            })
        else:
            return JsonResponse({
                'success': False,
                'message': 'Credenciales inválidas'
            }, status=401)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)

@login_required
@csrf_exempt
@require_http_methods(["GET", "POST"])
def api_perfil(request):
    """API endpoint for user profile"""
    if request.method == 'GET':
        publicaciones_usuario = Publicacion.objects.filter(usuario=request.user)
        data = []
        for pub in publicaciones_usuario:
            data.append({
                'id': pub.id,
                'titulo': pub.titulo,
                'contenido': pub.contenido,
                'fecha_creacion': pub.fecha_creacion.isoformat(),
                'has_imagen': bool(pub.imagen)
            })
        
        return JsonResponse({
            'user': {
                'id': request.user.id,
                'username': request.user.username,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'email': request.user.email,
                'fecha_nacimiento': request.user.fecha_nacimiento.isoformat() if request.user.fecha_nacimiento else None,
                'has_profile_picture': bool(request.user.profile_picture)
            },
            'publicaciones': data
        })
    
    elif request.method == 'POST':
        try:
            # Handle multipart form data for publications with images
            form = PublicacionForm(request.POST, request.FILES)
            if form.is_valid():
                publicacion = form.save(commit=False)
                publicacion.usuario = request.user
                
                if 'imagen' in request.FILES:
                    imagen_file = request.FILES['imagen']
                    publicacion.imagen_name = imagen_file.name
                    publicacion.imagen_type = imagen_file.content_type
                    publicacion.imagen = imagen_file.read()
                    
                publicacion.save()
                return JsonResponse({
                    'success': True,
                    'message': '¡Publicación creada con éxito!',
                    'publicacion': {
                        'id': publicacion.id,
                        'titulo': publicacion.titulo,
                        'contenido': publicacion.contenido,
                        'fecha_creacion': publicacion.fecha_creacion.isoformat()
                    }
                })
            else:
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                }, status=400)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': str(e)
            }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def api_logout(request):
    """API endpoint for user logout"""
    logout(request)
    return JsonResponse({'success': True, 'message': 'Logout exitoso'})

def profile_picture(request, user_id):
    """Vista para servir la imagen de perfil desde la base de datos"""
    try:
        user = UsuarioPersonalizado.objects.get(id=user_id)
        if user.profile_picture and user.profile_picture_type:
            return HttpResponse(
                user.profile_picture,
                content_type=user.profile_picture_type
            )
    except UsuarioPersonalizado.DoesNotExist:
        pass
    
    raise Http404("Imagen no encontrada")

def publicacion_imagen(request, publicacion_id):
    """Vista para servir la imagen de una publicación"""
    try:
        publicacion = Publicacion.objects.get(id=publicacion_id)
        if publicacion.imagen and publicacion.imagen_type:
            return HttpResponse(
                publicacion.imagen,
                content_type=publicacion.imagen_type
            )
    except Publicacion.DoesNotExist:
        pass
    
    raise Http404("Imagen no encontrada")

# Web Views
def inicio(request):
    """Vista principal de la aplicación web"""
    return render(request, 'inicio.html')

def registrar_usuario(request):
    """Vista para registro de usuario en la web"""
    if request.method == 'POST':
        form = RegistroUsuarioForm(request.POST, request.FILES)
        if form.is_valid():
            user = form.save()
            username = form.cleaned_data.get('username')
            messages.success(request, f'Cuenta creada para {username}!')
            return redirect('login')
    else:
        form = RegistroUsuarioForm()
    return render(request, 'registro.html', {'form': form})

@login_required
def perfil(request):
    """Vista del perfil de usuario"""
    if request.method == 'POST':
        form = PublicacionForm(request.POST, request.FILES)
        if form.is_valid():
            publicacion = form.save(commit=False)
            publicacion.usuario = request.user
            
            if 'imagen' in request.FILES:
                imagen_file = request.FILES['imagen']
                publicacion.imagen_name = imagen_file.name
                publicacion.imagen_type = imagen_file.content_type
                publicacion.imagen = imagen_file.read()
                
            publicacion.save()
            messages.success(request, '¡Publicación creada con éxito!')
            return redirect('perfil')
    else:
        form = PublicacionForm()
    
    publicaciones_usuario = Publicacion.objects.filter(usuario=request.user)
    return render(request, 'perfil.html', {'form': form, 'publicaciones': publicaciones_usuario})

def custom_logout(request):
    """Vista personalizada para logout"""
    logout(request)
    messages.info(request, 'Has cerrado sesión exitosamente.')
    return redirect('inicio')