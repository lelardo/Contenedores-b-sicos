# filepath: c:\Users\leona\Documents\Develop\proyecto_rapido\users\admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import UsuarioPersonalizado

admin.site.register(UsuarioPersonalizado, UserAdmin)