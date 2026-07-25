"""
Image compression service for blog post images.
Uses Pillow to compress, resize, and convert images to WebP format.
"""
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import InMemoryUploadedFile
import os
import logging

logger = logging.getLogger(__name__)

# Default compression settings
DEFAULT_MAX_WIDTH = 1920
DEFAULT_MAX_HEIGHT = 1080
DEFAULT_QUALITY = 85
DEFAULT_FORMAT = 'WEBP'


def compress_image(uploaded_image, max_width=DEFAULT_MAX_WIDTH, max_height=DEFAULT_MAX_HEIGHT, 
                   quality=DEFAULT_QUALITY, output_format=DEFAULT_FORMAT):
    """
    Compress an uploaded image file.
    
    Args:
        uploaded_image: InMemoryUploadedFile or File object
        max_width: Maximum width in pixels
        max_height: Maximum height in pixels
        quality: JPEG/WebP quality (1-100)
        output_format: 'WEBP', 'JPEG', or 'PNG'
    
    Returns:
        InMemoryUploadedFile with compressed image, or None if compression fails
    """
    try:
        # Open the image
        img = Image.open(uploaded_image)
        
        # Convert RGBA to RGB if saving as JPEG
        if output_format.upper() == 'JPEG' and img.mode == 'RGBA':
            img = img.convert('RGB')
        elif img.mode not in ('RGB', 'RGBA'):
            img = img.convert('RGB')
        
        # Calculate new dimensions while maintaining aspect ratio
        original_width, original_height = img.size
        ratio = min(max_width / original_width, max_height / original_height, 1.0)
        
        if ratio < 1.0:
            new_width = int(original_width * ratio)
            new_height = int(original_height * ratio)
            img = img.resize((new_width, new_height), Image.LANCZOS)
        
        # Save to BytesIO
        buffer = BytesIO()
        
        # Determine save format and extension
        save_format = output_format.upper()
        if save_format == 'WEBP':
            extension = '.webp'
            content_type = 'image/webp'
        elif save_format == 'JPEG':
            extension = '.jpg'
            content_type = 'image/jpeg'
        else:
            extension = '.png'
            content_type = 'image/png'
        
        # Save with optimization
        img.save(buffer, format=save_format, quality=quality, optimize=True)
        buffer.seek(0)
        
        # Get original filename without extension
        original_name = os.path.splitext(uploaded_image.name)[0]
        compressed_filename = f"{original_name}_compressed{extension}"
        
        # Create a new InMemoryUploadedFile
        compressed_file = InMemoryUploadedFile(
            buffer,
            None,
            compressed_filename,
            content_type,
            buffer.tell(),
            None
        )
        
        logger.info(f"Compressed {uploaded_image.name} ({original_width}x{original_height}) -> "
                   f"{compressed_filename} ({img.size[0]}x{img.size[1]}) quality={quality}")
        
        return compressed_file
        
    except Exception as e:
        logger.error(f"Image compression failed for {uploaded_image.name}: {str(e)}")
        # Return original if compression fails
        return uploaded_image


def create_thumbnail(image, max_width=400, max_height=300, quality=75):
    """
    Create a thumbnail version of an image.
    
    Args:
        image: Image file
        max_width: Thumbnail max width
        max_height: Thumbnail max height
        quality: Compression quality
    
    Returns:
        InMemoryUploadedFile with thumbnail
    """
    return compress_image(
        image, 
        max_width=max_width, 
        max_height=max_height, 
        quality=quality,
        output_format='WEBP'
    )
