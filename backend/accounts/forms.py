from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import User

class UserRegistrationForm(UserCreationForm):
    email = forms.EmailField(required=True)
    first_name = forms.CharField(required=True, max_length=30)
    last_name = forms.CharField(required=True, max_length=30)
    phone_number = forms.CharField(required=True, max_length=15)
    date_of_birth = forms.DateField(
        required=True,
        widget=forms.DateInput(attrs={'type': 'date'})
    )
    address = forms.CharField(required=True, widget=forms.Textarea(attrs={'rows': 3}))
    proof_id_type = forms.ChoiceField(
        required=True,
        choices=[
            ('', 'Select ID Type'),
            ('AADHAR', 'Aadhar Card'),
            ('PAN', 'PAN Card'),
            ('DRIVING_LICENSE', 'Driving License'),
            ('PASSPORT', 'Passport'),
        ]
    )
    proof_id_number = forms.CharField(required=True, max_length=50)
    proof_id_document = forms.FileField(required=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name', 
            'phone_number', 'date_of_birth', 'address',
            'proof_id_type', 'proof_id_number', 'proof_id_document',
            'password1', 'password2'
        ]
