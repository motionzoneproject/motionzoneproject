type UserDetailsShape = {
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  address: string | null;
  postalCode: string | null;
  dateOfBirth?: string | null;
  allowPhotoVideo?: boolean | null;
  city: string | null;
};

type UserForAdminForm = {
  name: string;
  details: UserDetailsShape | null;
};

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function withFallback(value: string | null | undefined, fallback = "") {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

export function getAdminUserFormDefaults(user: UserForAdminForm) {
  const fallbackName = splitName(user.name);

  return {
    firstName: withFallback(user.details?.firstName, fallbackName.firstName),
    lastName: withFallback(user.details?.lastName, fallbackName.lastName),
    phoneNumber: user.details?.phoneNumber ?? "",
    dateOfBirth: user.details?.dateOfBirth ?? "",
    address: user.details?.address ?? "",
    postalCode: user.details?.postalCode ?? "",
    city: user.details?.city ?? "",
    allowPhotoVideo: user.details?.allowPhotoVideo ?? false,
  };
}
