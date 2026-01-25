export const MAX_ITEM_PHOTOS = 8;

export const sanitizePhotosArray = (value: unknown, limit = MAX_ITEM_PHOTOS): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter((entry) => entry.length)
      .slice(0, limit);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? [trimmed] : [];
  }
  return [];
};

export type SanitizedExtraData = {
  extraData: Record<string, any> | null;
  photoCount: number;
  photos: string[];
};

export const sanitizeInventoryExtraData = (
  extraData: unknown,
  options?: { includePhotos?: boolean; limit?: number }
): SanitizedExtraData => {
  const limit = options?.limit ?? MAX_ITEM_PHOTOS;
  const photos = sanitizePhotosArray((extraData as any)?.photos, limit);

  if (!extraData || typeof extraData !== "object") {
    return {
      extraData: null,
      photoCount: photos.length,
      photos
    };
  }

  const cloned = Array.isArray(extraData) ? {} : { ...(extraData as Record<string, any>) };
  if (options?.includePhotos) {
    cloned.photos = photos;
  } else {
    delete cloned.photos;
  }

  return {
    extraData: cloned,
    photoCount: photos.length,
    photos
  };
};

export type SerializeInventoryOptions = {
  includePhotos?: boolean;
  includePhotoPreview?: boolean;
};

export const serializeInventoryItem = <T extends { price: any; extraData?: any }>(
  item: T,
  options?: SerializeInventoryOptions
) => {
  const { extraData, photoCount, photos } = sanitizeInventoryExtraData(item.extraData ?? null, {
    includePhotos: options?.includePhotos
  });
  const priceValue =
    item.price !== null && item.price !== undefined ? Number(item.price as number) : null;

  const payload: Record<string, any> = {
    ...(item as any),
    price: priceValue,
    extraData,
    photoCount
  };

  if (options?.includePhotoPreview) {
    payload.photoPreview = photos[0] ?? null;
  }

  return payload;
};
