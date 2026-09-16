// Keep UUID filters below reverse-proxy request/response header limits.
// PostgREST echoes the query in Content-Location, even for an empty result.
export async function loadSessionBatches<T>(
  sessionIds: string[],
  load: (ids: string[]) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<{ data: T[]; error: unknown }> {
  const data: T[] = [];
  for (let offset = 0; offset < sessionIds.length; offset += 40) {
    const result = await load(sessionIds.slice(offset, offset + 40));
    if (result.error) return { data: [], error: result.error };
    data.push(...(result.data || []));
  }
  return { data, error: null };
}
