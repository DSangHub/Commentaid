import { requireUser } from "../../../lib/supabase";
import { checkRateLimit } from "../../../lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

function cleanChannel(value) {
  const input = value.trim();
  const channelMatch = input.match(/youtube\.com\/channel\/([^/?#]+)/i);
  if (channelMatch) return { id: channelMatch[1] };

  const handleMatch = input.match(/(?:youtube\.com\/)?@([^/?#]+)/i);
  if (handleMatch) return { handle: handleMatch[1] };

  if (/^UC[\w-]{20,}$/.test(input)) return { id: input };
  return { handle: input.replace(/^@/, "") };
}

async function youtube(path, params, key) {
  const url = new URL(`${YOUTUBE_API}/${path}`);
  Object.entries({ ...params, key }).forEach(([name, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(name, value);
  });
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "YouTube request failed.");
  }
  return data;
}

async function resolveChannel(input, key) {
  const target = cleanChannel(input);
  const data = await youtube(
    "channels",
    {
      part: "snippet,statistics,contentDetails",
      ...(target.id ? { id: target.id } : { forHandle: target.handle }),
    },
    key
  );
  return data.items?.[0] || null;
}

export async function GET(request) {
  try {
    const auth = await requireUser(request);
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    const rate = checkRateLimit(`comments:${auth.user.id}`, 60);
    if (!rate.allowed) {
      return Response.json(
        { error: "Comment refresh limit reached. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
      );
    }

    const key = process.env.YOUTUBE_API_KEY;
    if (!key) {
      return Response.json(
        { error: "YouTube monitoring is not configured yet." },
        { status: 503 }
      );
    }

    const rawChannel =
      new URL(request.url).searchParams.get("channel") ||
      process.env.YOUTUBE_CHANNEL ||
      "";
    if (!rawChannel || rawChannel.length > 200) {
      return Response.json({ error: "Enter a valid YouTube channel." }, { status: 400 });
    }

    const channel = await resolveChannel(rawChannel, key);
    if (!channel) {
      return Response.json({ error: "YouTube channel not found." }, { status: 404 });
    }

    const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
    const playlist = uploads
      ? await youtube(
          "playlistItems",
          { part: "snippet", playlistId: uploads, maxResults: "8" },
          key
        )
      : { items: [] };

    const videos = (playlist.items || []).map((item) => ({
      id: item.snippet?.resourceId?.videoId,
      title: item.snippet?.title || "YouTube video",
    })).filter((video) => video.id);

    const commentGroups = await Promise.all(
      videos.map(async (video) => {
        try {
          const data = await youtube(
            "commentThreads",
            { part: "snippet", videoId: video.id, maxResults: "10", order: "time" },
            key
          );
          return (data.items || []).map((item) => {
            const top = item.snippet?.topLevelComment?.snippet || {};
            const id = item.snippet?.topLevelComment?.id || item.id;
            return {
              id,
              author: top.authorDisplayName || "Viewer",
              text: top.textDisplay || top.textOriginal || "",
              publishedAt: top.publishedAt,
              likeCount: top.likeCount || 0,
              replyCount: item.snippet?.totalReplyCount || 0,
              videoId: video.id,
              videoTitle: video.title,
              url: `https://www.youtube.com/watch?v=${video.id}&lc=${id}`,
            };
          });
        } catch (error) {
          if (/disabled/i.test(error.message)) return [];
          throw error;
        }
      })
    );

    const comments = commentGroups
      .flat()
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    return Response.json(
      {
        channel: {
          id: channel.id,
          title: channel.snippet?.title || rawChannel,
          thumbnail: channel.snippet?.thumbnails?.default?.url || "",
          subscribers: channel.statistics?.subscriberCount || null,
        },
        comments,
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "X-RateLimit-Remaining": String(rate.remaining),
        },
      }
    );
  } catch (error) {
    console.error("Commentaid YouTube error", error);
    return Response.json(
      { error: error.message || "Could not load YouTube comments." },
      { status: 500 }
    );
  }
}
