export type MediaUsage = {
  kind: "site_block" | "staff" | "course";
  label: string;
};

export async function resolveMediaUsages(admin: any, organizationId: string, mediaPaths: string[]) {
  const uniquePaths = [...new Set(mediaPaths.filter(Boolean))];
  const result = Object.fromEntries(uniquePaths.map((path) => [path, [] as MediaUsage[]]));
  if (!organizationId || uniquePaths.length === 0) return result;

  const [{ data: blocks }, { data: profiles }, { data: courses }] = await Promise.all([
    admin.from("site_content_blocks").select("block_key, title, content").eq("organization_id", organizationId),
    admin.from("profiles").select("avatar_url").in("avatar_url", uniquePaths),
    admin.from("courses").select("title, card_image_url").eq("organization_id", organizationId).in("card_image_url", uniquePaths),
  ]);

  for (const mediaPath of uniquePaths) {
    for (const block of blocks || []) {
      if (JSON.stringify(block.content || {}).includes(mediaPath)) result[mediaPath].push({ kind: "site_block", label: `Блок сайта: ${block.title || block.block_key}` });
    }
  }
  for (const profile of profiles || []) {
    if (result[profile.avatar_url]) result[profile.avatar_url].push({ kind: "staff", label: "Фото сотрудника" });
  }
  for (const course of courses || []) {
    if (result[course.card_image_url]) result[course.card_image_url].push({ kind: "course", label: `Фон курса: ${course.title || "без названия"}` });
  }
  return result;
}
