import zlib
import json
import base64
from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

class Profile(models.Model):
    ROLE_CHOICES = (
        ('coach', 'Coach'),
        ('athlete', 'Athlete'),
        ('staff', 'Staff'),
        ('vip', 'VIP'),
    )

    # Core Connection
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    
    # Basic Info
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='athlete')
    bio = models.TextField(max_length=500, blank=True)
    profile_image = models.ImageField(upload_to='profile_pics/', default='default.jpg')
    
    # === COACH SPECIFIC (Drills/Training) ===
    is_verified_coach = models.BooleanField(default=False, help_text="Coach is verified by staff")
    years_of_experience = models.IntegerField(null=True, blank=True, help_text="Years of coaching experience")
    certifications = models.TextField(blank=True, help_text="Coaching certifications (comma-separated)")
    
    # Scouting & Social Links
    hudl_link = models.URLField(max_length=255, blank=True, help_text="Link to your Hudl highlight reel")
    maxpreps_link = models.URLField(max_length=255, blank=True, help_text="Link to your MaxPreps profile")
    twitter_x_link = models.URLField(max_length=255, blank=True, null=True, help_text="Link to your X (Twitter) profile")
    
    # Recruiting Data
    graduation_year = models.IntegerField(blank=True, null=True)
    position = models.CharField(max_length=100, blank=True)
    school_name = models.CharField(max_length=200, blank=True)
    
    # === EMAIL VERIFICATION ===
    email_verified = models.BooleanField(default=False, help_text="Email has been verified")
    email_verification_token = models.CharField(max_length=100, blank=True, null=True, unique=True, help_text="Token for email verification")
    email_verification_sent_at = models.DateTimeField(null=True, blank=True, help_text="When verification email was sent")
    
    # === AGE GATE / COPPA ===
    date_of_birth = models.DateField(null=True, blank=True, help_text="User's date of birth (collected only at registration)")
    parent_email = models.EmailField(blank=True, help_text="Parent/guardian email for under-13 users")
    is_parental_consent_granted = models.BooleanField(default=False, help_text="Parental consent has been obtained (COPPA)")
    parental_consent_method = models.CharField(max_length=50, blank=True,
        choices=[('credit_card', 'Credit Card Authorization'),
                 ('signed_form', 'Signed Consent Form'),
                 ('video_chat', 'Video Chat Verification')],
        help_text="Method used to verify parental consent")
    parental_consent_granted_at = models.DateTimeField(null=True, blank=True, help_text="When parental consent was granted")
    parental_consent_expires_at = models.DateTimeField(null=True, blank=True, help_text="When parental consent expires (annually)")

    # === ATHLETE STATS (v2 - Elite Athlete System) ===
    state = models.CharField(max_length=2, blank=True, help_text="Two-letter state code (e.g., TX, CA)")
    sports = models.ManyToManyField('Sport', blank=True, help_text="Sports this athlete plays")
    
    # Measurables
    height_ft = models.IntegerField(null=True, blank=True, help_text="Height in feet")
    height_in = models.IntegerField(null=True, blank=True, help_text="Height in inches (0-11)")
    weight_lbs = models.IntegerField(null=True, blank=True, help_text="Weight in pounds")
    
    # Per-Sport Specific Stats (JSON — flexible for any sport attribute recruiters look for)
    sport_specific_stats = models.JSONField(default=dict, blank=True, 
        help_text="Per-sport stats keyed by sport slug. e.g., {'basketball': {'wingspan_in': 82, 'hand_size_in': 9.5}}"
    )
    
    # Performance Stats
    vertical_jump_in = models.FloatField(null=True, blank=True, help_text="Vertical jump in inches")
    forty_yard_time = models.FloatField(null=True, blank=True, help_text="40-yard dash time in seconds")

    max_bench_lbs = models.IntegerField(null=True, blank=True, help_text="Max bench press in pounds")
    max_squat_lbs = models.IntegerField(null=True, blank=True, help_text="Max squat in pounds")
    max_power_clean_lbs = models.IntegerField(null=True, blank=True, help_text="Max power clean in pounds")
    shuttle_time = models.FloatField(null=True, blank=True, help_text="Pro-agility shuttle time in seconds")
    gpa = models.FloatField(null=True, blank=True, help_text="Grade point average (0.0 - 4.0)")
    
    # Computed property helpers for strength ratios
    @property
    def bench_ratio(self):
        """Strength-to-weight ratio for bench press"""
        if self.max_bench_lbs and self.weight_lbs and self.weight_lbs > 0:
            return round(self.max_bench_lbs / self.weight_lbs, 2)
        return None
    
    @property
    def squat_ratio(self):
        """Strength-to-weight ratio for squat"""
        if self.max_squat_lbs and self.weight_lbs and self.weight_lbs > 0:
            return round(self.max_squat_lbs / self.weight_lbs, 2)
        return None
    
    @property
    def power_clean_ratio(self):
        """Strength-to-weight ratio for power clean"""
        if self.max_power_clean_lbs and self.weight_lbs and self.weight_lbs > 0:
            return round(self.max_power_clean_lbs / self.weight_lbs, 2)
        return None
    
    @property
    def height_display(self):
        """Display height as '6'2"' format"""
        if self.height_ft is not None and self.height_in is not None:
            return f"{self.height_ft}'{self.height_in}\""
        return None
    
    def __str__(self):
        return f"{self.user.username}'s Profile ({self.role})"


# --- AUTOMATION SIGNALS ---
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    # Only save profile if it exists (avoid errors when profile missing)
    try:
        profile = instance.profile
    except Exception:
        return
    profile.save()


class Show(models.Model):
    CATEGORY_CHOICES = [
        ('interview', 'Interview'),
        ('training', 'Training'),
        ('analysis', 'Game Analysis'),
        ('recruiting', 'Recruiting'),
        ('coaching', 'Coaching'),
        ('other', 'Other'),
    ]
    
    # Basic Information
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, help_text="Detailed show description")
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='interview', blank=True)
    tags = models.CharField(max_length=255, blank=True, help_text="Comma-separated tags (e.g., football, recruiting, training)")
    
    # Guest Information
    guest = models.ForeignKey(Profile, on_delete=models.SET_NULL, null=True, blank=True, 
                              help_text="Link to guest profile (optional)")
    guest_name_override = models.CharField(max_length=200, blank=True, 
                                          help_text="Override guest name if not in system")
    
    # Media
    image = models.ImageField(upload_to='show_images/', null=True, blank=True, 
                             help_text='Main show image/poster')
    thumbnail = models.ImageField(upload_to='show_thumbnails/', null=True, blank=True,
                                 help_text='Thumbnail for calendar/past shows (optional)')
    video_url = models.URLField(blank=True, help_text="Link to recorded video (YouTube, Facebook, etc.)")
    
    # Scheduling
    air_date = models.DateTimeField()
    duration = models.IntegerField(default=60, help_text="Duration in minutes")
    
    # Content
    transcript = models.TextField(blank=True, help_text="Full show transcript")
    questions_asked = models.TextField(blank=True, help_text="List of questions used in the show")
    show_notes = models.TextField(blank=True, help_text="Additional notes, resources, or links")
    
    # Status
    is_live = models.BooleanField(default=False, help_text="Currently broadcasting live")
    is_published = models.BooleanField(default=True, help_text="Show in public calendar")
    
    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-air_date']
        indexes = [
            models.Index(fields=['-air_date', 'is_published']),
            models.Index(fields=['guest', 'is_published']),
            models.Index(fields=['category', 'is_published']),
        ]

    def __str__(self):
        return f"{self.title} - {self.air_date.date()}"
    
    @property
    def display_guest_name(self):
        """Get guest name for display"""
        if self.guest:
            return self.guest.user.username
        return self.guest_name_override or "Guest TBA"
    
    @property 
    def is_past(self):
        return self.air_date < timezone.now()
    
    @property
    def duration_formatted(self):
        """Format duration as hours and minutes"""
        hours = self.duration // 60
        minutes = self.duration % 60
        if hours > 0:
            return f"{hours}h {minutes}m"
        return f"{minutes}m"
    
    def get_tags_list(self):
        """Convert tags string to list"""
        if not self.tags:
            return []
        return [tag.strip() for tag in self.tags.split(',') if tag.strip()]


class GuestRequest(models.Model):
    ROLE_CHOICES = [
        ('athlete', 'Athlete'),
        ('coach', 'Coach'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('verified', 'Email Verified - Pending Approval'),
    ]
    
    # Basic Information
    name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True, null=True, help_text="Phone number for verification")
    
    # Security Information
    ip_address = models.GenericIPAddressField(blank=True, null=True, help_text="IP address at time of submission")
    user_agent = models.TextField(blank=True, null=True, help_text="Browser user agent")
    
    # Verification Information
    verification_token = models.CharField(max_length=100, blank=True, null=True, unique=True)
    verification_sent_at = models.DateTimeField(blank=True, null=True)
    verified_at = models.DateTimeField(blank=True, null=True)
    verification_attempts = models.IntegerField(default=0)
    
    # Guest Information
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='athlete')
    hudl = models.URLField(blank=True, null=True)
    maxpreps = models.URLField(blank=True, null=True)
    bio = models.TextField(default="", blank=True)
    
    # Status Tracking
    submitted_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
    approved_at = models.DateTimeField(blank=True, null=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='approved_requests')
    rejection_reason = models.TextField(blank=True, null=True, help_text="Reason for rejection if applicable")
    
    # Metadata
    notes = models.TextField(blank=True, null=True, help_text="Internal notes about this request")
    
    # Additional fields for frontend compatibility
    phone_number = models.CharField(max_length=20, blank=True, null=True, help_text="Phone number (legacy field)")
    reason = models.TextField(blank=True, null=True, help_text="Reason for guest request")
    show = models.ForeignKey(Show, on_delete=models.SET_NULL, blank=True, null=True, help_text="Associated show")
    
    class Meta:
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['status', 'submitted_at']),
            models.Index(fields=['email', 'status']),
            models.Index(fields=['verification_token']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.role}) - {self.status}"
    
    def generate_verification_token(self):
        """Generate a unique verification token"""
        import secrets
        import string
        alphabet = string.ascii_letters + string.digits
        token = ''.join(secrets.choice(alphabet) for _ in range(32))
        self.verification_token = token
        self.verification_sent_at = timezone.now()
        self.save()
        return token
    
    def verify_email(self, token):
        """Verify email with token"""
        if self.verification_token == token:
            self.verified_at = timezone.now()
            self.status = 'verified'
            self.verification_token = None  # Clear token after verification
            self.save()
            return True
        self.verification_attempts += 1
        self.save()
        return False
    
    def is_verified(self):
        """Check if email is verified"""
        return self.verified_at is not None
    
    def approve(self, user):
        """Approve this guest request"""
        self.status = 'approved'
        self.approved_at = timezone.now()
        self.approved_by = user
        self.save()
    
    def reject(self, user, reason=""):
        """Reject this guest request"""
        self.status = 'rejected'
        self.rejection_reason = reason
        self.save()
    
    def get_days_since_submission(self):
        """Get days since submission"""
        from django.utils import timezone
        return (timezone.now() - self.submitted_at).days
    

class MediaAsset(models.Model):
    MEDIA_TYPE_CHOICES = [
        ('video', 'Video'),
        ('highlight', 'Game Highlight'),
        ('interview', 'Interview'),
        ('drill', 'Coach Drill/Training'),
        ('training', 'Training Footage'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='media_assets')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, help_text="Description or caption for the media")
    media_type = models.CharField(max_length=20, choices=MEDIA_TYPE_CHOICES, default='video')
    sport = models.ForeignKey('Sport', on_delete=models.SET_NULL, null=True, blank=True, help_text="Sport this media relates to")
    tags = models.CharField(max_length=500, blank=True, help_text="Comma-separated tags (e.g., footwork, speed, agility)")
    is_receipt = models.BooleanField(default=False, help_text="This video is a stat/achievement receipt")
    receipt_label = models.CharField(max_length=300, blank=True, help_text="What stat or achievement this receipt shows (e.g., '36in vertical jump, hand-timed')")
    file = models.FileField(upload_to='athlete_media/', help_text="Video file (MP4, MOV, etc.)")
    thumbnail = models.ImageField(upload_to='media_thumbnails/', blank=True, null=True, help_text="Custom thumbnail image (optional)")
    created_at = models.DateTimeField(auto_now_add=True)
    likes = models.ManyToManyField(User, blank=True, related_name='liked_media', help_text="Users who liked this media asset")
    view_count = models.IntegerField(default=0, help_text="Number of views")
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['media_type', '-created_at']),
            models.Index(fields=['sport', '-created_at']),
            models.Index(fields=['-view_count']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.title}"
    
    def save(self, *args, **kwargs):
        """Compress thumbnail images on save"""
        super().save(*args, **kwargs)
        
        # Compress thumbnail if it exists
        if self.thumbnail and hasattr(self.thumbnail, 'path'):
            try:
                self._compress_image(self.thumbnail.path)
            except Exception as e:
                print(f"Warning: Could not compress thumbnail: {e}")
    
    def _compress_image(self, image_path):
        """Compress an image file to reduce file size while maintaining quality"""
        try:
            from PIL import Image
            import os
            
            img = Image.open(image_path)
            
            # Get original file size
            original_size = os.path.getsize(image_path)
            
            # Only compress if larger than 200KB
            if original_size > 200 * 1024:
                # Convert to RGB if necessary (for PNG with transparency)
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                
                # Resize if too large (max 1920px on longest side)
                max_dimension = 1920
                if max(img.size) > max_dimension:
                    ratio = max_dimension / max(img.size)
                    new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
                    img = img.resize(new_size, Image.LANCZOS)
                
                # Save with compression
                img.save(image_path, 'JPEG', quality=85, optimize=True)
                
                new_size = os.path.getsize(image_path)
                print(f"Compressed thumbnail: {original_size / 1024:.1f}KB -> {new_size / 1024:.1f}KB")
        except ImportError:
            print("Pillow not installed, skipping image compression")
        except Exception as e:
            print(f"Image compression error: {e}")
    

class Vote(models.Model):
    voter = models.ForeignKey(User, on_delete=models.CASCADE)
    athlete = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='received_votes')
    voted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Prevents a user from voting for the same athlete more than once
        unique_together = ('voter', 'athlete')


class ContactInquiry(models.Model):
    TYPE_CHOICES = [
        ('general', 'General Inquiry'),
        ('tech-support', 'Technical Support'),
        ('media-inquiry', 'Media Collaboration'),
    ]
    
    name = models.CharField(max_length=100)
    email = models.EmailField()
    message = models.TextField()
    inquiry_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='general')
    submitted_at = models.DateTimeField(auto_now_add=True)
    is_responded = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.name} - {self.inquiry_type} ({self.submitted_at.date()})"


class JoinRequest(models.Model):
    """Request to join the platform — invite-only. Admin reviews and creates accounts."""
    ROLE_CHOICES = [
        ('athlete', 'Athlete'),
        ('coach', 'Coach'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True, help_text="Email address for the account")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='athlete',
                            help_text="Whether you are an athlete or coach")
    school_or_organization = models.CharField(max_length=200, blank=True,
        help_text="Your school, club, or organization name")
    position_or_sport = models.CharField(max_length=100, blank=True,
        help_text="Your sport, position, or coaching specialty")
    message = models.TextField(blank=True,
        help_text="Tell us a bit about yourself and why you'd like to join")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    admin_notes = models.TextField(blank=True, help_text="Internal admin notes")
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
        help_text="Admin who reviewed this request")
    
    class Meta:
        ordering = ['-submitted_at']
        verbose_name = 'Join Request'
        verbose_name_plural = 'Join Requests'
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.role} ({self.get_status_display()})"
    
    def approve(self, user):
        self.status = 'approved'
        self.reviewed_at = timezone.now()
        self.reviewed_by = user
        self.save()
    
    def reject(self, admin_user, reason=''):
        self.status = 'rejected'
        self.admin_notes = reason
        self.reviewed_at = timezone.now()
        self.reviewed_by = admin_user
        self.save()


class BlogPost(models.Model):
    """Staff News Blog - posts with images, video links, and comments"""
    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=300, unique=True, help_text="URL-friendly identifier (auto-generated from title)")
    content = models.TextField(help_text="Blog post content (HTML supported)")
    excerpt = models.TextField(max_length=500, blank=True, help_text="Short preview/summary of the post")
    
    # Author
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blog_posts')
    
    # Media
    featured_image = models.ImageField(
        upload_to='blog_images/', 
        null=True, blank=True,
        help_text="Main image for the blog post (auto-compressed to WebP)"
    )
    featured_image_compressed = models.ImageField(
        upload_to='blog_images/compressed/',
        null=True, blank=True,
        help_text="Compressed WebP version of featured image"
    )
    video_url = models.URLField(
        max_length=500, blank=True,
        help_text="Optional video link (YouTube, Vimeo, etc.)"
    )
    
    # Organization
    tags = models.CharField(max_length=500, blank=True, help_text="Comma-separated tags")
    category = models.CharField(max_length=100, blank=True, help_text="Post category (e.g., News, Story, Update)")
    
    # Status
    is_published = models.BooleanField(default=False, help_text="Visible to the public")
    is_featured = models.BooleanField(default=False, help_text="Show on the front page as featured story")
    published_at = models.DateTimeField(null=True, blank=True, help_text="When the post was published")
    allow_comments = models.BooleanField(default=True, help_text="Allow comments on this post")
    
    # Likes
    likes = models.ManyToManyField(User, blank=True, related_name='liked_blog_posts', help_text="Users who liked this post")
    
    # Metadata
    view_count = models.IntegerField(default=0, help_text="Number of views")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-published_at', '-created_at']
        indexes = [
            models.Index(fields=['-published_at', 'is_published']),
            models.Index(fields=['slug']),
            models.Index(fields=['author', '-created_at']),
        ]
        verbose_name = "Blog Post"
        verbose_name_plural = "Blog Posts"
    
    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        """Auto-generate slug and compress image on save"""
        from django.utils.text import slugify
        
        # Auto-generate slug if not provided
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while BlogPost.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        
        # Set published_at when first publishing
        if self.is_published and not self.published_at:
            from django.utils import timezone
            self.published_at = timezone.now()
        
        super().save(*args, **kwargs)
    
    def get_tags_list(self):
        """Convert tags string to list"""
        if not self.tags:
            return []
        return [tag.strip() for tag in self.tags.split(',') if tag.strip()]
    
    @property
    def comment_count(self):
        """Get count of approved comments"""
        return self.comments.filter(is_approved=True).count()
    
    @property
    def like_count(self):
        """Get count of likes"""
        return self.likes.count()
    
    @property
    def reading_time(self):
        """Estimate reading time in minutes"""
        word_count = len(self.content.split())
        minutes = max(1, round(word_count / 200))
        return minutes


class BlogPostImage(models.Model):
    """Images for a blog post — first image is hero, rest appear in carousel"""
    post = models.ForeignKey(BlogPost, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(
        upload_to='blog_images/',
        help_text="Full-size image (auto-compressed to WebP on save)"
    )
    compressed = models.ImageField(
        upload_to='blog_images/compressed/',
        null=True, blank=True,
        help_text="Compressed WebP version (max 1920px wide)"
    )
    thumbnail = models.ImageField(
        upload_to='blog_images/thumbnails/',
        null=True, blank=True,
        help_text="Small thumbnail for carousel dots / list preview (400px wide)"
    )
    caption = models.CharField(max_length=500, blank=True, help_text="Optional image caption")
    order = models.PositiveIntegerField(default=0, help_text="Display order (0 = first / hero)")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']
        indexes = [
            models.Index(fields=['post', 'order']),
        ]
        verbose_name = "Blog Image"
        verbose_name_plural = "Blog Images"

    def __str__(self):
        return f"Image {self.order} for {self.post.title}"

    def save(self, *args, **kwargs):
        """Auto-compress image and generate thumbnail on save"""
        is_new = self.pk is None
        super().save(*args, **kwargs)

        # Compress and generate thumbnail after the file is saved to disk
        if self.image and hasattr(self.image, 'path'):
            try:
                self._compress_and_thumbnail()
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"BlogPostImage compression failed: {e}")

    def _compress_and_thumbnail(self):
        """Compress the uploaded image to WebP and generate a thumbnail"""
        from PIL import Image as PILImage
        import os

        img_path = self.image.path
        img = PILImage.open(img_path)

        # Convert RGBA/P to RGB
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')

        # --- Full-size compressed (max 1920px wide) ---
        compressed_img = img.copy()
        if compressed_img.width > 1920:
            ratio = 1920 / compressed_img.width
            new_size = (1920, int(compressed_img.height * ratio))
            compressed_img = compressed_img.resize(new_size, PILImage.LANCZOS)

        compressed_dir = os.path.dirname(self.image.path).replace('blog_images', 'blog_images/compressed')
        # Actually use the compressed field's storage path
        base = os.path.splitext(os.path.basename(self.image.name))[0]
        compressed_name = f"{base}_compressed.webp"

        # Save compressed
        from django.core.files.base import ContentFile
        from io import BytesIO
        buffer = BytesIO()
        compressed_img.save(buffer, format='WEBP', quality=82, optimize=True)
        buffer.seek(0)

        if self.compressed:
            self.compressed.delete(save=False)
        self.compressed.save(
            compressed_name,
            ContentFile(buffer.read()),
            save=False
        )

        # --- Thumbnail (max 400px wide) ---
        thumb_img = img.copy()
        if thumb_img.width > 400:
            ratio = 400 / thumb_img.width
            new_size = (400, int(thumb_img.height * ratio))
            thumb_img = thumb_img.resize(new_size, PILImage.LANCZOS)

        thumb_name = f"{base}_thumb.webp"
        buffer2 = BytesIO()
        thumb_img.save(buffer2, format='WEBP', quality=75, optimize=True)
        buffer2.seek(0)

        if self.thumbnail:
            self.thumbnail.delete(save=False)
        self.thumbnail.save(
            thumb_name,
            ContentFile(buffer2.read()),
            save=False
        )

        # Update without recursing
        type(self).objects.filter(pk=self.pk).update(
            compressed=self.compressed.name,
            thumbnail=self.thumbnail.name,
        )

    def delete(self, *args, **kwargs):
        """Clean up files on delete"""
        for field in ['image', 'compressed', 'thumbnail']:
            f = getattr(self, field, None)
            if f and hasattr(f, 'path'):
                try:
                    import os
                    if os.path.isfile(f.path):
                        os.remove(f.path)
                except Exception:
                    pass
        super().delete(*args, **kwargs)


class BlogComment(models.Model):
    """Comments on blog posts - any authenticated user can comment"""
    post = models.ForeignKey(BlogPost, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blog_comments')
    content = models.TextField(max_length=2000, help_text="Comment content")
    
    # Moderation
    is_approved = models.BooleanField(default=False, help_text="Approved by admin for public display")
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                    related_name='approved_comments')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['post', 'is_approved', 'created_at']),
            models.Index(fields=['author', '-created_at']),
        ]
        verbose_name = "Blog Comment"
        verbose_name_plural = "Blog Comments"
    
    def __str__(self):
        return f"Comment by {self.author.username} on {self.post.title}"
    
    def approve(self, user):
        """Approve this comment"""
        from django.utils import timezone
        self.is_approved = True
        self.approved_at = timezone.now()
        self.approved_by = user
        self.save()


class StreamingPlatform(models.Model):
    PLATFORM_CHOICES = [
        ('youtube', 'YouTube'),
        ('facebook', 'Facebook'),
        ('instagram', 'Instagram Live'),
        ('tiktok', 'TikTok'),
        ('owncast', 'Owncast'),
        ('custom', 'Custom RTMP'),
    ]
    
    name = models.CharField(max_length=100, help_text="Display name for this platform")
    platform_type = models.CharField(max_length=20, choices=PLATFORM_CHOICES, default='youtube')
    rtmp_url = models.CharField(max_length=500, help_text="RTMP server URL (e.g., rtmp://a.rtmp.youtube.com/live2)")
    stream_key = models.CharField(max_length=500, help_text="Stream key/secret for this platform")
    is_enabled = models.BooleanField(default=True, help_text="Enable/disable streaming to this platform")
    is_active = models.BooleanField(default=False, help_text="Currently streaming to this platform")
    last_test = models.DateTimeField(null=True, blank=True, help_text="Last connection test timestamp")
    test_status = models.BooleanField(default=False, help_text="Last test result")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Platform-specific settings
    youtube_broadcast_id = models.CharField(max_length=100, blank=True, help_text="YouTube broadcast ID (optional)")
    facebook_page_id = models.CharField(max_length=100, blank=True, help_text="Facebook page ID (optional)")
    instagram_account_id = models.CharField(max_length=100, blank=True, help_text="Instagram account ID (optional)")
    tiktok_username = models.CharField(max_length=100, blank=True, help_text="TikTok username (optional)")
    custom_settings = models.JSONField(default=dict, blank=True, help_text="Custom platform settings")
    
    class Meta:
        ordering = ['platform_type', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_platform_type_display()})"
    
    def get_full_rtmp_url(self):
        """Get complete RTMP URL with stream key"""
        if self.rtmp_url.endswith('/'):
            return f"{self.rtmp_url}{self.stream_key}"
        return f"{self.rtmp_url}/{self.stream_key}"


class StreamingSession(models.Model):
    session_id = models.CharField(max_length=100, unique=True, help_text="Unique session identifier")
    platforms = models.ManyToManyField(StreamingPlatform, blank=True, help_text="Platforms streamed to in this session")
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration = models.IntegerField(default=0, help_text="Duration in seconds")
    viewer_count = models.IntegerField(default=0, help_text="Current viewer count")
    bitrate = models.IntegerField(default=0, help_text="Current bitrate in kbps")
    is_active = models.BooleanField(default=True, help_text="Session is currently active")
    
    # Statistics
    total_viewers = models.IntegerField(default=0, help_text="Total viewers across session")
    peak_viewers = models.IntegerField(default=0, help_text="Peak concurrent viewers")
    total_duration = models.IntegerField(default=0, help_text="Total duration in seconds")
    
    class Meta:
        ordering = ['-started_at']
    
    def __str__(self):
        return f"Session {self.session_id} ({'Active' if self.is_active else 'Ended'})"
    
    def update_duration(self):
        """Update session duration"""
        if self.is_active and self.started_at:
            self.duration = int((timezone.now() - self.started_at).total_seconds())
            self.save()
        return self.duration


class WebRTCRoom(models.Model):
    """WebRTC room for guest interviews"""
    ROOM_TYPE_CHOICES = [
        ('interview', 'Interview'),
        ('training', 'Training'),
        ('analysis', 'Game Analysis'),
        ('coaching', 'Coaching'),
    ]
    
    room_id = models.CharField(max_length=100, unique=True, help_text="Unique room identifier")
    name = models.CharField(max_length=200, help_text="Room display name")
    room_type = models.CharField(max_length=50, choices=ROOM_TYPE_CHOICES, default='interview')
    description = models.TextField(blank=True, help_text="Room description")
    
    # Host information
    host = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hosted_rooms', 
                            help_text="Room host/creator")
    host_stream_key = models.CharField(max_length=200, blank=True, 
                                      help_text="Host's stream key for OBS virtual camera")
    
    # Guest information
    guest_name = models.CharField(max_length=200, blank=True, help_text="Guest name")
    guest_email = models.EmailField(blank=True, help_text="Guest email")
    guest_stream_key = models.CharField(max_length=200, blank=True, 
                                       help_text="Guest's stream key for WebRTC connection")
    
    # Room settings
    is_public = models.BooleanField(default=False, help_text="Publicly accessible room")
    requires_password = models.BooleanField(default=False, help_text="Requires password to join")
    room_password = models.CharField(max_length=100, blank=True, help_text="Room password")
    max_participants = models.IntegerField(default=2, help_text="Maximum participants (host + guests)")
    
    # Status
    is_active = models.BooleanField(default=True, help_text="Room is active")
    is_live = models.BooleanField(default=False, help_text="Room is currently live streaming")
    is_recording = models.BooleanField(default=False, help_text="Room is being recorded")
    
    # Timing
    created_at = models.DateTimeField(auto_now_add=True)
    scheduled_start = models.DateTimeField(null=True, blank=True, help_text="Scheduled start time")
    started_at = models.DateTimeField(null=True, blank=True, help_text="Actual start time")
    ended_at = models.DateTimeField(null=True, blank=True, help_text="End time")
    
    # Streaming
    streaming_session = models.ForeignKey(StreamingSession, on_delete=models.SET_NULL, 
                                         null=True, blank=True, 
                                         help_text="Associated streaming session")
    rtmp_output_url = models.CharField(max_length=500, blank=True, 
                                      help_text="RTMP output URL for streaming")
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional room metadata")
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['room_id', 'is_active']),
            models.Index(fields=['host', 'is_active']),
            models.Index(fields=['is_live', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.room_id}) - {'Live' if self.is_live else 'Idle'}"
    
    @property
    def participant_count(self):
        """Get current participant count"""
        return self.participants.filter(is_connected=True).count()
    
    @property
    def duration(self):
        """Get room duration in seconds"""
        if self.started_at and self.ended_at:
            return int((self.ended_at - self.started_at).total_seconds())
        elif self.started_at:
            return int((timezone.now() - self.started_at).total_seconds())
        return 0
    
    def start_room(self):
        """Mark room as started"""
        if not self.started_at:
            self.started_at = timezone.now()
            self.is_live = True
            self.save()
    
    def end_room(self):
        """Mark room as ended"""
        if self.started_at and not self.ended_at:
            self.ended_at = timezone.now()
            self.is_live = False
            self.is_active = False
            self.save()


class WebRTCParticipant(models.Model):
    """Participant in a WebRTC room"""
    ROLE_CHOICES = [
        ('host', 'Host'),
        ('guest', 'Guest'),
        ('viewer', 'Viewer'),
    ]
    
    room = models.ForeignKey(WebRTCRoom, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, 
                            related_name='webrtc_participations')
    participant_id = models.CharField(max_length=100, help_text="Unique participant identifier")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='guest')
    display_name = models.CharField(max_length=200, help_text="Display name in room")
    
    # Connection info
    peer_id = models.CharField(max_length=500, blank=True, help_text="WebRTC peer ID")
    stream_key = models.CharField(max_length=200, blank=True, help_text="Stream key for this participant")
    egress_key = models.CharField(max_length=200, blank=True, help_text="RTMP egress key for OBS media source")
    ice_servers = models.JSONField(default=list, blank=True, help_text="ICE servers configuration")
    
    # Video quality settings for RTMP egress
    egress_bitrate = models.IntegerField(default=2500, help_text="Bitrate for RTMP egress in kbps")
    egress_resolution_width = models.IntegerField(default=1280, help_text="Width for RTMP egress")
    egress_resolution_height = models.IntegerField(default=720, help_text="Height for RTMP egress")
    egress_framerate = models.IntegerField(default=30, help_text="Framerate for RTMP egress")
    
    # Status
    is_connected = models.BooleanField(default=False, help_text="Currently connected")
    has_audio = models.BooleanField(default=True, help_text="Audio enabled")
    has_video = models.BooleanField(default=True, help_text="Video enabled")
    is_screen_sharing = models.BooleanField(default=False, help_text="Screen sharing")
    
    # Timing
    joined_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)
    left_at = models.DateTimeField(null=True, blank=True)
    
    # Stats
    connection_quality = models.IntegerField(default=100, help_text="Connection quality (0-100)")
    bitrate = models.IntegerField(default=0, help_text="Current bitrate in kbps")
    packet_loss = models.FloatField(default=0.0, help_text="Packet loss percentage")
    
    class Meta:
        ordering = ['-joined_at']
        unique_together = ['room', 'participant_id']
        indexes = [
            models.Index(fields=['room', 'is_connected']),
            models.Index(fields=['participant_id', 'is_connected']),
        ]
    
    def __str__(self):
        return f"{self.display_name} ({self.role}) in {self.room.name}"
    
    @property
    def duration(self):
        """Get participant duration in seconds"""
        if self.joined_at and self.left_at:
            return int((self.left_at - self.joined_at).total_seconds())
        elif self.joined_at:
            return int((timezone.now() - self.joined_at).total_seconds())
        return 0
    
    def disconnect(self):
        """Mark participant as disconnected"""
        if not self.left_at:
            self.left_at = timezone.now()
            self.is_connected = False
            self.save()


class WebRTCSignal(models.Model):
    """WebRTC signaling messages"""
    SIGNAL_TYPE_CHOICES = [
        ('offer', 'Offer'),
        ('answer', 'Answer'),
        ('candidate', 'ICE Candidate'),
        ('join', 'Join'),
        ('leave', 'Leave'),
        ('error', 'Error'),
    ]
    
    room = models.ForeignKey(WebRTCRoom, on_delete=models.CASCADE, related_name='signals')
    sender = models.ForeignKey(WebRTCParticipant, on_delete=models.CASCADE, 
                              related_name='sent_signals', null=True, blank=True)
    receiver = models.ForeignKey(WebRTCParticipant, on_delete=models.CASCADE, 
                                related_name='received_signals', null=True, blank=True)
    
    signal_type = models.CharField(max_length=20, choices=SIGNAL_TYPE_CHOICES)
    payload = models.JSONField(default=dict, help_text="Signal payload (SDP, candidate, etc.)")
    
    created_at = models.DateTimeField(auto_now_add=True)
    delivered = models.BooleanField(default=False, help_text="Signal was delivered")
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['room', 'signal_type', 'created_at']),
            models.Index(fields=['sender', 'receiver', 'delivered']),
        ]
    
    def __str__(self):
        return f"{self.signal_type} from {self.sender} to {self.receiver} at {self.created_at}"
    
    def mark_delivered(self):
        """Mark signal as delivered"""
        if not self.delivered:
            self.delivered = True
            self.delivered_at = timezone.now()
            self.save()


# ============================================================================
# ELITE ATHLETE STATS SYSTEM (v2)
# ============================================================================

class Sport(models.Model):
    """Sport an athlete can play (e.g., Football, Basketball, Track & Field)"""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    icon = models.CharField(max_length=50, blank=True, help_text="Emoji or icon identifier")
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name


class AthleteStatEntry(models.Model):
    """Historical stat entry for progress tracking & trend arrows"""
    STAT_TYPE_CHOICES = [
        ('height', 'Height'),
        ('weight', 'Weight'),
        ('vertical_jump', 'Vertical Jump'),
        ('forty_yard', '40-Yard Dash'),
        ('max_bench', 'Max Bench Press'),
        ('max_squat', 'Max Squat'),
        ('max_power_clean', 'Max Power Clean'),
        ('shuttle', 'Shuttle Time'),
        ('gpa', 'GPA'),
    ]
    
    athlete = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='stat_entries')
    stat_type = models.CharField(max_length=20, choices=STAT_TYPE_CHOICES)
    value = models.FloatField(help_text="Numeric value of the stat at this point in time")
    is_verified = models.BooleanField(default=False)
    recorded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['athlete', 'stat_type', '-recorded_at']),
            models.Index(fields=['stat_type', 'value']),
        ]
        verbose_name = "Athlete Stat Entry"
        verbose_name_plural = "Athlete Stat Entries"
    
    def __str__(self):
        return f"{self.athlete.user.username} - {self.stat_type}: {self.value}"


class StatVerificationVideo(models.Model):
    """Video proof uploaded by athlete to verify a stat"""
    STAT_TYPE_CHOICES = [
        ('vertical_jump', 'Vertical Jump'),
        ('forty_yard', '40-Yard Dash'),
        ('max_bench', 'Max Bench Press'),
        ('max_squat', 'Max Squat'),
        ('max_power_clean', 'Max Power Clean'),
        ('shuttle', 'Shuttle Time'),
    ]
    
    athlete = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='verification_videos')
    stat_type = models.CharField(max_length=20, choices=STAT_TYPE_CHOICES)
    video = models.FileField(upload_to='stat_verifications/', help_text="Verification video file")
    thumbnail = models.ImageField(upload_to='stat_verification_thumbnails/', blank=True)
    is_approved = models.BooleanField(default=False, help_text="Approved by staff/admin")
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.athlete.user.username} - {self.stat_type} verification"


# ============================================================================
# RECRUITER ATTRIBUTE SYSTEM — Per-Sport Key Stats Recruiters Look For
# ============================================================================

class SportAttribute(models.Model):
    """Key attribute recruiters look for, per sport (e.g., Wingspan for Basketball)"""
    sport = models.ForeignKey(Sport, on_delete=models.CASCADE, related_name='attributes')
    name = models.CharField(max_length=100, help_text="e.g., Wingspan, Arm Length, Exit Velocity")
    slug = models.SlugField(max_length=100)
    unit = models.CharField(max_length=50, blank=True, help_text="e.g., inches, seconds, mph, feet")
    icon = models.CharField(max_length=10, blank=True, help_text="Optional emoji indicator")
    description = models.TextField(blank=True, help_text="What recruiters look for in this attribute")
    is_measurable = models.BooleanField(default=True, help_text="True = numeric field, False = checkbox/skill tag")
    benchmark_text = models.CharField(max_length=200, blank=True, help_text="e.g., 'Elite: 7ft+ wingspan'")
    sort_order = models.IntegerField(default=0, help_text="Display order within sport")

    class Meta:
        ordering = ['sport', 'sort_order']
        unique_together = ['sport', 'slug']
        verbose_name = "Sport Attribute"
        verbose_name_plural = "Sport Attributes"

    def __str__(self):
        return f"{self.sport.name}: {self.name}"


# ============================================================================
# MEDIA TAG SYSTEM — Flexible Key-Value Tags for Receipt Videos
# ============================================================================

class MediaTag(models.Model):
    """Custom key-value tags on media assets (flexible for any sport/skill)"""
    media = models.ForeignKey(MediaAsset, on_delete=models.CASCADE, related_name='media_tags')
    key = models.CharField(max_length=100, help_text="Tag key e.g., 'wingspan', 'skill', 'technique'")
    value = models.CharField(max_length=200, help_text="Tag value e.g., '82in', 'footwork', 'release speed'")

    class Meta:
        indexes = [
            models.Index(fields=['key', 'value']),
            models.Index(fields=['media', 'key']),
        ]
        verbose_name = "Media Tag"
        verbose_name_plural = "Media Tags"

    def __str__(self):
        return f"{self.key}: {self.value}"


# ============================================================================
# DRILL SYSTEM — Coach & Athlete Shared Drill Library
# ============================================================================

class Drill(models.Model):
    """Training drill shared by coaches or athletes"""
    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]

    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_drills')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, help_text="Drill description and instructions")
    sport = models.ForeignKey(Sport, on_delete=models.SET_NULL, null=True, blank=True)

    # Drill details
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='intermediate')
    equipment = models.CharField(max_length=500, blank=True, help_text="Required equipment (comma-separated)")
    duration_minutes = models.IntegerField(default=10, help_text="Estimated duration in minutes")
    reps_sets = models.CharField(max_length=200, blank=True, help_text="Sets/reps recommendations e.g., '3x10'")
    skills_focused = models.CharField(max_length=500, blank=True, help_text="Skills this drill develops (comma-separated)")

    # Video demonstration
    video = models.ForeignKey(MediaAsset, on_delete=models.SET_NULL, null=True, blank=True,
                             help_text="Video demonstration of the drill")

    # Engagement
    view_count = models.IntegerField(default=0, help_text="Number of views")
    save_count = models.IntegerField(default=0, help_text="Number of athletes who saved this drill")
    likes = models.ManyToManyField(User, blank=True, related_name='liked_drills')
    saved_by = models.ManyToManyField(User, blank=True, related_name='saved_drills')

    # Status
    is_published = models.BooleanField(default=True, help_text="Visible to the public")
    is_featured = models.BooleanField(default=False, help_text="Showcased on drill library homepage")

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_featured', '-created_at']
        indexes = [
            models.Index(fields=['sport', '-created_at']),
            models.Index(fields=['difficulty', '-created_at']),
            models.Index(fields=['-view_count']),
            models.Index(fields=['creator', '-created_at']),
        ]
        verbose_name = "Drill"
        verbose_name_plural = "Drills"

    def __str__(self):
        return f"{self.title} ({self.get_difficulty_display()})"


# ============================================================================
# LIVE VERIFICATION SYSTEM — WebRTC-Backed Stat Verification
# ============================================================================

class LiveVerificationRequest(models.Model):
    """Request for a live WebRTC stat verification session"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    athlete = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='verification_requests')
    stat_label = models.CharField(max_length=200, help_text="What stat they want verified (e.g., 'Bench Press 225lbs x 15')")
    notes = models.TextField(blank=True, help_text="Additional notes for the verification session")
    
    # Scheduling
    preferred_time = models.DateTimeField(null=True, blank=True, help_text="Athlete's preferred time")
    scheduled_at = models.DateTimeField(null=True, blank=True, help_text="Confirmed time slot")
    
    # Staff assignment
    assigned_staff = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                      related_name='assigned_verifications')
    
    # LiveKit Room (reuse existing WebRTC infrastructure)
    room = models.ForeignKey(WebRTCRoom, on_delete=models.SET_NULL, null=True, blank=True,
                            help_text="LiveKit room for the verification session")
    
    # Result
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    result_video = models.ForeignKey(StatVerificationVideo, on_delete=models.SET_NULL, null=True, blank=True,
                                    help_text="The recorded verification video")
    verified_value = models.FloatField(null=True, blank=True, help_text="The confirmed value witnessed live")
    staff_notes = models.TextField(blank=True, help_text="Staff notes from the verification session")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['athlete', 'status']),
            models.Index(fields=['status', 'scheduled_at']),
            models.Index(fields=['assigned_staff', 'status']),
        ]
        verbose_name = "Live Verification Request"
        verbose_name_plural = "Live Verification Requests"

    def __str__(self):
        return f"Verification: {self.athlete.user.username} - {self.stat_label} ({self.status})"


# ============================================================================
# COPPA AGE GATE — Parental Consent & Audit Log
# ============================================================================

class ParentalConsentRequest(models.Model):
    """Tracks parental consent flow for users under 13 (COPPA compliance)"""
    STATUS_CHOICES = [
        ('pending', 'Awaiting Parent Response'),
        ('consent_given', 'Consent Granted'),
        ('expired', 'Expired'),
        ('revoked', 'Revoked by Parent'),
    ]
    METHOD_CHOICES = [
        ('credit_card', 'Credit Card Authorization'),
        ('signed_form', 'Signed Consent Form'),
        ('video_chat', 'Video Chat Verification'),
    ]

    child_email = models.EmailField(help_text="The minor's email address")
    parent_email = models.EmailField(help_text="Parent/guardian email address")
    child_dob = models.DateField(help_text="Child's date of birth (used only for age verification)")
    child_name = models.CharField(max_length=200, blank=True, 
        help_text="Child's name (only collected if consent given)")
    parent_name = models.CharField(max_length=200, blank=True,
        help_text="Parent/guardian full name")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    consent_token = models.CharField(max_length=100, unique=True, help_text="Secret token for consent URL")
    consent_method = models.CharField(max_length=50, choices=METHOD_CHOICES, default='video_chat')
    expires_at = models.DateTimeField(help_text="When this consent request expires")
    
    # Staff who handled the consent
    handled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='handled_consent_requests')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    consent_granted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['consent_token']),
            models.Index(fields=['parent_email', 'status']),
            models.Index(fields=['status', 'expires_at']),
        ]
        verbose_name = "Parental Consent Request"
        verbose_name_plural = "Parental Consent Requests"

    def __str__(self):
        return f"Consent for {self.child_name or self.child_email} ({self.status})"

    def generate_consent_token(self):
        """Generate a unique consent token"""
        import secrets
        self.consent_token = secrets.token_urlsafe(48)
        self.save(update_fields=['consent_token'])
        return self.consent_token

    def is_expired(self):
        """Check if the consent request has expired"""
        return timezone.now() > self.expires_at


class COPPAAuditLog(models.Model):
    """
    COPPA/Tennessee Law Compliance Audit Log.
    We NEVER store parent driver's license, full credit card numbers, or SSN.
    This log ONLY records that a verification event occurred, the method used, 
    and the date/time — no PII preserved.
    """
    METHOD_CHOICES = [
        ('credit_card', 'Credit Card Authorization'),
        ('signed_form', 'Signed Consent Form'),
        ('video_chat', 'Video Chat Verification'),
        ('age_gate_denied', 'Age Gate - Registration Denied (Under 13)'),
        ('age_gate_allowed', 'Age Gate - Registration Allowed (13+)'),
        ('consent_revoked', 'Parental Consent Revoked'),
    ]

    event_type = models.CharField(max_length=20, choices=METHOD_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # PII-safe identifiers (hashed — never raw)
    parent_email_hash = models.CharField(max_length=64, blank=True,
        help_text="SHA-256 hash of parent email for lookup — never store raw")
    requester_identifier = models.CharField(max_length=64, blank=True,
        help_text="Hashed identifier for the requesting user (username hash)")
    
    # Non-PII metadata allowed
    notes = models.TextField(blank=True, 
        help_text="Event notes — e.g., 'Video chat verified by staff jdoe' — no PII")
    staff_username = models.CharField(max_length=150, blank=True,
        help_text="Staff member who completed the verification (if applicable)")

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['event_type', '-timestamp']),
            models.Index(fields=['-timestamp']),
        ]
        verbose_name = "COPPA Audit Log Entry"
        verbose_name_plural = "COPPA Audit Log Entries"

    def __str__(self):
        return f"[{self.timestamp}] {self.get_event_type_display()}"


# ============================================================================
# AI ASSISTANT — Import models from ai_models.py for makemigrations to discover
# ============================================================================
from .ai_models import AIPersonality, AIChatSession, AIChatMessage, CompressedTextField


class ContentReport(models.Model):
    """
    User-submitted content moderation reports.
    Any authenticated user can flag content for review.
    """
    REASON_CHOICES = [
        ('inappropriate', 'Inappropriate Content'),
        ('underage', 'User May Be Under 13'),
        ('harassment', 'Harassment or Bullying'),
        ('non_athletic', 'Non-Athletic Content'),
        ('profanity', 'Profanity or Explicit Language'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('reviewed', 'Reviewed - No Action'),
        ('actioned', 'Reviewed - Action Taken'),
        ('dismissed', 'Dismissed'),
    ]

    reporter = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='submitted_reports')
    media = models.ForeignKey(MediaAsset, on_delete=models.CASCADE, null=True, blank=True,
        related_name='reports')
    reported_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='received_reports',
        help_text="User being reported (if not media-specific)")
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    description = models.TextField(blank=True, help_text="Additional details about the report")
    
    # Moderation
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='moderated_reports')
    moderation_notes = models.TextField(blank=True, help_text="Staff notes about the resolution")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['reporter', '-created_at']),
            models.Index(fields=['media', 'status']),
        ]
        verbose_name = "Content Report"
        verbose_name_plural = "Content Reports"

    def __str__(self):
        return f"Report by {self.reporter} on {self.media or self.reported_user} ({self.reason})"

    def resolve(self, staff_user, status, notes=""):
        """Resolve this report"""
        self.status = status
        self.reviewed_by = staff_user
        self.moderation_notes = notes
        self.resolved_at = timezone.now()
        self.save()


# ============================================================
# Passkeys / WebAuthn — Biometric authentication credentials
# ============================================================
class PasskeyCredential(models.Model):
    """Stores WebAuthn credentials for passwordless biometric login."""

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='passkey_credentials',
        help_text="The user who owns this passkey",
    )
    credential_id = models.CharField(
        max_length=512,
        unique=True,
        help_text="Base64URL-encoded credential ID from the authenticator",
    )
    credential_public_key = models.TextField(
        help_text="PEM-encoded public key for signature verification",
    )
    sign_count = models.IntegerField(
        default=0,
        help_text="Signature counter — incremented each time the authenticator is used",
    )
    transports = models.JSONField(
        default=list,
        blank=True,
        help_text="Authenticator transport methods (e.g., ['internal', 'hybrid', 'usb'])",
    )
    device_name = models.CharField(
        max_length=128,
        blank=True,
        help_text="User-friendly name for this passkey (e.g., 'iPhone 15', 'YubiKey 5C')",
    )
    backed_up = models.BooleanField(
        default=False,
        help_text="Whether this credential is backed up (multi-device sync)",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this passkey was registered",
    )
    last_used_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this passkey was last used to authenticate",
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Passkey Credential'
        verbose_name_plural = 'Passkey Credentials'

    def __str__(self):
        device = self.device_name or 'Unknown device'
        return f"{self.user.username} — {device} ({self.created_at.strftime('%Y-%m-%d')})"
