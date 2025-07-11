# Generated by Django 5.2.2 on 2025-06-05 01:35

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuariopersonalizado',
            name='profile_picture_name',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='usuariopersonalizado',
            name='profile_picture_type',
            field=models.CharField(blank=True, max_length=30, null=True),
        ),
        migrations.AlterField(
            model_name='usuariopersonalizado',
            name='profile_picture',
            field=models.BinaryField(blank=True, null=True),
        ),
    ]
