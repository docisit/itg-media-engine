# Generated migration: BlogPostImage model for multi-image blog posts

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('members', '0033_add_chat_rate_limit_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='BlogPostImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(help_text='Full-size image (auto-compressed to WebP on save)', upload_to='blog_images/')),
                ('compressed', models.ImageField(blank=True, help_text='Compressed WebP version (max 1920px wide)', null=True, upload_to='blog_images/compressed/')),
                ('thumbnail', models.ImageField(blank=True, help_text='Small thumbnail for carousel dots / list preview (400px wide)', null=True, upload_to='blog_images/thumbnails/')),
                ('caption', models.CharField(blank=True, help_text='Optional image caption', max_length=500)),
                ('order', models.PositiveIntegerField(default=0, help_text='Display order (0 = first / hero)')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('post', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='images', to='members.blogpost')),
            ],
            options={
                'verbose_name': 'Blog Image',
                'verbose_name_plural': 'Blog Images',
                'ordering': ['order', 'created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='blogpostimage',
            index=models.Index(fields=['post', 'order'], name='blog_post_img_order_idx'),
        ),
    ]