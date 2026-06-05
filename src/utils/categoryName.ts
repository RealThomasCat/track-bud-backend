export const normalizeCategoryName = (name: string) =>
    name.trim().replace(/\s+/g, " ").toLowerCase();
