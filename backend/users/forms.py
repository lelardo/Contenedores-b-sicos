from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import UsuarioPersonalizado, Publicacion

class RegistroUsuarioForm(UserCreationForm):
    email = forms.EmailField(required=True)
    first_name = forms.CharField(max_length=30, required=True)
    last_name = forms.CharField(max_length=30, required=True)
    profile_picture = forms.ImageField(required=False)
    # Añadir el campo de fecha de nacimiento con un widget DateInput
    fecha_nacimiento = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={'type': 'date'})
    )

    class Meta:
        model = UsuarioPersonalizado
        fields = ('username', 'first_name', 'last_name', 'email', 'fecha_nacimiento', 'password1', 'password2')

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        user.first_name = self.cleaned_data['first_name'] 
        user.last_name = self.cleaned_data['last_name']
        
        # Guardar la fecha de nacimiento si se proporcionó
        if 'fecha_nacimiento' in self.cleaned_data:
            user.fecha_nacimiento = self.cleaned_data['fecha_nacimiento']
        
        # Convertir la imagen a datos binarios si se proporcionó una
        if 'profile_picture' in self.cleaned_data and self.cleaned_data['profile_picture']:
            image_file = self.cleaned_data['profile_picture']
            # Guardar el nombre y tipo de archivo
            user.profile_picture_name = image_file.name
            user.profile_picture_type = image_file.content_type
            # Leer los datos binarios y guardarlos
            user.profile_picture = image_file.read()
        
        if commit:
            user.save()
            
        return user

class PublicacionForm(forms.ModelForm):
    imagen = forms.ImageField(required=False)
    
    class Meta:
        model = Publicacion
        fields = ('titulo', 'contenido', 'imagen')
        widgets = {
            'titulo': forms.TextInput(attrs={'class': 'form-control'}),
            'contenido': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
        }