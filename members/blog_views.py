"""
Blog Views - Staff News Blog with comments, image compression, and video support
"""
from rest_framework import serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import BlogPost, BlogComment
import logging

logger = logging.getLogger(__name__)


# ============================================================================
# SERIALIZERS
# ============================================================================

class BlogCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_role = serializers.SerializerMethodField()
    author_profile_image = serializers.SerializerMethodField()
    
    class Meta:
        model = BlogComment
        fields = [
            'id', 'post', 'author', 'author_name', 'author_role', 
            'author_profile_image', 'content', 'is_approved',
            'approved_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['author', 'is_approved', 'approved_at', 'approved_by', 'created_at', 'updated_at']
    
    def get_author_name(self, obj):
        return obj.author.username
    
    def get_author_role(self, obj):
        try:
            return obj.author.profile.role if obj.author.profile else None
        except:
            return None
    
    def get_author_profile_image(self, obj):
        request = self.context.get('request')
        try:
            if obj.author.profile and obj.author.profile.profile_image:
                if request:
                    return request.build_absolute_uri(obj.author.profile.profile_image.url)
                return obj.author.profile.profile_image.url
        except:
            pass
        return None


class BlogPostListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for blog list view"""
    author_name = serializers.SerializerMethodField()
    author_role = serializers.SerializerMethodField()
    featured_image_url = serializers.SerializerMethodField()
    comment_count = serializers.ReadOnlyField()
    like_count = serializers.ReadOnlyField()
    reading_time = serializers.ReadOnlyField()
    tags_list = serializers.SerializerMethodField()
    
    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'slug', 'excerpt', 'author', 'author_name', 'author_role',
            'featured_image_url', 'category', 'tags', 'tags_list',
            'is_published', 'is_featured', 'published_at', 'view_count',
            'comment_count', 'like_count', 'reading_time', 'created_at', 'updated_at'
        ]
        read_only_fields = ['author', 'view_count', 'created_at', 'updated_at']
    
    def get_author_name(self, obj):
        return obj.author.username
    
    def get_author_role(self, obj):
        try:
            return obj.author.profile.role if obj.author.profile else None
        except:
            return None
    
    def get_featured_image_url(self, obj):
        request = self.context.get('request')
        try:
            # Use compressed version if available
            img = obj.featured_image_compressed if obj.featured_image_compressed else obj.featured_image
            if img and hasattr(img, 'url'):
                if request:
                    return request.build_absolute_uri(img.url)
                return img.url
        except Exception:
            pass
        return None
    
    def get_tags_list(self, obj):
        return obj.get_tags_list()


class BlogPostDetailSerializer(serializers.ModelSerializer):
    """Full serializer for blog detail view"""
    author_name = serializers.SerializerMethodField()
    author_role = serializers.SerializerMethodField()
    author_profile_image = serializers.SerializerMethodField()
    featured_image_url = serializers.SerializerMethodField()
    compressed_image_url = serializers.SerializerMethodField()
    comment_count = serializers.ReadOnlyField()
    like_count = serializers.ReadOnlyField()
    reading_time = serializers.ReadOnlyField()
    tags_list = serializers.SerializerMethodField()
    comments = serializers.SerializerMethodField()
    
    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'slug', 'content', 'excerpt',
            'author', 'author_name', 'author_role', 'author_profile_image',
            'featured_image_url', 'compressed_image_url', 'video_url',
            'category', 'tags', 'tags_list',
            'is_published', 'published_at', 'allow_comments',
            'view_count', 'comment_count', 'like_count', 'reading_time',
            'comments', 'created_at', 'updated_at'
        ]
        read_only_fields = ['author', 'view_count', 'created_at', 'updated_at']
    
    def get_author_name(self, obj):
        return obj.author.username
    
    def get_author_role(self, obj):
        try:
            return obj.author.profile.role if obj.author.profile else None
        except:
            return None
    
    def get_author_profile_image(self, obj):
        request = self.context.get('request')
        try:
            if obj.author.profile and obj.author.profile.profile_image:
                if request:
                    return request.build_absolute_uri(obj.author.profile.profile_image.url)
                return obj.author.profile.profile_image.url
        except:
            pass
        return None
    
    def get_featured_image_url(self, obj):
        request = self.context.get('request')
        try:
            if obj.featured_image and hasattr(obj.featured_image, 'url'):
                if request:
                    return request.build_absolute_uri(obj.featured_image.url)
                return obj.featured_image.url
        except Exception:
            pass
        return None
    
    def get_compressed_image_url(self, obj):
        request = self.context.get('request')
        try:
            if obj.featured_image_compressed and hasattr(obj.featured_image_compressed, 'url'):
                if request:
                    return request.build_absolute_uri(obj.featured_image_compressed.url)
                return obj.featured_image_compressed.url
        except Exception:
            pass
        return None
    
    def get_tags_list(self, obj):
        return obj.get_tags_list()
    
    def get_comments(self, obj):
        """Get approved comments for the post"""
        comments = obj.comments.filter(is_approved=True)
        return BlogCommentSerializer(comments, many=True, context=self.context).data


class BlogPostAdminSerializer(serializers.ModelSerializer):
    """Admin serializer with all fields for CRUD"""
    author_name = serializers.ReadOnlyField(source='author.username')
    comment_count = serializers.ReadOnlyField()
    pending_comments = serializers.SerializerMethodField()
    
    class Meta:
        model = BlogPost
        fields = '__all__'
        read_only_fields = [
            'author', 'slug', 'view_count', 
            'created_at', 'updated_at', 'published_at'
        ]
    
    def get_pending_comments(self, obj):
        return obj.comments.filter(is_approved=False).count()
    
    def validate_is_published(self, value):
        """Handle boolean-as-string from FormData"""
        if isinstance(value, str):
            return value.lower() == 'true'
        return bool(value)
    
    def validate_is_featured(self, value):
        """Handle boolean-as-string from FormData"""
        if isinstance(value, str):
            return value.lower() == 'true'
        return bool(value)
    
    def validate_allow_comments(self, value):
        """Handle boolean-as-string from FormData"""
        if isinstance(value, str):
            return value.lower() == 'true'
        return bool(value)


# ============================================================================
# VIEWS
# ============================================================================

class BlogPostPublicListView(APIView):
    """Public list of published blog posts"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        posts = BlogPost.objects.filter(is_published=True)
        
        # Filter by category if provided
        category = request.query_params.get('category')
        if category:
            posts = posts.filter(category=category)
        
        # Filter by tag if provided
        tag = request.query_params.get('tag')
        if tag:
            posts = posts.filter(tags__icontains=tag)
        
        # Search by title/content
        search = request.query_params.get('search')
        if search:
            posts = posts.filter(
                models.Q(title__icontains=search) | 
                models.Q(content__icontains=search) |
                models.Q(excerpt__icontains=search)
            )
        
        serializer = BlogPostListSerializer(posts, many=True, context={'request': request})
        return Response(serializer.data)


class BlogPostPublicDetailView(APIView):
    """Public detail view of a single blog post"""
    permission_classes = [AllowAny]
    
    def get(self, request, slug):
        post = get_object_or_404(BlogPost, slug=slug, is_published=True)
        
        # Increment view count
        BlogPost.objects.filter(pk=post.pk).update(view_count=models.F('view_count') + 1)
        post.refresh_from_db()
        
        serializer = BlogPostDetailSerializer(post, context={'request': request})
        return Response(serializer.data)


class BlogPostAdminListView(APIView):
    """Admin CRUD for blog posts"""
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        posts = BlogPost.objects.all().order_by('-created_at')
        serializer = BlogPostAdminSerializer(posts, many=True, context={'request': request})
        return Response(serializer.data)
    
    def post(self, request):
        try:
            # Pass through the uploaded file directly — no custom ContentFile injection
            # (compression will be added later for community forum posts)
            serializer = BlogPostAdminSerializer(data=request.data, context={'request': request})

            if serializer.is_valid():
                serializer.save(author=request.user)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                logger.error(f"Blog post validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception(f"Blog post creation failed: {str(e)}")
            return Response({'error': str(e), 'detail': 'An unexpected error occurred while creating the post.'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BlogPostAdminDetailView(APIView):
    """Admin detail CRUD for a single blog post"""
    permission_classes = [IsAdminUser]
    
    def get_object(self, pk):
        return get_object_or_404(BlogPost, pk=pk)
    
    def get(self, request, pk):
        post = self.get_object(pk)
        serializer = BlogPostAdminSerializer(post, context={'request': request})
        return Response(serializer.data)
    
    def put(self, request, pk):
        post = self.get_object(pk)
        
        try:
            # Use request.data directly — DRF handles multipart form data natively
            serializer = BlogPostAdminSerializer(post, data=request.data, partial=True, context={'request': request})
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            else:
                logger.error(f"Blog post update validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception(f"Blog post update failed: {str(e)}")
            return Response({'error': str(e), 'detail': 'An unexpected error occurred while updating the post.'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request, pk):
        post = self.get_object(pk)
        post.delete()
        return Response({'message': 'Post deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


class BlogCommentCreateView(APIView):
    """Create a comment on a blog post (authenticated users only)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, slug):
        post = get_object_or_404(BlogPost, slug=slug, is_published=True)
        
        if not post.allow_comments:
            return Response({'error': 'Comments are disabled on this post'}, status=status.HTTP_403_FORBIDDEN)
        
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'Comment content is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(content) > 2000:
            return Response({'error': 'Comment must be under 2000 characters'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Auto-approve comments from authenticated users (Coach, Athlete, Staff, VIP)
        comment = BlogComment.objects.create(
            post=post,
            author=request.user,
            content=content,
            is_approved=True,
            approved_at=timezone.now(),
            approved_by=request.user
        )
        
        serializer = BlogCommentSerializer(comment, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BlogCommentAdminListView(APIView):
    """Admin view all comments (approved and pending)"""
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        # Get all comments, newest first
        comments = BlogComment.objects.all().order_by('-created_at')
        
        # Filter by post
        post_id = request.query_params.get('post_id')
        if post_id:
            comments = comments.filter(post_id=post_id)
        
        # Filter by approval status
        approved = request.query_params.get('approved')
        if approved is not None:
            is_approved = approved.lower() == 'true'
            comments = comments.filter(is_approved=is_approved)
        
        serializer = BlogCommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data)


class BlogCommentApproveView(APIView):
    """Approve a pending comment"""
    permission_classes = [IsAdminUser]
    
    def post(self, request, comment_id):
        comment = get_object_or_404(BlogComment, pk=comment_id)
        comment.approve(request.user)
        serializer = BlogCommentSerializer(comment, context={'request': request})
        return Response(serializer.data)


class BlogCommentDeleteView(APIView):
    """Delete a comment"""
    permission_classes = [IsAdminUser]
    
    def delete(self, request, comment_id):
        comment = get_object_or_404(BlogComment, pk=comment_id)
        comment.delete()
        return Response({'message': 'Comment deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


class BlogFeaturedPostView(APIView):
    """Get the featured post for the front page"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        post = BlogPost.objects.filter(is_published=True, is_featured=True).first()
        if not post:
            # Fall back to most recent published post
            post = BlogPost.objects.filter(is_published=True).first()
        if not post:
            return Response(None)
        serializer = BlogPostListSerializer(post, context={'request': request})
        return Response(serializer.data)


class BlogCategoriesView(APIView):
    """Get list of unique categories used in blog posts"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        categories = BlogPost.objects.filter(is_published=True)\
            .values_list('category', flat=True)\
            .distinct()\
            .exclude(category='')\
            .order_by('category')
        return Response(list(categories))


class BlogPostLikeToggleView(APIView):
    """Toggle like on a blog post (authenticated users only)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, slug):
        post = get_object_or_404(BlogPost, slug=slug, is_published=True)
        
        if request.user in post.likes.all():
            post.likes.remove(request.user)
            liked = False
        else:
            post.likes.add(request.user)
            liked = True
        
        return Response({
            'liked': liked,
            'like_count': post.like_count
        })


class BlogPostLikeStatusView(APIView):
    """Check if the current user has liked a post"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, slug):
        post = get_object_or_404(BlogPost, slug=slug, is_published=True)
        liked = request.user in post.likes.all()
        return Response({
            'liked': liked,
            'like_count': post.like_count
        })


# Need to import models for the Q filter
from django.db import models
