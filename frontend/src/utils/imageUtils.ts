type ImageCategory = 'events' | 'hero' | 'gallery' | 'avatars' | 'team' | undefined;

/**
 * Resim URL'sini tam URL'ye çevirir.
 * Proxy sayesinde artık base URL (API_URL) eklemeye gerek kalmamıştır.
 * Tüm yollar, sunucu kökünden göreceli (relative) olarak ele alınır.
 * @param imagePath - API'den gelen resim yolu (örn. /uploads/events/image.jpg veya sadece image.jpg)
 * @param category - Resim kategorisi (imagePath tam değilse kullanılır)
 * @returns Tam, göreceli resim URL'si (örn. /uploads/events/image.jpg)
 */
export const getImageUrl = (imagePath?: string, category: ImageCategory = undefined): string => {
  if (!imagePath) {
    switch (category) {
      case 'events':
        return '/images/default-event.svg';
      case 'hero':
        return '/images/default-hero-bg.svg';
      case 'gallery':
        return '/images/default-gallery.svg';
      case 'avatars':
        return '/uploads/team/default-avatar.jpg'; // Corrected path
      case 'team':
        return '/uploads/team/default-avatar.jpg';
      default:
        return '/images/default-hero-bg.svg'; // Fallback to an existing image
    }
  }

  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  if (imagePath.startsWith('/')) {
    return imagePath;
  }

  if (category) {
    return `/uploads/${category}/${imagePath}`;
  }

  return `/${imagePath}`;
}; 