from rest_framework import serializers
from django.conf import settings
from .models import Profile, GuestRequest, MediaAsset, WebRTCRoom, WebRTCParticipant, WebRTCSignal, ContactInquiry
from .models import Sport, AthleteStatEntry, StatVerificationVideo, SportAttribute, MediaTag, Drill
from django.contrib.auth.models import User


class SportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sport
        fields = ['id', 'name', 'slug', 'icon']


class SportAttributeSerializer(serializers.ModelSerializer):
    sport_name = serializers.ReadOnlyField(source='sport.name')
    sport_slug = serializers.ReadOnlyField(source='sport.slug')

    class Meta:
        model = SportAttribute
        fields = [
            'id', 'sport', 'sport_name', 'sport_slug',
            'name', 'slug', 'unit', 'icon', 'description',
            'is_measurable', 'benchmark_text', 'sort_order',
        ]


class MediaTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaTag
        fields = ['id', 'media', 'key', 'value']


class DrillListSerializer(serializers.ModelSerializer):
    creator_name = serializers.ReadOnlyField(source='creator.username')
    creator_role = serializers.SerializerMethodField()
    sport_name = serializers.SerializerMethodField()
    difficulty_display = serializers.ReadOnlyField(source='get_difficulty_display')
    skills_list = serializers.SerializerMethodField()
    equipment_list = serializers.SerializerMethodField()
    video_thumbnail = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField()
    save_count = serializers.ReadOnlyField()

    class Meta:
        model = Drill
        fields = [
            'id', 'title', 'description', 'sport', 'sport_name',
            'difficulty', 'difficulty_display', 'equipment', 'equipment_list',
            'duration_minutes', 'reps_sets', 'skills_focused', 'skills_list',
            'video', 'video_thumbnail',
            'view_count', 'save_count', 'like_count',
            'is_featured',
            'creator', 'creator_name', 'creator_role',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['view_count', 'save_count', 'created_at', 'updated_at']

    def get_creator_role(self, obj):
        try:
            return obj.creator.profile.role if obj.creator.profile else None
        except:
            return None

    def get_sport_name(self, obj):
        return obj.sport.name if obj.sport else None

    def get_skills_list(self, obj):
        if not obj.skills_focused:
            return []
        return [s.strip() for s in obj.skills_focused.split(',') if s.strip()]

    def get_equipment_list(self, obj):
        if not obj.equipment:
            return []
        return [e.strip() for e in obj.equipment.split(',') if e.strip()]

    def get_video_thumbnail(self, obj):
        if obj.video and obj.video.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.video.thumbnail.url)
            return obj.video.thumbnail.url
        return None

    def get_like_count(self, obj):
        return obj.likes.count()


class DrillCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Drill
        fields = [
            'title', 'description', 'sport', 'difficulty', 'equipment',
            'duration_minutes', 'reps_sets', 'skills_focused', 'video',
        ]


class AthleteStatEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = AthleteStatEntry
        fields = ['id', 'stat_type', 'value', 'is_verified', 'recorded_at']


# ============================================================================
# ProfileSerializer — built fields list is conditional on SPORTS_MODULE_ENABLED
# ============================================================================
_profile_base_fields = [
    'username', 'email', 'role', 'bio', 'profile_image',
    'is_active', 'stat_trends',
]
_profile_sports_fields = [
    'hudl_link', 'maxpreps_link', 'twitter_x_link',
    'graduation_year', 'position', 'school_name',
    'state', 'sports', 'sport_ids',
    'height_ft', 'height_in', 'weight_lbs',
    'vertical_jump_in', 'forty_yard_time',
    'max_bench_lbs', 'max_squat_lbs', 'max_power_clean_lbs',
    'shuttle_time', 'gpa',
    'bench_ratio', 'squat_ratio', 'power_clean_ratio', 'height_display',
]

_sports_enabled = getattr(settings, 'SPORTS_MODULE_ENABLED', False)

class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    is_active = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    stat_trends = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = _profile_base_fields + (_profile_sports_fields if _sports_enabled else [])
        read_only_fields = ['username', 'email', 'role', 'is_active']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Conditionally add sports fields only when sports module enabled
        # This avoids DRF's assertion error when a declared field is not in Meta.fields
        if _sports_enabled:
            self.fields['sports'] = SportSerializer(many=True, read_only=True)
            self.fields['sport_ids'] = serializers.PrimaryKeyRelatedField(
                queryset=Sport.objects.all(), source='sports',
                many=True, write_only=True, required=False
            )

    def get_is_active(self, obj):
        return obj.user.is_active

    def get_email(self, obj):
        return obj.user.email

    def get_stat_trends(self, obj):
        """Return recent stat trends for this athlete (sports module only)"""
        if not _sports_enabled:
            return []
        entries = AthleteStatEntry.objects.filter(athlete=obj).order_by('-recorded_at')[:20]
        trends = {}
        for entry in entries:
            if entry.stat_type not in trends:
                trends[entry.stat_type] = {
                    'latest': entry.value,
                    'recorded_at': entry.recorded_at,
                    'is_verified': entry.is_verified,
                }
        return [
            {'stat_type': k, **v}
            for k, v in sorted(trends.items(), key=lambda x: x[1]['recorded_at'], reverse=True)
        ][:5]


class ProfileListSerializer(serializers.ModelSerializer):
    """Compact serializer for profile lists (minimal fields)"""
    username = serializers.ReadOnlyField(source='user.username')
    is_active = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ['username', 'role', 'bio', 'profile_image', 'is_active']
        read_only_fields = fields

    def get_is_active(self, obj):
        return obj.user.is_active


class GuestRequestSerializer(serializers.ModelSerializer):
    """For guest booking — used by both the public endpoint and admin"""

    class Meta:
        model = GuestRequest
        fields = '__all__'
        read_only_fields = ['admin_notes', 'status', 'submitted_at', 'email_verified', 'email_token']


class MediaAssetSerializer(serializers.ModelSerializer):
    """Tight, user-friendly serializer for media assets"""

    class Meta:
        model = MediaAsset
        fields = [
            'id', 'title', 'description', 'media_type', 'file',
            'thumbnail', 'show', 'user', 'created_at',
        ]
        read_only_fields = ['user', 'created_at']


class ContactInquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactInquiry
        fields = '__all__'
        read_only_fields = ['submitted_at', 'is_responded']


class ShowSerializer(serializers.ModelSerializer):
    """Comprehensive serializer for shows (calendar, guest info)"""

    class Meta:
        model = Profile  
        fields = ['user']  


class WebRTCRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebRTCRoom
        fields = '__all__'


class WebRTCParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebRTCParticipant
        fields = '__all__'


class WebRTCSignalSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebRTCSignal
        fields = '__all__'
